import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empresa, LocalResponse } from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class LocalService {
  private readonly url = `${API_BASE}/locales`;

  constructor(private http: HttpClient) {}

  listar(): Observable<LocalResponse[]> {
    return this.http.get<LocalResponse[]>(this.url);
  }

  listarPorEmpresa(empresa: Empresa): Observable<LocalResponse[]> {
    return this.http.get<LocalResponse[]>(`${this.url}/empresa/${empresa}`);
  }

  listarInactivos(): Observable<LocalResponse[]> {
    return this.http.get<LocalResponse[]>(`${this.url}/inactivos`);
  }

  listarInactivosPorEmpresa(empresa: Empresa): Observable<LocalResponse[]> {
    return this.http.get<LocalResponse[]>(`${this.url}/empresa/${empresa}/inactivos`);
  }

  crear(nombre: string, empresa: Empresa): Observable<LocalResponse> {
    return this.http.post<LocalResponse>(this.url, { nombre, empresa });
  }

  actualizar(id: number, nombre: string, empresa: Empresa): Observable<LocalResponse> {
    return this.http.put<LocalResponse>(`${this.url}/${id}`, { nombre, empresa });
  }

  darDeBaja(id: number): Observable<LocalResponse> {
    return this.http.patch<LocalResponse>(`${this.url}/${id}/dar-de-baja`, null);
  }

  reactivar(id: number): Observable<LocalResponse> {
    return this.http.patch<LocalResponse>(`${this.url}/${id}/reactivar`, null);
  }
}
