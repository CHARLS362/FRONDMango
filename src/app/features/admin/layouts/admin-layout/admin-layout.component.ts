import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../../core/services/pos-state.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen flex bg-crema text-verde-oscuro">
      <!-- Sidebar Administrativo Especial -->
      <aside class="w-72 glassmorphism border-r border-[#1C3B1E]/10 h-screen sticky top-0 flex flex-col justify-between p-6 z-30">
        <div class="flex flex-col gap-8">
          <!-- Logo / Back POS -->
          <div class="flex flex-col gap-2">
            <a
              routerLink="/pos"
              class="flex items-center gap-2 text-xs font-bold text-naranja hover:underline cursor-pointer"
            >
              <lucide-icon name="arrow-left" size="12"></lucide-icon>
              Volver al POS Vendedor
            </a>
            <div class="flex items-center gap-3 py-2 px-1">
              <span class="w-10 h-10 rounded-xl bg-verde-oscuro flex items-center justify-center text-crema text-lg font-bold shadow-md shadow-verde-oscuro/20">
                A
              </span>
              <div>
                <h1 class="text-lg font-extrabold tracking-tight text-verde-oscuro">Panel de Dueño</h1>
                <p class="text-[9px] text-[#49882C] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <lucide-icon name="shield-check" size="10"></lucide-icon> MODO ADMIN
                </p>
              </div>
            </div>
          </div>

          <!-- Menú Administrativo -->
          <nav class="flex flex-col gap-1.5">
            @for (item of adminMenu; track item.href) {
              <a
                [routerLink]="item.href"
                [ngClass]="[
                  isActive(item.href, item.exact)
                    ? 'bg-verde-oscuro text-crema shadow-lg shadow-verde-oscuro/15'
                    : 'text-verde-oscuro/70 hover:bg-verde-oscuro/5 hover:text-verde-oscuro'
                ]"
                class="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative cursor-pointer"
              >
                <lucide-icon [name]="item.icon" size="18"></lucide-icon>
                <span class="text-xs font-extrabold">{{ item.name }}</span>
                @if (isActive(item.href, item.exact)) {
                  <span class="absolute right-3 w-1.5 h-1.5 rounded-full bg-naranja"></span>
                }
              </a>
            }
          </nav>
        </div>

        <!-- Footer -->
        <p class="text-[10px] text-center text-verde-oscuro/30 font-medium">
          Acceso Autenticado • Mango 81
        </p>
      </aside>

      <!-- Área de Trabajo Administrativa -->
      <main class="flex-1 h-screen overflow-y-auto p-8 flex flex-col">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AdminLayoutComponent implements OnInit {
  private stateService = inject(POSStateService);
  private router = inject(Router);

  vendedorActivo = this.stateService.vendedorActivo;
  currentUrl = signal<string>('');

  adminMenu = [
    { name: "Indicadores Generales", href: "/admin", icon: "layout-dashboard", exact: true },
    { name: "Gestión de Catálogo (Menú)", href: "/admin/inventario", icon: "package", exact: false },
    { name: "Temporadas y Ajustes", href: "/admin/reportes", icon: "calendar-range", exact: false },
    { name: "Gestión de Vendedores", href: "/admin/vendedores", icon: "user", exact: false },
  ];

  constructor() {
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl.set(event.urlAfterRedirects);
    });
  }

  ngOnInit() {
    // Asegurar sesión admin al cargar
    if (!this.vendedorActivo()) {
      this.stateService.setVendedorActivo("Administrador", "administrador");
      this.stateService.abrirCaja(150.0);
    }
  }

  isActive(href: string, exact: boolean): boolean {
    const url = this.currentUrl();
    if (exact) {
      return url === href;
    }
    return url.startsWith(href);
  }
}
