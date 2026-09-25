import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  { path: '', redirectTo: 'estaciones', pathMatch: 'full' },
  {
    path: 'estaciones',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/estaciones/estaciones.page').then((m) => m.EstacionesPage),
  },
  {
    path: 'estaciones/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/estaciones/estacion-detalle.page').then((m) => m.EstacionDetallePage),
  },
  {
    path: 'fisico',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventario-fisico/fisico.page').then((m) => m.FisicoPage),
  },
  {
    path: 'logico',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventario-logico/logico.page').then((m) => m.LogicoPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
  },
  { path: '**', redirectTo: 'estaciones' },
];
