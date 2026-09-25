import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Rol } from '../../models/inventario.models';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) return inject(Router).createUrlTree(['/login']);
  if (auth.rol() === Rol.ADMIN) return true;
  return inject(Router).createUrlTree(['/estaciones']);
};
