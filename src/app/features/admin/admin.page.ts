import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Plus } from '@primeicons/angular/plus';
import { Pencil } from '@primeicons/angular/pencil';
import { Trash } from '@primeicons/angular/trash';

import {
  DispositivoResponse,
  Empresa,
  LocalResponse,
  MarcaResponse,
  Rol,
  UbicacionFisicaResponse,
} from '../../models/inventario.models';
import { DispositivoService } from '../../services/dispositivo.service';
import { MarcaService } from '../../services/marca.service';
import { LocalService } from '../../services/local.service';
import { UbicacionFisicaService } from '../../services/ubicacion-fisica.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../services/api-utils';
import { EMPRESA_OPTIONS } from '../../shared/enum-options';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-admin',
  imports: [
    IconComponent,
    FormsModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    CheckboxModule,
    TabsModule,
    AccordionModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    ConfirmDialogModule,
    TooltipModule,
    Plus,
    Pencil,
    Trash,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminPage implements OnInit {
  private dispositivoService = inject(DispositivoService);
  private marcaService = inject(MarcaService);
  private localService = inject(LocalService);
  private ubicacionService = inject(UbicacionFisicaService);
  private auth = inject(AuthService);
  private confirm = inject(ConfirmationService);
  private ms = inject(MessageService);

  readonly empresaOptions = EMPRESA_OPTIONS;
  readonly Rol = Rol;

  get isAdmin(): boolean { return this.auth.rol() === Rol.ADMIN; }

  tabIndex = '0';

  // ── Dispositivos ──
  dispositivos = signal<DispositivoResponse[]>([]);
  loadingDisp = signal(false);
  drawerDisp = false;
  editandoDispId: number | null = null;
  dispNombre = '';
  dispEsComponente = false;
  dispRequiereSerie = true;
  dispositivosAbiertos: number[] = [];
  agregandoMarcaDispId: number | null = null;
  nuevaMarcaNombre = '';
  marcaEditandoId: number | null = null;
  marcaEditandoDispId: number | null = null;
  marcaEditNombre = '';

  // ── Locales ──
  locales = signal<LocalResponse[]>([]);
  loadingLocal = signal(false);
  drawerLocal = false;
  editandoLocalId: number | null = null;
  localNombre = '';
  localEmpresa: Empresa | undefined;

  // ── Ubicaciones ──
  ubicaciones = signal<UbicacionFisicaResponse[]>([]);
  loadingUbic = signal(false);
  drawerUbic = false;
  editandoUbicId: number | null = null;
  ubicNombre = '';
  ubicLocalId: number | null = null;

  ngOnInit(): void {
    this.cargarDispositivos();
    this.cargarLocales();
    this.cargarUbicaciones();
  }

  // ── Dispositivos ──────────────────────────────────

  cargarDispositivos(): void {
    this.loadingDisp.set(true);
    this.dispositivoService.listar().subscribe({
      next: (d) => { this.dispositivos.set(d); this.loadingDisp.set(false); },
      error: () => this.loadingDisp.set(false),
    });
  }

  abrirNuevoDisp(): void {
    this.editandoDispId = null;
    this.dispNombre = '';
    this.dispEsComponente = false;
    this.dispRequiereSerie = true;
    this.drawerDisp = true;
  }

  abrirEditarDisp(d: DispositivoResponse): void {
    this.editandoDispId = d.id;
    this.dispNombre = d.nombre;
    this.dispEsComponente = d.esComponenteCpu;
    this.dispRequiereSerie = d.requiereSerie;
    this.drawerDisp = true;
  }

  // ── Marcas del dispositivo (inline en la card) ──

  toggleAgregarMarca(d: DispositivoResponse): void {
    if (this.agregandoMarcaDispId === d.id) {
      this.agregandoMarcaDispId = null;
      this.nuevaMarcaNombre = '';
      return;
    }
    this.agregandoMarcaDispId = d.id;
    this.nuevaMarcaNombre = '';
    this.marcaEditandoId = null;
    this.marcaEditandoDispId = null;
    if (!this.dispositivosAbiertos.includes(d.id)) {
      this.dispositivosAbiertos = [...this.dispositivosAbiertos, d.id];
    }
  }

  crearMarcaPara(d: DispositivoResponse): void {
    const nombre = this.nuevaMarcaNombre.trim();
    if (!nombre) return;
    this.marcaService.crear(d.id, nombre).subscribe({
      next: () => {
        this.nuevaMarcaNombre = '';
        this.agregandoMarcaDispId = null;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Marca agregada', life: 3000 });
        this.cargarDispositivos();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  editarMarcaDe(d: DispositivoResponse, m: MarcaResponse): void {
    this.marcaEditandoId = m.id;
    this.marcaEditandoDispId = d.id;
    this.marcaEditNombre = m.nombre;
    this.agregandoMarcaDispId = null;
  }

  cancelarEdicionMarca(): void {
    this.marcaEditandoId = null;
    this.marcaEditandoDispId = null;
    this.marcaEditNombre = '';
  }

  guardarEdicionMarcaDe(): void {
    if (this.marcaEditandoDispId == null || this.marcaEditandoId == null) return;
    const nombre = this.marcaEditNombre.trim();
    if (!nombre) return;
    this.marcaService.actualizar(this.marcaEditandoDispId, this.marcaEditandoId, nombre).subscribe({
      next: () => {
        this.marcaEditandoId = null;
        this.marcaEditandoDispId = null;
        this.marcaEditNombre = '';
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Marca actualizada', life: 3000 });
        this.cargarDispositivos();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  eliminarMarcaDe(d: DispositivoResponse, m: MarcaResponse): void {
    this.confirm.confirm({
      message: `¿Eliminar la marca "${m.nombre}" del dispositivo ${d.nombre}?`,
      header: 'Eliminar marca',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.marcaService.eliminar(d.id, m.id).subscribe({
        next: () => {
          this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Marca eliminada', life: 3000 });
          this.cargarDispositivos();
        },
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      }),
    });
  }

  guardarDisp(): void {
    if (!this.dispNombre.trim()) return;
    const op$ = this.editandoDispId == null
      ? this.dispositivoService.crear(this.dispNombre.trim(), this.dispEsComponente, this.dispRequiereSerie)
      : this.dispositivoService.actualizar(
          this.editandoDispId,
          this.dispNombre.trim(),
          this.dispEsComponente,
          this.dispRequiereSerie,
        );
    op$.subscribe({
      next: () => {
        this.drawerDisp = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Dispositivo guardado', life: 3000 });
        this.cargarDispositivos();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  eliminarDisp(d: DispositivoResponse): void {
    this.confirm.confirm({
      message: `¿Eliminar el dispositivo "${d.nombre}"?`,
      header: 'Eliminar dispositivo',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.dispositivoService.eliminar(d.id).subscribe({
        next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Eliminado', life: 3000 }); this.cargarDispositivos(); },
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      }),
    });
  }

  // ── Locales ───────────────────────────────────────

  cargarLocales(): void {
    this.loadingLocal.set(true);
    forkJoin([this.localService.listar(), this.localService.listarInactivos()]).subscribe({
      next: ([activos, inactivos]) => {
        this.locales.set([...activos, ...inactivos]);
        this.loadingLocal.set(false);
      },
      error: () => this.loadingLocal.set(false),
    });
  }

  get localesActivos(): LocalResponse[] {
    return this.locales().filter((l) => l.activo);
  }

  abrirNuevoLocal(): void { this.editandoLocalId = null; this.localNombre = ''; this.localEmpresa = undefined; this.drawerLocal = true; }

  abrirEditarLocal(l: LocalResponse): void {
    this.editandoLocalId = l.id; this.localNombre = l.nombre; this.localEmpresa = l.empresa; this.drawerLocal = true;
  }

  guardarLocal(): void {
    if (!this.localNombre.trim() || !this.localEmpresa) return;
    const op$ = this.editandoLocalId == null
      ? this.localService.crear(this.localNombre.trim(), this.localEmpresa)
      : this.localService.actualizar(this.editandoLocalId, this.localNombre.trim(), this.localEmpresa);
    op$.subscribe({
      next: () => { this.drawerLocal = false; this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Local guardado', life: 3000 }); this.cargarLocales(); },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  darDeBajaLocal(l: LocalResponse): void {
    this.confirm.confirm({
      message: `¿Dar de baja el local "${l.nombre}"? Quedará inactivo pero sus datos se conservarán.`,
      header: 'Dar de baja local',
      acceptLabel: 'Dar de baja', rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.localService.darDeBaja(l.id).subscribe({
        next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Local dado de baja', life: 3000 }); this.cargarLocales(); },
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      }),
    });
  }

  reactivarLocal(l: LocalResponse): void {
    this.localService.reactivar(l.id).subscribe({
      next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Local reactivado', life: 3000 }); this.cargarLocales(); },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  // ── Ubicaciones ───────────────────────────────────

  cargarUbicaciones(): void {
    this.loadingUbic.set(true);
    forkJoin([this.ubicacionService.listar(), this.ubicacionService.listarInactivos()]).subscribe({
      next: ([activas, inactivas]) => {
        this.ubicaciones.set([...activas, ...inactivas]);
        this.loadingUbic.set(false);
      },
      error: () => this.loadingUbic.set(false),
    });
  }

  abrirNuevaUbic(): void { this.editandoUbicId = null; this.ubicNombre = ''; this.ubicLocalId = null; this.drawerUbic = true; }

  abrirEditarUbic(u: UbicacionFisicaResponse): void {
    this.editandoUbicId = u.id; this.ubicNombre = u.nombre; this.ubicLocalId = u.local?.id ?? null; this.drawerUbic = true;
  }

  guardarUbic(): void {
    if (!this.ubicNombre.trim() || !this.ubicLocalId) return;
    const op$ = this.editandoUbicId == null
      ? this.ubicacionService.crear(this.ubicNombre.trim(), this.ubicLocalId)
      : this.ubicacionService.actualizar(this.editandoUbicId, this.ubicNombre.trim(), this.ubicLocalId);
    op$.subscribe({
      next: () => { this.drawerUbic = false; this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Ubicación guardada', life: 3000 }); this.cargarUbicaciones(); },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  darDeBajaUbic(u: UbicacionFisicaResponse): void {
    this.confirm.confirm({
      message: `¿Dar de baja la ubicación "${u.nombre}"?`,
      header: 'Dar de baja ubicación',
      acceptLabel: 'Dar de baja', rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.ubicacionService.darDeBaja(u.id).subscribe({
        next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Ubicación dada de baja', life: 3000 }); this.cargarUbicaciones(); },
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      }),
    });
  }

  reactivarUbic(u: UbicacionFisicaResponse): void {
    this.ubicacionService.reactivar(u.id).subscribe({
      next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Ubicación reactivada', life: 3000 }); this.cargarUbicaciones(); },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }
}
