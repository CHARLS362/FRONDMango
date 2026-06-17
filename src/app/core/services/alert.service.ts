import { Injectable, signal } from '@angular/core';

export interface AlertConfig {
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm?: (value?: any) => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  alertState = signal<AlertConfig | null>(null);

  alert(title: string, message: string, onConfirm?: () => void) {
    this.alertState.set({
      title,
      message,
      type: 'alert',
      onConfirm
    });
  }

  confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
    this.alertState.set({
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel
    });
  }

  prompt(title: string, message: string, defaultValue: string, placeholder: string, onConfirm: (val: string) => void, onCancel?: () => void) {
    this.alertState.set({
      title,
      message,
      type: 'prompt',
      defaultValue,
      placeholder,
      onConfirm,
      onCancel
    });
  }

  close() {
    this.alertState.set(null);
  }
}
