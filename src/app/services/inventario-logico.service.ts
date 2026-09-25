import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ContrasenaResponse,
  Empresa,
  InventarioLogicoRequest,
  InventarioLogicoResponse,
  InventarioLogicoUpdate,
  TipoAcceso,
} from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class InventarioLogicoService {
  private readonly url = `${API_BASE}/inventario-logico`;

  constructor(private http: HttpClient) {}

  porEmpresa(empresa: Empresa): Observable<InventarioLogicoResponse[]> {
    return this.http.get<InventarioLogicoResponse[]>(`${this.url}/empresa/${empresa}`);
  }

  porEstacion(estacionId: number): Observable<InventarioLogicoResponse[]> {
    return this.http.get<InventarioLogicoResponse[]>(`${this.url}/estacion/${estacionId}`);
  }

  porTipoAcceso(tipoAcceso: TipoAcceso): Observable<InventarioLogicoResponse[]> {
    return this.http.get<InventarioLogicoResponse[]>(`${this.url}/tipo-acceso/${tipoAcceso}`);
  }

  porUbicacion(ubicacionId: number): Observable<InventarioLogicoResponse[]> {
    return this.http.get<InventarioLogicoResponse[]>(`${this.url}/ubicacion/${ubicacionId}`);
  }

  obtenerContrasena(id: number): Observable<ContrasenaResponse> {
    return this.http.get<ContrasenaResponse>(`${this.url}/${id}/contrasena`);
  }

  crear(request: InventarioLogicoRequest): Observable<InventarioLogicoResponse> {
    return this.http.post<InventarioLogicoResponse>(this.url, request);
  }

  actualizar(id: number, update: InventarioLogicoUpdate): Observable<InventarioLogicoResponse> {
    return this.http.patch<InventarioLogicoResponse>(`${this.url}/${id}`, update);
  }

  asignarEstacion(id: number, estacionId: number): Observable<InventarioLogicoResponse> {
    return this.http.patch<InventarioLogicoResponse>(
      `${this.url}/${id}/asignar-estacion/${estacionId}`,
      null,
    );
  }

  quitarEstacion(id: number): Observable<InventarioLogicoResponse> {
    return this.http.patch<InventarioLogicoResponse>(`${this.url}/${id}/quitar-estacion`, null);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
