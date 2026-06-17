import { Component, inject, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { POSStateService } from './core/services/pos-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private stateService = inject(POSStateService);

  alertState = this.stateService.alertState;
  promptVal = signal<string>('');

  constructor() {
    effect(() => {
      const state = this.alertState();
      if (state && state.type === 'prompt') {
        this.promptVal.set(state.defaultValue || '');
      } else {
        this.promptVal.set('');
      }
    });
  }

  confirmAlert() {
    const state = this.alertState();
    if (state && state.onConfirm) {
      if (state.type === 'prompt') {
        state.onConfirm(this.promptVal());
      } else {
        state.onConfirm();
      }
    }
    this.stateService.closeAlert();
  }

  cancelAlert() {
    const state = this.alertState();
    if (state && state.onCancel) {
      state.onCancel();
    }
    this.stateService.closeAlert();
  }
}
