import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';
import { BluetoothPrinterService } from '../../../core/services/bluetooth-printer.service';
import { KeypadModalComponent } from '../keypad-modal/keypad-modal.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, KeypadModalComponent],
  template: `
    <aside [ngClass]="isCollapsed() ? 'w-20 px-3 py-6' : 'w-72 p-6'"
           class="transition-all duration-300 ease-in-out bg-white/70 backdrop-blur-xl border-r border-verde-oscuro/10 h-screen sticky top-0 flex flex-col justify-between z-30 shrink-0">
      
      <!-- Toggle Collapse Button Chevron -->
      <button
        (click)="isCollapsed.set(!isCollapsed())"
        class="absolute -right-3.5 top-9 w-7 h-7 bg-naranja hover:bg-naranja/90 text-crema rounded-full flex items-center justify-center border border-verde-oscuro/10 shadow-lg hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        [title]="isCollapsed() ? 'Expandir menú' : 'Colapsar menú'"
      >
        <lucide-icon [name]="isCollapsed() ? 'chevron-right' : 'chevron-left'" size="14" strokeWidth="3"></lucide-icon>
      </button>

      <div class="flex flex-col gap-8">
        <!-- Logo Premium -->
        <div class="flex items-center gap-3 py-2 px-1" [ngClass]="isCollapsed() ? 'justify-center' : ''">
          <span class="w-10 h-10 rounded-xl bg-naranja flex items-center justify-center text-crema text-xl font-black shadow-md shadow-naranja/20 shrink-0 select-none">
            M
          </span>
          @if (!isCollapsed()) {
            <div class="fade-in">
              <h1 class="text-xl font-black tracking-tight text-verde-oscuro">Mango 81</h1>
              <p class="text-[10px] text-[#49882C] font-extrabold uppercase tracking-wider">POS & INVENTARIO</p>
            </div>
          }
        </div>

        <!-- Vendedor Info -->
        @if (vendedorActivo()) {
          <div class="flex items-center gap-3 p-3 rounded-2xl bg-verde-oscuro/5 border border-verde-oscuro/5" [ngClass]="isCollapsed() ? 'justify-center' : ''">
            <div class="w-8 h-8 rounded-full bg-verde-oscuro/10 flex items-center justify-center text-verde-oscuro shrink-0">
              <lucide-icon name="user" size="16"></lucide-icon>
            </div>
            @if (!isCollapsed()) {
              <div class="overflow-hidden fade-in">
                <p class="text-[9px] text-verde-oscuro/60 font-bold uppercase tracking-wider">Turno Activo</p>
                <p class="text-xs font-black text-verde-oscuro truncate">{{ vendedorActivo() }}</p>
              </div>
            }
          </div>
        }

        <!-- Navigation Menu -->
        <nav class="flex flex-col gap-2">
          @for (item of menuItems; track item.href) {
            @if (item.href !== '/admin' || rolActivo() === 'administrador') {
              <a
                [routerLink]="item.href"
                (click)="handleNavClick(item.href, $event)"
                [ngClass]="[
                  isCollapsed() ? 'p-3.5 justify-center' : 'px-4 py-3.5',
                  isActive(item.href, item.exact)
                    ? 'bg-verde-oscuro text-crema shadow-lg shadow-verde-oscuro/15'
                    : 'text-verde-oscuro/70 hover:bg-verde-oscuro/5 hover:text-verde-oscuro'
                ]"
                class="flex items-center gap-4 rounded-2xl transition-all duration-200 group relative cursor-pointer"
                [title]="isCollapsed() ? item.name : ''"
              >
                <lucide-icon [name]="item.icon" size="20"
                             [ngClass]="isActive(item.href, item.exact) ? 'text-crema shrink-0' : 'text-verde-oscuro/60 group-hover:text-verde-oscuro shrink-0'"></lucide-icon>
                
                @if (!isCollapsed()) {
                  <div class="fade-in">
                    <p class="text-xs font-black leading-none">{{ item.name }}</p>
                    <p [ngClass]="isActive(item.href, item.exact) ? 'text-crema/60 font-medium' : 'text-verde-oscuro/40 font-semibold group-hover:text-verde-oscuro/50'"
                       class="text-[9px] mt-1">
                      {{ item.description }}
                    </p>
                  </div>
                }

                @if (isActive(item.href, item.exact)) {
                  @if (!isCollapsed()) {
                    <span class="absolute right-3 w-1.5 h-1.5 rounded-full bg-naranja"></span>
                  } @else {
                    <span class="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-md bg-naranja"></span>
                  }
                }
              </a>
            }
          }
        </nav>
      </div>

      <!-- Footer Actions -->
      <div class="flex flex-col gap-3">
        <!-- Botón de Conexión Bluetooth para Ticketera -->
        <button
          (click)="togglePrinter()"
          [ngClass]="[
            isCollapsed() ? 'p-3.5 justify-center' : 'px-4 py-3.5',
            printerService.connectionStatus() === 'connected'
              ? 'bg-[#49882C]/10 text-[#49882C] border-[#49882C]/30 hover:bg-[#49882C]/20'
              : printerService.connectionStatus() === 'connecting'
              ? 'bg-naranja/10 text-naranja border border-naranja/30 animate-pulse'
              : 'bg-verde-oscuro/5 text-verde-oscuro/70 border border-verde-oscuro/10 hover:bg-verde-oscuro/10'
          ]"
          class="flex items-center gap-3 w-full rounded-2xl border transition-all font-bold text-xs cursor-pointer"
          [title]="isCollapsed() ? (printerService.connectionStatus() === 'connected' ? 'Desconectar Ticketera (' + printerService.deviceName() + ')' : 'Conectar Ticketera') : ''"
        >
          <lucide-icon name="bluetooth" size="16" class="shrink-0" [ngClass]="printerService.connectionStatus() === 'connected' ? 'text-[#49882C]' : printerService.connectionStatus() === 'connecting' ? 'text-naranja' : 'text-verde-oscuro/60'"></lucide-icon>
          @if (!isCollapsed()) {
            <div class="flex-1 text-left fade-in overflow-hidden">
              <p class="leading-none text-[10px] font-black uppercase">
                {{ printerService.connectionStatus() === 'connected' ? 'Conectado' : printerService.connectionStatus() === 'connecting' ? 'Conectando...' : 'Sin Conexión' }}
              </p>
              <p class="text-[9px] font-semibold opacity-75 mt-0.5 truncate">
                {{ printerService.connectionStatus() === 'connected' ? printerService.deviceName() : 'Vincular Ticketera' }}
              </p>
            </div>
          }
        </button>

        @if (vendedorActivo()) {
          <button
            (click)="handleLogout()"
            [ngClass]="isCollapsed() ? 'p-3.5 justify-center' : 'px-4 py-3.5'"
            class="flex items-center justify-center gap-3 w-full rounded-2xl bg-naranja/10 hover:bg-naranja/15 text-naranja border border-naranja/20 transition-all font-bold text-xs cursor-pointer"
            [title]="isCollapsed() ? 'Cerrar Turno' : ''"
          >
            <lucide-icon name="log-out" size="16" class="shrink-0"></lucide-icon>
            @if (!isCollapsed()) {
              <span class="fade-in">Cerrar Turno</span>
            }
          </button>
        }
        @if (!isCollapsed()) {
          <p class="text-[9px] text-center text-verde-oscuro/30 font-extrabold uppercase tracking-wider fade-in">
            Mango 81 — POS v1.2
          </p>
        }
      </div>
    </aside>

    <!-- Teclado numérico estilo iOS -->
    <app-keypad-modal
      [isOpen]="showAdminPasscode()"
      (close)="showAdminPasscode.set(false)"
      (success)="handlePasscodeSuccess()"
    ></app-keypad-modal>
  `
})
export class SidebarComponent {
  private stateService = inject(POSStateService);
  private router = inject(Router);
  printerService = inject(BluetoothPrinterService);

  vendedorActivo = this.stateService.vendedorActivo;
  rolActivo = this.stateService.rolActivo;
  
  isCollapsed = signal<boolean>(false);
  showAdminPasscode = signal<boolean>(false);
  targetUrl = signal<string>('');

  currentUrl = signal<string>('');

  async togglePrinter() {
    if (this.printerService.connectionStatus() === 'connected') {
      await this.printerService.disconnect();
    } else {
      this.printerService.connect().catch(err => {
        this.stateService.alert('Error de Conexión', err.message || 'No se pudo conectar a la ticketera.');
      });
    }
  }

  menuItems = [
    { name: "Terminal POS", href: "/pos", icon: "shopping-cart", description: "Ventas y Carrito", exact: true },
    { name: "Historial Tickets", href: "/pos/historial", icon: "receipt", description: "Pedidos Pagados", exact: false },
    { name: "Administración", href: "/admin", icon: "settings", description: "Catálogo y Reportes", exact: false },
  ];

  constructor() {
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl.set(event.urlAfterRedirects);
    });
  }

  isActive(href: string, exact: boolean): boolean {
    const url = this.currentUrl();
    if (exact) {
      return url === href;
    }
    return url === href || url.startsWith(`${href}/`);
  }

  handleNavClick(href: string, event: Event) {
    if (href.startsWith('/admin')) {
      event.preventDefault();
      // Si ya es admin, ir directo sin pedir clave
      if (this.rolActivo() === 'administrador') {
        this.router.navigate([href]);
      } else {
        this.targetUrl.set(href);
        this.showAdminPasscode.set(true);
      }
    }
  }

  handlePasscodeSuccess() {
    this.showAdminPasscode.set(false);
    const url = this.targetUrl();
    if (url) {
      this.stateService.setVendedorActivo('Administrador', 'administrador');
      this.stateService.abrirCaja(150.0); // Abre caja inicial si pasa a admin
      this.router.navigate([url]);
    }
  }

  handleLogout() {
    this.stateService.confirm(
      'Cerrar Turno',
      '¿Está seguro de que desea cerrar el turno y la caja actual?',
      () => {
        this.stateService.cerrarCaja(this.stateService.cajaFondoInicial() + this.stateService.cajaMetodoVentas().efectivo);
        this.router.navigate(['/']);
      }
    );
  }
}
