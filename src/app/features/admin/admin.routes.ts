import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./catalog/catalog.component').then(m => m.AdminCatalogComponent)
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./reports/reports.component').then(m => m.AdminReportsComponent)
  }
];
