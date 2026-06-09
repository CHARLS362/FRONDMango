import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../core/services/pos-state.service';
import { TicketPreviewComponent } from '../../shared/components/ticket-preview/ticket-preview.component';
import { TicketVenta } from '../../core/models/pos.models';

@Component({
  selector: 'app-historial-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, TicketPreviewComponent],
  template: `
    <div class="flex-1 flex flex-col gap-6 h-full fade-in max-h-screen overflow-hidden">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a routerLink="/pos" class="text-verde-oscuro/50 hover:text-naranja transition-colors p-1 -ml-1 rounded-lg">
              <lucide-icon name="arrow-left" size="18"></lucide-icon>
            </a>
            <h1 class="text-2xl font-black text-verde-oscuro flex items-center gap-2">
              <lucide-icon name="receipt" class="text-naranja" size="24"></lucide-icon> 
              Historial de Pedidos Pagados
            </h1>
          </div>
          <p class="text-xs font-semibold text-verde-oscuro/50 ml-8">
            Revisa los tickets cobrados en el turno actual o re-imprime comprobantes.
          </p>
        </div>

        <!-- Buscador -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <lucide-icon name="search" size="16" class="text-verde-oscuro/40"></lucide-icon>
          </div>
          <input
            type="text"
            placeholder="Buscar por N° Ticket o Cliente..."
            [(ngModel)]="searchTerm"
            class="w-full md:w-80 bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-verde-oscuro outline-none shadow-sm transition-all"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 bg-white rounded-3xl border border-verde-oscuro/5 shadow-sm p-6 overflow-y-auto custom-scrollbar">
        @if (historialTickets().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-verde-oscuro/30 space-y-3">
            <lucide-icon name="receipt" size="48" strokeWidth="1"></lucide-icon>
            <p class="font-bold">Aún no hay pedidos pagados en este turno.</p>
          </div>
        } @else if (filteredTickets().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-verde-oscuro/30 space-y-3">
            <lucide-icon name="search" size="48" strokeWidth="1"></lucide-icon>
            <p class="font-bold">No se encontraron tickets con esa búsqueda.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (ticket of filteredTickets(); track ticket.id) {
              <div class="bg-crema/40 border border-verde-oscuro/10 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="bg-verde-oscuro text-crema text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                      {{ ticket.id }}
                    </span>
                    <p class="text-[10px] text-verde-oscuro/60 font-semibold mt-1">
                      {{ ticket.fecha }}
                    </p>
                  </div>
                  <span class="text-lg font-black text-black">
                    S/ {{ ticket.total.toFixed(2) }}
                  </span>
                </div>

                <div class="bg-white rounded-xl p-3 border border-verde-oscuro/5 flex flex-col gap-1.5 flex-1">
                  <div class="flex justify-between text-[11px]">
                    <span class="text-verde-oscuro/60 font-medium">Cliente:</span>
                    <span class="font-bold text-verde-oscuro truncate max-w-[120px]">
                      {{ ticket.clienteNombre || "Sin nombre" }}
                    </span>
                  </div>
                  <div class="flex justify-between text-[11px]">
                    <span class="text-verde-oscuro/60 font-medium">Servicio:</span>
                    <span class="font-bold text-verde-oscuro">
                      {{ ticket.modoServicio }}
                    </span>
                  </div>
                  <div class="flex justify-between text-[11px]">
                    <span class="text-verde-oscuro/60 font-medium">Pago:</span>
                    <span class="font-bold text-naranja">
                      {{ ticket.metodoPago.replace('_', ' ') }}
                    </span>
                  </div>
                </div>

                <button
                  (click)="handlePrintClick(ticket)"
                  class="w-full bg-[#49882C]/10 hover:bg-[#49882C]/20 text-[#49882C] border border-[#49882C]/20 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer mt-1"
                >
                  <lucide-icon name="printer" size="14"></lucide-icon>
                  Ver / Imprimir Ticket
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Ticket Modal -->
      @if (ticketToPrint()) {
        <app-ticket-preview
          [isOpen]="true"
          tipoTicket="VENTA FINAL"
          [ticketNumber]="ticketToPrint()!.id.replace('PE-', '')"
          [items]="ticketToPrint()!.items"
          [total]="ticketToPrint()!.total"
          [pagado]="ticketToPrint()!.pagado"
          [vuelto]="ticketToPrint()!.vuelto"
          [metodoPago]="ticketToPrint()!.metodoPago"
          [vendedor]="ticketToPrint()!.vendedor"
          [cliente]="ticketToPrint()!.clienteNombre || ''"
          [observaciones]="ticketToPrint()!.observaciones || ''"
          [modoServicio]="ticketToPrint()!.modoServicio"
          (close)="closePrintModal()"
        ></app-ticket-preview>
      }
    </div>
  `
})
export class HistorialTicketsComponent {
  private stateService = inject(POSStateService);

  historialTickets = this.stateService.historialTickets;
  searchTerm = '';
  ticketToPrint = signal<TicketVenta | null>(null);

  filteredTickets = computed(() => {
    const term = this.searchTerm.toLowerCase().trim();
    return this.historialTickets().filter(
      (t) =>
        t.id.toLowerCase().includes(term) ||
        (t.clienteNombre && t.clienteNombre.toLowerCase().includes(term))
    );
  });

  handlePrintClick(ticket: TicketVenta) {
    this.ticketToPrint.set(ticket);
  }

  closePrintModal() {
    this.ticketToPrint.set(null);
  }
}
