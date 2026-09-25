import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DispositivoResponse } from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class DispositivoService {
  private readonly url = `${API_BASE}/dispositivos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<DispositivoResponse[]> {
    return this.http.get<DispositivoResponse[]>(this.url);
  }

  crear(nombre: string, esComponenteCpu = false, requiereSerie = true): Observable<DispositivoResponse> {
    return this.http.post<DispositivoResponse>(this.url, {
      nombre,
      esComponenteCpu: String(esComponenteCpu),
      requiereSerie: String(requiereSerie),
    });
  }

  actualizar(
    id: number,
    nombre: string,
    esComponenteCpu?: boolean,
    requiereSerie?: boolean,
  ): Observable<DispositivoResponse> {
    const body: Record<string, string> = { nombre };
    if (esComponenteCpu !== undefined) {
      body['esComponenteCpu'] = String(esComponenteCpu);
    }
    if (requiereSerie !== undefined) {
      body['requiereSerie'] = String(requiereSerie);
    }
    return this.http.put<DispositivoResponse>(`${this.url}/${id}`, body);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
