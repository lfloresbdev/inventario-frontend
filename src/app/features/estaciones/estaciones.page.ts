import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Plus } from '@primeicons/angular/plus';
import { Pencil } from '@primeicons/angular/pencil';
import { Trash } from '@primeicons/angular/trash';
import { Building } from '@primeicons/angular/building';
import { Link } from '@primeicons/angular/link';

import {
  Empresa,
  EstacionResponse,
  EstacionUpdateRequest,
  InventarioFisicoResponse,
  LocalResponse,
  Rol,
  UbicacionFisicaResponse,
} from '../../models/inventario.models';
import { EstacionService } from '../../services/estacion.service';
import { LocalService } from '../../services/local.service';
import { UbicacionFisicaService } from '../../services/ubicacion-fisica.service';
import { InventarioFisicoService } from '../../services/inventario-fisico.service';
import { InventarioLogicoService } from '../../services/inventario-logico.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../services/api-utils';
import { EMPRESA_OPTIONS } from '../../shared/enum-options';
import { IconComponent } from '../../shared/icon.component';
import { OpcionAgrupada, SelectAgrupadoComponent } from '../../shared/select-agrupado.component';

interface ItemOpcion { id: number; label: string; }

@Component({
  selector: 'app-estaciones',
  imports: [
    IconComponent,
    SelectAgrupadoComponent,
    FormsModule,
    RouterLink,
    ButtonModule,
    DrawerModule,
    SelectModule,
    InputNumberModule,
    FloatLabelModule,
    TagModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    Plus,
    Pencil,
    Trash,
    Building,
    Link,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './estaciones.html',
  styleUrl: './estaciones.scss',
})
export class EstacionesPage implements OnInit {
  private service = inject(EstacionService);
  private localService = inject(LocalService);
  private ubicacionService = inject(UbicacionFisicaService);
  private fisicoService = inject(InventarioFisicoService);
  private logicoService = inject(InventarioLogicoService);
  private auth = inject(AuthService);
  private ms = inject(MessageService);
  private confirm = inject(ConfirmationService);

  estaciones = signal<EstacionResponse[]>([]);
  estacionesInactivas = signal<EstacionResponse[]>([]);
  verInactivas = false;
  localesDisponibles = signal<LocalResponse[]>([]);
  ubicacionesDisponibles = signal<UbicacionFisicaResponse[]>([]);
  loading = signal(false);

  readonly Rol = Rol;
  readonly empresaOptions = EMPRESA_OPTIONS;
  readonly tipoInventarioOptions = [
    { label: 'Físico', value: 'FISICO' },
    { label: 'Lógico', value: 'LOGICO' },
  ];
  readonly modoOptions = [
    { label: 'Escritorio', value: 'ESCRITORIO' },
    { label: 'Laptop', value: 'LAPTOP' },
  ];

  // --- Drawer crear ---
  drawerVisible = false;
  empresaForm: Empresa | undefined;
  localId: number | undefined;
  ubicacionFisicaId: number | undefined;
  modoCrear: 'ESCRITORIO' | 'LAPTOP' = 'ESCRITORIO';

  // Items disponibles sin asignar (cargados por empresa)
  itemsDisponibles = signal<InventarioFisicoResponse[]>([]);
  loadingItems = false;

  // Selects de dispositivos — Escritorio
  selCpu: number | null = null;
  selMonitor: number | null = null;
  selTeclado: number | null = null;
  selMouse: number | null = null;
  selAudifonos: number | null = null;
  /** Cantidad de cables de poder a asignar (máx 2 por regla de negocio). */
  cantidadCablesPoder = 0;
  selCableVideo: number | null = null; // VGA o HDMI

  // Selects de dispositivos — Laptop
  selLaptop: number | null = null;
  selCargador: number | null = null;

  // --- Drawer editar ---
  editandoId: number | null = null;
  editDrawerVisible = false;
  editEmpresaForm: Empresa | undefined;
  editLocalId: number | undefined;
  editUbicacionFisicaId: number | undefined;
  editLocalesDisponibles = signal<LocalResponse[]>([]);
  editUbicacionesDisponibles = signal<UbicacionFisicaResponse[]>([]);

  // --- Drawer asignar item ---
  asignarDrawerVisible = false;
  estacionTarget: EstacionResponse | null = null;
  tipoInventario: 'FISICO' | 'LOGICO' | null = null;
  asignarItemsDisponibles = signal<ItemOpcion[]>([]);
  loadingAsignarItems = false;
  itemSeleccionadoId: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  get isAdmin(): boolean {
    return this.auth.rol() === Rol.ADMIN;
  }

  cargar(): void {
    this.loading.set(true);
    const empresa = this.auth.empresa();
    const obs$ = empresa ? this.service.filtrarPorEmpresa(empresa) : this.service.listar();
    obs$.subscribe({
      next: (data) => { this.estaciones.set(data); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 4000 });
      },
    });
  }

  // ---------- CREAR ----------

  abrirNueva(): void {
    this.resetCrearForm();
    this.drawerVisible = true;
    const empresa = this.auth.empresa();
    if (empresa) {
      this.empresaForm = empresa;
      this.cargarLocales(empresa);
      this.cargarItemsDisponibles(empresa);
    }
  }

  onEmpresaChange(): void {
    this.localId = undefined;
    this.ubicacionFisicaId = undefined;
    this.ubicacionesDisponibles.set([]);
    this.resetSelects();
    const empresa = this.auth.empresa() ?? this.empresaForm;
    if (empresa) {
      this.cargarLocales(empresa);
      this.cargarItemsDisponibles(empresa);
    }
  }

  cargarLocales(empresa: Empresa): void {
    this.localService.listarPorEmpresa(empresa).subscribe({
      next: (data) => this.localesDisponibles.set(data),
      error: () => {},
    });
  }

  cargarItemsDisponibles(empresa: Empresa): void {
    this.loadingItems = true;
    this.fisicoService.sinAsignarPorEmpresa(empresa).subscribe({
      next: (data) => {
        this.itemsDisponibles.set(data);
        this.cantidadCablesPoder = this.maxCablesPoder;
        this.loadingItems = false;
      },
      error: () => { this.loadingItems = false; },
    });
  }

  onLocalChange(): void {
    this.ubicacionFisicaId = undefined;
    this.ubicacionesDisponibles.set([]);
    if (this.localId) {
      this.ubicacionService.listarPorLocal(this.localId).subscribe({
        next: (data) => this.ubicacionesDisponibles.set(data),
        error: () => {},
      });
    }
  }

  onModoChange(): void {
    this.resetSelects();
  }

  itemsPorDispositivo(nombre: string): InventarioFisicoResponse[] {
    return this.itemsDisponibles().filter(
      (i) => i.dispositivo?.nombre?.trim().toUpperCase() === nombre.trim().toUpperCase(),
    );
  }

  itemsCableVideo(): InventarioFisicoResponse[] {
    return this.itemsDisponibles().filter((i) => {
      const n = i.dispositivo?.nombre?.toUpperCase() ?? '';
      return n === 'CABLE VGA' || n === 'CABLE HDMI';
    });
  }

  private itemLabel(item: InventarioFisicoResponse): string {
    const parts: string[] = [];
    if (item.hostname) parts.push(item.hostname);
    if (item.marca?.nombre) parts.push(item.marca.nombre);
    if (item.modelo) parts.push(item.modelo);
    if (item.procesador) parts.push(item.procesador);
    if (item.ramTipo && item.ramEspacio != null) parts.push(`${item.ramEspacio}GB ${item.ramTipo}`);
    if (item.discoTipo && item.discoEspacio != null) parts.push(`${item.discoEspacio}GB ${item.discoTipo}`);
    if (item.pulgadas != null) parts.push(`${item.pulgadas}"`);
    if (item.serie) parts.push(`${item.serie}`);
    return parts.join(' · ') || item.dispositivo?.nombre || 'Item';
  }

  private toOpciones(items: InventarioFisicoResponse[]): ItemOpcion[] {
    return items.map((i) => ({ id: i.id, label: this.itemLabel(i) }));
  }

  /** Agrupa items idénticos (marca + modelo [, + pulgadas]) en una opción con su conteo. */
  private agruparItems(items: InventarioFisicoResponse[], conPulgadas = false): OpcionAgrupada[] {
    const grupos = new Map<string, { item: InventarioFisicoResponse; cantidad: number }>();
    for (const i of items) {
      const clave = [i.marca?.nombre ?? '', i.modelo ?? '', conPulgadas ? i.pulgadas ?? '' : '']
        .join('|').toLowerCase();
      const g = grupos.get(clave);
      if (g) g.cantidad++;
      else grupos.set(clave, { item: i, cantidad: 1 });
    }
    return [...grupos.values()].map(({ item, cantidad }) => ({
      id: item.id,
      label: this.itemGroupLabel(item, conPulgadas),
      cantidad,
      marca: item.marca?.nombre ?? 'Sin marca',
    }));
  }

  private itemGroupLabel(item: InventarioFisicoResponse, conPulgadas: boolean): string {
    const parts: string[] = [];
    if (item.marca?.nombre) parts.push(item.marca.nombre);
    if (item.modelo) parts.push(item.modelo);
    if (conPulgadas && item.pulgadas != null) parts.push(`${item.pulgadas}"`);
    return parts.join(' · ') || (item.dispositivo?.nombre ?? 'Item');
  }

  /** Cables de video agrupados por dispositivo (CABLE VGA / CABLE HDMI) con su conteo total. */
  private agruparCableVideo(items: InventarioFisicoResponse[]): OpcionAgrupada[] {
    const grupos = new Map<string, { item: InventarioFisicoResponse; cantidad: number }>();
    for (const i of items) {
      const dispositivo = i.dispositivo?.nombre ?? 'Cable';
      const g = grupos.get(dispositivo);
      if (g) g.cantidad++;
      else grupos.set(dispositivo, { item: i, cantidad: 1 });
    }
    return [...grupos.values()].map(({ item, cantidad }) => ({
      id: item.id,
      label: item.dispositivo?.nombre ?? 'Cable',
      cantidad,
      marca: item.dispositivo?.nombre ?? 'Cable',
    }));
  }

  readonly cpuOpciones     = computed(() => this.toOpciones(this.itemsPorDispositivo('CPU')));
  readonly monitorOpciones  = computed(() => this.agruparItems(this.itemsPorDispositivo('MONITOR'), true));
  readonly tecladoOpciones  = computed(() => this.agruparItems(this.itemsPorDispositivo('TECLADO')));
  readonly mouseOpciones    = computed(() => this.agruparItems(this.itemsPorDispositivo('MOUSE')));
  readonly aufifonosOpciones = computed(() => this.agruparItems(this.itemsPorDispositivo('AUDÍFONOS')));
  /** Cables de poder libres y cuántos quedarían según lo elegido en el contador. */
  get cablesPoderDisponibles(): number {
    return this.itemsPorDispositivo('CABLE PODER').length;
  }

  get maxCablesPoder(): number {
    return Math.min(2, this.cablesPoderDisponibles);
  }

  get cablesPoderRestantes(): number {
    return Math.max(0, this.cablesPoderDisponibles - this.cantidadCablesPoder);
  }

  cambiarCables(delta: number): void {
    this.cantidadCablesPoder = Math.min(Math.max(0, this.cantidadCablesPoder + delta), this.maxCablesPoder);
  }
  readonly cableVideoOpciones = computed(() => this.agruparCableVideo(this.itemsCableVideo()));
  readonly laptopOpciones   = computed(() => this.toOpciones(this.itemsPorDispositivo('LAPTOP')));
  readonly cargadorOpciones = computed(() => this.toOpciones(this.itemsPorDispositivo('CARGADOR')));

  guardar(): void {
    const empresa = this.auth.empresa() ?? this.empresaForm;
    if (!empresa) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona la empresa', life: 3000 });
      return;
    }
    if (!this.localId || !this.ubicacionFisicaId) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona local y ubicación física', life: 3000 });
      return;
    }

    let itemIds: number[];
    if (this.modoCrear === 'LAPTOP') {
      if (!this.selLaptop || !this.selCargador) {
        this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona LAPTOP y CARGADOR', life: 3000 });
        return;
      }
      itemIds = [this.selLaptop, this.selCargador];
    } else {
      if (!this.selCpu || !this.selMonitor || !this.selTeclado || !this.selMouse ||
          !this.selAudifonos || !this.selCableVideo) {
        this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Completa todos los dispositivos de escritorio', life: 3000 });
        return;
      }
      const cablesPoder = this.itemsPorDispositivo('CABLE PODER')
        .slice(0, this.cantidadCablesPoder)
        .map((i) => i.id);
      itemIds = [this.selCpu, this.selMonitor, this.selTeclado, this.selMouse,
                 this.selAudifonos, ...cablesPoder, this.selCableVideo];
    }

    const req = { empresa, localId: this.localId, ubicacionFisicaId: this.ubicacionFisicaId, itemIds };
    this.service.crear(req).subscribe({
      next: () => {
        this.drawerVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Estación creada', life: 3000 });
        this.cargar();
      },
      error: (err) => {
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 6000 });
      },
    });
  }

  resetCrearForm(): void {
    this.empresaForm = undefined;
    this.localId = undefined;
    this.ubicacionFisicaId = undefined;
    this.modoCrear = 'ESCRITORIO';
    this.localesDisponibles.set([]);
    this.ubicacionesDisponibles.set([]);
    this.itemsDisponibles.set([]);
    this.resetSelects();
  }

  resetSelects(): void {
    this.selCpu = null; this.selMonitor = null; this.selTeclado = null;
    this.selMouse = null; this.selAudifonos = null;
    this.cantidadCablesPoder = 0; this.selCableVideo = null;
    this.selLaptop = null; this.selCargador = null;
  }

  // ---------- EDITAR ----------

  abrirEditar(est: EstacionResponse): void {
    this.editandoId = est.id;
    this.editEmpresaForm = est.empresa;
    this.editLocalId = est.local?.id;
    this.editUbicacionFisicaId = est.ubicacionFisica?.id;
    this.editDrawerVisible = true;
    const empresa = this.auth.empresa() ?? est.empresa;
    this.localService.listarPorEmpresa(empresa).subscribe({
      next: (data) => this.editLocalesDisponibles.set(data),
      error: () => {},
    });
    if (est.local?.id) {
      this.ubicacionService.listarPorLocal(est.local.id).subscribe({
        next: (data) => this.editUbicacionesDisponibles.set(data),
        error: () => {},
      });
    }
  }

  onEditLocalChange(): void {
    this.editUbicacionFisicaId = undefined;
    this.editUbicacionesDisponibles.set([]);
    if (this.editLocalId) {
      this.ubicacionService.listarPorLocal(this.editLocalId).subscribe({
        next: (data) => this.editUbicacionesDisponibles.set(data),
        error: () => {},
      });
    }
  }

  guardarEdicion(): void {
    if (!this.editandoId || !this.editLocalId || !this.editUbicacionFisicaId) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Completa todos los campos', life: 3000 });
      return;
    }
    const empresa = this.auth.empresa() ?? this.editEmpresaForm;
    if (!empresa) return;
    const req: EstacionUpdateRequest = { empresa, localId: this.editLocalId, ubicacionFisicaId: this.editUbicacionFisicaId };
    this.service.actualizar(this.editandoId, req).subscribe({
      next: () => {
        this.editDrawerVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Estación actualizada', life: 3000 });
        this.cargar();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  // ---------- ASIGNAR ITEM ----------

  abrirAsignar(est: EstacionResponse): void {
    this.estacionTarget = est;
    this.tipoInventario = null;
    this.itemSeleccionadoId = null;
    this.asignarItemsDisponibles.set([]);
    this.asignarDrawerVisible = true;
  }

  onTipoInventarioChange(): void {
    this.itemSeleccionadoId = null;
    this.asignarItemsDisponibles.set([]);
    if (!this.tipoInventario || !this.estacionTarget) return;
    const empresa = this.estacionTarget.empresa;
    this.loadingAsignarItems = true;
    if (this.tipoInventario === 'FISICO') {
      this.fisicoService.sinAsignarPorEmpresa(empresa).subscribe({
        next: (items) => {
          this.asignarItemsDisponibles.set(items.map((i) => ({
            id: i.id,
            label: `${i.dispositivo?.nombre ?? ''} ${i.marca?.nombre ?? ''}${i.modelo ? ' · ' + i.modelo : ''}`,
          })));
          this.loadingAsignarItems = false;
        },
        error: () => { this.loadingAsignarItems = false; },
      });
    } else {
      this.logicoService.porEmpresa(empresa).subscribe({
        next: (items) => {
          this.asignarItemsDisponibles.set(
            items.filter((i) => !i.estacionId).map((i) => ({
              id: i.id,
              label: `${i.tipoAcceso} - ${i.identificador}`,
            })),
          );
          this.loadingAsignarItems = false;
        },
        error: () => { this.loadingAsignarItems = false; },
      });
    }
  }

  confirmarAsignar(): void {
    if (!this.itemSeleccionadoId || !this.estacionTarget || !this.tipoInventario) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona un item', life: 3000 });
      return;
    }
    const estId = this.estacionTarget.id;
    const itemId = this.itemSeleccionadoId;
    const onNext = () => {
      this.asignarDrawerVisible = false;
      this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item asignado a la estación', life: 3000 });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onError = (err: any) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 });
    if (this.tipoInventario === 'FISICO') {
      this.fisicoService.asignarEstacion(itemId, estId).subscribe({ next: onNext, error: onError });
    } else {
      this.logicoService.asignarEstacion(itemId, estId).subscribe({ next: onNext, error: onError });
    }
  }

  // ---------- ELIMINAR ----------

  eliminar(est: EstacionResponse): void {
    this.confirm.confirm({
      header: 'Eliminar estación',
      message: `¿Eliminar la estación "${est.nombre}"? Los items asignados quedarán sin asignar.`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.eliminar(est.id).subscribe({
          next: () => {
            this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Estación eliminada', life: 3000 });
            this.cargar();
          },
          error: (err) => {
            this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 });
          },
        });
      },
    });
  }

  // ---------- DAR DE BAJA / REACTIVAR ----------

  toggleInactivas(): void {
    this.verInactivas = !this.verInactivas;
    if (this.verInactivas) {
      this.refrescarInactivas();
    }
  }

  reactivar(est: EstacionResponse): void {
    this.service.reactivar(est.id).subscribe({
      next: () => {
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Estación reactivada', life: 3000 });
        this.cargar();
        this.refrescarInactivas();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  private refrescarInactivas(): void {
    this.service.listarInactivos().subscribe({
      next: (data) => this.estacionesInactivas.set(data),
      error: () => {},
    });
  }
}
