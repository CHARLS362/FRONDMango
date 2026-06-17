import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../core/services/pos-state.service';
import { TicketPreviewComponent } from '../../shared/components/ticket-preview/ticket-preview.component';
import { CartItem, Product, Insumo } from '../../core/models/pos.models';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TicketPreviewComponent],
  templateUrl: './pos-terminal.component.html'
})
export class PosTerminalComponent implements OnInit {
  stateService = inject(POSStateService);

  // States
  activeCategory = signal<string>('Todos');
  showAbrirCajaModal = signal<boolean>(false);
  fondoInicialInput = signal<string>('150');
  showCustomerDetails = signal<boolean>(false);
  showCartOnMobile = signal<boolean>(false);

  // Checkout de Consumo Local (Cobro de Pedido)
  showPedidoCheckoutModal = signal<boolean>(false);
  pedidoCashReceived = signal<string>('');
  pedidoPaymentMethod = signal<"EFECTIVO" | "YAPE_PLIN" | "TARJETA">("EFECTIVO");

  // Ticket Preview modal details
  showTicketModal = signal<boolean>(false);
  lastTicketDetails = signal<{
    tipo: "CONTROL" | "PARA LLEVAR" | "VENTA FINAL" | "SUBSANADO";
    number: string;
    items: CartItem[];
    total: number;
    pagado: number;
    vuelto: number;
    metodo: "EFECTIVO" | "YAPE_PLIN" | "TARJETA";
    cliente?: string;
    observaciones?: string;
    modoServicio?: "MESA" | "LLEVAR";
    mesaId?: string | null;
    empaque?: "BOLSA" | "VASO";
  } | null>(null);

  categories = ["Todos", "Jugos", "Pasteles", "Empanadas"];

  // Computed Values
  carta = this.stateService.carta;
  inventario = this.stateService.inventario;
  carrito = this.stateService.carrito;
  modoServicio = this.stateService.modoServicio;
  pedidoSeleccionadoId = this.stateService.pedidoSeleccionadoId;
  vendedorActivo = this.stateService.vendedorActivo;
  frutasTemporada = this.stateService.frutasTemporada;
  ordenesActivas = this.stateService.ordenesActivas;
  cajaAbierta = this.stateService.cajaAbierta;

  filteredProducts = computed(() => {
    const category = this.activeCategory();
    return this.carta().filter(prod => {
      if (!prod.activo) return false;
      if (category === 'Todos') return true;
      return prod.categoria === category;
    });
  });

  activeFruit = computed(() => {
    return this.frutasTemporada().find(f => f.activa);
  });

  starProducts = computed(() => {
    const fruit = this.activeFruit();
    if (!fruit) return [];
    return this.carta().filter(p => p.activo && p.nombre.toLowerCase().includes(fruit.nombre.toLowerCase()));
  });

  cartTotal = computed(() => {
    return this.carrito().reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  });

  displayTotal = computed(() => {
    const baseTotal = this.cartTotal();
    const order = this.activeOrder();
    if (!order) return baseTotal;
    const isLlevar = order.modoServicio === 'LLEVAR';
    const empaque = order.empaque;
    const surcharge = (isLlevar && empaque === 'VASO') ? 1.0 : 0.0;
    return baseTotal + surcharge;
  });

  activeOrder = computed(() => {
    const selId = this.pedidoSeleccionadoId();
    return selId !== null ? this.ordenesActivas().find(o => o.id === selId) : null;
  });

  isOrderAlreadySent = computed(() => {
    const order = this.activeOrder();
    return order ? order.enviadoCocina === true : false;
  });

  orderTotal = computed(() => {
    const order = this.activeOrder();
    if (!order) return 0;
    const baseTotal = order.carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const surcharge = (order.modoServicio === 'LLEVAR' && order.empaque === 'VASO') ? 1.0 : 0.0;
    return baseTotal + surcharge;
  });

  ngOnInit() {
    // Si la caja está cerrada, podemos recordarle
  }

  handleCategoryChange(cat: string) {
    this.activeCategory.set(cat);
  }

  handleAddToCart(productId: string, tipo: "GENERAL" | "ENTERA" | "PORCION") {
    this.stateService.agregarAlCarrito(productId, tipo);
  }

  handleRemoveFromCart(productId: string, tipo: "GENERAL" | "ENTERA" | "PORCION") {
    this.stateService.quitarDelCarrito(productId, tipo);
  }

  handleQuantityChange(productId: string, tipo: "GENERAL" | "ENTERA" | "PORCION", delta: number) {
    this.stateService.cambiarCantidadCarrito(productId, tipo, delta);
  }

  handleClearCart() {
    this.stateService.limpiarCarrito();
  }

  handleServiceModeChange(mode: "MESA" | "LLEVAR") {
    this.stateService.cambiarModoServicio(mode);
  }

  handleCreateOrder() {
    this.stateService.crearNuevoPedido();
  }

  handleSelectOrder(id: string | null) {
    this.stateService.seleccionarPedido(id);
  }

  handleCancelarPedidoClick() {
    const selId = this.pedidoSeleccionadoId();
    if (selId === null) return;

    this.stateService.confirm(
      "Cancelar Pedido",
      `¿Está seguro de que desea cancelar el pedido N° ${selId}? Esta acción se registrará en las auditorías del sistema.`,
      () => {
        this.stateService.cancelarPedido(selId);
        this.stateService.alert("Pedido Cancelado", `El pedido N° ${selId} ha sido cancelado.`);
      }
    );
  }

  handleUpdateOrderData(cliente: string, obs: string) {
    const selId = this.pedidoSeleccionadoId();
    if (selId) {
      this.stateService.actualizarDatosPedido(selId, cliente, obs);
    }
  }

  handleEmpaqueChange(empaque: "BOLSA" | "VASO") {
    const selId = this.pedidoSeleccionadoId();
    if (selId) {
      this.stateService.actualizarEmpaquePedido(selId, empaque);
    }
  }

  handleMarkProductServed(idx: number, currentVal: boolean) {
    const selId = this.pedidoSeleccionadoId();
    if (selId) {
      this.stateService.marcarProductoServido(selId, idx, currentVal);
    }
  }

  // VALIDAR PEDIDO: Envía a cocina e imprime ticket
  handleValidarPedido() {
    const selId = this.pedidoSeleccionadoId();
    if (this.carrito().length === 0 || selId === null) return;

    if (!this.cajaAbierta()) {
      this.showAbrirCajaModal.set(true);
      return;
    }
    
    const ord = this.activeOrder();
    const clientName = ord?.clienteNombre || "";
    const obsNotes = ord?.observaciones || "";
    const serviceMode = ord?.modoServicio || this.modoServicio();
    
    this.stateService.enviarPedidoCocina(selId);
    
    this.lastTicketDetails.set({
      tipo: "CONTROL",
      number: selId,
      items: [...this.carrito()],
      total: this.displayTotal(),
      pagado: 0,
      vuelto: 0,
      metodo: "EFECTIVO",
      cliente: clientName,
      observaciones: obsNotes,
      modoServicio: serviceMode,
      mesaId: selId,
      empaque: ord?.empaque || "BOLSA"
    });
    this.showTicketModal.set(true);
  }

  // SUBSANAR TICKET
  handleSubsanarTicket() {
    const selId = this.pedidoSeleccionadoId();
    if (this.carrito().length === 0 || selId === null) return;
    
    const ord = this.activeOrder();
    const clientName = ord?.clienteNombre || "";
    const obsNotes = ord?.observaciones || "";
    const sufijo = this.stateService.subsanarOrdenPedido(selId);
    const ticketNo = `${selId}${sufijo}`;
    
    this.lastTicketDetails.set({
      tipo: "SUBSANADO",
      number: ticketNo,
      items: [...this.carrito()],
      total: this.displayTotal(),
      pagado: 0,
      vuelto: 0,
      metodo: "EFECTIVO",
      cliente: clientName,
      observaciones: obsNotes,
      modoServicio: ord?.modoServicio || this.modoServicio(),
      mesaId: selId,
      empaque: ord?.empaque || "BOLSA"
    });
    this.showTicketModal.set(true);
  }

  // RE-IMPRIMIR TICKET
  handleReimprimirTicket() {
    const selId = this.pedidoSeleccionadoId();
    if (this.carrito().length === 0 || selId === null) return;
    
    const ord = this.activeOrder();
    const clientName = ord?.clienteNombre || "";
    const obsNotes = ord?.observaciones || "";
    
    const letras = ["A", "B", "C", "D", "E", "F", "G"];
    let ticketNo = selId;
    if (ord && ord.subsanadoCount > 0) {
       const sufijo = letras[ord.subsanadoCount - 1] || `-${ord.subsanadoCount}`;
       ticketNo = `${selId}${sufijo}`;
    }
    
    this.lastTicketDetails.set({
      tipo: ord && ord.subsanadoCount > 0 ? "SUBSANADO" : "CONTROL",
      number: ticketNo,
      items: [...this.carrito()],
      total: this.displayTotal(),
      pagado: 0,
      vuelto: 0,
      metodo: "EFECTIVO",
      cliente: clientName,
      observaciones: obsNotes,
      modoServicio: ord?.modoServicio || this.modoServicio(),
      mesaId: selId,
      empaque: ord?.empaque || "BOLSA"
    });
    this.showTicketModal.set(true);
  }

  // Abrir checkout
  handlePedidoCheckoutClick() {
    if (this.pedidoSeleccionadoId() === null) return;
    if (!this.cajaAbierta()) {
      this.showAbrirCajaModal.set(true);
      return;
    }
    this.pedidoCashReceived.set((Math.ceil(this.orderTotal() / 10) * 10).toString());
    this.pedidoPaymentMethod.set("EFECTIVO");
    this.showPedidoCheckoutModal.set(true);
  }

  // Confirmar cobro
  handleConfirmPedidoPayment() {
    const selId = this.pedidoSeleccionadoId();
    if (selId === null) return;
    const cash = parseFloat(this.pedidoCashReceived()) || 0;
    
    const activeOrd = this.ordenesActivas().find(o => o.id === selId);
    if (!activeOrd) return;

    const baseTotal = activeOrd.carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const surcharge = (activeOrd.modoServicio === 'LLEVAR' && activeOrd.empaque === 'VASO') ? 1.0 : 0.0;
    const total = baseTotal + surcharge;

    if (this.pedidoPaymentMethod() === 'EFECTIVO' && cash < total) {
      this.stateService.alert("Monto insuficiente", "El efectivo recibido es menor que el total del pedido.");
      return;
    }

    const clientName = activeOrd.clienteNombre || "";
    const obsNotes = activeOrd.observaciones || "";
    const serviceMode = activeOrd.modoServicio || this.modoServicio();
    const itemsSnapshot = [...activeOrd.carrito];

    const { ticketId, vuelto, totalCobrado } = this.stateService.cobrarPedido(selId, cash, this.pedidoPaymentMethod());
    
    this.lastTicketDetails.set({
      tipo: "VENTA FINAL",
      number: ticketId.replace("PE-", ""),
      items: itemsSnapshot,
      total: totalCobrado,
      pagado: this.pedidoPaymentMethod() === 'EFECTIVO' ? cash : totalCobrado,
      vuelto: this.pedidoPaymentMethod() === 'EFECTIVO' ? vuelto : 0,
      metodo: this.pedidoPaymentMethod(),
      cliente: clientName,
      observaciones: obsNotes,
      modoServicio: serviceMode,
      mesaId: null,
      empaque: activeOrd.empaque || "BOLSA"
    });

    this.showPedidoCheckoutModal.set(false);
    this.showTicketModal.set(true);
    this.pedidoCashReceived.set('');
  }

  handleQuickCash(amount: number) {
    this.pedidoCashReceived.set(amount.toString());
  }

  handleAbrirCajaAction() {
    const fondo = parseFloat(this.fondoInicialInput());
    if (isNaN(fondo) || fondo < 0) {
      this.stateService.alert("Fondo Inicial", "Por favor ingrese un fondo inicial válido.");
      return;
    }
    this.stateService.abrirCaja(fondo);
    this.showAbrirCajaModal.set(false);
  }

  // Helper Stock Visual
  getStockVisual(prod: Product) {
    const insumo = prod.insumoId ? this.inventario().find(i => i.id === prod.insumoId) : null;
    const isCake = prod.unidad === "Torta";
    
    if (isCake && insumo) {
      const stockVal = insumo.stock;
      const yieldVal = prod.porcionesPorUnidad || 16;
      const enteras = Math.floor(stockVal);
      const fraccion = stockVal - enteras;
      const porciones = Math.round(fraccion * yieldVal);
      
      if (enteras > 0 && porciones > 0) {
        return `${enteras} entera(s) y ${porciones} tajada(s)`;
      } else if (enteras > 0) {
        return `${enteras} entera(s)`;
      } else if (porciones > 0) {
        return `${porciones} tajada(s)`;
      } else {
        return "Agotado";
      }
    } else if (insumo) {
      return insumo.stock <= 0 ? "Agotado" : `${insumo.stock} unidad(es)`;
    } else {
      return "Disponible (Elaborado al instante)";
    }
  }

  isLowStock(prod: Product): boolean {
    const insumo = prod.insumoId ? this.inventario().find(i => i.id === prod.insumoId) : null;
    return insumo ? insumo.stock <= insumo.stockMinimo : false;
  }

  isOutOfStock(prod: Product, tipo: "GENERAL" | "ENTERA" | "PORCION"): boolean {
    const insumo = prod.insumoId ? this.inventario().find(i => i.id === prod.insumoId) : null;
    if (!insumo) return false;
    
    if (tipo === 'ENTERA') {
      return insumo.stock < 1;
    }
    if (tipo === 'PORCION') {
      const yieldVal = prod.porcionesPorUnidad || 16;
      return insumo.stock < (1 / yieldVal);
    }
    return insumo.stock < 1;
  }

  parseFloat(val: string): number {
    return parseFloat(val) || 0;
  }
}
