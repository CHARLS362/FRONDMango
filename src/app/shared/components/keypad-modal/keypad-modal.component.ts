import { Component, Input, Output, EventEmitter, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { POSStateService } from '../../../core/services/pos-state.service';

@Component({
  selector: 'app-keypad-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-verde-oscuro/45 backdrop-blur-md fade-in">
        <div class="w-96 rounded-3xl bg-crema border border-verde-oscuro/10 p-8 shadow-2xl flex flex-col items-center">
          
          <!-- Header -->
          <div class="w-full flex justify-between items-center mb-6">
            <h3 class="text-sm font-bold tracking-wider text-verde-oscuro/60 uppercase">Acceso Restringido</h3>
            <button 
              (click)="onClose()" 
              class="w-8 h-8 rounded-full bg-verde-oscuro/5 hover:bg-verde-oscuro/10 flex items-center justify-center text-verde-oscuro transition-colors cursor-pointer"
            >
              <lucide-icon name="x" size="16"></lucide-icon>
            </button>
          </div>

          <!-- Info -->
          <div class="text-center mb-8">
            <h2 class="text-xl font-black text-verde-oscuro">Clave del Administrador</h2>
            <p class="text-xs text-verde-oscuro/50 mt-1">Ingrese su pin de seguridad para acceder</p>
          </div>

          <!-- Passcode Circles Indicator -->
          <div class="flex gap-6 justify-center mb-10" [ngClass]="isShaking() ? 'animate-bounce' : ''">
            @for (circle of [0, 1, 2, 3]; track circle) {
              <div
                [ngClass]="[
                  error()
                    ? 'bg-[#FF8E25] border-[#FF8E25]'
                    : passcode().length > circle
                    ? 'bg-verde-oscuro border-verde-oscuro scale-110'
                    : 'border-verde-oscuro/25 bg-transparent'
                ]"
                class="w-4 h-4 rounded-full border-2 transition-all duration-200"
              ></div>
            }
          </div>

          <!-- Grid Numbers keypad -->
          <div class="grid grid-cols-3 gap-5 max-w-[270px] w-full mb-6">
            @for (num of ['1', '2', '3', '4', '5', '6', '7', '8', '9']; track num) {
              <button
                (click)="handleKeyPress(num)"
                class="w-16 h-16 rounded-full bg-white hover:bg-verde-oscuro/5 active:bg-verde-oscuro/10 text-verde-oscuro font-bold text-2xl flex items-center justify-center border border-verde-oscuro/5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                {{ num }}
              </button>
            }
            
            <!-- Empty spacer -->
            <div class="w-16 h-16"></div>
            
            <button
              (click)="handleKeyPress('0')"
              class="w-16 h-16 rounded-full bg-white hover:bg-verde-oscuro/5 active:bg-verde-oscuro/10 text-verde-oscuro font-bold text-2xl flex items-center justify-center border border-verde-oscuro/5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              0
            </button>

            <button
              (click)="handleDelete()"
              class="w-16 h-16 rounded-full bg-white hover:bg-naranja/10 text-naranja flex items-center justify-center border border-naranja/10 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <lucide-icon name="delete" size="20"></lucide-icon>
            </button>
          </div>

          <!-- Error message -->
          @if (error()) {
            <p class="text-xs text-[#FF8E25] font-bold animate-pulse">Código de seguridad incorrecto</p>
          }
        </div>
      </div>
    }
  `
})
export class KeypadModalComponent {
  private stateService = inject(POSStateService);

  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  passcode = signal<string>('');
  error = signal<boolean>(false);
  isShaking = signal<boolean>(false);

  constructor() {
    // Escucha cambios en isOpen para resetear
    effect(() => {
      if (this.isOpen) {
        this.passcode.set('');
        this.error.set(false);
        this.isShaking.set(false);
      }
    }, { allowSignalWrites: true });
  }

  handleKeyPress(num: string) {
    if (this.passcode().length < 4) {
      const newPass = this.passcode() + num;
      this.passcode.set(newPass);

      // Auto-validate once 4 digits are entered
      if (newPass.length === 4) {
        if (newPass === this.stateService.claveAdministrador()) {
          setTimeout(() => {
            this.success.emit();
          }, 300);
        } else {
          setTimeout(() => {
            this.error.set(true);
            this.isShaking.set(true);
            
            // Shake effect and clear
            setTimeout(() => {
              this.isShaking.set(false);
              this.passcode.set('');
              this.error.set(false);
            }, 600);
          }, 200);
        }
      }
    }
  }

  handleDelete() {
    if (this.passcode().length > 0) {
      this.passcode.set(this.passcode().slice(0, -1));
    }
  }

  onClose() {
    this.close.emit();
  }
}
