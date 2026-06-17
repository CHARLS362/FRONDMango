export interface Insumo {
  id: string;
  nombre: string;
  unidad: string;          // "Kg", "Unidad", "Torta", etc.
  stock: number;
  stockMinimo: number;
  costo: number;
  precioVentaPorcion?: number; // Precio al que se vende directo del almacén
  activo: boolean;
  categoria?: string;      // Categoría del insumo
  temporadaId?: number;    // ID de la temporada asociada
}

export interface FruitSeason {
  id: string;
  nombre: string;
  mesInicio: number; // 1-12
  mesFin: number;    // 1-12
  duracionDias: number;
  activa: boolean;
  imagen?: string;
}
