import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import type { Insumo, FruitSeason } from '../core/domain/inventory.model';
import type { AuditLog } from '../core/domain/audit.model';

const INITIAL_INSUMOS: Insumo[] = [
  { id: 'insumo-torta-choc', nombre: 'Torta de Chocolate (Torta Completa)', unidad: 'Torta', stock: 3.0, stockMinimo: 1.0, costo: 30.0, activo: true },
  { id: 'insumo-torta-tresleches', nombre: 'Torta Tres Leches (Torta Completa)', unidad: 'Torta', stock: 2.0, stockMinimo: 0.5, costo: 28.0, activo: true },
  { id: 'insumo-torta-selvanegra', nombre: 'Torta Selva Negra (Torta Completa)', unidad: 'Torta', stock: 4.0, stockMinimo: 1.0, costo: 35.0, activo: true },
  { id: 'insumo-papaya', nombre: 'Papaya Fresca', unidad: 'Kg', stock: 50.0, stockMinimo: 10.0, costo: 3.0, activo: true },
  { id: 'insumo-mango', nombre: 'Mango Fresco', unidad: 'Kg', stock: 40.0, stockMinimo: 8.0, costo: 3.5, activo: true },
  { id: 'insumo-fresa', nombre: 'Fresa Fresca', unidad: 'Kg', stock: 30.0, stockMinimo: 8.0, costo: 4.0, activo: true },
  { id: 'insumo-pina-platano', nombre: 'Mix Piña/Plátano', unidad: 'Kg', stock: 45.0, stockMinimo: 10.0, costo: 3.2, activo: true },
  { id: 'insumo-empanada-carne', nombre: 'Empanada de Carne (Almacén)', unidad: 'Unidad', stock: 25.0, stockMinimo: 5.0, costo: 2.5, activo: true },
  { id: 'insumo-empanada-pollo', nombre: 'Empanada de Pollo (Almacén)', unidad: 'Unidad', stock: 30.0, stockMinimo: 5.0, costo: 2.2, activo: true },
  { id: 'insumo-pastel-acelga', nombre: 'Pastel de Acelga (Almacén)', unidad: 'Unidad', stock: 15.0, stockMinimo: 3.0, costo: 2.8, activo: true }
];

const INITIAL_FRUITS: FruitSeason[] = [
  { id: 'mango', nombre: 'Mango', mesInicio: 1, mesFin: 5, duracionDias: 150, activa: true },
  { id: 'fresa', nombre: 'Fresa', mesInicio: 6, mesFin: 10, duracionDias: 150, activa: false },
  { id: 'lucuma', nombre: 'Lúcuma', mesInicio: 11, mesFin: 12, duracionDias: 60, activa: false },
];

@Injectable({
  providedIn: 'root'
})
export class InventoryStore {
  private storage = inject(LocalStorageService);

  inventario = signal<Insumo[]>(this.storage.load('inventario', INITIAL_INSUMOS));
  frutasTemporada = signal<FruitSeason[]>(this.storage.load('frutasTemporada', INITIAL_FRUITS));
  mesSimulado = signal<number>(this.storage.load('mesSimulado', 1));

  constructor() {
    effect(() => this.storage.save('inventario', this.inventario()));
    effect(() => this.storage.save('frutasTemporada', this.frutasTemporada()));
    effect(() => this.storage.save('mesSimulado', this.mesSimulado()));
  }

  // --- CRUD Insumos ---

  crearInsumo(i: Omit<Insumo, 'activo'>) {
    this.inventario.update(prev => [...prev, { ...i, activo: true }]);
  }

  actualizarInsumo(id: string, fields: Partial<Insumo>) {
    this.inventario.update(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
  }

  eliminarInsumo(id: string) {
    this.inventario.update(prev => prev.map(i => i.id === id ? { ...i, activo: false } : i));
  }

  // --- Stock Operations (returns AuditLog for TicketsStore) ---

  descontarStock(items: { insumoId: string; tipoVenta: string; cantidad: number; porcionesPorUnidad?: number; factorDescuento?: number }[]) {
    this.inventario.update(prev =>
      prev.map(insumo => {
        let stockADescontar = 0;
        items.forEach(item => {
          if (item.insumoId === insumo.id) {
            if (item.tipoVenta === 'ENTERA') {
              stockADescontar += item.cantidad;
            } else if (item.tipoVenta === 'PORCION') {
              const rendimiento = item.porcionesPorUnidad || 16;
              stockADescontar += item.cantidad * (1 / rendimiento);
            } else if (item.tipoVenta === 'GENERAL') {
              const factor = item.factorDescuento || 1;
              stockADescontar += item.cantidad * factor;
            }
          }
        });
        if (stockADescontar > 0) {
          return { ...insumo, stock: Math.max(0, insumo.stock - stockADescontar) };
        }
        return insumo;
      })
    );
  }

  revertirStock(items: { insumoId: string; tipoVenta: string; cantidad: number; porcionesPorUnidad?: number; factorDescuento?: number }[]) {
    this.inventario.update(prev =>
      prev.map(insumo => {
        let stockARegresar = 0;
        items.forEach(item => {
          if (item.insumoId === insumo.id) {
            if (item.tipoVenta === 'ENTERA') {
              stockARegresar += item.cantidad;
            } else if (item.tipoVenta === 'PORCION') {
              const rendimiento = item.porcionesPorUnidad || 16;
              stockARegresar += item.cantidad * (1 / rendimiento);
            } else if (item.tipoVenta === 'GENERAL') {
              const factor = item.factorDescuento || 1;
              stockARegresar += item.cantidad * factor;
            }
          }
        });
        if (stockARegresar > 0) {
          return { ...insumo, stock: insumo.stock + stockARegresar };
        }
        return insumo;
      })
    );
  }

  recibirStockRapido(insumoId: string, cantidad: number, vendedorActivo: string | null): AuditLog {
    const insumo = this.inventario().find(i => i.id === insumoId);
    if (!insumo) throw new Error(`Insumo ${insumoId} not found`);

    this.inventario.update(prev =>
      prev.map(i => i.id === insumoId ? { ...i, stock: i.stock + cantidad } : i)
    );

    return {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'STOCK',
      descripcion: `Recepción rápida de mercadería: +${cantidad} ${insumo.unidad}(s) de "${insumo.nombre}" por ${vendedorActivo || 'Vendedor'}`,
      detalles: { insumoId, cantidad, nombre: insumo.nombre, vendedor: vendedorActivo },
    };
  }

  retirarStockRapido(insumoId: string, cantidad: number, vendedorActivo: string | null): AuditLog {
    const insumo = this.inventario().find(i => i.id === insumoId);
    if (!insumo) throw new Error(`Insumo ${insumoId} not found`);

    this.inventario.update(prev =>
      prev.map(i => i.id === insumoId ? { ...i, stock: Math.max(0, i.stock - cantidad) } : i)
    );

    return {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'STOCK',
      descripcion: `Retiro de almacén (Merma/Uso): -${cantidad} ${insumo.unidad}(s) de "${insumo.nombre}" por ${vendedorActivo || 'Vendedor'}`,
      detalles: { insumoId, cantidad, nombre: insumo.nombre, vendedor: vendedorActivo, operacion: 'RETIRO' },
    };
  }

  // --- Fruit Seasons ---

  actualizarTemporadaFruta(id: string, fields: Partial<FruitSeason>) {
    this.frutasTemporada.update(prev =>
      prev.map(f => {
        if (f.id === id) {
          const actualizada = { ...f, ...fields };
          if (fields.mesInicio !== undefined || fields.mesFin !== undefined) {
            const inicio = fields.mesInicio !== undefined ? fields.mesInicio : f.mesInicio;
            const fin = fields.mesFin !== undefined ? fields.mesFin : f.mesFin;
            let meses = fin >= inicio ? fin - inicio + 1 : (12 - inicio + 1) + fin;
            actualizada.duracionDias = meses * 30;
          }
          return actualizada;
        }
        return f;
      })
    );
    this._reEvaluarTemporadas();
  }

  setMesSimulado(mes: number) {
    this.mesSimulado.set(mes);
    this._reEvaluarTemporadas();
  }

  private _reEvaluarTemporadas() {
    const mes = this.mesSimulado();
    this.frutasTemporada.update(prev =>
      prev.map(f => {
        let activa = false;
        if (f.mesFin >= f.mesInicio) {
          activa = mes >= f.mesInicio && mes <= f.mesFin;
        } else {
          activa = mes >= f.mesInicio || mes <= f.mesFin;
        }
        return { ...f, activa };
      })
    );
  }
}
