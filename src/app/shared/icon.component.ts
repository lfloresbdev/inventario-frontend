import { Component, input } from '@angular/core';

/**
 * Iconos Tabler (MIT) inlineados. Claves semánticas, no nombres de archivo,
 * para que el resto de la app no dependa de la nomenclatura de la librería.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }

      /* El trazo se define aquí y no en el SCSS del padre: con encapsulación
         emulada las reglas del padre no alcanzan el svg de este componente.
         El color llega por herencia de 'color' + stroke="currentColor". */
      svg {
        display: block;
        fill: none;
        stroke: currentcolor;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<string>('1.25rem');
}
