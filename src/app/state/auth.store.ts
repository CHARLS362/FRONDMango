import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import type { AuditLog } from '../core/domain/audit.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private storage = inject(LocalStorageService);

  // --- Signals ---
  vendedorActivo = signal<string | null>(this.storage.load('vendedorActivo', null));
  cajaAbierta = signal<boolean>(this.storage.load('cajaAbierta', false));
  cajaFondoInicial = signal<number>(this.storage.load('cajaFondoInicial', 0));
  cajaMetodoVentas = signal<{ efectivo: number; yapePlin: number; tarjeta: number }>(
    this.storage.load('cajaMetodoVentas', { efectivo: 0, yapePlin: 0, tarjeta: 0 })
  );
  cajaLogs = signal<{ tipo: string; monto: number; hora: string }[]>(
    this.storage.load('cajaLogs', [])
  );
  claveAdministrador = signal<string>(this.storage.load('claveAdministrador', '1234'));

  constructor() {
    effect(() => this.storage.save('vendedorActivo', this.vendedorActivo()));
    effect(() => this.storage.save('cajaAbierta', this.cajaAbierta()));
    effect(() => this.storage.save('cajaFondoInicial', this.cajaFondoInicial()));
    effect(() => this.storage.save('cajaMetodoVentas', this.cajaMetodoVentas()));
    effect(() => this.storage.save('cajaLogs', this.cajaLogs()));
    effect(() => this.storage.save('claveAdministrador', this.claveAdministrador()));
  }

  // --- Actions ---

  setVendedorActivo(nombre: string | null) {
    this.vendedorActivo.set(nombre);
  }

  abrirCaja(fondo: number): AuditLog {
    this.cajaAbierta.set(true);
    this.cajaFondoInicial.set(fondo);
    this.cajaMetodoVentas.set({ efectivo: 0, yapePlin: 0, tarjeta: 0 });
    this.cajaLogs.set([{ tipo: 'Apertura', monto: fondo, hora: new Date().toLocaleTimeString() }]);

    return {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'CAJA_APERTURA',
      descripcion: `Apertura de caja con fondo inicial de S/. ${fondo.toFixed(2)}`,
      detalles: { fondoInicial: fondo, vendedor: this.vendedorActivo() },
    };
  }

  cerrarCaja(efectivoReal: number): { diferencia: number; balance: any; auditLog: AuditLog } {
    const fondoInicial = this.cajaFondoInicial();
    const ventasEfectivo = this.cajaMetodoVentas().efectivo;
    const montoTeoricoEfectivo = fondoInicial + ventasEfectivo;
    const diferencia = efectivoReal - montoTeoricoEfectivo;

    const balance = {
      fondoInicial,
      ventasEfectivo,
      ventasYapePlin: this.cajaMetodoVentas().yapePlin,
      ventasTarjeta: this.cajaMetodoVentas().tarjeta,
      totalVentas: ventasEfectivo + this.cajaMetodoVentas().yapePlin + this.cajaMetodoVentas().tarjeta,
      teoricoEfectivo: montoTeoricoEfectivo,
      realEfectivo: efectivoReal,
      diferencia,
    };

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'CAJA_CIERRE',
      descripcion: `Cierre de caja. Total ventas: S/. ${balance.totalVentas.toFixed(2)}. Arqueo: S/. ${diferencia.toFixed(2)} (vendedor: ${this.vendedorActivo()})`,
      detalles: balance,
    };

    this.cajaAbierta.set(false);
    this.vendedorActivo.set(null);
    this.cajaLogs.update(prev => [...prev, { tipo: 'Cierre', monto: efectivoReal, hora: new Date().toLocaleTimeString() }]);

    return { diferencia, balance, auditLog };
  }

  registrarVentaEnCaja(total: number, metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA') {
    this.cajaMetodoVentas.update(prev => {
      const nuevo = { ...prev };
      if (metodoPago === 'EFECTIVO') nuevo.efectivo += total;
      if (metodoPago === 'YAPE_PLIN') nuevo.yapePlin += total;
      if (metodoPago === 'TARJETA') nuevo.tarjeta += total;
      return nuevo;
    });
  }

  revertirVentaEnCaja(total: number, metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA') {
    this.cajaMetodoVentas.update(prev => {
      const nuevo = { ...prev };
      if (metodoPago === 'EFECTIVO') nuevo.efectivo = Math.max(0, nuevo.efectivo - total);
      if (metodoPago === 'YAPE_PLIN') nuevo.yapePlin = Math.max(0, nuevo.yapePlin - total);
      if (metodoPago === 'TARJETA') nuevo.tarjeta = Math.max(0, nuevo.tarjeta - total);
      return nuevo;
    });
  }

  cambiarClaveAdministrador(nuevaClave: string) {
    this.claveAdministrador.set(nuevaClave);
  }
}
