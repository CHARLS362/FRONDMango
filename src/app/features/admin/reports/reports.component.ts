import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';
import { FruitSeason } from '../../../core/models/pos.models';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './reports.component.html'
})
export class AdminReportsComponent {
  private stateService = inject(POSStateService);

  frutasTemporada = this.stateService.frutasTemporada;
  mesActual = this.stateService.mesActual;
  auditorias = this.stateService.auditorias;
  vendedorActivo = this.stateService.vendedorActivo;
  claveAdministrador = this.stateService.claveAdministrador;

  editingFruitId = signal<string | null>(null);
  editNombre = '';
  editImagen = '';
  editInicio = 1;
  editFin = 5;

  // Formulario de agregar fruta
  nuevaFrutaNombre = '';
  nuevaFrutaImagen = '';
  nuevaFrutaInicio = 1;
  nuevaFrutaFin = 5;

  // Cambio de clave state
  claveActualInput = '';
  nuevaClaveInput = '';
  confirmarClaveInput = '';

  showClaveActual = signal<boolean>(false);
  showNuevaClave = signal<boolean>(false);
  showConfirmarClave = signal<boolean>(false);

  monthsList = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];



  activeFruit = computed(() => {
    return this.frutasTemporada().find(f => f.activa);
  });

  handleEditSeasonClick(f: FruitSeason) {
    this.editingFruitId.set(f.id);
    this.editNombre = f.nombre;
    this.editImagen = f.imagen || '';
    this.editInicio = f.mesInicio;
    this.editFin = f.mesFin;
  }

  handleSaveSeason(id: string) {
    this.stateService.actualizarTemporadaFruta(id, {
      nombre: this.editNombre,
      imagen: this.editImagen,
      mesInicio: this.editInicio,
      mesFin: this.editFin
    });
    this.editingFruitId.set(null);
    this.stateService.alert("Temporada Guardada", "Temporada de fruta guardada. Los cálculos del sistema se han reajustado [✓]");
  }

  handleCancelEdit() {
    this.editingFruitId.set(null);
  }

  handleAgregarFruta() {
    if (!this.nuevaFrutaNombre.trim()) {
      this.stateService.alert("Error de validación", "Por favor ingrese un nombre de fruta válido.");
      return;
    }

    const id = this.nuevaFrutaNombre.trim().toLowerCase().replace(/\s+/g, '-');
    const yaExiste = this.frutasTemporada().some(f => f.id === id);
    if (yaExiste) {
      this.stateService.alert("Error de validación", "Esta fruta ya existe en el control de temporadas.");
      return;
    }

    this.stateService.crearTemporadaFruta({
      id,
      nombre: this.nuevaFrutaNombre.trim(),
      imagen: this.nuevaFrutaImagen.trim() || '🥭',
      mesInicio: Number(this.nuevaFrutaInicio),
      mesFin: Number(this.nuevaFrutaFin)
    });

    this.nuevaFrutaNombre = '';
    this.nuevaFrutaImagen = '';
    this.nuevaFrutaInicio = 1;
    this.nuevaFrutaFin = 5;

    this.stateService.alert("Fruta Agregada", "La fruta se ha añadido exitosamente al control de temporadas.");
  }

  handleDeleteFruit(id: string) {
    this.stateService.confirm(
      "Eliminar Fruta",
      "¿Está seguro de que desea eliminar esta fruta del control de temporadas?",
      () => {
        this.stateService.eliminarTemporadaFruta(id);
        this.editingFruitId.set(null);
        this.stateService.alert("Fruta Eliminada", "La fruta ha sido eliminada.");
      }
    );
  }


  handleSavePasscode() {
    if (this.claveActualInput !== this.claveAdministrador()) {
      this.stateService.alert("Error de validación", "La contraseña actual ingresada es incorrecta.");
      return;
    }
    if (this.nuevaClaveInput.length < 4) {
      this.stateService.alert("Clave inválida", "Por favor ingrese una contraseña nueva de al menos 4 dígitos.");
      return;
    }
    if (this.nuevaClaveInput !== this.confirmarClaveInput) {
      this.stateService.alert("Error de validación", "Las nuevas contraseñas ingresadas no coinciden.");
      return;
    }
    this.stateService.cambiarClaveAdministrador(this.nuevaClaveInput);
    this.claveActualInput = '';
    this.nuevaClaveInput = '';
    this.confirmarClaveInput = '';
    this.showClaveActual.set(false);
    this.showNuevaClave.set(false);
    this.showConfirmarClave.set(false);
    this.stateService.alert("Clave Modificada", "Contraseña administrativa de Mango 81 modificada con éxito [✓]");
  }

}
