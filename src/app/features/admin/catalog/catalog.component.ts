import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';
import { Product, Insumo } from '../../../core/models/pos.models';

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './catalog.component.html'
})
export class AdminCatalogComponent {
  private stateService = inject(POSStateService);

  carta = this.stateService.carta;
  inventario = this.stateService.inventario;

  activeTab = signal<"CARTA" | "INSUMOS">("CARTA");

  // Categorías existentes deducidas dinámicamente de productos e insumos
  categoriasExistentes = computed(() => {
    const catsFromCarta = this.carta().map(p => p.categoria).filter(Boolean);
    const catsFromInsumos = this.inventario().map(i => i.categoria).filter((c): c is string => !!c);
    return Array.from(new Set([...catsFromCarta, ...catsFromInsumos]));
  });

  // Form State para creación/edición de CARTA
  showCartaForm = signal<boolean>(false);
  nombreCarta = '';
  descripcionCarta = '';
  categoriaCarta = 'Jugos';
  unidadCarta = 'Vaso';
  costoCarta = '';
  precioGeneralCarta = '';
  precioEnteraCarta = '';
  precioPorcionCarta = '';
  porcionesPorUnidadCarta = '16';
  insumoIdCarta = '';
  factorDescuentoCarta = '1.0';
  imagenCarta = signal<string>('');

  // Form State para creación/edición de INSUMOS
  showInsumoForm = signal<boolean>(false);
  nombreInsumo = '';
  categoriaInsumo = 'Jugos';
  unidadInsumo = 'Kg';
  stockInsumo = '';
  stockMinimoInsumo = '';
  costoInsumo = '';
  precioVentaInsumo = '';

  // Modales y Controles Rápidos
  showStockModal = signal<string | null>(null); // insumoId a recibir
  stockToReceive = '5';
  showWithdrawModal = signal<string | null>(null); // insumoId a retirar
  stockToWithdraw = '1';
  
  // Edición Directa de Stocks en Almacén
  directStockEditId = signal<string | null>(null);
  directStockValue = '';

  handleImageUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.imagenCarta.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  handleCreateCartaItem(e: Event) {
    e.preventDefault();
    if (!this.nombreCarta || !this.costoCarta) {
      this.stateService.alert("Campos incompletos", "Por favor ingrese al menos el nombre y el costo del producto.");
      return;
    }

    const isTorta = this.unidadCarta === "Torta";

    this.stateService.crearProducto({
      id: `prod-${Date.now()}`,
      nombre: this.nombreCarta,
      descripcion: this.descripcionCarta,
      categoria: this.categoriaCarta,
      unidad: this.unidadCarta,
      costo: parseFloat(this.costoCarta) || 0,
      precio: isTorta ? 0 : parseFloat(this.precioGeneralCarta) || 0,
      precioEntera: isTorta ? parseFloat(this.precioEnteraCarta) || 0 : undefined,
      precioPorcion: isTorta ? parseFloat(this.precioPorcionCarta) || 0 : undefined,
      porcionesPorUnidad: isTorta ? parseInt(this.porcionesPorUnidadCarta) || 16 : undefined,
      insumoId: this.insumoIdCarta ? this.insumoIdCarta : undefined,
      factorDescuento: this.factorDescuentoCarta ? parseFloat(this.factorDescuentoCarta) || 1.0 : undefined,
      imagen: this.imagenCarta() ? this.imagenCarta() : undefined
    });

    // Reset fields
    this.nombreCarta = '';
    this.descripcionCarta = '';
    this.categoriaCarta = 'Jugos';
    this.unidadCarta = 'Vaso';
    this.costoCarta = '';
    this.precioGeneralCarta = '';
    this.precioEnteraCarta = '';
    this.precioPorcionCarta = '';
    this.porcionesPorUnidadCarta = '16';
    this.insumoIdCarta = '';
    this.factorDescuentoCarta = '1.0';
    this.imagenCarta.set('');
    this.showCartaForm.set(false);
  }

  handleCreateInsumoItem(e: Event) {
    e.preventDefault();
    if (!this.nombreInsumo || !this.stockInsumo || !this.costoInsumo) {
      this.stateService.alert("Campos incompletos", "Por favor ingrese al menos el nombre, stock inicial y costo del insumo.");
      return;
    }

    this.stateService.crearInsumo({
      id: `insumo-${Date.now()}`,
      nombre: this.nombreInsumo,
      unidad: this.unidadInsumo || "Unidad",
      stock: parseFloat(this.stockInsumo) || 0,
      stockMinimo: parseFloat(this.stockMinimoInsumo) || 0,
      costo: parseFloat(this.costoInsumo) || 0,
      precioVentaPorcion: this.precioVentaInsumo ? parseFloat(this.precioVentaInsumo) : undefined,
      categoria: this.categoriaInsumo || undefined
    });

    // Reset fields
    this.nombreInsumo = '';
    this.categoriaInsumo = 'Jugos';
    this.unidadInsumo = 'Kg';
    this.stockInsumo = '';
    this.stockMinimoInsumo = '';
    this.costoInsumo = '';
    this.precioVentaInsumo = '';
    this.showInsumoForm.set(false);
  }

  handleStockReception() {
    const insId = this.showStockModal();
    if (!insId) return;
    const qty = parseFloat(this.stockToReceive);
    if (isNaN(qty) || qty <= 0) {
      this.stateService.alert("Monto inválido", "Por favor, ingrese un número mayor a cero.");
      return;
    }

    this.stateService.recibirStockRapido(insId, qty);
    this.showStockModal.set(null);
    this.stockToReceive = '5';
    this.stateService.alert("Stock Actualizado", "Recepción de stock guardada e inmutada en auditoría [✓]");
  }

  handleStockWithdraw() {
    const insId = this.showWithdrawModal();
    if (!insId) return;
    const qty = parseFloat(this.stockToWithdraw);
    if (isNaN(qty) || qty <= 0) {
      this.stateService.alert("Monto inválido", "Por favor, ingrese un número mayor a cero.");
      return;
    }

    this.stateService.retirarStockRapido(insId, qty);
    this.showWithdrawModal.set(null);
    this.stockToWithdraw = '1';
    this.stateService.alert("Stock Actualizado", "Retiro de stock guardado exitosamente [✓]");
  }

  handleSaveDirectStock(insumoId: string) {
    const newVal = parseFloat(this.directStockValue);
    if (isNaN(newVal) || newVal < 0) {
      this.stateService.alert("Monto inválido", "Por favor, ingrese un nivel de stock válido (número no negativo).");
      return;
    }
    this.stateService.actualizarInsumo(insumoId, { stock: newVal });
    this.directStockEditId.set(null);
    this.directStockValue = '';
  }

  handleDeleteProduct(id: string, name: string) {
    this.stateService.confirm(
      'Desactivar Producto',
      `¿Desactivar "${name}" del menú comercial?`,
      () => {
        this.stateService.eliminarProducto(id);
      }
    );
  }

  handleDeleteInsumo(id: string, name: string) {
    this.stateService.confirm(
      'Eliminar Insumo',
      `¿Eliminar definitivamente "${name}" de las existencias del almacén?`,
      () => {
        this.stateService.eliminarInsumo(id);
      }
    );
  }

  // Stock Visual Equivalencies
  getStockVisual(insumo: Insumo, yieldVal: number = 16) {
    if (insumo.unidad === "Torta") {
      const stockVal = insumo.stock;
      const enteras = Math.floor(stockVal);
      const fraccion = stockVal - enteras;
      const porciones = Math.round(fraccion * yieldVal);
      
      if (enteras > 0 && porciones > 0) {
        return `${enteras} ent. y ${porciones} taj.`;
      } else if (enteras > 0) {
        return `${enteras} entera(s)`;
      } else if (porciones > 0) {
        return `${porciones} tajada(s)`;
      } else {
        return "Agotado";
      }
    }
    return `${insumo.stock.toFixed(2).endsWith(".00") ? insumo.stock.toFixed(0) : insumo.stock.toFixed(2)} ${insumo.unidad}`;
  }

  getLinkedInsumo(insumoId?: string): Insumo | undefined {
    if (!insumoId) return undefined;
    return this.inventario().find(i => i.id === insumoId);
  }

  isLowStock(insumo: Insumo): boolean {
    return insumo.stock <= insumo.stockMinimo;
  }
}
