import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { LoginRequest, LoginResponse, UserSession } from '../models/auth.models';
import { Rol } from '../models/inventario.models';
import { API_BASE } from './api-utils';

const SESSION_KEY = 'albru_session';
const TOKEN_KEY = 'albru_token';

interface JwtPayload {
  sub: string;
  rol: string;
  empresa?: string;
  exp: number;
  iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // El token es un signal para que todo lo derivado (rol, expiración) reaccione a login/logout
  private tokenSignal = signal<string | null>(this.loadToken());
  private sessionSignal = signal<UserSession | null>(this.loadSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly isLoggedIn = computed(
    () => this.sessionSignal() !== null && !this.isTokenExpired(this.tokenSignal()),
  );
  readonly empresa = computed(() => this.sessionSignal()?.empresa ?? null);
  readonly username = computed(() => this.sessionSignal()?.username ?? null);
  readonly nombre = computed(() => this.sessionSignal()?.nombre ?? null);

  // rol derivado del JWT firmado (no manipulable desde DevTools), reactivo al token
  readonly rol = computed((): Rol | null => {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token).rol as Rol;
    } catch {
      return null;
    }
  });

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/auth/login`, request).pipe(
      tap((res) => {
        sessionStorage.setItem(TOKEN_KEY, res.token);
        const session: UserSession = {
          username: res.username,
          nombre: res.nombre,
          empresa: res.empresa,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        this.tokenSignal.set(res.token);
        this.sessionSignal.set(session);
      }),
    );
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    // Clear any legacy localStorage entries from previous sessions
    localStorage.removeItem('albru_session');
    localStorage.removeItem('albru_token');
    this.tokenSignal.set(null);
    this.sessionSignal.set(null);

    this.http.post(`${API_BASE}/auth/logout`, {}).subscribe({ error: () => {} });

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  isSessionExpired(): boolean {
    return this.isTokenExpired(this.tokenSignal());
  }

  private isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const { exp } = jwtDecode<JwtPayload>(token);
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }

  private loadToken(): string | null {
    // Clear any legacy localStorage entries from previous sessions
    localStorage.removeItem('albru_session');
    localStorage.removeItem('albru_token');

    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      const { exp } = jwtDecode<JwtPayload>(token);
      if (Date.now() >= exp * 1000) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  private loadSession(): UserSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }
}
