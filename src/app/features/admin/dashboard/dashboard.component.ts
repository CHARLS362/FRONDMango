import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';
import { Insumo, AuditLog } from '../../../core/models/pos.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex-1 flex flex-col gap-8 h-full max-h-screen overflow-y-auto pr-2">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-black text-verde-oscuro">Dashboard de Ventas</h1>
          <p class="text-xs text-verde-oscuro/50 mt-1 font-medium">
            Resumen diario financiero, auditorías en tiempo real y alertas críticas de reabastecimiento.
          </p>
        </div>
        <button
          (click)="handleCerrarCaja()"
          class="bg-naranja hover:bg-naranja/95 active:scale-[0.98] text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-naranja/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <lucide-icon name="activity" size="14"></lucide-icon>
          Realizar Arqueo y Cerrar Caja
        </button>
      </div>

      <!-- METRICAS CARDS -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Total Recaudado -->
        <div class="bg-white rounded-3xl p-6 border border-verde-oscuro/5 shadow-sm flex flex-col justify-between h-36">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-extrabold text-[#49882C] uppercase tracking-wider">Recaudación Total</span>
            <span class="w-8 h-8 rounded-full bg-[#49882C]/10 flex items-center justify-center text-[#49882C]">
              <lucide-icon name="dollar-sign" size="16"></lucide-icon>
            </span>
          </div>
          <div>
            <h2 class="text-2xl font-black text-verde-oscuro">S/. {{ totalVendido().toFixed(2) }}</h2>
            <p class="text-[10px] text-verde-oscuro/40 font-medium mt-1">Ventas brutas del día de hoy</p>
          </div>
        </div>

        <!-- Transacciones -->
        <div class="bg-white rounded-3xl p-6 border border-verde-oscuro/5 shadow-sm flex flex-col justify-between h-36">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-extrabold text-naranja uppercase tracking-wider">Ventas Cerradas</span>
            <span class="w-8 h-8 rounded-full bg-naranja/10 flex items-center justify-center text-naranja">
              <lucide-icon name="shopping-bag" size="16"></lucide-icon>
            </span>
          </div>
          <div>
            <h2 class="text-2xl font-black text-verde-oscuro">{{ numTransacciones() }} órdenes</h2>
            <p class="text-[10px] text-verde-oscuro/40 font-medium mt-1">Despachadas exitosamente en tienda</p>
          </div>
        </div>

        <!-- Alertas Stock -->
        <div class="bg-white rounded-3xl p-6 border border-verde-oscuro/5 shadow-sm flex flex-col justify-between h-36">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-extrabold text-[#FFD256] dark:text-[#FF8E25] uppercase tracking-wider">Insumos Críticos</span>
            <span class="w-8 h-8 rounded-full bg-[#FFD256]/20 flex items-center justify-center text-naranja">
              <lucide-icon name="alert-triangle" size="16"></lucide-icon>
            </span>
          </div>
          <div>
            <h2 class="text-2xl font-black text-verde-oscuro">{{ numBajoStock() }} alertas</h2>
            <p class="text-[10px] text-verde-oscuro/40 font-medium mt-1">Productos por debajo del stock mínimo</p>
          </div>
        </div>
      </div>

      <!-- METODOS PAGO Y RANKING -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Distribución de Ventas -->
        <div class="bg-white rounded-3xl p-6 border border-verde-oscuro/5 flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-black text-verde-oscuro mb-1 flex items-center gap-2">
              <lucide-icon name="trending-up" size="16" class="text-naranja"></lucide-icon>
              Métodos de Pago Recibidos
            </h3>
            <p class="text-[10px] text-verde-oscuro/50 font-medium mb-6">Canales digitales vs efectivo en tienda</p>
          </div>

          <div class="flex flex-col gap-4">
            <!-- Efectivo -->
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between text-xs font-bold text-verde-oscuro">
                <span class="flex items-center gap-1.5"><lucide-icon name="coins" size="12" class="text-verde-oscuro/40"></lucide-icon> Efectivo en Tienda</span>
                <span>S/. {{ totalEfectivo().toFixed(2) }}</span>
              </div>
              <div class="w-full h-2.5 bg-crema rounded-full overflow-hidden">
                <div 
                  class="h-full bg-naranja rounded-full transition-all duration-500" 
                  [style.width.%]="percentEfectivo()"
                ></div>
              </div>
            </div>

            <!-- Yape/Plin -->
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between text-xs font-bold text-verde-oscuro">
                <span class="flex items-center gap-1.5"><lucide-icon name="activity" size="12" class="text-verde-oscuro/40"></lucide-icon> Transferencia Yape / Plin</span>
                <span>S/. {{ totalYape().toFixed(2) }}</span>
              </div>
              <div class="w-full h-2.5 bg-crema rounded-full overflow-hidden">
                <div 
                  class="h-full bg-[#49882C] rounded-full transition-all duration-500" 
                  [style.width.%]="percentYape()"
                ></div>
              </div>
            </div>

            <!-- Tarjeta -->
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between text-xs font-bold text-verde-oscuro">
                <span class="flex items-center gap-1.5"><lucide-icon name="credit-card" size="12" class="text-verde-oscuro/40"></lucide-icon> Tarjeta de Crédito/Débito</span>
                <span>S/. {{ totalTarjeta().toFixed(2) }}</span>
              </div>
              <div class="w-full h-2.5 bg-crema rounded-full overflow-hidden">
                <div 
                  class="h-full bg-verde-oscuro rounded-full transition-all duration-500" 
                  [style.width.%]="percentTarjeta()"
                ></div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-verde-oscuro/5 flex justify-between text-[10px] text-verde-oscuro/40 font-semibold">
            <span>Fondo de Caja Apertura: S/. {{ cajaFondoInicial().toFixed(2) }}</span>
            <span>Monto Teórico en Caja: S/. {{ (cajaFondoInicial() + totalEfectivo()).toFixed(2) }}</span>
          </div>
        </div>

        <!-- Ranking de Ventas -->
        <div class="bg-white rounded-3xl p-6 border border-verde-oscuro/5">
          <h3 class="text-sm font-black text-verde-oscuro mb-1 flex items-center gap-2">
            <lucide-icon name="star" size="16" class="text-naranja"></lucide-icon>
            Productos Más Vendidos
          </h3>
          <p class="text-[10px] text-verde-oscuro/50 font-medium mb-6">Tendencia de consumo de hoy de alta rotación</p>

          <div class="flex flex-col gap-4">
            @for (p of rankingVentas; track p.name) {
              <div class="flex flex-col gap-1.5">
                <div class="flex justify-between text-xs font-bold text-verde-oscuro">
                  <span>{{ p.name }}</span>
                  <span>{{ p.quantity }} uds.</span>
                </div>
                <div class="w-full h-2 bg-crema rounded-full overflow-hidden">
                  <div 
                    [ngClass]="p.color"
                    class="h-full rounded-full"
                    [style.width.%]="p.percent"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>

      </div>

      <!-- ALERTAS CRÍTICAS DE STOCK BAJO -->
      @if (numBajoStock() > 0) {
        <div class="bg-[#FF8E25]/10 rounded-3xl p-6 border border-naranja/20">
          <h3 class="text-sm font-black text-naranja mb-2 flex items-center gap-2">
            <lucide-icon name="alert-triangle" size="18"></lucide-icon>
            Alerta de Inventario: Stock Crítico
          </h3>
          <p class="text-[11px] text-[#1C3B1E]/80 font-medium mb-4">
            Los siguientes insumos se encuentran por debajo del umbral mínimo de seguridad. Solicite reabastecimiento en el panel correspondiente.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            @for (prod of productosBajoStock(); track prod.id) {
              <div class="bg-white rounded-2xl p-4 border border-[#FF8E25]/15 flex justify-between items-center">
                <div>
                  <h4 class="text-xs font-bold text-verde-oscuro truncate max-w-[140px]">{{ prod.nombre }}</h4>
                  <span class="text-[9px] text-verde-oscuro/45 font-bold uppercase mt-0.5 block">Mínimo: {{ prod.stockMinimo }} {{ prod.unidad }}</span>
                </div>
                <div class="text-right">
                  <span class="text-sm font-black text-naranja">
                    {{ formatStock(prod.stock) }}
                  </span>
                  <span class="block text-[8px] text-verde-oscuro/45 font-bold uppercase">{{ prod.unidad }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- RECENT AUDIT LOGS -->
      <div class="bg-white rounded-3xl p-6 border border-verde-oscuro/5">
        <h3 class="text-sm font-black text-verde-oscuro mb-1 flex items-center gap-2">
          <lucide-icon name="history" size="16" class="text-naranja"></lucide-icon>
          Resumen de Auditoría Reciente
        </h3>
        <p class="text-[10px] text-verde-oscuro/50 font-medium mb-4">Registro inmutable de movimientos financieros y de stock</p>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-verde-oscuro">
            <thead>
              <tr class="border-b border-verde-oscuro/10 pb-2 text-[10px] font-bold text-verde-oscuro/45 uppercase tracking-wider">
                <th class="py-2.5">Fecha / Hora</th>
                <th>Acción / Movimiento</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-verde-oscuro/5">
              @for (log of recentAudits(); track log.id) {
                <tr class="hover:bg-crema/20">
                  <td class="py-3 text-[10px] font-semibold text-verde-oscuro/50">{{ log.fecha }}</td>
                  <td class="font-bold">{{ log.descripcion }}</td>
                  <td>
                    <span 
                      [ngClass]="[
                        log.tipo === 'VENTA' ? 'bg-[#49882C]/10 text-[#49882C]' : '',
                        log.tipo === 'STOCK' ? 'bg-naranja/10 text-naranja' : '',
                        log.tipo === 'CAJA_APERTURA' || log.tipo === 'CAJA_CIERRE' ? 'bg-verde-oscuro/10 text-verde-oscuro' : ''
                      ]"
                      class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded"
                    >
                      {{ log.tipo }}
                    </span>
                  </td>
                </tr>
              }
              @if (recentAudits().length === 0) {
                <tr>
                  <td colSpan="3" class="py-6 text-center text-[10px] text-verde-oscuro/35 font-bold">
                    No se registran auditorías en el turno actual
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
  private stateService = inject(POSStateService);
  private router = inject(Router);

  inventario = this.stateService.inventario;
  auditorias = this.stateService.auditorias;
  cajaFondoInicial = this.stateService.cajaFondoInicial;
  cajaMetodoVentas = this.stateService.cajaMetodoVentas;

  totalEfectivo = computed(() => this.cajaMetodoVentas().efectivo);
  totalYape = computed(() => this.cajaMetodoVentas().yapePlin);
  totalTarjeta = computed(() => this.cajaMetodoVentas().tarjeta);

  totalVendido = computed(() => this.totalEfectivo() + this.totalYape() + this.totalTarjeta());

  numTransacciones = computed(() => this.auditorias().filter(a => a.tipo === 'VENTA').length);

  productosBajoStock = computed(() => this.inventario().filter(p => p.activo && p.stock <= p.stockMinimo));
  numBajoStock = computed(() => this.productosBajoStock().length);

  percentEfectivo = computed(() => this.totalVendido() > 0 ? (this.totalEfectivo() / this.totalVendido()) * 100 : 0);
  percentYape = computed(() => this.totalVendido() > 0 ? (this.totalYape() / this.totalVendido()) * 100 : 0);
  percentTarjeta = computed(() => this.totalVendido() > 0 ? (this.totalTarjeta() / this.totalVendido()) * 100 : 0);

  recentAudits = computed(() => this.auditorias().slice(0, 5));

  rankingVentas = [
    { name: "Jugo de Mango Especial", quantity: 24, percent: 80, color: "bg-amarillo" },
    { name: "Empanada de Carne", quantity: 18, percent: 60, color: "bg-[#FF8E25]" },
    { name: "Torta de Chocolate (Porciones)", quantity: 12, percent: 40, color: "bg-[#1C3B1E]" },
    { name: "Jugo de Papaya Especial", quantity: 8, percent: 25, color: "bg-[#49882C]" },
  ];

  handleCerrarCaja() {
    const defaultAmount = (this.cajaFondoInicial() + this.totalEfectivo()).toString();
    this.stateService.prompt(
      'Arqueo de Caja',
      'Ingrese el monto REAL de efectivo en caja para realizar el Arqueo:',
      defaultAmount,
      'Monto en efectivo',
      (cashReal) => {
        if (cashReal === null || cashReal === undefined) return;
        const cashRealNum = parseFloat(cashReal);
        if (isNaN(cashRealNum)) {
          this.stateService.alert("Monto inválido", "Por favor, ingrese un monto numérico válido.");
          return;
        }

        const { diferencia, balance } = this.stateService.cerrarCaja(cashRealNum);
        
        let mensaje = `Total Ventas: S/. ${balance.totalVentas.toFixed(2)}\n`;
        mensaje += `Efectivo Esperado: S/. ${balance.teoricoEfectivo.toFixed(2)}\n`;
        mensaje += `Efectivo Real: S/. ${balance.realEfectivo.toFixed(2)}\n`;
        mensaje += `Diferencia: S/. ${balance.diferencia.toFixed(2)}\n\n`;
        
        if (diferencia === 0) {
          mensaje += `Caja cuadrada perfectamente [✓]`;
        } else if (diferencia > 0) {
          mensaje += `Sobrante en caja de S/. ${diferencia.toFixed(2)} [!]`;
        } else {
          mensaje += `Faltante en caja de S/. ${Math.abs(diferencia).toFixed(2)} [!]`;
        }

        this.stateService.alert("Turno Cerrado", mensaje, () => {
          this.router.navigate(['/']);
        });
      }
    );
  }

  formatStock(val: number): string {
    return val.toFixed(2).endsWith(".00") ? val.toFixed(0) : val.toFixed(2);
  }
}
