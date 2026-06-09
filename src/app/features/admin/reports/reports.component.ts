import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';
import { TicketPreviewComponent } from '../../../shared/components/ticket-preview/ticket-preview.component';
import { FruitSeason } from '../../../core/models/pos.models';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TicketPreviewComponent],
  templateUrl: './reports.component.html'
})
export class AdminReportsComponent {
  private stateService = inject(POSStateService);

  frutasTemporada = this.stateService.frutasTemporada;
  mesSimulado = this.stateService.mesSimulado;
  auditorias = this.stateService.auditorias;
  vendedorActivo = this.stateService.vendedorActivo;
  claveAdministrador = this.stateService.claveAdministrador;

  editingFruitId = signal<string | null>(null);
  editInicio = 1;
  editFin = 5;

  // Carta Digital Link State
  menuUrl = 'https://mango81.pe/carta-digital';
  showQRReceipt = signal<boolean>(false);

  // Cambio de clave state
  nuevaClaveInput = '';

  monthsList = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Mock QR code grids
  qrGrid = Array.from({ length: 100 }).map(() => Math.random() > 0.45);

  activeFruit = computed(() => {
    return this.frutasTemporada().find(f => f.activa);
  });

  handleEditSeasonClick(f: FruitSeason) {
    this.editingFruitId.set(f.id);
    this.editInicio = f.mesInicio;
    this.editFin = f.mesFin;
  }

  handleSaveSeason(id: string) {
    this.stateService.actualizarTemporadaFruta(id, {
      mesInicio: this.editInicio,
      mesFin: this.editFin
    });
    this.editingFruitId.set(null);
    alert("Temporada de fruta guardada. Los cálculos del sistema se han reajustado [✓]");
  }

  handleSimulateMonth(mesIdx: number) {
    this.stateService.setMesSimulado(mesIdx + 1);
  }

  handleSavePasscode() {
    if (this.nuevaClaveInput.length < 4) {
      alert("Por favor ingrese una contraseña de al menos 4 dígitos.");
      return;
    }
    this.stateService.cambiarClaveAdministrador(this.nuevaClaveInput);
    this.nuevaClaveInput = '';
    alert("Contraseña administrativa de Mango 81 modificada con éxito [✓]");
  }

  handleExportQR() {
    alert(`QR Copiado al portapapeles con enlace: ${this.menuUrl}`);
  }

  isCornerQR(idx: number): boolean {
    return (
      (idx < 3 && idx % 10 < 3) || // top-left
      (idx < 3 && idx % 10 >= 7) || // top-right
      (idx >= 70 && idx % 10 < 3)   // bottom-left
    );
  }
}
