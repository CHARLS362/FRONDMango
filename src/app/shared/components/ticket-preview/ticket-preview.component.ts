import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CartItem } from '../../../core/models/pos.models';
import { POSStateService } from '../../../core/services/pos-state.service';

@Component({
  selector: 'app-ticket-preview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-verde-oscuro/45 backdrop-blur-md fade-in p-4">
        <div class="flex flex-col gap-4 max-w-sm w-full max-h-[95vh]">
          
          <!-- Contenedor del Papel Térmico (Scrollable) -->
          <div class="w-full flex-1 overflow-y-auto px-1 py-1 -mx-1 custom-scrollbar">
            <!-- Papel Térmico -->
            <div class="w-full bg-white rounded-md border border-gray-300 shadow-2xl p-6 font-mono text-xs text-gray-800 relative select-none fade-in overflow-hidden">
              <!-- Jagged border at top and bottom -->
              <div class="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_75%,transparent_75%,transparent),linear-gradient(135deg,transparent_25%,#fff_25%,#fff_75%,transparent_75%,transparent)] bg-size-[10px_10px] translate-y-[-2px]"></div>
            
            @if (isFormalReceipt()) {
              <!-- ======================================================== -->
              <!-- FORMATO A: BOLETA DE VENTA FORMAL (COMPROBANTE PAGO) -->
              <!-- ======================================================== */ -->
              <div class="fade-in">
                <div class="text-center mb-4 mt-2">
                  <h3 class="text-xs font-black uppercase text-black tracking-tight leading-none">Pastelería & Juguería Aura</h3>
                  <p class="text-[9px] text-gray-500 mt-1 leading-normal">
                    Inversiones Aura S.A.C.<br />
                    Calle Los Mangos 81, Piura<br />
                    RUC: 10459821034 - Tlf: (073) 325-104
                  </p>
                  <div class="border border-black py-1 mt-2.5 max-w-[220px] mx-auto">
                    <p class="text-[10px] font-black uppercase text-black">BOLETA DE VENTA ELECTRÓNICA</p>
                    <p class="text-xs font-black text-black mt-0.5">{{ boletaCorrelativa() }}</p>
                  </div>
                </div>

                <div class="border-t border-dashed border-gray-400 py-2.5 flex flex-col gap-1 text-[9px] text-gray-700">
                  <div class="flex justify-between">
                    <span>FECHA DE EMISIÓN:</span>
                    <span class="font-semibold text-black">{{ dateString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>HORA DE EMISIÓN:</span>
                    <span class="font-semibold text-black">{{ timeString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>CAJERO / VENDEDOR:</span>
                    <span class="uppercase font-semibold text-black">{{ vendedor }}</span>
                  </div>
                  @if (finalCliente()) {
                    <div class="flex justify-between">
                      <span>CLIENTE:</span>
                      <span class="uppercase font-semibold text-black">{{ finalCliente() }}</span>
                    </div>
                  }
                  @if (mesaId) {
                    <div class="flex justify-between">
                      <span>CÓDIGO PEDIDO:</span>
                      <span class="font-black text-black">#{{ mesaId }}</span>
                    </div>
                  }
                  @if (finalModoServicio()) {
                    <div class="flex justify-between">
                      <span>TIPO ENTREGA:</span>
                      <span class="font-black text-black uppercase">
                        {{ finalModoServicio() === 'LLEVAR' ? 'PARA LLEVAR' : 'CONSUMO LOCAL' }}
                      </span>
                    </div>
                  }
                </div>

                <!-- Detalle de Productos Boleta -->
                <div class="border-t border-dashed border-gray-400 py-3">
                  <div class="flex justify-between font-black text-black mb-2 text-[9px] border-b border-dotted border-gray-400 pb-1">
                    <span class="w-8">CANT.</span>
                    <span className="flex-1 px-1.5">DESCRIPCIÓN</span>
                    <span class="w-12 text-right">P.U.</span>
                    <span class="w-14 text-right">IMPORTE</span>
                  </div>
                  
                  <div class="flex flex-col gap-1.5 text-[9px]">
                    @for (item of items; track item.productoId) {
                      <div class="flex justify-between items-start">
                        <span class="w-8 font-bold">{{ formatCantidad(item.cantidad) }}</span>
                        <span class="flex-1 px-1.5 truncate uppercase">
                          {{ item.nombre }}
                          <span class="block text-[8px] text-gray-500 capitalize">
                            {{ item.tipoVenta === 'PORCION' ? 'Porción de Torta' : item.tipoVenta === 'ENTERA' ? 'Torta Entera' : '' }}
                          </span>
                        </span>
                        <span class="w-12 text-right">S/.{{ item.precio.toFixed(2) }}</span>
                        <span class="w-14 text-right font-semibold text-black">S/.{{ (item.precio * item.cantidad).toFixed(2) }}</span>
                      </div>
                    }
                    @if (hasRecargoVaso()) {
                      <div class="flex justify-between items-start font-bold text-black border-t border-dotted border-gray-400 pt-1.5 mt-1.5">
                        <span class="w-8">1</span>
                        <span class="flex-1 px-1.5 uppercase truncate">Recargo Envase Vaso</span>
                        <span class="w-12 text-right">S/.1.00</span>
                        <span class="w-14 text-right font-semibold text-black">S/.1.00</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Desglose Monetario Boleta (SIN IMPUESTOS, SOLO CONSUMO) -->
                <div class="border-t border-dashed border-gray-400 pt-3 flex flex-col gap-1 text-[9px]">
                  <div class="flex justify-between text-black font-black text-xs py-1 border-t border-dotted border-gray-400 mt-1">
                    <span>TOTAL CONSUMO:</span>
                    <span>S/.{{ total.toFixed(2) }}</span>
                  </div>
                  
                  <div class="flex justify-between mt-2 pt-2 border-t border-dashed border-gray-400">
                    <span>MÉTODO DE PAGO:</span>
                    <span class="font-bold text-black uppercase">{{ metodoPago.replace('_', ' ') }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>EFECTIVO RECIBIDO:</span>
                    <span>S/.{{ pagado.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between text-black font-bold">
                    <span>VUELTO ENTREGADO:</span>
                    <span>S/.{{ vuelto.toFixed(2) }}</span>
                  </div>
                </div>

                <div class="border-t border-dashed border-gray-400 mt-5 pt-3.5 text-center text-[8px] text-gray-500 leading-normal">
                  <p class="font-bold text-black">REPRESENTACIÓN IMPRESA DE LA BOLETA ELECTRÓNICA</p>
                  <p class="mt-0.5">Autorizado mediante resolución de SUNAT. Gracias por su compra.</p>
                </div>
              </div>
            } @else if (tipoTicket === 'CONTROL') {
              <!-- ======================================================== -->
              <!-- FORMATO B: DOBLE TICKET DE CONTROL ORDEN (COCINA + CLIENTE) -->
              <!-- ======================================================== -->
              <div class="fade-in flex flex-col gap-6">
                
                <!-- TICKET 1: PREPARACIÓN DE COCINA (SIN PRECIOS) -->
                <div class="border-b border-dashed border-gray-400 pb-6">
                  <div class="text-center mb-4 mt-2 border-b-2 border-black pb-2">
                    <h2 class="text-sm font-black text-black">*** TICKET DE BARRA Y COCINA ***</h2>
                    <div class="text-center my-1">
                      <span class="text-2xl font-black text-black block">PEDIDO N° {{ ticketNumber }}</span>
                    </div>
                    <span class="text-[9px] font-bold bg-black text-crema px-2 py-0.5 rounded mt-0.5 inline-block">
                      ORDEN DE PREPARACIÓN
                    </span>
                  </div>

                  <div class="py-2 flex flex-col gap-1 text-[9px] text-black font-bold">
                    <div class="flex justify-between">
                      <span>HORA: {{ timeString() }}</span>
                      <span>PEDIDO ID: {{ ticketNumber }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>VENDEDOR: {{ vendedor }}</span>
                      @if (finalModoServicio()) {
                        <span class="bg-black text-white px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black">
                          {{ finalModoServicio() === 'LLEVAR' ? 'LLEVAR' : 'MESA' }}
                        </span>
                      }
                    </div>
                    @if (finalCliente()) {
                      <div class="flex justify-between border-t border-dotted border-gray-400 pt-1">
                        <span>CLIENTE:</span>
                        <span class="uppercase text-gray-800 font-extrabold">{{ finalCliente() }}</span>
                      </div>
                    }
                    @if (finalObservaciones()) {
                      <div class="flex flex-col border-t border-dotted border-gray-400 pt-1">
                        <span class="text-gray-500 text-[8px]">OBSERVACIONES:</span>
                        <span class="uppercase text-red-600 font-black mt-0.5 leading-normal bg-red-50 p-1.5 rounded border border-red-200 text-[8px]">
                          {{ finalObservaciones() }}
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Detalle de Productos de Barra -->
                  <div class="border-t-2 border-black py-2.5">
                    <div class="flex justify-between font-black text-black mb-2 text-[9px] border-b border-dotted border-gray-300 pb-1">
                      <span class="w-8">CANT.</span>
                      <span class="flex-1 px-1">PRODUCTO</span>
                      <span class="w-12 text-right">P.U.</span>
                      <span class="w-14 text-right">IMPORTE</span>
                    </div>
                    
                    <div class="flex flex-col gap-1.5 text-[9px] text-black">
                      @for (item of items; track item.productoId) {
                        <div class="flex justify-between items-start font-medium">
                          <span class="w-8 font-bold">{{ formatCantidad(item.cantidad) }}</span>
                          <span class="flex-1 px-1 uppercase truncate">
                            {{ item.nombre }}
                            <span class="block text-[8px] text-gray-500 lowercase">
                              {{ item.tipoVenta === 'PORCION' ? 'porción' : item.tipoVenta === 'ENTERA' ? 'entera' : '' }}
                            </span>
                          </span>
                          <span class="w-12 text-right">S/.{{ item.precio.toFixed(2) }}</span>
                          <span class="w-14 text-right font-bold text-black">S/.{{ (item.precio * item.cantidad).toFixed(2) }}</span>
                        </div>
                      }
                      @if (hasRecargoVaso()) {
                        <div class="flex justify-between items-start font-bold border-t border-dotted border-gray-400 pt-1.5 mt-1.5">
                          <span class="w-8">1</span>
                          <span class="flex-1 px-1 uppercase truncate">Recargo Envase Vaso</span>
                          <span class="w-12 text-right">S/.1.00</span>
                          <span class="w-14 text-right font-bold text-black">S/.1.00</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Total Consumo -->
                  <div class="border-t border-dashed border-gray-400 pt-2 flex flex-col gap-1 text-[9px] font-bold text-black">
                    <div class="flex justify-between text-xs font-black py-1 border-b border-dotted border-gray-400">
                      <span>TOTAL ORDEN:</span>
                      <span>S/.{{ total.toFixed(2) }}</span>
                    </div>
                  </div>

                  <div class="border-t-2 border-black mt-3 pt-2 text-center text-[9px] text-black font-black uppercase tracking-wider">
                    <p>*** DESPACHAR DE INMEDIATO ***</p>
                  </div>
                </div>

                <!-- LÍNEA DE CORTE FÍSICO DE LA TICKETERA -->
                <div class="flex items-center justify-center gap-1.5 my-1 text-gray-400 text-[9px] select-none font-bold">
                  <span>✂️</span>
                  <span>- - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                </div>

                <!-- TICKET 2: RESPALDO DE CLIENTE -->
                <div class="pt-2">
                  <div class="text-center mb-4 mt-2 border-b-2 border-black pb-2">
                    <h2 class="text-sm font-black text-black">*** TICKET DE CLIENTE ***</h2>
                    <div class="text-center my-1">
                      <span class="text-2xl font-black text-black block">PEDIDO N° {{ ticketNumber }}</span>
                    </div>
                    <span class="text-[9px] font-bold bg-black text-crema px-2 py-0.5 rounded mt-0.5 inline-block">
                      COPIA DEL CLIENTE
                    </span>
                  </div>

                  <div class="py-2 flex flex-col gap-1 text-[9px] text-black font-bold">
                    <div class="flex justify-between">
                      <span>HORA: {{ timeString() }}</span>
                      <span>PEDIDO ID: {{ ticketNumber }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>VENDEDOR: {{ vendedor }}</span>
                      @if (finalModoServicio()) {
                        <span class="bg-black text-white px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black">
                          {{ finalModoServicio() === 'LLEVAR' ? 'LLEVAR' : 'MESA' }}
                        </span>
                      }
                    </div>
                    @if (finalCliente()) {
                      <div class="flex justify-between border-t border-dotted border-gray-400 pt-1">
                        <span>CLIENTE:</span>
                        <span class="uppercase text-gray-800 font-extrabold">{{ finalCliente() }}</span>
                      </div>
                    }
                    @if (finalObservaciones()) {
                      <div class="flex flex-col border-t border-dotted border-gray-400 pt-1">
                        <span class="text-gray-500 text-[8px]">OBSERVACIONES:</span>
                        <span class="uppercase text-red-600 font-black mt-0.5 leading-normal bg-red-50 p-1.5 rounded border border-red-200 text-[8px]">
                          {{ finalObservaciones() }}
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Detalle de Productos de Barra -->
                  <div class="border-t-2 border-black py-2.5">
                    <div class="flex justify-between font-black text-black mb-2 text-[9px] border-b border-dotted border-gray-300 pb-1">
                      <span class="w-8">CANT.</span>
                      <span class="flex-1 px-1">PRODUCTO</span>
                      <span class="w-12 text-right">P.U.</span>
                      <span class="w-14 text-right">IMPORTE</span>
                    </div>
                    
                    <div class="flex flex-col gap-1.5 text-[9px] text-black">
                      @for (item of items; track item.productoId) {
                        <div class="flex justify-between items-start font-medium">
                          <span class="w-8 font-bold">{{ formatCantidad(item.cantidad) }}</span>
                          <span class="flex-1 px-1 uppercase truncate">
                            {{ item.nombre }}
                            <span class="block text-[8px] text-gray-500 lowercase">
                              {{ item.tipoVenta === 'PORCION' ? 'porción' : item.tipoVenta === 'ENTERA' ? 'entera' : '' }}
                            </span>
                          </span>
                          <span class="w-12 text-right">S/.{{ item.precio.toFixed(2) }}</span>
                          <span class="w-14 text-right font-bold text-black">S/.{{ (item.precio * item.cantidad).toFixed(2) }}</span>
                        </div>
                      }
                      @if (hasRecargoVaso()) {
                        <div class="flex justify-between items-start font-bold border-t border-dotted border-gray-400 pt-1.5 mt-1.5">
                          <span class="w-8">1</span>
                          <span class="flex-1 px-1 uppercase truncate">Recargo Envase Vaso</span>
                          <span class="w-12 text-right">S/.1.00</span>
                          <span class="w-14 text-right font-bold text-black">S/.1.00</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Total Consumo -->
                  <div class="border-t border-dashed border-gray-400 pt-2 flex flex-col gap-1 text-[9px] font-bold text-black">
                    <div class="flex justify-between text-xs font-black py-1 border-b border-dotted border-gray-400">
                      <span>TOTAL ORDEN:</span>
                      <span>S/.{{ total.toFixed(2) }}</span>
                    </div>
                  </div>

                  <div class="border-t-2 border-black mt-3 pt-2 text-center text-[9px] text-black font-black uppercase tracking-wider">
                    <p>*** ESPERE SU LLAMADO ***</p>
                  </div>
                </div>
                
              </div>
            } @else {
              <!-- ======================================================== -->
              <!-- FORMATO C: TICKET DE COCINA - SUBSANADO (INFORMAL) -->
              <!-- ======================================================== -->
              <div class="fade-in">
                <div class="text-center mb-4 mt-2 border-b-2 border-black pb-2">
                  <h2 class="text-sm font-black text-black">*** TICKET DE BARRA Y COCINA ***</h2>
                  <div class="text-center my-1">
                    <span class="text-2xl font-black text-black block">PEDIDO N° {{ ticketNumber }}</span>
                  </div>
                  <span class="text-[10px] font-bold bg-naranja text-crema px-2.5 py-0.5 rounded mt-0.5 inline-block animate-pulse">
                    ACTUALIZACIÓN - SUBSANADO
                  </span>
                </div>

                <div class="py-2.5 flex flex-col gap-1 text-[9px] text-black font-bold">
                  <div class="flex justify-between">
                    <span>HORA: {{ timeString() }}</span>
                    <span>PEDIDO ID: {{ ticketNumber }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>VENDEDOR: {{ vendedor }}</span>
                    @if (finalModoServicio()) {
                      <span class="bg-naranja text-white px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black">
                        {{ finalModoServicio() === 'LLEVAR' ? 'LLEVAR' : 'MESA' }}
                      </span>
                    }
                  </div>
                  @if (finalCliente()) {
                    <div class="flex justify-between border-t border-dotted border-gray-400 pt-1">
                      <span>CLIENTE:</span>
                      <span class="uppercase text-gray-800 font-extrabold">{{ finalCliente() }}</span>
                    </div>
                  }
                  @if (finalObservaciones()) {
                    <div class="flex flex-col border-t border-dotted border-gray-400 pt-1 text-[9px]">
                      <span class="text-gray-500 text-[8px]">OBSERVACIONES:</span>
                      <span class="uppercase text-red-600 font-black mt-0.5 leading-normal bg-red-50 p-1.5 rounded border border-red-200 text-[8px]">
                        {{ finalObservaciones() }}
                      </span>
                    </div>
                  }
                </div>

                <!-- Detalle de Productos de Barra -->
                <div class="border-t-2 border-black py-3">
                  <div class="flex justify-between font-black text-black mb-2 text-[9px] border-b border-dotted border-gray-300 pb-1">
                    <span class="w-8">CANT.</span>
                    <span class="flex-1 px-1">PRODUCTO</span>
                    <span class="w-12 text-right">P.U.</span>
                    <span class="w-14 text-right">IMPORTE</span>
                  </div>
                  
                  <!-- Dividido SUBSANADO Cocina -->
                  <div class="flex flex-col gap-3">
                    @if (itemsServidos().length > 0) {
                      <div class="opacity-50">
                        <p class="font-black text-black border-b border-dotted border-gray-400 pb-0.5 mb-1.5 text-[8px]">
                          [✓] YA DESPACHADO (NO PREPARAR)
                        </p>
                        @for (item of itemsServidos(); track item.productoId) {
                          <div class="flex justify-between items-start text-gray-600 mb-1 text-[9px] line-through">
                            <span class="w-8 font-bold">{{ formatCantidad(item.amount) }}</span>
                            <span class="flex-1 px-1 uppercase font-bold">
                              {{ item.name }} ({{ item.type === 'PORCION' ? 'Porc.' : item.type === 'ENTERA' ? 'Ent.' : 'Vas.' }})
                            </span>
                            <span class="w-12 text-right">S/.{{ item.price.toFixed(2) }}</span>
                            <span class="w-14 text-right">S/.{{ (item.price * item.amount).toFixed(2) }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (itemsPorPreparar().length > 0) {
                      <div>
                        <p class="font-black text-red-600 border-b border-dotted border-red-500 pb-0.5 mb-1.5 text-[8px] animate-pulse">
                          [ ] POR PREPARAR AHORA!
                        </p>
                        @for (item of itemsPorPreparar(); track item.productoId) {
                          <div class="flex justify-between items-start text-black mb-1.5 text-[10px] font-medium">
                            <span class="w-8 font-bold">{{ formatCantidad(item.amount) }}</span>
                            <span class="flex-1 px-1 uppercase truncate font-bold">
                              {{ item.name }} ({{ item.type === 'PORCION' ? 'Porción' : item.type === 'ENTERA' ? 'Entera' : 'Vaso' }})
                            </span>
                            <span class="w-12 text-right">S/.{{ item.price.toFixed(2) }}</span>
                            <span class="w-14 text-right font-black">S/.{{ (item.price * item.amount).toFixed(2) }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (hasRecargoVaso()) {
                      <div class="flex justify-between items-start font-bold border-t border-dotted border-gray-400 pt-1.5 mt-2">
                        <span class="w-8">1</span>
                        <span class="flex-1 px-1 uppercase truncate">Recargo Envase Vaso</span>
                        <span class="w-12 text-right">S/.1.00</span>
                        <span class="w-14 text-right font-black">S/.1.00</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Total Consumo -->
                <div class="border-t border-dashed border-gray-400 pt-2 flex flex-col gap-1 text-[9px] font-bold text-black">
                  <div class="flex justify-between text-xs font-black py-1 border-b border-dotted border-gray-400">
                    <span>TOTAL ORDEN:</span>
                    <span>S/.{{ total.toFixed(2) }}</span>
                  </div>
                </div>

                <div class="border-t-2 border-black mt-4 pt-3 text-center text-[10px] text-black font-black uppercase tracking-wider">
                  <p>*** DESPACHAR DE INMEDIATO ***</p>
                </div>

                <!-- LÍNEA DE CORTE FÍSICO DE LA TICKETERA -->
                <div class="flex items-center justify-center gap-1.5 my-1 text-gray-400 text-[9px] select-none font-bold">
                  <span>✂️</span>
                  <span>- - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                </div>

                <!-- TICKET 2: RESPALDO DE CLIENTE -->
                <div class="pt-2">
                  <div class="text-center mb-4 mt-2 border-b-2 border-black pb-2">
                    <h2 class="text-sm font-black text-black">*** TICKET DE CLIENTE ***</h2>
                    <div class="text-center my-1">
                      <span class="text-2xl font-black text-black block">PEDIDO N° {{ ticketNumber }}</span>
                    </div>
                    <span class="text-[10px] font-bold bg-naranja text-crema px-2.5 py-0.5 rounded mt-0.5 inline-block">
                      ACTUALIZACIÓN - COPIA DEL CLIENTE
                    </span>
                  </div>

                  <div class="py-2.5 flex flex-col gap-1 text-[9px] text-black font-bold">
                    <div class="flex justify-between">
                      <span>HORA: {{ timeString() }}</span>
                      <span>PEDIDO ID: {{ ticketNumber }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>VENDEDOR: {{ vendedor }}</span>
                      @if (finalModoServicio()) {
                        <span class="bg-naranja text-white px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black">
                          {{ finalModoServicio() === 'LLEVAR' ? 'LLEVAR' : 'MESA' }}
                        </span>
                      }
                    </div>
                    @if (finalCliente()) {
                      <div class="flex justify-between border-t border-dotted border-gray-400 pt-1">
                        <span>CLIENTE:</span>
                        <span class="uppercase text-gray-800 font-extrabold">{{ finalCliente() }}</span>
                      </div>
                    }
                    @if (finalObservaciones()) {
                      <div class="flex flex-col border-t border-dotted border-gray-400 pt-1 text-[9px]">
                        <span class="text-gray-500 text-[8px]">OBSERVACIONES:</span>
                        <span class="uppercase text-red-600 font-black mt-0.5 leading-normal bg-red-50 p-1.5 rounded border border-red-200 text-[8px]">
                          {{ finalObservaciones() }}
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Detalle de Productos de Barra -->
                  <div class="border-t-2 border-black py-3">
                    <div class="flex justify-between font-black text-black mb-2 text-[9px] border-b border-dotted border-gray-300 pb-1">
                      <span class="w-8">CANT.</span>
                      <span class="flex-1 px-1">PRODUCTO</span>
                      <span class="w-12 text-right">P.U.</span>
                      <span class="w-14 text-right">IMPORTE</span>
                    </div>
                    
                    <!-- Dividido SUBSANADO Cocina -->
                    <div class="flex flex-col gap-3">
                      @if (itemsServidos().length > 0) {
                        <div class="opacity-50">
                          <p class="font-black text-black border-b border-dotted border-gray-400 pb-0.5 mb-1.5 text-[8px]">
                            [✓] YA DESPACHADO
                          </p>
                          @for (item of itemsServidos(); track item.productoId) {
                            <div class="flex justify-between items-start text-gray-600 mb-1 text-[9px] line-through">
                              <span class="w-8 font-bold">{{ formatCantidad(item.amount) }}</span>
                              <span class="flex-1 px-1 uppercase font-bold">
                                {{ item.name }} ({{ item.type === 'PORCION' ? 'Porc.' : item.type === 'ENTERA' ? 'Ent.' : 'Vas.' }})
                              </span>
                              <span class="w-12 text-right">S/.{{ item.price.toFixed(2) }}</span>
                              <span class="w-14 text-right">S/.{{ (item.price * item.amount).toFixed(2) }}</span>
                            </div>
                          }
                        </div>
                      }
                      @if (itemsPorPreparar().length > 0) {
                        <div>
                          <p class="font-black text-red-600 border-b border-dotted border-red-500 pb-0.5 mb-1.5 text-[8px]">
                            [ ] POR PREPARAR AHORA
                          </p>
                          @for (item of itemsPorPreparar(); track item.productoId) {
                            <div class="flex justify-between items-start text-black mb-1.5 text-[10px] font-medium">
                              <span class="w-8 font-bold">{{ formatCantidad(item.amount) }}</span>
                              <span class="flex-1 px-1 uppercase truncate font-bold">
                                {{ item.name }} ({{ item.type === 'PORCION' ? 'Porción' : item.type === 'ENTERA' ? 'Entera' : 'Vaso' }})
                              </span>
                              <span class="w-12 text-right">S/.{{ item.price.toFixed(2) }}</span>
                              <span class="w-14 text-right font-black">S/.{{ (item.price * item.amount).toFixed(2) }}</span>
                            </div>
                          }
                        </div>
                      }
                      @if (hasRecargoVaso()) {
                        <div class="flex justify-between items-start font-bold border-t border-dotted border-gray-400 pt-1.5 mt-2">
                          <span class="w-8">1</span>
                          <span class="flex-1 px-1 uppercase truncate">Recargo Envase Vaso</span>
                          <span class="w-12 text-right">S/.1.00</span>
                          <span class="w-14 text-right font-black">S/.1.00</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Total Consumo -->
                  <div class="border-t border-dashed border-gray-400 pt-2 flex flex-col gap-1 text-[9px] font-bold text-black">
                    <div class="flex justify-between text-xs font-black py-1 border-b border-dotted border-gray-400">
                      <span>TOTAL ORDEN:</span>
                      <span>S/.{{ total.toFixed(2) }}</span>
                    </div>
                  </div>

                  <div class="border-t-2 border-black mt-4 pt-3 text-center text-[10px] text-black font-black uppercase tracking-wider">
                    <p>*** ESPERE SU LLAMADO ***</p>
                  </div>
                </div>
                
              </div>
            }

            <!-- Success Overlay when printing -->
            @if (printed()) {
              <div class="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 fade-in">
                <span class="w-12 h-12 rounded-full bg-[#49882C] flex items-center justify-center text-white">
                  <lucide-icon name="check" size="28"></lucide-icon>
                </span>
                <p class="text-sm font-bold text-verde-oscuro">
                  {{
                    isFormalReceipt() 
                      ? "Imprimiendo 2 Copias..." 
                      : tipoTicket === "CONTROL"
                      ? "Imprimiendo Cocina + Cliente..."
                      : "Imprimiendo Ticket..."
                  }}
                </p>
                <p class="text-[10px] text-verde-oscuro/60 text-center px-6">
                  {{
                    isFormalReceipt() 
                      ? "Copia Cliente + Copia Establecimiento emitidas exitosamente" 
                      : tipoTicket === "CONTROL"
                      ? "1 Ticket Cocina (Sin precios) + 1 Ticket Cliente (Con precios)"
                      : "Conexión Térmica Local Exitosa"
                  }}
                </p>
              </div>
            }
          </div>
          </div>

          <!-- Action Buttons -->
          @if (!printed()) {
            <div class="flex gap-3 w-full shrink-0">
              <button
                (click)="onClose()"
                class="flex-1 bg-white hover:bg-gray-100 border border-gray-300 py-3 rounded-2xl font-bold text-xs text-gray-700 active:scale-95 transition-all text-center cursor-pointer"
              >
                Cerrar Vista
              </button>
              <button
                (click)="handlePrint()"
                class="flex-1 bg-naranja hover:bg-naranja/90 py-3 rounded-2xl font-bold text-xs text-white shadow-lg shadow-naranja/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <lucide-icon name="printer" size="14"></lucide-icon>
                Imprimir Ticket
              </button>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class TicketPreviewComponent {
  private stateService = inject(POSStateService);

  @Input() isOpen: boolean = false;
  @Input() tipoTicket: "CONTROL" | "PARA LLEVAR" | "VENTA FINAL" | "SUBSANADO" = "CONTROL";
  @Input() ticketNumber: string = '';
  @Input() vendedor: string = '';
  @Input() items: CartItem[] = [];
  @Input() total: number = 0;
  @Input() pagado: number = 0;
  @Input() vuelto: number = 0;
  @Input() metodoPago: "EFECTIVO" | "YAPE_PLIN" | "TARJETA" = "EFECTIVO";
  @Input() mesaId: string | null = null;
  @Input() cliente: string = '';
  @Input() observaciones: string = '';
  @Input() modoServicio?: "MESA" | "LLEVAR";
  @Input() empaque?: "BOLSA" | "VASO" = "BOLSA";

  @Output() close = new EventEmitter<void>();

  printed = signal<boolean>(false);

  // Computed Date / Time
  dateString = signal<string>(new Date().toLocaleDateString());
  timeString = signal<string>(new Date().toLocaleTimeString());

  isFormalReceipt() {
    return this.tipoTicket === "VENTA FINAL" || this.tipoTicket === "PARA LLEVAR";
  }

  hasRecargoVaso() {
    return this.finalModoServicio() === 'LLEVAR' && (this.empaque === 'VASO' || this.activeOrder()?.empaque === 'VASO');
  }

  activeOrder() {
    const baseOrderId = this.ticketNumber.replace(/[a-zA-Z]/g, "");
    return this.stateService.ordenesActivas().find(o => o.id === baseOrderId || o.id === this.mesaId);
  }

  finalCliente() {
    return this.cliente || this.activeOrder()?.clienteNombre || "";
  }

  finalObservaciones() {
    return this.observaciones || this.activeOrder()?.observaciones || "";
  }

  finalModoServicio() {
    return this.modoServicio || this.activeOrder()?.modoServicio || "MESA";
  }

  // Dividir ítems para ticket de orden SUBSANADO
  itemsServidos() {
    return this.items
      .filter(item => item.servido)
      .map(item => ({ name: item.nombre, amount: item.cantidad, price: item.precio, type: item.tipoVenta, productoId: item.productoId }));
  }

  itemsPorPreparar() {
    return this.items
      .filter(item => !item.servido)
      .map(item => ({ name: item.nombre, amount: item.cantidad, price: item.precio, type: item.tipoVenta, productoId: item.productoId }));
  }

  boletaCorrelativa() {
    return `F001-${this.ticketNumber.padStart(8, '0')}`;
  }

  formatCantidad(val: number): string {
    return val.toFixed(2).endsWith(".00") ? val.toFixed(0) : val.toFixed(2);
  }

  handlePrint() {
    this.printed.set(true);
    setTimeout(() => {
      this.printed.set(false);
      this.close.emit();
    }, 2000);
  }

  onClose() {
    this.close.emit();
  }
}
