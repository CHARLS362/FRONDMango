export interface AuditLog {
  id: string;
  fecha: string;
  tipo: "VENTA" | "STOCK" | "CAJA_APERTURA" | "CAJA_CIERRE";
  descripcion: string;
  detalles: any;
}
