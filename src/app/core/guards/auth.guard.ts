import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../state/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const user = authStore.vendedorActivo();
  const role = authStore.rolActivo();

  if (user !== null) {
    if (state.url.startsWith('/admin') && role !== 'administrador') {
      router.navigate(['/pos']);
      return false;
    }
    return true;
  }

  router.navigate(['/']);
  return false;
};
