import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Empresa,
  InventarioFisicoRequest,
  InventarioFisicoResponse,
  InventarioFisicoUpdate,
} from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class InventarioFisicoService {
  private readonly url = `${API_BASE}/inventario-fisico`;

  constructor(private http: HttpClient) {}

  porEmpresa(empresa: Empresa): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/empresa/${empresa}`);
  }

  sinAsignarPorEmpresa(empresa: Empresa): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/empresa/${empresa}/sin-asignar`);
  }

  porEstacion(estacionId: number): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/estacion/${estacionId}`);
  }

  porDispositivo(dispositivoId: number): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/dispositivo/${dispositivoId}`);
  }

  porLocal(localId: number): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/local/${localId}`);
  }

  porUbicacion(ubicacionId: number): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/ubicacion/${ubicacionId}`);
  }

  crear(request: InventarioFisicoRequest): Observable<InventarioFisicoResponse> {
    return this.http.post<InventarioFisicoResponse>(this.url, request);
  }

  actualizar(id: number, update: InventarioFisicoUpdate): Observable<InventarioFisicoResponse> {
    return this.http.patch<InventarioFisicoResponse>(`${this.url}/${id}`, update);
  }

  asignarEstacion(id: number, estacionId: number): Observable<InventarioFisicoResponse> {
    return this.http.patch<InventarioFisicoResponse>(
      `${this.url}/${id}/asignar-estacion/${estacionId}`,
      null,
    );
  }

  quitarEstacion(id: number): Observable<InventarioFisicoResponse> {
    return this.http.patch<InventarioFisicoResponse>(`${this.url}/${id}/quitar-estacion`, null);
  }

  componentes(cpuId: number): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/${cpuId}/componentes`);
  }

  libresPorEmpresa(empresa: Empresa): Observable<InventarioFisicoResponse[]> {
    return this.http.get<InventarioFisicoResponse[]>(`${this.url}/empresa/${empresa}/libres`);
  }

  asignarACpu(id: number, cpuId: number): Observable<InventarioFisicoResponse> {
    return this.http.patch<InventarioFisicoResponse>(`${this.url}/${id}/asignar-cpu/${cpuId}`, null);
  }

  quitarDeCpu(id: number): Observable<InventarioFisicoResponse> {
    return this.http.patch<InventarioFisicoResponse>(`${this.url}/${id}/quitar-cpu`, null);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
