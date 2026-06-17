import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import { ApiService } from '../core/services/api.service';
import { environment } from '../../environments/environment';
import type { TicketVenta } from '../core/domain/ticket.model';
import type { AuditLog } from '../core/domain/audit.model';

@Injectable({
  providedIn: 'root'
})
export class TicketsStore {
  private storage = inject(LocalStorageService);
  private apiService = inject(ApiService);

  // --- Signals ---
  historialTickets = signal<TicketVenta[]>(this.storage.load('historialTickets', []));
  auditorias = signal<AuditLog[]>(this.storage.load('auditorias', []));

  constructor() {
    if (environment.useBackend) {
      this.apiService.getTickets().subscribe({
        next: (data) => this.historialTickets.set(data),
        error: (err) => console.error('Error fetching tickets from backend:', err)
      });
      this.apiService.getAuditorias().subscribe({
        next: (data) => this.auditorias.set(data),
        error: (err) => console.error('Error fetching audits from backend:', err)
      });
    }

    effect(() => this.storage.save('historialTickets', this.historialTickets()));
    effect(() => this.storage.save('auditorias', this.auditorias()));
  }

  // --- Actions ---

  agregarTicket(ticket: TicketVenta) {
    this.historialTickets.update(prev => [ticket, ...prev]);
    if (environment.useBackend) {
      this.apiService.crearTicket(ticket).subscribe({
        error: (err) => console.error('Error saving ticket in backend:', err)
      });
    }
  }

  agregarAuditoria(log: AuditLog) {
    this.auditorias.update(prev => [log, ...prev]);
    if (environment.useBackend) {
      this.apiService.crearAuditoria(log).subscribe({
        error: (err) => console.error('Error saving audit in backend:', err)
      });
    }
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

    if (environment.useBackend) {
      this.apiService.anularTicket(targetLog.detalles.ticketId).subscribe({
        next: () => {
          this.apiService.getAuditorias().subscribe({
            next: (data) => this.auditorias.set(data),
            error: (err) => console.error('Error refreshing audits after void:', err)
          });
          this.apiService.getTickets().subscribe({
            next: (data) => this.historialTickets.set(data),
            error: (err) => console.error('Error refreshing tickets after void:', err)
          });
        },
        error: (err) => console.error('Error voiding sale in backend:', err)
      });
    }

    return { total, metodoPago, items, ticketId: targetLog.detalles.ticketId };
  }
}
