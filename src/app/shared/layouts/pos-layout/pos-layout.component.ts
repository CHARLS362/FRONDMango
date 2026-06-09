import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { POSStateService } from '../../../core/services/pos-state.service';

@Component({
  selector: 'app-pos-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="min-h-screen flex bg-crema text-verde-oscuro">
      <!-- Sidebar Fija Izquierda -->
      <app-sidebar></app-sidebar>

      <!-- Contenido Principal de Trabajo -->
      <main class="flex-1 h-screen overflow-y-auto p-8 relative flex flex-col">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class PosLayoutComponent implements OnInit {
  private stateService = inject(POSStateService);

  ngOnInit() {
    // Fallback amigable para desarrollo: auto-inicia turno demo
    if (!this.stateService.vendedorActivo()) {
      this.stateService.setVendedorActivo('Vendedor de Pruebas');
      this.stateService.abrirCaja(150.0);
    }
  }
}
