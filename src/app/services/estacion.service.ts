import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empresa, EstacionRequest, EstacionResponse, EstacionUpdateRequest } from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class EstacionService {
  private readonly url = `${API_BASE}/estaciones`;

  constructor(private http: HttpClient) {}

  listar(): Observable<EstacionResponse[]> {
    return this.http.get<EstacionResponse[]>(this.url);
  }

  filtrarPorEmpresa(empresa: Empresa): Observable<EstacionResponse[]> {
    return this.http.get<EstacionResponse[]>(`${this.url}/empresa/${empresa}`);
  }

  filtrarPorLocal(localId: number): Observable<EstacionResponse[]> {
    return this.http.get<EstacionResponse[]>(`${this.url}/local/${localId}`);
  }

  buscarPorId(id: number): Observable<EstacionResponse> {
    return this.http.get<EstacionResponse>(`${this.url}/${id}`);
  }

  crear(request: EstacionRequest): Observable<EstacionResponse> {
    return this.http.post<EstacionResponse>(this.url, request);
  }

  actualizar(id: number, request: EstacionUpdateRequest): Observable<EstacionResponse> {
    return this.http.put<EstacionResponse>(`${this.url}/${id}`, request);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  listarInactivos(): Observable<EstacionResponse[]> {
    return this.http.get<EstacionResponse[]>(`${this.url}/inactivos`);
  }

  darDeBaja(id: number): Observable<EstacionResponse> {
    return this.http.patch<EstacionResponse>(`${this.url}/${id}/dar-de-baja`, null);
  }

  reactivar(id: number): Observable<EstacionResponse> {
    return this.http.patch<EstacionResponse>(`${this.url}/${id}/reactivar`, null);
  }
}
