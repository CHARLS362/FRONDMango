import { Routes } from '@angular/router';

export const posRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pos-terminal.component').then(m => m.PosTerminalComponent)
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('../historial-tickets/historial-tickets.component').then(m => m.HistorialTicketsComponent)
  }
];
