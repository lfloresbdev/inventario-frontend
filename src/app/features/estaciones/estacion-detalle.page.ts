import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ArrowLeft } from '@primeicons/angular/arrow-left';
import { MinusCircle } from '@primeicons/angular/minus-circle';
import { Plus } from '@primeicons/angular/plus';

import {
  EstacionResponse,
  InventarioFisicoResponse,
  InventarioLogicoResponse,
} from '../../models/inventario.models';
import { EstacionService } from '../../services/estacion.service';
import { InventarioFisicoService } from '../../services/inventario-fisico.service';
import { InventarioLogicoService } from '../../services/inventario-logico.service';
import { parseApiError } from '../../services/api-utils';
import { RamTipoPipe, DiscoTipoPipe, TipoAccesoPipe } from '../../shared/enum-pipes';
import { IconComponent } from '../../shared/icon.component';
import { OpcionAgrupada } from '../../shared/select-agrupado.component';
import { deviceVisualType, accessVisualType } from '../../shared/visual-type';

interface GrupoFisico {
  item: InventarioFisicoResponse;
  cantidad: number;
  items: InventarioFisicoResponse[];
}

/** Máximo de dispositivos permitidos por estación y a qué categoría pertenece cada uno. */
const CATEGORIAS: { key: string; label: string; max: number; dispositivos: string[] }[] = [
  { key: 'CPU', label: 'CPU', max: 1, dispositivos: ['CPU'] },
  { key: 'MONITOR', label: 'Monitor', max: 1, dispositivos: ['MONITOR'] },
  { key: 'TECLADO', label: 'Teclado', max: 1, dispositivos: ['TECLADO'] },
  { key: 'MOUSE', label: 'Mouse', max: 1, dispositivos: ['MOUSE'] },
  { key: 'AUDIFONOS', label: 'Audífonos', max: 1, dispositivos: ['AUDÍFONOS'] },
  { key: 'VIDEO', label: 'Cable de video (VGA/HDMI)', max: 1, dispositivos: ['CABLE VGA', 'CABLE HDMI'] },
  { key: 'PODER', label: 'Cables de poder', max: 2, dispositivos: ['CABLE PODER'] },
];

function categoriaDe(nombre: string | undefined): string | null {
  const n = (nombre ?? '').trim().toUpperCase();
  return CATEGORIAS.find((c) => c.dispositivos.includes(n))?.key ?? null;
}

@Component({
  selector: 'app-estacion-detalle',
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    ButtonModule,
    TagModule,
    TabsModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DrawerModule,
    SelectModule,
    AccordionModule,
    FloatLabelModule,
    ArrowLeft,
    MinusCircle,
    Plus,
    RamTipoPipe,
    DiscoTipoPipe,
    TipoAccesoPipe,
    IconComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './estacion-detalle.html',
  styleUrl: './estacion-detalle.scss',
})
export class EstacionDetallePage implements OnInit {
  private route = inject(ActivatedRoute);
  private estacionService = inject(EstacionService);
  private fisicoService = inject(InventarioFisicoService);
  private logicoService = inject(InventarioLogicoService);
  private confirm = inject(ConfirmationService);
  private ms = inject(MessageService);

  id = signal<number | null>(null);
  estacion = signal<EstacionResponse | null>(null);
  fisicos = signal<InventarioFisicoResponse[]>([]);
  logicos = signal<InventarioLogicoResponse[]>([]);
  loading = signal(true);
  tabIndex = '0';

  agregarItemVisible = false;
  itemsLibres = signal<InventarioFisicoResponse[]>([]);

  readonly nombre = computed(() => this.estacion()?.nombre ?? '');

  /** Categorías que la estación aún puede recibir, con sus items libres y sus opciones agrupadas. */
  readonly categoriasAgregables = computed(() => {
    const usados = new Map<string, number>();
    for (const f of this.fisicos()) {
      const key = categoriaDe(f.dispositivo?.nombre);
      if (key) usados.set(key, (usados.get(key) ?? 0) + 1);
    }
    const grupos = new Map<string, { key: string; label: string; icon: string; items: InventarioFisicoResponse[] }>();
    for (const i of this.itemsLibres()) {
      const key = categoriaDe(i.dispositivo?.nombre);
      if (!key) continue;
      const cat = CATEGORIAS.find((c) => c.key === key)!;
      if ((usados.get(key) ?? 0) >= cat.max) continue;
      const g = grupos.get(key);
      if (g) g.items.push(i);
      else grupos.set(key, { key, label: cat.label, icon: deviceVisualType(i.dispositivo?.nombre), items: [i] });
    }
    return CATEGORIAS.filter((c) => grupos.has(c.key)).map((c) => {
      const g = grupos.get(c.key)!;
      return { ...g, opciones: this.opcionesDe(g.items, c.key === 'VIDEO') };
    });
  });

  /** Opciones de un select agrupado: por dispositivo (video) o por marca + modelo, con su conteo. */
  private opcionesDe(items: InventarioFisicoResponse[], porDispositivo: boolean): OpcionAgrupada[] {
    const grupos = new Map<string, { item: InventarioFisicoResponse; cantidad: number }>();
    for (const i of items) {
      const clave = (porDispositivo
        ? (i.dispositivo?.nombre ?? '')
        : [i.marca?.nombre ?? '', i.modelo ?? ''].join('|')).toLowerCase();
      const g = grupos.get(clave);
      if (g) g.cantidad++;
      else grupos.set(clave, { item: i, cantidad: 1 });
    }
    return [...grupos.values()].map(({ item, cantidad }) => ({
      id: item.id,
      label: porDispositivo
        ? (item.dispositivo?.nombre ?? 'Cable')
        : (item.modelo || item.dispositivo?.nombre || 'Item'),
      cantidad,
      marca: porDispositivo ? (item.dispositivo?.nombre ?? 'Cable') : (item.marca?.nombre ?? 'Sin marca'),
    }));
  }

  /** Agrupa las opciones por marca para mostrarlas en subgrupos. */
  gruposDe(opciones: OpcionAgrupada[]) {
    const mapa = new Map<string, { marca: string; cantidad: number; items: OpcionAgrupada[] }>();
    for (const op of opciones) {
      const g = mapa.get(op.marca);
      if (g) { g.items.push(op); g.cantidad += op.cantidad; }
      else mapa.set(op.marca, { marca: op.marca, cantidad: op.cantidad, items: [op] });
    }
    return [...mapa.values()].sort((a, b) => a.marca.localeCompare(b.marca));
  }

  /** true cuando la estación ya tiene el máximo permitido en todas las categorías. */
  readonly estacionCompleta = computed(() => {
    const usados = new Map<string, number>();
    for (const f of this.fisicos()) {
      const key = categoriaDe(f.dispositivo?.nombre);
      if (key) usados.set(key, (usados.get(key) ?? 0) + 1);
    }
    return CATEGORIAS.every((c) => (usados.get(c.key) ?? 0) >= c.max);
  });

  // ---------- Agregar cable de poder (contador) ----------
  readonly cablesPoderLibres = computed(() =>
    this.itemsLibres().filter((i) => categoriaDe(i.dispositivo?.nombre) === 'PODER'));

  readonly cablesPoderEnEstacion = computed(() =>
    this.fisicos().filter((f) => categoriaDe(f.dispositivo?.nombre) === 'PODER').length);

  readonly maxCablesPoderAdd = computed(() =>
    Math.min(2 - this.cablesPoderEnEstacion(), this.cablesPoderLibres().length));

  cantidadCablesPoderAdd = 0;

  get cablesPoderAddRestantes(): number {
    return Math.max(0, this.cablesPoderLibres().length - this.cantidadCablesPoderAdd);
  }

  cambiarCablesAdd(delta: number): void {
    this.cantidadCablesPoderAdd = Math.min(Math.max(0, this.cantidadCablesPoderAdd + delta), this.maxCablesPoderAdd());
  }

  agregarCablesPoder(): void {
    const estacionId = this.id();
    const ids = this.cablesPoderLibres().slice(0, this.cantidadCablesPoderAdd).map((i) => i.id);
    if (!estacionId || ids.length === 0) return;
    forkJoin(ids.map((id) => this.fisicoService.asignarEstacion(id, estacionId))).subscribe({
      next: () => {
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Cables de poder agregados', life: 2500 });
        this.recargarTrasAsignar();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  // ---------- Selección de una categoría (asigna el item elegido) ----------
  onCategoriaSeleccion(id: number | null): void {
    if (id == null) return;
    this.asignarItemId(id);
  }

  asignarItemId(id: number): void {
    const estacionId = this.id();
    if (!estacionId) return;
    this.fisicoService.asignarEstacion(id, estacionId).subscribe({
      next: () => {
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item agregado a la estación', life: 2500 });
        this.recargarTrasAsignar();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  /** Recarga el inventario y los libres; cierra el drawer sólo si ya no queda nada por asignar. */
  private recargarTrasAsignar(): void {
    const estacionId = this.id();
    const empresa = this.estacion()?.local?.empresa;
    if (!estacionId || !empresa) return;
    forkJoin({
      fisicos: this.fisicoService.porEstacion(estacionId),
      logicos: this.logicoService.porEstacion(estacionId),
      libres: this.fisicoService.libresPorEmpresa(empresa),
    }).subscribe({
      next: ({ fisicos, logicos, libres }) => {
        this.fisicos.set(fisicos);
        this.logicos.set(logicos);
        this.itemsLibres.set(libres);
        this.cantidadCablesPoderAdd = 0;
        if (this.categoriasAgregables().length === 0) {
          this.agregarItemVisible = false;
          this.ms.add({
            severity: 'info',
            summary: 'Estación completa',
            detail: 'La estación ya tiene todos los dispositivos permitidos',
            life: 4000,
          });
        }
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      this.loading.set(false);
      return;
    }
    this.id.set(id);
    this.cargar(id);
  }

  cargar(id: number): void {
    this.loading.set(true);
    this.estacionService.buscarPorId(id).subscribe({
      next: (est) => {
        this.estacion.set(est);
        this.loading.set(false);
        this.cargarInventarios(id);
      },
      error: (err) => {
        this.loading.set(false);
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 });
      },
    });
  }

  cargarInventarios(id: number): void {
    this.fisicoService.porEstacion(id).subscribe({
      next: (data) => this.fisicos.set(data),
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje }),
    });
    this.logicoService.porEstacion(id).subscribe({
      next: (data) => this.logicos.set(data),
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje }),
    });
  }

  /** Items físicos agrupados por dispositivo + marca + modelo, con su conteo. */
  readonly fisicosAgrupados = computed<GrupoFisico[]>(() => {
    const mapa = new Map<string, { item: InventarioFisicoResponse; items: InventarioFisicoResponse[] }>();
    for (const f of this.fisicos()) {
      const clave = [f.dispositivo?.nombre ?? '', f.marca?.id ?? 0, f.modelo ?? ''].join('|').toLowerCase();
      const g = mapa.get(clave);
      if (g) g.items.push(f);
      else mapa.set(clave, { item: f, items: [f] });
    }
    return [...mapa.values()].map((g) => ({ item: g.item, cantidad: g.items.length, items: g.items }));
  });

  /** Los cables no muestran modelo en el detalle. */
  esCable(item: InventarioFisicoResponse): boolean {
    return (item.dispositivo?.nombre ?? '').toUpperCase().includes('CABLE');
  }

  liberarGrupo(grupo: GrupoFisico): void {
    const nombre = grupo.item.dispositivo?.nombre ?? 'item';
    const label = [nombre, grupo.item.marca?.nombre, grupo.item.modelo].filter(Boolean).join(' · ');
    this.confirm.confirm({
      message: grupo.cantidad > 1
        ? `¿Liberar ${grupo.cantidad} "${nombre}"? Quedarán sin asignación.`
        : `¿Liberar "${label}"? El item quedará sin asignación.`,
      header: 'Liberar item',
      acceptLabel: 'Liberar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        forkJoin(grupo.items.map((i) => this.fisicoService.quitarEstacion(i.id))).subscribe({
          next: () => {
            const ids = new Set(grupo.items.map((i) => i.id));
            this.fisicos.update((list) => list.filter((f) => !ids.has(f.id)));
            this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item(s) liberado(s)', life: 3000 });
          },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  liberarLogico(item: InventarioLogicoResponse): void {
    const label = [item.tipoAcceso, item.identificador].filter(Boolean).join(' · ');
    this.confirm.confirm({
      message: `¿Liberar "${label}"? El acceso quedará sin asignación.`,
      header: 'Liberar acceso',
      acceptLabel: 'Liberar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.logicoService.quitarEstacion(item.id).subscribe({
          next: () => {
            this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Acceso liberado', life: 3000 });
            this.logicos.update(list => list.filter(l => l.id !== item.id));
          },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  abrirAgregarItem(): void {
    const empresa = this.estacion()?.local?.empresa;
    if (!empresa) return;
    this.fisicoService.libresPorEmpresa(empresa).subscribe({
      next: (data) => { this.itemsLibres.set(data); this.agregarItemVisible = true; },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  asignarItem(item: InventarioFisicoResponse): void {
    this.asignarItemId(item.id);
  }

  deviceIcon(item: InventarioFisicoResponse): string {
    return deviceVisualType(item.dispositivo?.nombre);
  }

  accessIcon(item: InventarioLogicoResponse): string {
    return accessVisualType(item.tipoAcceso);
  }
}
