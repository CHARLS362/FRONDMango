import type { CartItem } from './order.model';

export interface TicketVenta {
  id: string;
  fecha: string;
  total: number;
  metodoPago: "EFECTIVO" | "YAPE_PLIN" | "TARJETA";
  items: CartItem[];
  vendedor: string;
  clienteNombre?: string;
  observaciones?: string;
  modoServicio: "MESA" | "LLEVAR";
  pagado: number;
  vuelto: number;
  empaque?: "BOLSA" | "VASO";
  recargoEmpaque?: number;
  pedidoId?: string;
}
