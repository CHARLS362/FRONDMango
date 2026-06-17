/**
 * POSStateService — Compatibility Facade
 *
 * This service re-exports all signals and coordinates cross-store operations.
 * Components can continue using this single injection point, while internally
 * the logic is now cleanly separated into domain-specific stores.
 *
 * Architecture:
 *   AuthStore      → Session, cash register state
 *   CatalogStore   → Products (carta) state
 *   InventoryStore → Insumos & fruit seasons state
 *   OrdersStore    → Active orders & cart state
 *   TicketsStore   → Ticket history & audit logs state
 */
import { Injectable, inject } from '@angular/core';
import { AuthStore } from '../../state/auth.store';
import { AlertService } from './alert.service';
import { CatalogStore } from '../../state/catalog.store';
import { InventoryStore } from '../../state/inventory.store';
import { OrdersStore } from '../../state/orders.store';
import { TicketsStore } from '../../state/tickets.store';
import type { Product } from '../domain/product.model';
import type { Insumo, FruitSeason } from '../domain/inventory.model';
import type { CartItem, OrdenActiva } from '../domain/order.model';
import type { TicketVenta } from '../domain/ticket.model';
import type { Usuario } from '../domain/user.model';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class POSStateService {
  private authStore = inject(AuthStore);
  private catalogStore = inject(CatalogStore);
  private inventoryStore = inject(InventoryStore);
  private ordersStore = inject(OrdersStore);
  private ticketsStore = inject(TicketsStore);
  private alertService = inject(AlertService);
  private apiService = inject(ApiService);

  readonly alertState = this.alertService.alertState;

  // ============================================================
  // SIGNAL PROXIES — re-expose all store signals for components
  // ============================================================

  // Auth
  readonly vendedorActivo = this.authStore.vendedorActivo;
  readonly rolActivo = this.authStore.rolActivo;
  readonly usuarios = this.authStore.usuarios;
  readonly cajaAbierta = this.authStore.cajaAbierta;
  readonly cajaFondoInicial = this.authStore.cajaFondoInicial;
  readonly cajaMetodoVentas = this.authStore.cajaMetodoVentas;
  readonly cajaLogs = this.authStore.cajaLogs;
  readonly claveAdministrador = this.authStore.claveAdministrador;

  // Catalog
  readonly carta = this.catalogStore.carta;

  // Inventory
  readonly inventario = this.inventoryStore.inventario;
  readonly frutasTemporada = this.inventoryStore.frutasTemporada;
  readonly mesActual = this.inventoryStore.mesActual;

  // Orders
  readonly ordenesActivas = this.ordersStore.ordenesActivas;
  readonly carrito = this.ordersStore.carrito;
  readonly modoServicio = this.ordersStore.modoServicio;
  readonly pedidoSeleccionadoId = this.ordersStore.pedidoSeleccionadoId;
  readonly ticketGlobalCorrelativo = this.ordersStore.ticketGlobalCorrelativo;

  // Tickets
  readonly historialTickets = this.ticketsStore.historialTickets;
  readonly auditorias = this.ticketsStore.auditorias;

  // ============================================================
  // ACTIONS — Delegate to stores, coordinate cross-store ops
  // ============================================================

  setVendedorActivo(nombre: string | null, rol: 'administrador' | 'vendedor' | null = null) {
    this.authStore.setVendedorActivo(nombre, rol);
  }

  crearUsuario(u: Usuario) {
    this.authStore.crearUsuario(u);
  }

  eliminarUsuario(username: string) {
    this.authStore.eliminarUsuario(username);
  }

  abrirCaja(fondo: number) {
    const log = this.authStore.abrirCaja(fondo);
    this.ticketsStore.agregarAuditoria(log);
  }

  cerrarCaja(efectivoReal: number) {
    const { diferencia, balance, auditLog } = this.authStore.cerrarCaja(efectivoReal);
    this.ticketsStore.agregarAuditoria(auditLog);
    this.ordersStore.limpiarOrdenesActivas();
    return { diferencia, balance };
  }

  cambiarClaveAdministrador(nuevaClave: string) {
    this.authStore.cambiarClaveAdministrador(nuevaClave);
  }

  // --- Cart ---

  cambiarModoServicio(modo: 'MESA' | 'LLEVAR') {
    this.ordersStore.cambiarModoServicio(modo);
  }

  seleccionarPedido(id: string | null) {
    this.ordersStore.seleccionarPedido(id);
  }

  crearNuevoPedido(): string {
    return this.ordersStore.crearNuevoPedido(this.vendedorActivo() || 'Vendedor');
  }

  cancelarPedido(pedidoId: string) {
    const log = this.ordersStore.cancelarPedido(pedidoId, this.vendedorActivo());
    if (log) {
      this.ticketsStore.agregarAuditoria(log);
    }
  }

  agregarAlCarrito(productoId: string, tipoVenta: 'GENERAL' | 'ENTERA' | 'PORCION' = 'GENERAL') {
    const product = this.carta().find(p => p.id === productoId);
    if (!product || !product.activo) return;

    let precio = product.precio;
    if (tipoVenta === 'ENTERA') precio = product.precioEntera || 0;
    if (tipoVenta === 'PORCION') precio = product.precioPorcion || 0;

    this.ordersStore.agregarAlCarrito(productoId, product.nombre, precio, tipoVenta);
  }

  quitarDelCarrito(productoId: string, tipoVenta: 'GENERAL' | 'ENTERA' | 'PORCION') {
    this.ordersStore.quitarDelCarrito(productoId, tipoVenta);
  }

  cambiarCantidadCarrito(productoId: string, tipoVenta: 'GENERAL' | 'ENTERA' | 'PORCION', delta: number) {
    this.ordersStore.cambiarCantidadCarrito(productoId, tipoVenta, delta);
  }

  limpiarCarrito() {
    this.ordersStore.limpiarCarrito();
  }

  actualizarDatosPedido(pedidoId: string, cliente: string, obs: string) {
    this.ordersStore.actualizarDatosPedido(pedidoId, cliente, obs);
  }

  actualizarEmpaquePedido(pedidoId: string, empaque: 'BOLSA' | 'VASO') {
    this.ordersStore.actualizarEmpaquePedido(pedidoId, empaque);
  }

  enviarPedidoCocina(pedidoId: string) {
    const log = this.ordersStore.enviarPedidoCocina(pedidoId, this.vendedorActivo());
    if (log) this.ticketsStore.agregarAuditoria(log);
  }

  marcarProductoServido(pedidoId: string, itemIndex: number, servido: boolean) {
    this.ordersStore.marcarProductoServido(pedidoId, itemIndex, servido);
  }

  subsanarOrdenPedido(pedidoId: string): string {
    const result = this.ordersStore.subsanarOrdenPedido(pedidoId, this.vendedorActivo());
    if (!result) return '';
    this.ticketsStore.agregarAuditoria(result.auditLog);
    return result.sufijo;
  }

  // --- Payment (coordinates Auth + Inventory + Orders + Tickets) ---

  procesarCobroDirecto(montoPagado: number, metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA') {
    const ticketId = `PE-${this.ticketGlobalCorrelativo()}`;
    const total = this.carrito().reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const vuelto = montoPagado - total;

    // Discount stock
    const stockItems = this._buildStockItems(this.carrito());
    this.inventoryStore.descontarStock(stockItems);

    // Register in caja
    this.authStore.registrarVentaEnCaja(total, metodoPago);

    const auditLog = {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'VENTA' as const,
      descripcion: `Venta Rápida (Boleta N° ${ticketId}) por S/. ${total.toFixed(2)} por ${this.vendedorActivo()}`,
      detalles: { ticketId, items: this.carrito(), total, pagado: montoPagado, vuelto, metodoPago },
    };

    const ticketVenta: TicketVenta = {
      id: ticketId,
      fecha: new Date().toLocaleString(),
      total,
      metodoPago,
      items: this.carrito(),
      vendedor: this.vendedorActivo() || 'Sistema',
      modoServicio: 'LLEVAR',
      pagado: montoPagado,
      vuelto,
    };

    this.ticketsStore.agregarAuditoria(auditLog);

    if (environment.useBackend) {
      // Create a temporary completed order to satisfy the backend's constraint that tickets require a pedidoId.
      const tempOrden: OrdenActiva = {
        id: 'temp-' + Date.now(),
        numeroPedido: this.ticketGlobalCorrelativo().toString(),
        carrito: this.carrito(),
        vendedor: this.vendedorActivo() || 'Sistema',
        horaApertura: new Date().toLocaleTimeString(),
        subsanadoCount: 0,
        estado: 'SERVIDO',
        clienteNombre: 'Venta Rápida',
        observaciones: '',
        modoServicio: 'LLEVAR',
        enviadoCocina: true,
        empaque: 'BOLSA',
        recargoEmpaque: 0
      };

      this.apiService.crearOrden(tempOrden).subscribe({
        next: (realPedidoId) => {
          ticketVenta.pedidoId = realPedidoId;
          ticketVenta.id = `PE-${realPedidoId}`;
          this.ticketsStore.agregarTicket(ticketVenta);
        },
        error: (err) => {
          console.error('Error creating temporary order for quick sale:', err);
          // Fallback to local ticket registration
          this.ticketsStore.agregarTicket(ticketVenta);
        }
      });
    } else {
      this.ticketsStore.agregarTicket(ticketVenta);
    }

    this.ordersStore.incrementarCorrelativo();
    this.ordersStore.carrito.set([]);
    this.ordersStore.modoServicio.set('LLEVAR');

    return { ticketId, vuelto };
  }

  cobrarPedido(pedidoId: string, montoPagado: number, metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA') {
    const ord = this.ordenesActivas().find(o => o.id === pedidoId);
    if (!ord) return { ticketId: '', vuelto: 0, itemsCobrados: [], totalCobrado: 0 };

    const itemsACobrar = [...ord.carrito];
    const ticketId = `PE-${pedidoId}`;
    const baseTotal = itemsACobrar.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const surcharge = (ord.modoServicio === 'LLEVAR' && ord.empaque === 'VASO') ? 1.0 : 0.0;
    const total = baseTotal + surcharge;
    const vuelto = montoPagado - total;

    // Discount stock
    const stockItems = this._buildStockItems(itemsACobrar);
    this.inventoryStore.descontarStock(stockItems);

    // Register in caja
    this.authStore.registrarVentaEnCaja(total, metodoPago);

    const auditLog = {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'VENTA' as const,
      descripcion: `Cobro Pedido N° ${pedidoId} (Boleta N° ${ticketId}) por S/. ${total.toFixed(2)} por ${this.vendedorActivo()} (Cliente: ${ord.clienteNombre || 'S/N'})`,
      detalles: { ticketId, items: itemsACobrar, total, pagado: montoPagado, vuelto, metodoPago, pedidoId, cliente: ord.clienteNombre, empaque: ord.empaque, recargoEmpaque: surcharge },
    };

    const ticketVenta: TicketVenta = {
      id: ticketId,
      fecha: new Date().toLocaleString(),
      total,
      metodoPago,
      items: itemsACobrar,
      vendedor: this.vendedorActivo() || 'Sistema',
      clienteNombre: ord.clienteNombre,
      observaciones: ord.observaciones,
      modoServicio: ord.modoServicio || 'MESA',
      pagado: montoPagado,
      vuelto,
      empaque: ord.empaque,
      recargoEmpaque: surcharge,
      pedidoId: pedidoId
    };

    // Pass true for completed flag so it doesn't send cancel order PUT request to backend
    this.ordersStore.eliminarOrden(pedidoId, true);
    this.ticketsStore.agregarAuditoria(auditLog);
    this.ticketsStore.agregarTicket(ticketVenta);
    this.ordersStore.carrito.set([]);
    this.ordersStore.pedidoSeleccionadoId.set(null);

    return { ticketId, vuelto, itemsCobrados: itemsACobrar, totalCobrado: total };
  }

  anularVenta(logId: string) {
    const result = this.ticketsStore.anularVenta(logId);
    if (!result) return;

    // Revert caja
    this.authStore.revertirVentaEnCaja(result.total, result.metodoPago);

    // Revert stock
    const stockItems = this._buildStockItemsFromAudit(result.items);
    this.inventoryStore.revertirStock(stockItems);
  }

  // --- Catalog CRUD ---

  crearProducto(p: Omit<Product, 'activo'>) {
    this.catalogStore.crearProducto(p);
  }

  actualizarProducto(id: string, fields: Partial<Product>) {
    this.catalogStore.actualizarProducto(id, fields);
  }

  eliminarProducto(id: string) {
    this.catalogStore.eliminarProducto(id);
  }

  // --- Inventory CRUD ---

  crearInsumo(i: Omit<Insumo, 'activo'>) {
    this.inventoryStore.crearInsumo(i);
  }

  actualizarInsumo(id: string, fields: Partial<Insumo>) {
    this.inventoryStore.actualizarInsumo(id, fields);
  }

  eliminarInsumo(id: string) {
    this.inventoryStore.eliminarInsumo(id);
  }

  recibirStockRapido(insumoId: string, cantidad: number) {
    const log = this.inventoryStore.recibirStockRapido(insumoId, cantidad, this.vendedorActivo());
    this.ticketsStore.agregarAuditoria(log);
  }

  retirarStockRapido(insumoId: string, cantidad: number) {
    const log = this.inventoryStore.retirarStockRapido(insumoId, cantidad, this.vendedorActivo());
    this.ticketsStore.agregarAuditoria(log);
  }

  // --- Fruit Seasons ---

  crearTemporadaFruta(f: Omit<FruitSeason, 'activa' | 'duracionDias'>) {
    this.inventoryStore.crearTemporadaFruta(f);
  }

  eliminarTemporadaFruta(id: string) {
    this.inventoryStore.eliminarTemporadaFruta(id);
  }

  actualizarTemporadaFruta(id: string, fields: Partial<FruitSeason>) {
    this.inventoryStore.actualizarTemporadaFruta(id, fields);
  }


  alert(title: string, message: string, onConfirm?: () => void) {
    this.alertService.alert(title, message, onConfirm);
  }

  confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
    this.alertService.confirm(title, message, onConfirm, onCancel);
  }

  prompt(title: string, message: string, defaultValue: string, placeholder: string, onConfirm: (val: string) => void, onCancel?: () => void) {
    this.alertService.prompt(title, message, defaultValue, placeholder, onConfirm, onCancel);
  }

  closeAlert() {
    this.alertService.close();
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private _buildStockItems(items: CartItem[]) {
    return items
      .map(item => {
        const product = this.carta().find(c => c.id === item.productoId);
        if (!product || !product.insumoId) return null;
        return {
          insumoId: product.insumoId,
          tipoVenta: item.tipoVenta,
          cantidad: item.cantidad,
          porcionesPorUnidad: product.porcionesPorUnidad,
          factorDescuento: product.factorDescuento,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private _buildStockItemsFromAudit(items: any[]) {
    return items
      .map((item: any) => {
        const product = this.carta().find(c => c.id === item.productoId);
        if (!product || !product.insumoId) return null;
        return {
          insumoId: product.insumoId,
          tipoVenta: item.tipoVenta,
          cantidad: item.cantidad,
          porcionesPorUnidad: product.porcionesPorUnidad,
          factorDescuento: product.factorDescuento,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }
}
