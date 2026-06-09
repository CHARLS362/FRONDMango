import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import type { CartItem, OrdenActiva } from '../core/domain/order.model';
import type { AuditLog } from '../core/domain/audit.model';

@Injectable({
  providedIn: 'root'
})
export class OrdersStore {
  private storage = inject(LocalStorageService);

  // --- Signals ---
  ordenesActivas = signal<OrdenActiva[]>(this.storage.load('ordenesActivas', []));
  carrito = signal<CartItem[]>([]);
  modoServicio = signal<'MESA' | 'LLEVAR'>('LLEVAR');
  pedidoSeleccionadoId = signal<string | null>(null);
  ticketGlobalCorrelativo = signal<number>(this.storage.load('ticketGlobalCorrelativo', 1));

  constructor() {
    effect(() => this.storage.save('ordenesActivas', this.ordenesActivas()));
    effect(() => this.storage.save('ticketGlobalCorrelativo', this.ticketGlobalCorrelativo()));
  }

  // --- Mode / Selection ---

  cambiarModoServicio(modo: 'MESA' | 'LLEVAR') {
    this.modoServicio.set(modo);
    this.pedidoSeleccionadoId.set(null);
    this.carrito.set([]);
  }

  seleccionarPedido(id: string | null) {
    if (id !== null) {
      const ord = this.ordenesActivas().find(o => o.id === id);
      if (ord) {
        this.pedidoSeleccionadoId.set(id);
        this.carrito.set([...ord.carrito]);
        this.modoServicio.set(ord.modoServicio || this.modoServicio());
      } else {
        this.pedidoSeleccionadoId.set(null);
        this.carrito.set([]);
      }
    } else {
      this.pedidoSeleccionadoId.set(null);
      this.carrito.set([]);
    }
  }

  // --- Orders CRUD ---

  crearNuevoPedido(vendedorActivo: string): string {
    const id = this.ticketGlobalCorrelativo().toString();
    const nuevaOrden: OrdenActiva = {
      id,
      numeroPedido: id,
      carrito: [],
      vendedor: vendedorActivo || 'Vendedor',
      horaApertura: new Date().toLocaleTimeString(),
      subsanadoCount: 0,
      estado: 'PREPARANDO',
      clienteNombre: '',
      observaciones: '',
      modoServicio: this.modoServicio(),
      enviadoCocina: false,
      empaque: 'BOLSA',
      recargoEmpaque: 0
    };

    this.ordenesActivas.update(prev => [...prev, nuevaOrden]);
    this.pedidoSeleccionadoId.set(id);
    this.carrito.set([]);
    this.ticketGlobalCorrelativo.update(prev => prev + 1);

    return id;
  }

  limpiarOrdenesActivas() {
    this.ordenesActivas.set([]);
    this.pedidoSeleccionadoId.set(null);
    this.carrito.set([]);
  }

  // --- Cart Operations ---

  agregarAlCarrito(productoId: string, nombre: string, precio: number, tipoVenta: 'GENERAL' | 'ENTERA' | 'PORCION') {
    const existingIndex = this.carrito().findIndex(
      item => item.productoId === productoId && item.tipoVenta === tipoVenta && item.servido === false && !item.enviadoCocina
    );

    let nuevoCarrito = [...this.carrito()];

    if (existingIndex > -1) {
      nuevoCarrito[existingIndex] = {
        ...nuevoCarrito[existingIndex],
        cantidad: nuevoCarrito[existingIndex].cantidad + 1,
      };
    } else {
      nuevoCarrito.push({ productoId, nombre, tipoVenta, precio, cantidad: 1, servido: false });
    }

    this.carrito.set(nuevoCarrito);
    this._syncCarritoToOrden(nuevoCarrito);
  }

  quitarDelCarrito(productoId: string, tipoVenta: 'GENERAL' | 'ENTERA' | 'PORCION') {
    const unservedIndex = this.carrito().findIndex(
      item => item.productoId === productoId && item.tipoVenta === tipoVenta && item.servido === false && !item.enviadoCocina
    );

    if (unservedIndex === -1) return;

    const nuevoCarrito = [...this.carrito()];
    nuevoCarrito.splice(unservedIndex, 1);
    this.carrito.set(nuevoCarrito);
    this._syncCarritoToOrden(nuevoCarrito);
  }

  cambiarCantidadCarrito(productoId: string, tipoVenta: 'GENERAL' | 'ENTERA' | 'PORCION', delta: number) {
    const existingIndex = this.carrito().findIndex(
      item => item.productoId === productoId && item.tipoVenta === tipoVenta && item.servido === false && !item.enviadoCocina
    );
    if (existingIndex === -1) return;

    let nuevoCarrito = [...this.carrito()];
    const nuevaCant = nuevoCarrito[existingIndex].cantidad + delta;

    if (nuevaCant <= 0) {
      nuevoCarrito.splice(existingIndex, 1);
    } else {
      nuevoCarrito[existingIndex] = { ...nuevoCarrito[existingIndex], cantidad: nuevaCant };
    }

    this.carrito.set(nuevoCarrito);
    this._syncCarritoToOrden(nuevoCarrito);
  }

  limpiarCarrito() {
    const selId = this.pedidoSeleccionadoId();
    if (selId) {
      const ord = this.ordenesActivas().find(o => o.id === selId);
      if (ord && ord.enviadoCocina) {
        const keptItems = ord.carrito.filter(item => item.servido);
        this.carrito.set(keptItems);
        this.ordenesActivas.update(prev =>
          prev.map(o => o.id === selId ? { ...o, carrito: keptItems } : o)
        );
        return;
      }
    }

    this.carrito.set([]);
    if (selId) {
      this.ordenesActivas.update(prev =>
        prev.map(o => o.id === selId ? { ...o, carrito: [] } : o)
      );
    }
  }

  // --- Order Details ---

  actualizarDatosPedido(pedidoId: string, cliente: string, obs: string) {
    this.ordenesActivas.update(prev =>
      prev.map(o => o.id === pedidoId ? { ...o, clienteNombre: cliente, observaciones: obs } : o)
    );
  }

  actualizarEmpaquePedido(pedidoId: string, empaque: 'BOLSA' | 'VASO') {
    const recargo = empaque === 'VASO' ? 1.0 : 0.0;
    this.ordenesActivas.update(prev =>
      prev.map(o => o.id === pedidoId ? { ...o, empaque, recargoEmpaque: recargo } : o)
    );
  }

  enviarPedidoCocina(pedidoId: string, vendedorActivo: string | null): AuditLog | null {
    const ord = this.ordenesActivas().find(o => o.id === pedidoId);
    if (!ord || ord.enviadoCocina) return null;

    const snapshotCarrito = this.carrito().map(item => ({ ...item, servido: false, enviadoCocina: true }));

    this.ordenesActivas.update(prev =>
      prev.map(o => o.id === pedidoId ? { ...o, carrito: snapshotCarrito, enviadoCocina: true } : o)
    );
    this.carrito.set(snapshotCarrito);

    return {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'STOCK',
      descripcion: `Pedido de Cocina N° ${pedidoId} enviado por ${vendedorActivo} (Cliente: ${ord.clienteNombre || 'S/N'}, Obs: ${ord.observaciones || 'S/N'})`,
      detalles: { pedidoId, items: snapshotCarrito, cliente: ord.clienteNombre, observaciones: ord.observaciones },
    };
  }

  marcarProductoServido(pedidoId: string, itemIndex: number, servido: boolean) {
    this.ordenesActivas.update(prev =>
      prev.map(o => {
        if (o.id === pedidoId) {
          const nuevoCar = [...o.carrito];
          if (nuevoCar[itemIndex]) {
            nuevoCar[itemIndex] = { ...nuevoCar[itemIndex], servido };
          }
          return { ...o, carrito: nuevoCar };
        }
        return o;
      })
    );

    if (this.pedidoSeleccionadoId() === pedidoId) {
      const ord = this.ordenesActivas().find(o => o.id === pedidoId);
      if (ord) this.carrito.set(ord.carrito);
    }
  }

  subsanarOrdenPedido(pedidoId: string, vendedorActivo: string | null): { sufijo: string; auditLog: AuditLog } | null {
    const ord = this.ordenesActivas().find(o => o.id === pedidoId);
    if (!ord) return null;

    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const sufijo = letras[ord.subsanadoCount] || `-${ord.subsanadoCount + 1}`;
    const nuevoSubsanadoCount = ord.subsanadoCount + 1;

    const snapshotCarrito = this.carrito().map(item => ({ ...item, enviadoCocina: true }));

    this.ordenesActivas.update(prev =>
      prev.map(o => o.id === pedidoId ? { ...o, carrito: snapshotCarrito, subsanadoCount: nuevoSubsanadoCount } : o)
    );
    this.carrito.set(snapshotCarrito);

    return {
      sufijo,
      auditLog: {
        id: `audit-${Date.now()}`,
        fecha: new Date().toLocaleString(),
        tipo: 'STOCK',
        descripcion: `Pedido N° ${pedidoId} subsanado (Revisión ${pedidoId}${sufijo}) por ${vendedorActivo}`,
        detalles: { pedidoId, revisionId: `${pedidoId}${sufijo}`, items: snapshotCarrito },
      }
    };
  }

  eliminarOrden(pedidoId: string) {
    this.ordenesActivas.update(prev => prev.filter(o => o.id !== pedidoId));
  }

  incrementarCorrelativo() {
    this.ticketGlobalCorrelativo.update(prev => prev + 1);
  }

  // --- Private Helpers ---

  private _syncCarritoToOrden(nuevoCarrito: CartItem[]) {
    const selId = this.pedidoSeleccionadoId();
    if (selId) {
      this.ordenesActivas.update(prev =>
        prev.map(o => o.id === selId ? { ...o, carrito: nuevoCarrito } : o)
      );
    }
  }
}
