import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Tooltip } from 'primeng/tooltip';

import { AuthService } from './services/auth.service';
import { InactivityService } from './services/inactivity.service';
import { Rol } from './models/inventario.models';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Tooltip, IconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  auth = inject(AuthService);
  readonly Rol = Rol;

  // Inicializa el detector de inactividad para toda la app
  private _inactivity = inject(InactivityService);

  logout(): void {
    this.auth.logout();
  }
}
