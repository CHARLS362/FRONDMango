import { Injectable, signal } from '@angular/core';
import type { TicketVenta } from '../domain/ticket.model';

// ─── UUIDs de servicios BLE comunes en ticketeras térmicas ───
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7e1a2c0-296b-11e5-9701-0002a5d5c51b',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb'
];

// Configuración del puerto serial para impresoras Bluetooth Clásico (SPP)
const SERIAL_OPTIONS = { baudRate: 9600 };

type ConnectionMode = 'serial' | 'ble';

@Injectable({
  providedIn: 'root'
})
export class BluetoothPrinterService {
  connectionStatus = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  deviceName = signal<string | null>(null);
  connectionMode = signal<ConnectionMode | null>(null);

  // --- Internals ---
  private serialPort: any = null;
  private serialWriter: any = null;
  private bleDevice: any = null;
  private bleCharacteristic: any = null;

  // ════════════════════════════════════════════════════════════════
  //  DETECCIÓN DE APIs DISPONIBLES
  // ════════════════════════════════════════════════════════════════

  /** Web Serial API — Chrome 117+. Detecta impresoras Bluetooth Clásico (SPP) emparejadas al sistema */
  isSerialSupported(): boolean {
    return 'serial' in navigator;
  }

  /** Web Bluetooth API — Chrome para BLE */
  isBluetoothSupported(): boolean {
    return !!(navigator as any).bluetooth;
  }

  // ════════════════════════════════════════════════════════════════
  //  CONEXIÓN PRINCIPAL (Intenta Serial primero, luego BLE)
  // ════════════════════════════════════════════════════════════════

  async connect(): Promise<void> {
    // Prioridad 1: Web Serial (Bluetooth Clásico SPP)
    // El usuario empareja la ticketera en Ajustes de Bluetooth del dispositivo (como haría nativamente),
    // y luego la selecciona aquí con su nombre real visible.
    if (this.isSerialSupported()) {
      try {
        await this.connectSerial();
        return;
      } catch (err: any) {
        console.warn('Web Serial no pudo conectar:', err.message);
        // Si el usuario canceló el diálogo, no intentar BLE automáticamente
        if (err.message?.includes('No port selected') || err.name === 'NotFoundError') {
          this.handleDisconnection();
          throw new Error('No se seleccionó ningún dispositivo.');
        }
      }
    }

    // Prioridad 2: Web Bluetooth (BLE)
    if (this.isBluetoothSupported()) {
      await this.connectBLE();
      return;
    }

    throw new Error('Este navegador no soporta Web Serial ni Web Bluetooth. Use Google Chrome 117+ o Edge.');
  }

  // ════════════════════════════════════════════════════════════════
  //  MODO 1: WEB SERIAL (Bluetooth Clásico / SPP)
  //  → Muestra dispositivos emparejados al sistema con NOMBRE REAL
  // ════════════════════════════════════════════════════════════════

  private async connectSerial(): Promise<void> {
    this.connectionStatus.set('connecting');
    console.log('[Serial] Abriendo selector de puertos seriales Bluetooth...');

    // Abre el selector nativo del navegador que muestra los dispositivos
    // Bluetooth Clásico emparejados al sistema operativo con su nombre real.
    const port = await (navigator as any).serial.requestPort();

    this.serialPort = port;

    // Obtener info del puerto para mostrar nombre del dispositivo
    const portInfo = port.getInfo();
    const vendorName = this.resolveSerialDeviceName(portInfo);
    this.deviceName.set(vendorName);

    console.log(`[Serial] Puerto seleccionado: ${vendorName}. Abriendo conexión...`);

    await port.open(SERIAL_OPTIONS);

    // Configurar el writer para enviar bytes
    this.serialWriter = port.writable.getWriter();

    // Escuchar desconexión
    (navigator as any).serial.addEventListener('disconnect', (event: any) => {
      if (event.target === this.serialPort) {
        console.log('[Serial] Dispositivo desconectado.');
        this.handleDisconnection();
      }
    });

    this.connectionMode.set('serial');
    this.connectionStatus.set('connected');
    console.log('[Serial] Conexión persistente establecida con la ticketera.');
  }

  /** Intenta resolver un nombre legible para el dispositivo serial */
  private resolveSerialDeviceName(portInfo: any): string {
    if (portInfo?.usbVendorId) {
      return `Ticketera (VID:${portInfo.usbVendorId.toString(16).toUpperCase()})`;
    }
    return 'Ticketera Bluetooth';
  }

  // ════════════════════════════════════════════════════════════════
  //  MODO 2: WEB BLUETOOTH (BLE / Low Energy)
  //  → Escaneo general, respaldo si Web Serial no está disponible
  // ════════════════════════════════════════════════════════════════

  private async connectBLE(): Promise<void> {
    this.connectionStatus.set('connecting');
    console.log('[BLE] Escaneando dispositivos BLE...');

    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_PRINTER_SERVICES
    });

    this.bleDevice = device;
    this.deviceName.set(device.name || 'Ticketera BLE');

    device.addEventListener('gattserverdisconnected', () => this.handleDisconnection());

    console.log('[BLE] Dispositivo seleccionado. Conectando al servidor GATT...');
    const server = await device.gatt.connect();

    console.log('[BLE] Servidor GATT conectado. Buscando servicio de impresión...');
    let service: any = null;

    for (const uuid of BLE_PRINTER_SERVICES) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) {
          console.log(`[BLE] Servicio encontrado: ${uuid}`);
          break;
        }
      } catch (e) {
        // Siguiente UUID
      }
    }

    if (!service) {
      throw new Error('No se encontró el servicio de impresión BLE en el dispositivo.');
    }

    console.log('[BLE] Buscando características de escritura...');
    const characteristics = await service.getCharacteristics();

    const characteristic = characteristics.find(
      (c: any) => c.properties.write || c.properties.writeWithoutResponse
    );

    if (!characteristic) {
      throw new Error('No se encontró la característica de escritura en el servicio de impresión.');
    }

    this.bleCharacteristic = characteristic;
    this.connectionMode.set('ble');
    this.connectionStatus.set('connected');
    console.log('[BLE] Conexión persistente establecida con la ticketera.');
  }

  // ════════════════════════════════════════════════════════════════
  //  DESCONEXIÓN
  // ════════════════════════════════════════════════════════════════

  async disconnect(): Promise<void> {
    try {
      if (this.connectionMode() === 'serial' && this.serialPort) {
        if (this.serialWriter) {
          await this.serialWriter.releaseLock();
          this.serialWriter = null;
        }
        await this.serialPort.close();
      }
      if (this.connectionMode() === 'ble' && this.bleDevice?.gatt?.connected) {
        this.bleDevice.gatt.disconnect();
      }
    } catch (e) {
      console.warn('Error al desconectar:', e);
    }
    this.handleDisconnection();
  }

  private handleDisconnection(): void {
    this.serialPort = null;
    this.serialWriter = null;
    this.bleDevice = null;
    this.bleCharacteristic = null;
    this.deviceName.set(null);
    this.connectionMode.set(null);
    this.connectionStatus.set('disconnected');
    console.log('Ticketera desconectada.');
  }

  // ════════════════════════════════════════════════════════════════
  //  IMPRESIÓN DE TICKET (despacha al canal activo)
  // ════════════════════════════════════════════════════════════════

  async printTicket(ticket: TicketVenta): Promise<void> {
    if (this.connectionStatus() !== 'connected') {
      throw new Error('No hay ninguna ticketera conectada.');
    }

    const bytes = this.encodeTicket(ticket);
    console.log(`Enviando ${bytes.length} bytes a la ticketera (${this.connectionMode()})...`);

    if (this.connectionMode() === 'serial') {
      await this.writeSerial(bytes);
    } else {
      await this.writeBLE(bytes);
    }

    console.log('Ticket impreso exitosamente.');
  }

  // ─── Escritura Serial (un solo bloque, sin fragmentación necesaria) ───
  private async writeSerial(data: Uint8Array): Promise<void> {
    if (!this.serialWriter) throw new Error('Writer serial no disponible.');
    await this.serialWriter.write(data);
  }

  // ─── Escritura BLE (fragmentada a 20 bytes por MTU) ───
  private async writeBLE(data: Uint8Array): Promise<void> {
    if (!this.bleCharacteristic) throw new Error('Característica BLE no disponible.');
    const CHUNK_SIZE = 20;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await this.bleCharacteristic.writeValue(chunk);
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  CODIFICACIÓN ESC/POS (58mm, 32 columnas, ASCII limpio)
  // ════════════════════════════════════════════════════════════════

  private formatLine(left: string, right: string, cols: number = 32): string {
    const spaceCount = cols - left.length - right.length;
    if (spaceCount <= 0) {
      return (left + ' ' + right).substring(0, cols);
    }
    return left + ' '.repeat(spaceCount) + right;
  }

  private cleanText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N')
      .replace(/[^\x20-\x7E\n\r]/g, '');
  }

  private encodeTicket(ticket: TicketVenta): Uint8Array {
    const encoder = new TextEncoder();
    const bytes: number[] = [];

    // ESC @ - Inicializar impresora
    bytes.push(0x1B, 0x40);

    // ESC a 1 - Centrar alineación
    bytes.push(0x1B, 0x61, 0x01);

    // GS ! 17 - Doble altura y doble ancho para título principal
    bytes.push(0x1D, 0x21, 0x11);
    bytes.push(...encoder.encode("MANGO 81\n"));

    // GS ! 0 - Restaurar tamaño normal
    bytes.push(0x1D, 0x21, 0x00);
    bytes.push(...encoder.encode(this.cleanText("Pastelería & Juguería\n")));
    bytes.push(...encoder.encode(this.cleanText("Calle Loreto 123 - Pab\n")));
    bytes.push(...encoder.encode("--------------------------------\n"));

    // ESC a 0 - Alinear a la izquierda
    bytes.push(0x1B, 0x61, 0x00);
    bytes.push(...encoder.encode(this.cleanText(`Boleta: ${ticket.id}\n`)));
    bytes.push(...encoder.encode(this.cleanText(`Fecha: ${ticket.fecha}\n`)));
    bytes.push(...encoder.encode(this.cleanText(`Vendedor: ${ticket.vendedor}\n`)));
    
    if (ticket.clienteNombre) {
      bytes.push(...encoder.encode(this.cleanText(`Cliente: ${ticket.clienteNombre}\n`)));
    }
    bytes.push(...encoder.encode("--------------------------------\n"));

    // Items de venta
    ticket.items.forEach((item) => {
      const qtyText = `${item.cantidad}x ${item.nombre}`;
      const priceText = `S/ ${(item.precio * item.cantidad).toFixed(2)}`;
      
      const typeLabel = item.tipoVenta === 'ENTERA' ? ' (Ent.)' : item.tipoVenta === 'PORCION' ? ' (Porc.)' : '';
      const fullLabel = this.cleanText(qtyText + typeLabel);

      if (fullLabel.length + priceText.length >= 31) {
        bytes.push(...encoder.encode(fullLabel + "\n"));
        bytes.push(...encoder.encode(this.formatLine("", priceText) + "\n"));
      } else {
        bytes.push(...encoder.encode(this.formatLine(fullLabel, priceText) + "\n"));
      }
    });

    bytes.push(...encoder.encode("--------------------------------\n"));

    // Totales
    if (ticket.recargoEmpaque && ticket.recargoEmpaque > 0) {
      bytes.push(...encoder.encode(this.formatLine("SUBTOTAL:", `S/ ${(ticket.total - ticket.recargoEmpaque).toFixed(2)}`) + "\n"));
      const empaqueLabel = ticket.empaque === 'VASO' ? 'RECARGO VASOS:' : 'RECARGO EMPAQUE:';
      bytes.push(...encoder.encode(this.formatLine(empaqueLabel, `S/ ${ticket.recargoEmpaque.toFixed(2)}`) + "\n"));
    }

    // Negrita activada
    bytes.push(0x1B, 0x45, 0x01);
    bytes.push(...encoder.encode(this.formatLine("TOTAL:", `S/ ${ticket.total.toFixed(2)}`) + "\n"));
    bytes.push(0x1B, 0x45, 0x00); // Negrita apagada

    const metodoText = ticket.metodoPago === 'YAPE_PLIN' ? 'YAPE/PLIN' : ticket.metodoPago;
    bytes.push(...encoder.encode(this.formatLine("PAGO:", `${metodoText} S/ ${ticket.pagado.toFixed(2)}`) + "\n"));
    
    if (ticket.vuelto > 0) {
      bytes.push(...encoder.encode(this.formatLine("VUELTO:", `S/ ${ticket.vuelto.toFixed(2)}`) + "\n"));
    }

    bytes.push(...encoder.encode("--------------------------------\n"));

    // ESC a 1 - Centrar pie de página
    bytes.push(0x1B, 0x61, 0x01);
    bytes.push(...encoder.encode("Gracias por su compra!\n"));
    
    if (ticket.observaciones) {
      bytes.push(...encoder.encode(this.cleanText(`Obs: ${ticket.observaciones}\n`)));
    }

    // Alimentar papel para poder cortar
    bytes.push(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);
    
    // Comando ESC/POS para cortar papel o alimentar completo
    bytes.push(0x1D, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  }
}
