import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarcaResponse } from '../models/inventario.models';
import { API_BASE } from './api-utils';

@Injectable({ providedIn: 'root' })
export class MarcaService {
  private readonly url = `${API_BASE}/dispositivos`;

  constructor(private http: HttpClient) {}

  listarPorDispositivo(dispositivoId: number): Observable<MarcaResponse[]> {
    return this.http.get<MarcaResponse[]>(`${this.url}/${dispositivoId}/marcas`);
  }

  crear(dispositivoId: number, nombre: string): Observable<MarcaResponse> {
    return this.http.post<MarcaResponse>(`${this.url}/${dispositivoId}/marcas`, { nombre });
  }

  actualizar(dispositivoId: number, marcaId: number, nombre: string): Observable<MarcaResponse> {
    return this.http.put<MarcaResponse>(`${this.url}/${dispositivoId}/marcas/${marcaId}`, { nombre });
  }

  eliminar(dispositivoId: number, marcaId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${dispositivoId}/marcas/${marcaId}`);
  }
}
