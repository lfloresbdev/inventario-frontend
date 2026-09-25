import { Pipe, PipeTransform } from '@angular/core';
import { DISCO_LABELS, RAM_LABELS, TIPO_ACCESO_LABELS } from './enum-options';

@Pipe({ name: 'ramTipo', standalone: true })
export class RamTipoPipe implements PipeTransform {
  transform(value?: string): string {
    return (value && RAM_LABELS[value as keyof typeof RAM_LABELS]) || value || '—';
  }
}

@Pipe({ name: 'discoTipo', standalone: true })
export class DiscoTipoPipe implements PipeTransform {
  transform(value?: string): string {
    return (value && DISCO_LABELS[value as keyof typeof DISCO_LABELS]) || value || '—';
  }
}

@Pipe({ name: 'tipoAcceso', standalone: true })
export class TipoAccesoPipe implements PipeTransform {
  transform(value?: string): string {
    return (value && TIPO_ACCESO_LABELS[value as keyof typeof TIPO_ACCESO_LABELS]) || value || '—';
  }
}
