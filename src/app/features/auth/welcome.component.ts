import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../core/services/pos-state.service';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <main class="min-h-screen flex flex-col justify-center items-center bg-crema p-6 selection:bg-amarillo relative overflow-hidden">
      <!-- Background gradients -->
      <div class="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amarillo/20 blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-naranja/10 blur-[120px] pointer-events-none"></div>

      <!-- Main Container -->
      <div class="max-w-md w-full text-center z-10">
        <!-- Logo / Badge -->
        <div class="inline-flex items-center gap-3 bg-verde-oscuro/5 border border-verde-oscuro/5 px-4 py-2 rounded-full mb-6">
          <span class="w-2.5 h-2.5 rounded-full bg-[#49882C] animate-pulse"></span>
          <span class="text-xs font-bold uppercase tracking-wider text-verde-oscuro/60">Sistema POS offline</span>
        </div>

        <!-- Title -->
        <h1 class="text-4xl font-black text-verde-oscuro tracking-tight mb-2">
          Pastelería & Juguería <span class="text-naranja">Mango 81</span>
        </h1>
        <p class="text-sm text-verde-oscuro/50 mb-10 font-medium">
          Ingrese sus credenciales de acceso para iniciar el sistema.
        </p>

        <!-- Form Box -->
        <div class="bg-white rounded-3xl border border-verde-oscuro/5 shadow-xl p-8 text-left">
          <form (onSubmit)="$event.preventDefault()" (submit)="handleStartShift()" class="flex flex-col gap-6">
            
            <!-- Input Usuario -->
            <div class="flex flex-col gap-2">
              <label for="username" class="text-xs font-bold text-verde-oscuro/70 uppercase tracking-wide">
                Usuario
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-verde-oscuro/45">
                  <lucide-icon name="user" size="18"></lucide-icon>
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Ingrese el usuario"
                  [(ngModel)]="username"
                  class="w-full bg-crema/40 focus:bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-verde-oscuro placeholder-verde-oscuro/30 outline-none transition-all"
                />
              </div>
            </div>

             <!-- Input Contraseña -->
             <div class="flex flex-col gap-2">
               <label for="password" class="text-xs font-bold text-verde-oscuro/70 uppercase tracking-wide">
                 Contraseña
               </label>
               <div class="relative">
                 <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-verde-oscuro/45">
                   <lucide-icon name="log-in" size="18"></lucide-icon>
                 </div>
                 <input
                   [type]="showPassword() ? 'text' : 'password'"
                   id="password"
                   name="password"
                   placeholder="Ingrese la contraseña"
                   [(ngModel)]="password"
                   class="w-full bg-crema/40 focus:bg-white border border-verde-oscuro/10 focus:border-[#49882C] rounded-2xl py-3.5 pl-11 pr-12 text-sm font-bold text-verde-oscuro placeholder-verde-oscuro/30 outline-none transition-all"
                 />
                 <button
                   type="button"
                   (click)="showPassword.set(!showPassword())"
                   class="absolute inset-y-0 right-0 pr-4 flex items-center text-verde-oscuro/45 hover:text-verde-oscuro/70 cursor-pointer outline-none select-none"
                 >
                   <lucide-icon [name]="showPassword() ? 'eye-off' : 'eye'" size="18"></lucide-icon>
                 </button>
               </div>
             </div>

            @if (errorText()) {
              <p class="text-xs text-[#FF8E25] font-bold">{{ errorText() }}</p>
            }

            <!-- Action button -->
            <button
              type="submit"
              class="flex items-center justify-center gap-3 w-full bg-naranja hover:bg-naranja/95 active:scale-[0.98] text-white py-4 px-6 rounded-2xl transition-all font-bold text-sm shadow-lg shadow-naranja/20 cursor-pointer"
            >
              <lucide-icon name="log-in" size="18"></lucide-icon>
              Ingresar al POS
              <lucide-icon name="arrow-right" size="16"></lucide-icon>
            </button>
          </form>
        </div>

        <!-- Footer info -->
        <p class="text-[10px] text-center text-verde-oscuro/30 font-semibold uppercase mt-8 tracking-wider">
          Acceso Restringido • Solo Personal Autorizado
        </p>
      </div>
    </main>
  `
})
export class WelcomeComponent {
  private router = inject(Router);
  private stateService = inject(POSStateService);
  private apiService = inject(ApiService);

  username = '';
  password = '';
  showPassword = signal<boolean>(false);
  errorText = signal<string>('');

  handleStartShift() {
    this.errorText.set('');

    if (environment.useBackend) {
      this.apiService.login(this.username.trim(), this.password).subscribe({
        next: (res) => {
          // Guardar token JWT en localStorage
          localStorage.setItem('mango81_token', JSON.stringify(res.token));
          
          // Normalizar el rol del backend: 'administrador' o 'vendedor'
          let normalizedRol: 'administrador' | 'vendedor' = 'vendedor';
          const r = (res.rol || '').toLowerCase();
          if (r === 'administrador' || r === 'admin') {
            normalizedRol = 'administrador';
          }
          
          // Iniciar turno
          this.stateService.setVendedorActivo(res.nombreUsuario || this.username, normalizedRol);
          
          // Redirigir al POS
          this.router.navigate(['/pos']);
        },
        error: (err) => {
          console.error('Error logging in backend:', err);
          
          // Si el error es de conexión (status === 0), caemos en modo local offline
          if (err.status === 0) {
            this.handleLocalLoginFallback();
          } else {
            // Mostrar error de credenciales devuelto por el servidor
            const msg = err.error?.message || 'Usuario o contraseña incorrectos en el servidor backend.';
            this.errorText.set(msg);
          }
        }
      });
    } else {
      // Modo offline/local por defecto
      this.handleLocalLoginFallback();
    }
  }

  private handleLocalLoginFallback() {
    const user = this.stateService.usuarios().find(
      u => u.username.toLowerCase() === this.username.trim().toLowerCase()
    );

    if (!user || !user.activo || user.password !== this.password) {
      this.errorText.set('Usuario o contraseña incorrectos, o usuario inactivo.');
      return;
    }

    // Si useBackend estaba activo, alertamos del modo local offline usando la alerta estilo iOS
    if (environment.useBackend) {
      this.stateService.alert(
        'Modo Sin Conexión',
        'El servidor backend está fuera de línea. Se ha iniciado sesión utilizando credenciales locales.'
      );
    }

    // Iniciar turno en store de forma directa
    this.stateService.setVendedorActivo(user.nombre, user.rol);
    
    // Redirigir directamente al POS
    this.router.navigate(['/pos']);
  }
}
