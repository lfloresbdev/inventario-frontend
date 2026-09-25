import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Plus } from '@primeicons/angular/plus';
import { Pencil } from '@primeicons/angular/pencil';
import { Trash } from '@primeicons/angular/trash';
import { Key } from '@primeicons/angular/key';
import { Eye } from '@primeicons/angular/eye';
import { EyeSlash } from '@primeicons/angular/eye-slash';
import { Link } from '@primeicons/angular/link';
import { TimesCircle } from '@primeicons/angular/times-circle';

import {
  Empresa,
  EstacionResponse,
  InventarioLogicoRequest,
  InventarioLogicoResponse,
  Rol,
  TipoAcceso,
  UbicacionFisicaResponse,
} from '../../models/inventario.models';
import { InventarioLogicoService } from '../../services/inventario-logico.service';
import { EstacionService } from '../../services/estacion.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../services/api-utils';
import { EMPRESA_OPTIONS, TIPO_ACCESO_OPTIONS } from '../../shared/enum-options';
import { TipoAccesoPipe } from '../../shared/enum-pipes';
import { IconComponent } from '../../shared/icon.component';
import { accessVisualType as resolveAccessIcon } from '../../shared/visual-type';

@Component({
  selector: 'app-logico',
  imports: [
    FormsModule,
    ButtonModule,
    DrawerModule,
    SelectModule,
    InputTextModule,
    FloatLabelModule,
    TagModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    Plus,
    Pencil,
    Trash,
    Key,
    Eye,
    EyeSlash,
    Link,
    TimesCircle,
    TipoAccesoPipe,
    IconComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './logico.html',
  styleUrl: './logico.scss',
})
export class LogicoPage implements OnInit {
  private service = inject(InventarioLogicoService);
  private estacionService = inject(EstacionService);
  private auth = inject(AuthService);
  private confirm = inject(ConfirmationService);
  private ms = inject(MessageService);

  items = signal<InventarioLogicoResponse[]>([]);
  estaciones = signal<EstacionResponse[]>([]);
  loading = signal(false);

  filtroUbicacionId: number | null = null;
  filtroTipoAcceso: TipoAcceso | null = null;
  filtroEstacion: number | null = null;

  get ubicacionesDeEstaciones(): UbicacionFisicaResponse[] {
    const map = new Map<number, UbicacionFisicaResponse>();
    this.estaciones().forEach((e) => {
      if (e.ubicacionFisica?.id) map.set(e.ubicacionFisica.id, e.ubicacionFisica);
    });
    return Array.from(map.values());
  }

  drawerVisible = false;
  editandoId: number | null = null;
  originalEstacionId: number | undefined;

  asignarDrawerVisible = false;
  itemAsignarId: number | null = null;
  estacionAsignarId: number | null = null;

  tipoAcceso: TipoAcceso | undefined;
  identificador = '';
  contrasena = '';
  mostrarContrasena = false;
  readonly soportaTextSecurity =
    typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc');
  estacionId: number | null = null;
  empresaForm: Empresa | undefined;

  contrasenas = signal(new Map<number, string>());
  visibles = signal(new Set<number>());

  readonly Rol = Rol;
  readonly tipoAccesoOptions = TIPO_ACCESO_OPTIONS;
  readonly empresaOptions = EMPRESA_OPTIONS;

  get isAdmin(): boolean {
    return this.auth.rol() === Rol.ADMIN;
  }

  ngOnInit(): void {
    const empresa = this.auth.empresa();
    const estaciones$ = empresa
      ? this.estacionService.filtrarPorEmpresa(empresa)
      : forkJoin([
          this.estacionService.filtrarPorEmpresa(Empresa.LYBTEL),
          this.estacionService.filtrarPorEmpresa(Empresa.RUNA),
        ]).pipe(map(([a, b]) => [...a, ...b]));
    estaciones$.subscribe({ next: (data) => this.estaciones.set(data), error: () => {} });
    this.cargarTodos();
  }

  cargarTodos(): void {
    this.loading.set(true);
    const empresa = this.auth.empresa();
    const items$ = empresa
      ? this.service.porEmpresa(empresa)
      : forkJoin([
          this.service.porEmpresa(Empresa.LYBTEL),
          this.service.porEmpresa(Empresa.RUNA),
        ]).pipe(map(([a, b]) => [...a, ...b]));
    items$.subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 });
      },
    });
  }

  cargarTipoAcceso(tipo: TipoAcceso): void {
    this.loading.set(true);
    this.service.porTipoAcceso(tipo).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje });
      },
    });
  }

  cargarEstacion(estacionId: number): void {
    this.loading.set(true);
    this.service.porEstacion(estacionId).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje });
      },
    });
  }

  cargarUbicacion(ubicacionId: number): void {
    this.loading.set(true);
    this.service.porUbicacion(ubicacionId).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje }); },
    });
  }

  aplicarFiltros(): void {
    if (this.filtroEstacion != null) {
      this.cargarEstacion(this.filtroEstacion);
    } else if (this.filtroUbicacionId != null) {
      this.cargarUbicacion(this.filtroUbicacionId);
    } else if (this.filtroTipoAcceso) {
      this.cargarTipoAcceso(this.filtroTipoAcceso);
    } else {
      this.cargarTodos();
    }
  }

  abrirNueva(): void {
    this.editandoId = null;
    this.originalEstacionId = undefined;
    this.resetForm();
    this.drawerVisible = true;
  }

  abrirEditar(item: InventarioLogicoResponse): void {
    this.editandoId = item.id;
    this.originalEstacionId = item.estacionId;
    this.tipoAcceso = item.tipoAcceso;
    this.identificador = item.identificador;
    this.contrasena = '';
    this.mostrarContrasena = false;
    this.estacionId = item.estacionId ?? null;
    this.drawerVisible = true;
  }

  resetForm(): void {
    this.tipoAcceso = undefined;
    this.identificador = '';
    this.contrasena = '';
    this.mostrarContrasena = false;
    this.estacionId = null;
    this.empresaForm = undefined;
  }

  guardar(): void {
    if (!this.tipoAcceso || !this.identificador.trim()) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Tipo de acceso e identificador son obligatorios', life: 3000 });
      return;
    }

    const empresa = this.auth.empresa() ?? this.empresaForm;
    if (!empresa) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona la empresa', life: 3000 });
      return;
    }

    const request: InventarioLogicoRequest = {
      empresa,
      tipoAcceso: this.tipoAcceso,
      identificador: this.identificador.trim(),
    };
    if (this.contrasena) request.contrasena = this.contrasena;
    if (this.estacionId != null) request.estacionId = this.estacionId;

    if (this.editandoId == null) {
      this.service.crear(request).subscribe({
        next: () => this.onSaved('Acceso creado'),
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      });
      return;
    }

    const id = this.editandoId;
    const patch: Partial<InventarioLogicoRequest> = { ...request };
    delete patch.estacionId;
    if (!patch.contrasena) delete patch.contrasena;

    this.service.actualizar(id, patch).subscribe({
      next: () => {
        if (this.estacionId == null && this.originalEstacionId != null) {
          this.service.quitarEstacion(id).subscribe({
            next: () => this.onSaved('Acceso actualizado'),
            error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
          });
        } else if (this.estacionId != null && this.originalEstacionId !== this.estacionId) {
          this.service.asignarEstacion(id, this.estacionId).subscribe({
            next: () => this.onSaved('Acceso actualizado'),
            error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
          });
        } else {
          this.onSaved('Acceso actualizado');
        }
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  private onSaved(detail: string): void {
    this.drawerVisible = false;
    this.ms.add({ severity: 'success', summary: 'Listo', detail, life: 3000 });
    this.aplicarFiltros();
  }

  abrirAsignarEstacion(item: InventarioLogicoResponse): void {
    this.itemAsignarId = item.id;
    this.estacionAsignarId = item.estacionId ?? null;
    this.asignarDrawerVisible = true;
  }

  confirmarAsignarEstacion(): void {
    if (!this.itemAsignarId || !this.estacionAsignarId) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona una estación', life: 3000 });
      return;
    }
    this.service.asignarEstacion(this.itemAsignarId, this.estacionAsignarId).subscribe({
      next: () => {
        this.asignarDrawerVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Acceso asignado a estación', life: 3000 });
        this.aplicarFiltros();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  desasignar(item: InventarioLogicoResponse): void {
    const estacion = this.estacionNombre(item.estacionId);
    this.confirm.confirm({
      message: `¿Liberar "${item.tipoAcceso} · ${item.identificador}" de la estación ${estacion}? El acceso quedará sin asignación.`,
      header: 'Liberar acceso',
      acceptLabel: 'Liberar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.quitarEstacion(item.id).subscribe({
          next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Acceso liberado', life: 3000 }); this.aplicarFiltros(); },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  eliminar(item: InventarioLogicoResponse): void {
    const label = [item.identificador].filter(Boolean).join(' · ');
    this.confirm.confirm({
      message: `¿Eliminar el acceso "${label}"? Esta acción no se puede deshacer.`,
      header: 'Eliminar acceso',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.eliminar(item.id).subscribe({
          next: () => {
            this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Acceso eliminado', life: 3000 });
            this.aplicarFiltros();
          },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  toggleContrasena(item: InventarioLogicoResponse): void {
    if (this.visibles().has(item.id)) {
      this.visibles.update(s => { const n = new Set(s); n.delete(item.id); return n; });
      return;
    }
    this.service.obtenerContrasena(item.id).subscribe({
      next: (res) => {
        this.contrasenas.update(m => new Map(m).set(item.id, res.contrasena));
        this.visibles.update(s => new Set([...s, item.id]));
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  estacionNombre(id?: number): string {
    if (id == null) return '';
    return this.estaciones().find((e) => e.id === id)?.nombre ?? `#${id}`;
  }

  accessVisualType(item: InventarioLogicoResponse): string {
    return resolveAccessIcon(item.tipoAcceso);
  }
}
