import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UbicacionFisicaResponse } from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class UbicacionFisicaService {
  private readonly url = `${API_BASE}/ubicaciones-fisicas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<UbicacionFisicaResponse[]> {
    return this.http.get<UbicacionFisicaResponse[]>(this.url);
  }

  listarPorLocal(localId: number): Observable<UbicacionFisicaResponse[]> {
    return this.http.get<UbicacionFisicaResponse[]>(`${this.url}/local/${localId}`);
  }

  crear(nombre: string, localId: number): Observable<UbicacionFisicaResponse> {
    return this.http.post<UbicacionFisicaResponse>(this.url, { nombre, localId });
  }

  actualizar(id: number, nombre: string, localId: number): Observable<UbicacionFisicaResponse> {
    return this.http.put<UbicacionFisicaResponse>(`${this.url}/${id}`, { nombre, localId });
  }

  listarInactivos(): Observable<UbicacionFisicaResponse[]> {
    return this.http.get<UbicacionFisicaResponse[]>(`${this.url}/inactivos`);
  }

  darDeBaja(id: number): Observable<UbicacionFisicaResponse> {
    return this.http.patch<UbicacionFisicaResponse>(`${this.url}/${id}/dar-de-baja`, null);
  }

  reactivar(id: number): Observable<UbicacionFisicaResponse> {
    return this.http.patch<UbicacionFisicaResponse>(`${this.url}/${id}/reactivar`, null);
  }
}
