import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { deviceVisualType, accessVisualType } from '../../shared/visual-type';

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
  itemAsignarId: number | null = null;

  readonly nombre = computed(() => this.estacion()?.nombre ?? '');

  readonly itemsLibresOpciones = computed(() =>
    this.itemsLibres().map(i => ({
      id: i.id,
      label: [i.dispositivo?.nombre, i.marca?.nombre, i.modelo, i.serie].filter(Boolean).join(' · '),
    }))
  );

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

  liberarFisico(item: InventarioFisicoResponse): void {
    const label = [item.dispositivo?.nombre, item.marca?.nombre, item.modelo].filter(Boolean).join(' · ');
    this.confirm.confirm({
      message: `¿Liberar "${label}"? El item quedará sin asignación.`,
      header: 'Liberar item',
      acceptLabel: 'Liberar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.fisicoService.quitarEstacion(item.id).subscribe({
          next: () => {
            this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item liberado', life: 3000 });
            this.fisicos.update(list => list.filter(f => f.id !== item.id));
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
    this.itemAsignarId = null;
    this.fisicoService.libresPorEmpresa(empresa).subscribe({
      next: (data) => { this.itemsLibres.set(data); this.agregarItemVisible = true; },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  confirmarAgregarItem(): void {
    const estacionId = this.id();
    if (!this.itemAsignarId || !estacionId) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona un item', life: 3000 });
      return;
    }
    this.fisicoService.asignarEstacion(this.itemAsignarId, estacionId).subscribe({
      next: () => {
        this.agregarItemVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item agregado a la estación', life: 3000 });
        this.cargarInventarios(estacionId);
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  deviceIcon(item: InventarioFisicoResponse): string {
    return deviceVisualType(item.dispositivo?.nombre);
  }

  accessIcon(item: InventarioLogicoResponse): string {
    return accessVisualType(item.tipoAcceso);
  }
}
