export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidad: string;          // "Torta" para tortas, "Vaso" para jugos, "Unidad" para empanadas
  costo: number;
  precio: number;          // Venta general (jugos, empanadas)
  precioEntera?: number;   // Para tortas enteras
  precioPorcion?: number;  // Para porciones de torta
  activo: boolean;
  insumoId?: string;       // Enlace al inventario físico
  factorDescuento?: number; // Cuánto descuenta del insumo en unidades
  porcionesPorUnidad?: number; // Rendimiento de tortas (ej. 17 para chocolate, 16 para zanahoria)
  imagen?: string;         // Imagen en base64 para la UI
}
