import { Component, computed, input, model } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { Popover, PopoverModule } from 'primeng/popover';

export interface OpcionAgrupada {
  id: number;
  label: string;
  cantidad: number;
  marca: string;
}

/**
 * Select con desplegable colapsable agrupado por marca. Cada opción muestra su conteo (xN)
 * y, al seleccionarla, el original tachado y cuántos quedarían tras la asignación (xN-1).
 */
@Component({
  selector: 'app-select-agrupado',
  imports: [PopoverModule, AccordionModule],
  templateUrl: './select-agrupado.component.html',
  styleUrl: './select-agrupado.component.scss',
})
export class SelectAgrupadoComponent {
  readonly opciones = input<OpcionAgrupada[]>([]);
  readonly placeholder = input('Seleccionar');
  /** true = desplegable por marca con acordeón; false = lista plana con contadores. */
  readonly agrupado = input(true);
  readonly value = model<number | null>(null);

  /** Opciones agrupadas por marca para el acordeón. */
  readonly grupos = computed(() => {
    const mapa = new Map<string, { marca: string; cantidad: number; items: OpcionAgrupada[] }>();
    for (const op of this.opciones()) {
      const g = mapa.get(op.marca);
      if (g) {
        g.items.push(op);
        g.cantidad += op.cantidad;
      } else {
        mapa.set(op.marca, { marca: op.marca, cantidad: op.cantidad, items: [op] });
      }
    }
    return [...mapa.values()].sort((a, b) => a.marca.localeCompare(b.marca));
  });

  readonly seleccionado = computed(
    () => this.opciones().find((o) => o.id === this.value()) ?? null,
  );

  seleccionar(op: OpcionAgrupada, popover: Popover): void {
    this.value.set(op.id);
    popover.hide();
  }
}
