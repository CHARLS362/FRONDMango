import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import { ApiService } from '../core/services/api.service';
import { environment } from '../../environments/environment';
import type { Product } from '../core/domain/product.model';

const INITIAL_CARTA: Product[] = [
  {
    id: 'torta-choc',
    nombre: 'Torta de Chocolate',
    descripcion: 'Torta de chocolate húmedo rellena con fudge artesanal',
    categoria: 'Pasteles',
    unidad: 'Torta',
    costo: 30.0,
    precio: 0,
    precioEntera: 60.0,
    precioPorcion: 8.5,
    activo: true,
    insumoId: 'insumo-torta-choc',
    porcionesPorUnidad: 17,
    imagen: '/images/torta_chocolate.png'
  },
  {
    id: 'torta-tresleches',
    nombre: 'Torta Tres Leches',
    descripcion: 'Esponjosa y bañada en tres leches con merengue suizo',
    categoria: 'Pasteles',
    unidad: 'Torta',
    costo: 28.0,
    precio: 0,
    precioEntera: 55.0,
    precioPorcion: 7.5,
    activo: true,
    insumoId: 'insumo-torta-tresleches',
    porcionesPorUnidad: 16
  },
  {
    id: 'torta-selvanegra',
    nombre: 'Torta Selva Negra',
    descripcion: 'Bizcochuelo de chocolate relleno de cerezas y crema chantilly',
    categoria: 'Pasteles',
    unidad: 'Torta',
    costo: 35.0,
    precio: 0,
    precioEntera: 65.0,
    precioPorcion: 9.0,
    activo: true,
    insumoId: 'insumo-torta-selvanegra',
    porcionesPorUnidad: 16
  },
  {
    id: 'jugo-papaya',
    nombre: 'Jugo de Papaya Especial',
    descripcion: 'Jugo natural con un toque de miel y algarrobina',
    categoria: 'Jugos',
    unidad: 'Vaso',
    costo: 3.0,
    precio: 8.0,
    activo: true
  },
  {
    id: 'jugo-mango',
    nombre: 'Jugo de Mango Especial',
    descripcion: 'Mango maduro seleccionado de temporada licuado al instante',
    categoria: 'Jugos',
    unidad: 'Vaso',
    costo: 3.5,
    precio: 9.5,
    activo: true,
    imagen: '/images/jugo_mango.png'
  },
  {
    id: 'jugo-fresa',
    nombre: 'Jugo de Fresa con Leche',
    descripcion: 'Fresas frescas licuadas con leche pasteurizada y endulzado al gusto',
    categoria: 'Jugos',
    unidad: 'Vaso',
    costo: 4.0,
    precio: 10.0,
    activo: true
  },
  {
    id: 'jugo-surtido',
    nombre: 'Jugo Surtido Aura',
    descripcion: 'Clásica combinación de papaya, piña y plátano de la casa',
    categoria: 'Jugos',
    unidad: 'Vaso',
    costo: 3.2,
    precio: 8.5,
    activo: true
  },
  {
    id: 'empanada-carne',
    nombre: 'Empanada de Carne',
    descripcion: 'Masa hojaldrada rellena con carne molida sazonada y huevo',
    categoria: 'Empanadas',
    unidad: 'Unidad',
    costo: 2.5,
    precio: 5.5,
    activo: true,
    insumoId: 'insumo-empanada-carne',
    factorDescuento: 1,
    imagen: '/images/empanada_carne.png'
  },
  {
    id: 'empanada-pollo',
    nombre: 'Empanada de Pollo',
    descripcion: 'Masa crocante rellena de pechuga de pollo deshilachada y crema',
    categoria: 'Empanadas',
    unidad: 'Unidad',
    costo: 2.2,
    precio: 5.0,
    activo: true,
    insumoId: 'insumo-empanada-pollo',
    factorDescuento: 1
  },
  {
    id: 'pastel-acelga',
    nombre: 'Pastel de Acelga',
    descripcion: 'Relleno saludable de acelgas seleccionadas con queso gratinado',
    categoria: 'Empanadas',
    unidad: 'Unidad',
    costo: 2.8,
    precio: 6.0,
    activo: true,
    insumoId: 'insumo-pastel-acelga',
    factorDescuento: 1
  }
];

@Injectable({
  providedIn: 'root'
})
export class CatalogStore {
  private storage = inject(LocalStorageService);
  private apiService = inject(ApiService);

  carta = signal<Product[]>(this.storage.load('carta', INITIAL_CARTA));

  constructor() {
    // Ensure default images are set if they are missing in the restored state
    const currentCarta = this.carta();
    let updated = false;
    const mapped = currentCarta.map(p => {
      if (p.id === 'torta-choc' && !p.imagen) { p.imagen = '/images/torta_chocolate.png'; updated = true; }
      if (p.id === 'jugo-mango' && !p.imagen) { p.imagen = '/images/jugo_mango.png'; updated = true; }
      if (p.id === 'empanada-carne' && !p.imagen) { p.imagen = '/images/empanada_carne.png'; updated = true; }
      return p;
    });
    if (updated) {
      this.carta.set(mapped);
    }

    if (environment.useBackend) {
      this.apiService.getCarta().subscribe({
        next: (data) => this.carta.set(data),
        error: (err) => console.error('Error fetching catalog from backend:', err)
      });
    }

    effect(() => this.storage.save('carta', this.carta()));
  }

  crearProducto(p: Omit<Product, 'activo'>) {
    if (environment.useBackend) {
      this.apiService.crearProducto(p).subscribe({
        next: (newProd) => this.carta.update(prev => [...prev, newProd]),
        error: (err) => console.error('Error creating product in backend:', err)
      });
    } else {
      this.carta.update(prev => [...prev, { ...p, activo: true }]);
    }
  }

  actualizarProducto(id: string, fields: Partial<Product>) {
    if (environment.useBackend) {
      this.apiService.actualizarProducto(id, fields).subscribe({
        next: () => this.carta.update(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p)),
        error: (err) => console.error('Error updating product in backend:', err)
      });
    } else {
      this.carta.update(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    }
  }

  eliminarProducto(id: string) {
    if (environment.useBackend) {
      this.apiService.eliminarProducto(id).subscribe({
        next: () => this.carta.update(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p)),
        error: (err) => console.error('Error deleting product from backend:', err)
      });
    } else {
      this.carta.update(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p));
    }
  }
}
