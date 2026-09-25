import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponseDTO } from '../models/inventario.models';

export const API_BASE = '/api';

export interface ApiError {
  status: number;
  mensaje: string;
  detalles: string[];
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body: Partial<ErrorResponseDTO> | undefined =
      typeof error.error === 'object' && error.error !== null ? error.error : undefined;

    let mensaje = body?.mensaje;
    let detalles = Array.isArray(body?.detalles) ? body.detalles : [];

    if (!mensaje) {
      switch (error.status) {
        case 400:
          mensaje = 'Datos inválidos';
          break;
        case 404:
          mensaje = 'Recurso no encontrado';
          break;
        case 409:
          mensaje = 'Ya existe un registro con esos datos';
          break;
        case 500:
          mensaje = 'Error interno del servidor';
          break;
        default:
          mensaje = 'Error inesperado';
      }
    }

    return { status: error.status, mensaje, detalles };
  }

  return { status: 0, mensaje: 'Sin conexión con el servidor', detalles: [] };
}
