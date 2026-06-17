import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';
import type { Usuario } from '../../../core/domain/user.model';

@Component({
  selector: 'app-admin-sellers',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col gap-8 fade-in">
      <!-- Encabezado del Panel -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-black tracking-tight text-verde-oscuro">Gestión de Vendedores</h2>
          <p class="text-sm text-verde-oscuro/50 font-medium">
            Registre nuevos usuarios o dé de baja a quienes ya no trabajan en el sistema.
          </p>
        </div>
      </div>

      <!-- Grid Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <!-- Formulario de Registro -->
        <div class="lg:col-span-1 bg-white rounded-3xl border border-verde-oscuro/5 shadow-xl p-6">
          <h3 class="text-lg font-extrabold text-verde-oscuro mb-6 flex items-center gap-2">
            <lucide-icon name="user" size="18" class="text-naranja"></lucide-icon>
            Registrar Nuevo Usuario
          </h3>

          <form (submit)="registrarVendedor($event)" class="flex flex-col gap-4">
            <!-- Nombre Completo -->
            <div class="flex flex-col gap-1.5">
              <label for="nombre" class="text-xs font-bold text-verde-oscuro/60 uppercase tracking-wide">Nombre Completo</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                [(ngModel)]="nuevoNombre"
                placeholder="Ej. Juan Pérez"
                class="w-full bg-crema/40 focus:bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-3 px-4 text-xs font-bold text-verde-oscuro placeholder-verde-oscuro/35 outline-none transition-all"
                required
              />
            </div>

            <!-- Nombre de Usuario (Login) -->
            <div class="flex flex-col gap-1.5">
              <label for="username" class="text-xs font-bold text-verde-oscuro/60 uppercase tracking-wide">Usuario (Login)</label>
              <input
                type="text"
                id="username"
                name="username"
                [(ngModel)]="nuevoUsername"
                placeholder="Ej. juanp"
                class="w-full bg-crema/40 focus:bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-3 px-4 text-xs font-bold text-verde-oscuro placeholder-verde-oscuro/35 outline-none transition-all"
                required
              />
            </div>

            <!-- Contraseña -->
            <div class="flex flex-col gap-1.5">
              <label for="password" class="text-xs font-bold text-verde-oscuro/60 uppercase tracking-wide">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="nuevoPassword"
                placeholder="Clave de acceso"
                class="w-full bg-crema/40 focus:bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-3 px-4 text-xs font-bold text-verde-oscuro placeholder-verde-oscuro/35 outline-none transition-all"
                required
              />
            </div>

            <!-- Rol de Usuario -->
            <div class="flex flex-col gap-1.5">
              <label for="rol" class="text-xs font-bold text-verde-oscuro/60 uppercase tracking-wide">Rol</label>
              <select
                id="rol"
                name="rol"
                [(ngModel)]="nuevoRol"
                class="w-full bg-crema/40 focus:bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-3 px-4 text-xs font-bold text-verde-oscuro outline-none transition-all cursor-pointer"
              >
                <option value="vendedor">Vendedor</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>

            <!-- Errores -->
            @if (errorMsg()) {
              <div class="text-xs text-[#FF8E25] font-bold flex items-center gap-1.5">
                <lucide-icon name="alert-circle" size="14"></lucide-icon>
                {{ errorMsg() }}
              </div>
            }

            <!-- Botón de Envío -->
            <button
              type="submit"
              class="flex items-center justify-center gap-2 w-full bg-verde-oscuro hover:bg-verde-oscuro/95 active:scale-[0.98] text-white py-3.5 px-6 rounded-2xl transition-all font-bold text-xs shadow-lg shadow-verde-oscuro/10 cursor-pointer mt-2"
            >
              <lucide-icon name="plus" size="14"></lucide-icon>
              Registrar Usuario
            </button>
          </form>
        </div>

        <!-- Listado de Usuarios -->
        <div class="lg:col-span-2 bg-white rounded-3xl border border-verde-oscuro/5 shadow-xl p-6">
          <h3 class="text-lg font-extrabold text-verde-oscuro mb-6">
            Usuarios Registrados ({{ usuarios().length }})
          </h3>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-verde-oscuro/10">
                  <th class="pb-3 text-xs font-bold text-verde-oscuro/50 uppercase tracking-wide">Nombre</th>
                  <th class="pb-3 text-xs font-bold text-verde-oscuro/50 uppercase tracking-wide">Usuario</th>
                  <th class="pb-3 text-xs font-bold text-verde-oscuro/50 uppercase tracking-wide">Rol</th>
                  <th class="pb-3 text-xs font-bold text-verde-oscuro/50 uppercase tracking-wide">Estado</th>
                  <th class="pb-3 text-right text-xs font-bold text-verde-oscuro/50 uppercase tracking-wide">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-verde-oscuro/5">
                @for (u of usuarios(); track u.username) {
                  <tr class="hover:bg-crema/20 transition-all">
                    <!-- Nombre -->
                    <td class="py-4 font-bold text-xs text-verde-oscuro">{{ u.nombre }}</td>
                    
                    <!-- Username -->
                    <td class="py-4 text-xs text-verde-oscuro/60 font-medium">&#64;{{ u.username }}</td>
                    
                    <!-- Rol -->
                    <td class="py-4 text-xs font-bold">
                      <span
                        [ngClass]="u.rol === 'administrador' ? 'bg-naranja/10 text-naranja border border-naranja/20' : 'bg-[#49882C]/10 text-[#49882C] border border-[#49882C]/20'"
                        class="px-2 py-1 rounded-full text-[10px] uppercase font-bold"
                      >
                        {{ u.rol }}
                      </span>
                    </td>

                    <!-- Estado -->
                    <td class="py-4 text-xs font-semibold">
                      <span class="flex items-center gap-1.5">
                        <span
                          [ngClass]="u.activo ? 'bg-[#49882C]' : 'bg-gray-300'"
                          class="w-2 h-2 rounded-full"
                        ></span>
                        {{ u.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>

                    <!-- Acciones -->
                    <td class="py-4 text-right">
                      @if (u.username !== 'admin') {
                        <button
                          (click)="darDeBaja(u)"
                          title="Dar de baja al usuario"
                          class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-red-100 hover:scale-105 active:scale-95"
                        >
                          <lucide-icon name="trash-2" size="14"></lucide-icon>
                        </button>
                      } @else {
                        <span class="text-[10px] text-verde-oscuro/35 font-bold uppercase select-none italic pr-2">Sistema</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `
})
export class AdminSellersComponent {
  private stateService = inject(POSStateService);

  usuarios = this.stateService.usuarios;

  nuevoNombre = '';
  nuevoUsername = '';
  nuevoPassword = '';
  nuevoRol: 'administrador' | 'vendedor' = 'vendedor';
  errorMsg = signal<string>('');

  registrarVendedor(event: Event) {
    event.preventDefault();
    this.errorMsg.set('');

    const usernameLimpio = this.nuevoUsername.trim().toLowerCase();
    if (!this.nuevoNombre.trim() || !usernameLimpio || !this.nuevoPassword.trim()) {
      this.errorMsg.set('Todos los campos son requeridos.');
      return;
    }

    // Verificar si ya existe el usuario
    const yaExiste = this.usuarios().some(u => u.username.toLowerCase() === usernameLimpio);
    if (yaExiste) {
      this.errorMsg.set('El nombre de usuario ya está registrado.');
      return;
    }

    const nuevoUsuario: Usuario = {
      username: usernameLimpio,
      nombre: this.nuevoNombre.trim(),
      password: this.nuevoPassword,
      rol: this.nuevoRol,
      activo: true
    };

    this.stateService.crearUsuario(nuevoUsuario);

    // Resetear formulario
    this.nuevoNombre = '';
    this.nuevoUsername = '';
    this.nuevoPassword = '';
    this.nuevoRol = 'vendedor';
  }

  darDeBaja(u: Usuario) {
    this.stateService.confirm(
      'Eliminar Vendedor',
      `¿Está seguro de que desea eliminar al usuario @${u.username}? Perderá el acceso de inmediato.`,
      () => {
        this.stateService.eliminarUsuario(u.username);
      }
    );
  }
}
