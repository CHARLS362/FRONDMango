import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import type { TicketVenta } from '../core/domain/ticket.model';
import type { AuditLog } from '../core/domain/audit.model';

@Injectable({
  providedIn: 'root'
})
export class TicketsStore {
  private storage = inject(LocalStorageService);

  // --- Signals ---
  historialTickets = signal<TicketVenta[]>(this.storage.load('historialTickets', []));
  auditorias = signal<AuditLog[]>(this.storage.load('auditorias', []));

  constructor() {
    effect(() => this.storage.save('historialTickets', this.historialTickets()));
    effect(() => this.storage.save('auditorias', this.auditorias()));
  }

  // --- Actions ---

  agregarTicket(ticket: TicketVenta) {
    this.historialTickets.update(prev => [ticket, ...prev]);
  }

  agregarAuditoria(log: AuditLog) {
    this.auditorias.update(prev => [log, ...prev]);
  }

  anularVenta(logId: string): {
    total: number;
    metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA';
    items: any[];
    ticketId: string;
  } | null {
    const auditoriasList = this.auditorias();
    const logIndex = auditoriasList.findIndex(a => a.id === logId);
    if (logIndex === -1) return null;

    const targetLog = auditoriasList[logIndex];
    if (targetLog.tipo !== 'VENTA') return null;

    const total = targetLog.detalles.total;
    const metodoPago = targetLog.detalles.metodoPago;
    const items = targetLog.detalles.items || [];

    const logAnulacion: AuditLog = {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'STOCK',
      descripcion: `ANULACIÓN de Boleta N° ${targetLog.detalles.ticketId}. Reversados S/. ${total.toFixed(2)} e inventario devuelto.`,
      detalles: { ticketAnulado: targetLog.detalles.ticketId, total, items },
    };

    const nuevasAuditorias = auditoriasList.map((a, i) => {
      if (i === logIndex) {
        return { ...a, tipo: 'STOCK' as const, descripcion: `[ANULADA] ${a.descripcion}` };
      }
      return a;
    });

    this.auditorias.set([logAnulacion, ...nuevasAuditorias]);

    return { total, metodoPago, items, ticketId: targetLog.detalles.ticketId };
  }
}
