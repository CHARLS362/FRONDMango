import { Routes } from '@angular/router';
import { PosLayoutComponent } from './shared/layouts/pos-layout/pos-layout.component';
import { AdminLayoutComponent } from './features/admin/layouts/admin-layout/admin-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/welcome.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'pos',
    component: PosLayoutComponent,
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/pos/pos.routes').then(m => m.posRoutes)
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  { path: '**', redirectTo: '' }
];
