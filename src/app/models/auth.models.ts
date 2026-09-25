import { Empresa, Rol } from './inventario.models';

export interface LoginRequest {
  username: string;
  contrasena: string;
}

export interface LoginResponse {
  nombre: string;
  username: string;
  rol: Rol;
  empresa: Empresa | null;
  expiresAt: number;
  token: string;
}

export interface UserSession {
  username: string;
  nombre: string;
  empresa: Empresa | null;
}
