import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';

import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../services/api-utils';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, FloatLabelModule, IconComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  contrasena = '';
  loading = signal(false);
  error = signal('');

  login(): void {
    if (!this.username.trim() || !this.contrasena) {
      this.error.set('Ingresa usuario y contraseña');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.auth.login({ username: this.username.trim(), contrasena: this.contrasena }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/estaciones']);
      },
      error: (err) => {
        this.loading.set(false);
        const e = parseApiError(err);
        this.error.set(e.status === 401 ? 'Usuario o contraseña incorrectos' : 'Error al iniciar sesión. Intente nuevamente.');
      },
    });
  }
}
