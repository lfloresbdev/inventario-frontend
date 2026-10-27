import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { Plus } from '@primeicons/angular/plus';
import { Pencil } from '@primeicons/angular/pencil';
import { Trash } from '@primeicons/angular/trash';
import { Server } from '@primeicons/angular/server';
import { Link } from '@primeicons/angular/link';
import { TimesCircle } from '@primeicons/angular/times-circle';

import {
  DiscoTipo,
  DispositivoResponse,
  Empresa,
  EstacionResponse,
  EstadoFisico,
  InventarioFisicoRequest,
  InventarioFisicoResponse,
  LocalResponse,
  MarcaResponse,
  RamTipo,
  ResumenDispositivo,
  ResumenFisico,
  Rol,
  UbicacionFisicaResponse,
} from '../../models/inventario.models';
import { InventarioFisicoService } from '../../services/inventario-fisico.service';
import { EstacionService } from '../../services/estacion.service';
import { DispositivoService } from '../../services/dispositivo.service';
import { MarcaService } from '../../services/marca.service';
import { LocalService } from '../../services/local.service';
import { UbicacionFisicaService } from '../../services/ubicacion-fisica.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../services/api-utils';
import { DISCO_CAPACIDAD_OPTIONS, DISCO_LABELS, DISCO_OPTIONS, EMPRESA_OPTIONS, ESTADO_FISICO_LABELS, ESTADO_FISICO_OPTIONS, PROCESADOR_OPTIONS, RAM_CAPACIDAD_OPTIONS, RAM_LABELS, RAM_OPTIONS } from '../../shared/enum-options';
import { RamTipoPipe, DiscoTipoPipe, EstadoFisicoPipe } from '../../shared/enum-pipes';
import { IconComponent } from '../../shared/icon.component';
import { deviceVisualType as resolveDeviceIcon } from '../../shared/visual-type';

/** Subnivel de la vista agrupada: MARCA + MODELO dentro de un dispositivo. */
interface SubgrupoFisico {
  key: string;
  marca?: MarcaResponse;
  modelo?: string;
  total: number;
  operativo: number;
  danado: number;
  almacen: number;
  enReparacion: number;
  obsoleto: number;
}

/** Fila superior de la vista agrupada: un DISPOSITIVO con los contadores de todos sus modelos. */
interface GrupoFisico {
  key: string;
  dispositivo: DispositivoResponse;
  total: number;
  operativo: number;
  danado: number;
  almacen: number;
  enReparacion: number;
  obsoleto: number;
  subgrupos: SubgrupoFisico[];
}

/** Traduce el mapa porEstado del backend a los contadores de la vista. */
function contarEstado(porEstado: Record<string, number> | null | undefined) {
  const e = porEstado ?? {};
  return {
    operativo: e['OPERATIVO'] ?? 0,
    danado: e['DANADO'] ?? 0,
    almacen: e['EN_ALMACEN'] ?? 0,
    enReparacion: e['EN_REPARACION'] ?? 0,
    obsoleto: e['OBSOLETO'] ?? 0,
  };
}

/** Card de la sección de componentes. */
interface ComponenteCard {
  tipo: string;
  titulo: string;
  icono: string;
  total: number;
}

@Component({
  selector: 'app-fisico',
  imports: [
    FormsModule,
    ButtonModule,
    DrawerModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    FloatLabelModule,
    TagModule,
    SkeletonModule,
    ToastModule,
    Plus,
    Pencil,
    Trash,
    Server,
    Link,
    TimesCircle,
    RamTipoPipe,
    DiscoTipoPipe,
    EstadoFisicoPipe,
    ConfirmDialogModule,
    DialogModule,
    IconComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './fisico.html',
  styleUrl: './fisico.scss',
})
export class FisicoPage implements OnInit {
  private confirm = inject(ConfirmationService);
  private service = inject(InventarioFisicoService);
  private estacionService = inject(EstacionService);
  private dispositivoService = inject(DispositivoService);
  private marcaService = inject(MarcaService);
  private localService = inject(LocalService);
  private ubicacionService = inject(UbicacionFisicaService);
  private auth = inject(AuthService);
  private ms = inject(MessageService);

  items = signal<InventarioFisicoResponse[]>([]);
  estaciones = signal<EstacionResponse[]>([]);
  dispositivos = signal<DispositivoResponse[]>([]);
  readonly dispositivosComponentes = computed(() => this.dispositivos().filter((d) => this.esComponente(d)));
  locales = signal<LocalResponse[]>([]);
  ubicaciones = signal<UbicacionFisicaResponse[]>([]);
  loading = signal(false);

  /** Grupos de equipos (dispositivo → marca·modelo) calculados por el backend. */
  resumenes = signal<ResumenDispositivo[]>([]);
  /** Grupos de componentes (RAM / Procesador / Disco) para el inventario global. */
  resumenComp = signal<ResumenFisico[]>([]);

  // Signals: los consumen computed() de agrupación y filtrado
  readonly filtroLocalId = signal<number | null>(null);
  readonly filtroUbicacionId = signal<number | null>(null);

  /** Dispositivo desplegado en la lista (nivel 1); sólo uno a la vez. */
  readonly dispositivoAbierto = signal<string | null>(null);
  /** Subgrupo marca·modelo desplegado dentro del dispositivo (nivel 2). */
  readonly subgrupoAbierto = signal<string | null>(null);
  /** Contador pulsado. null = TOTAL = sin filtro; aplica a los items del subgrupo abierto. */
  readonly filtroEstado = signal<EstadoFisico | null>(null);

  /**
   * Base sobre la que se cuenta: filtrada por Local y Ubicación, nunca por estado.
   * Si el estado entrara aquí, al pulsar DAÑADO los demás contadores caerían a cero.
   */
  readonly itemsFiltrados = computed(() => {
    const localId = this.filtroLocalId();
    const ubicacionId = this.filtroUbicacionId();
    if (localId == null && ubicacionId == null) return this.items();

    // La ubicación no viaja en el item: se resuelve a través de su estación
    const ubicacionPorEstacion = new Map(
      this.estaciones().map((e) => [e.id, e.ubicacionFisica?.id]),
    );
    return this.items().filter((i) => {
      if (localId != null && i.local?.id !== localId) return false;
      if (ubicacionId != null && ubicacionPorEstacion.get(i.estacionId ?? -1) !== ubicacionId) {
        return false;
      }
      return true;
    });
  });

  /**
   * Dos niveles: DISPOSITIVO (con contadores agregados) y dentro MARCA + MODELO.
   * La clave incluye la empresa para no colisionar cuando el ADMIN ve las dos.
   */
  readonly grupos = computed<GrupoFisico[]>(() =>
    this.resumenes().map((r) => ({
      key: this.claveDispositivo(r),
      dispositivo: r.dispositivo,
      total: r.cantidad,
      ...contarEstado(r.porEstado),
      subgrupos: (r.subgrupos ?? []).map((s) => ({
        key: this.claveItem(s),
        marca: s.marca,
        modelo: s.modelo,
        total: s.cantidad,
        ...contarEstado(s.porEstado),
      })),
    })),
  );

  private claveDispositivo(r: ResumenDispositivo): string {
    return `${r.empresa ?? ''}|${r.dispositivo?.id ?? 0}`;
  }

  /** Clave de un subgrupo marca·modelo; sirve igual para un item suelto. */
  private claveItem(x: {
    empresa?: Empresa;
    dispositivo?: DispositivoResponse;
    marca?: MarcaResponse;
    modelo?: string;
  }): string {
    return `${x.empresa ?? ''}|${x.dispositivo?.id ?? 0}|${x.marca?.id ?? 0}|${(x.modelo ?? '').trim().toLowerCase()}`;
  }

  /** Items del subgrupo marca·modelo desplegado, ya con el filtro de estado aplicado. */
  readonly itemsDelSubgrupo = computed(() => {
    const key = this.subgrupoAbierto();
    if (key == null) return [];
    const items = this.itemsFiltrados().filter((i) => this.claveItem(i) === key);
    const estado = this.filtroEstado();
    return estado ? items.filter((i) => i.estado === estado) : items;
  });

  detalleVisible = false;
  itemDetalle = signal<InventarioFisicoResponse | null>(null);
  componentesCpu = signal<InventarioFisicoResponse[]>([]);

  componenteDetalleVisible = false;
  componenteDetalle = signal<InventarioFisicoResponse | null>(null);

  componenteDrawerVisible = false;
  itemsLibres = signal<InventarioFisicoResponse[]>([]);
  componenteSelId: number | null = null;

  readonly itemsLibresOpciones = computed(() => {
    const tiposAsignados = new Set(this.componentesCpu().map((c) => this.tipoComponente(c)));
    return this.itemsLibres()
      .filter((i) => this.esComponente(i.dispositivo) && !tiposAsignados.has(this.tipoComponente(i)))
      .map((i) => ({
        id: i.id,
        label: [i.dispositivo?.nombre, this.describirComponente(i)].filter(Boolean).join(' · '),
      }));
  });

  drawerVisible = false;
  /** Modo del formulario de creación: true = sólo componentes, false = sólo dispositivos. */
  creandoComponente = false;
  editandoId: number | null = null;
  originalEstacionId: number | undefined;

  asignarDrawerVisible = false;
  itemAsignarId: number | null = null;
  estacionAsignarId: number | null = null;

  dispositivoId: number | undefined;
  marcaId: number | undefined;
  modelo = '';
  serie = '';
  ramTipo: RamTipo | undefined;
  ramEspacio: number | null = null;
  procesador = '';
  pulgadas: number | null = null;
  discoTipo: DiscoTipo | undefined;
  discoEspacio: number | null = null;
  estacionId: number | null = null;
  empresaForm: Empresa | undefined;
  hostname = '';
  /** Sólo condiciones; vacío significa "en buen estado" y lo resuelve el backend. */
  estadoForm: EstadoFisico | null = null;

  marcasFiltradas = signal<MarcaResponse[]>([]);

  // CPU modo
  cpuModo: 'armada' | 'porarmar' = 'armada';

  // CPU "por armar" — selección de ítems libres
  compRamId: number | null = null;
  compProcesadorId: number | null = null;
  compDiscoId: number | null = null;

  // CPU "armada" — lista dinámica de componentes nuevos
  armadaComponentes: Array<{
    dispositivoId?: number;
    marcaId?: number;
    marcas?: MarcaResponse[];
    ramTipo?: RamTipo;
    ramEspacio: number | null;
    procesador: string;
    discoTipo?: DiscoTipo;
    discoEspacio: number | null;
  }> = [];

  get selectedDispositivoEsCpu(): boolean {
    return this.dispositivos().find(d => d.id === this.dispositivoId)?.nombre?.trim().toUpperCase() === 'CPU';
  }

  get selectedEsComponente(): boolean {
    return this.dispositivos().find(d => d.id === this.dispositivoId)?.esComponenteCpu ?? false;
  }

  get selectedRequiereSerie(): boolean {
    return this.dispositivos().find(d => d.id === this.dispositivoId)?.requiereSerie ?? true;
  }

  get serieObligatoria(): boolean {
    return !this.selectedEsComponente && this.selectedRequiereSerie;
  }

  private get _selectedNombre(): string {
    return this.dispositivos().find(d => d.id === this.dispositivoId)?.nombre?.trim().toUpperCase() ?? '';
  }

  get selectedEsRam(): boolean {
    const n = this._selectedNombre;
    return n.includes('RAM') || n.includes('MEMORIA');
  }

  get selectedEsDisco(): boolean {
    const n = this._selectedNombre;
    return n.includes('DISCO') || n === 'SSD' || n === 'HDD' || n === 'M2';
  }

  get selectedEsProcesador(): boolean {
    const n = this._selectedNombre;
    return n.includes('PROCESADOR') || n.includes('PROCESSOR');
  }

  get selectedEsMonitor(): boolean {
    const n = this._selectedNombre;
    return n === 'MONITOR' || n === 'TV' || n === 'PROYECTOR';
  }

  onDispositivoChange(dispositivoId: number | undefined): void {
    this.marcaId = undefined;

    if (dispositivoId == null) {
      this.marcasFiltradas.set([]);
      return;
    }
    this.marcaService.listarPorDispositivo(dispositivoId).subscribe({
      next: (marcas) => this.marcasFiltradas.set(marcas),
      error: () => this.marcasFiltradas.set([]),
    });
  }

  onComponenteDispositivoChange(index: number): void {
    const comp = this.armadaComponentes[index];
    if (!comp) return;
    comp.marcaId = undefined;
    comp.marcas = [];
    if (comp.dispositivoId == null) return;
    this.marcaService.listarPorDispositivo(comp.dispositivoId).subscribe({
      next: (marcas) => (comp.marcas = marcas),
      error: () => (comp.marcas = []),
    });
  }

  get marcasParaForm(): MarcaResponse[] {
    return this.marcasFiltradas();
  }

  /** Al crear, la sección de origen acota el listado: Componentes o Dispositivos. Al editar, todos. */
  get dispositivosForm(): DispositivoResponse[] {
    if (this.editandoId != null) return this.dispositivos();
    return this.dispositivos().filter((d) => this.esComponente(d) === this.creandoComponente);
  }

  agregarComponenteArmada(): void {
    this.armadaComponentes.push({
      dispositivoId: undefined, marcaId: undefined, marcas: [],
      ramTipo: undefined, ramEspacio: null, procesador: '', discoTipo: undefined, discoEspacio: null,
    });
  }

  quitarComponenteArmada(i: number): void {
    this.armadaComponentes.splice(i, 1);
  }

  armadaCompDispNombre(dispositivoId?: number): string {
    return this.dispositivos().find(d => d.id === dispositivoId)?.nombre?.toUpperCase() ?? '';
  }

  esRam(dispositivoId?: number): boolean {
    const n = this.armadaCompDispNombre(dispositivoId);
    return n.includes('RAM') || n.includes('MEMORIA');
  }

  esDisco(dispositivoId?: number): boolean {
    const n = this.armadaCompDispNombre(dispositivoId);
    return n.includes('DISCO') || n === 'SSD' || n === 'HDD' || n === 'M2';
  }

  esProcesador(dispositivoId?: number): boolean {
    const n = this.armadaCompDispNombre(dispositivoId);
    return n.includes('PROCESADOR') || n.includes('PROCESSOR');
  }

  private esComponente(d?: DispositivoResponse): boolean {
    if (!d) return false;
    if (d.esComponenteCpu) return true;
    const n = d.nombre?.toUpperCase() ?? '';
    return (
      n.includes('RAM') ||
      n.includes('MEMORIA') ||
      n.includes('DISCO') ||
      n === 'SSD' ||
      n === 'HDD' ||
      n === 'M2' ||
      n.includes('PROCESADOR') ||
      n.includes('PROCESSOR')
    );
  }

  private tipoComponente(item: InventarioFisicoResponse): 'ram' | 'disco' | 'procesador' | 'otro' {
    const n = item.dispositivo?.nombre?.toUpperCase() ?? '';
    if (n.includes('RAM') || n.includes('MEMORIA')) return 'ram';
    if (n.includes('DISCO') || n === 'SSD' || n === 'HDD' || n === 'M2') return 'disco';
    if (n.includes('PROCESADOR') || n.includes('PROCESSOR')) return 'procesador';
    return 'otro';
  }

  private capacidadLabel(gb?: number | null): string | null {
    if (gb == null) return null;
    return gb === 1024 ? '1TB' : `${gb}GB`;
  }

  private describirComponente(item: InventarioFisicoResponse): string {
    const tipo = this.tipoComponente(item);
    const marca = item.marca?.nombre ?? '';
    if (tipo === 'ram') {
      return [item.ramTipo, this.capacidadLabel(item.ramEspacio)].filter(Boolean).join(' - ');
    }
    if (tipo === 'disco') {
      return [item.discoTipo, this.capacidadLabel(item.discoEspacio)].filter(Boolean).join(' - ');
    }
    if (tipo === 'procesador') {
      return [marca, item.procesador || item.modelo].filter(Boolean).join(' - ');
    }
    return [marca, item.modelo].filter(Boolean).join(' - ');
  }

  inventarioCompAbierto = signal(false);

  /** Inventario global de componentes agrupado por tipo, con desglose por estado y estación. */
  readonly inventarioComponentes = computed(() => {
    const grupos = this.resumenComp();
    const tipos: { tipo: 'ram' | 'procesador' | 'disco' | 'otro'; titulo: string }[] = [
      { tipo: 'ram', titulo: 'RAM' },
      { tipo: 'procesador', titulo: 'Procesador' },
      { tipo: 'disco', titulo: 'Disco' },
    ];
    if (grupos.some((r) => this.tipoResumen(r) === 'otro')) {
      tipos.push({ tipo: 'otro', titulo: 'Otros' });
    }
    return tipos.map(({ tipo, titulo }) => {
      const items = grupos
        .filter((r) => this.tipoResumen(r) === tipo)
        .map((r) => ({ resumen: r, descripcion: this.describirResumen(r) }))
        .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
      return {
        tipo,
        titulo,
        total: items.reduce((acc, i) => acc + i.resumen.cantidad, 0),
        items,
      };
    });
  });

  private tipoResumen(r: ResumenFisico): 'ram' | 'procesador' | 'disco' | 'otro' {
    const n = r.dispositivo?.nombre?.toUpperCase() ?? '';
    if (n.includes('RAM') || n.includes('MEMORIA')) return 'ram';
    if (n.includes('DISCO') || n === 'SSD' || n === 'HDD' || n === 'M2') return 'disco';
    if (n.includes('PROCESADOR') || n.includes('PROCESSOR')) return 'procesador';
    return 'otro';
  }

  private describirResumen(r: ResumenFisico): string {
    const marca = r.marca?.nombre ?? '';
    const tipo = this.tipoResumen(r);
    if (tipo === 'ram') return [marca, r.ramTipo, this.capacidadLabel(r.ramEspacio)].filter(Boolean).join(' · ');
    if (tipo === 'disco') return [marca, r.discoTipo, this.capacidadLabel(r.discoEspacio)].filter(Boolean).join(' · ');
    if (tipo === 'procesador') return [marca, r.procesador || r.modelo].filter(Boolean).join(' · ');
    return [marca, r.modelo].filter(Boolean).join(' · ');
  }

  desgloseResumen(r: ResumenFisico): string {
    const partes: string[] = [];
    if (r.enAlmacen > 0) partes.push(`${r.enAlmacen} en almacén`);
    for (const e of r.porEstacion ?? []) partes.push(`${e.cantidad} en ${e.estacionNombre}`);
    return partes.join(' · ');
  }

  /** Card de componentes seleccionada para el popup y filtros activos dentro del popup. */
  compCardPopupVisible = false;
  readonly compCardSeleccionada = signal<ComponenteCard | null>(null);
  readonly compCardEstado = signal<EstadoFisico | null>(null);
  readonly compCardUbicacion = signal<'SUELTO' | 'EN_CPU' | null>(null);

  /** Cards de la sección de componentes: un total general por tipo. */
  readonly componentesCards = computed<ComponenteCard[]>(() => {
    const grupos = this.resumenComp();
    const tipos: { tipo: string; titulo: string; icono: string }[] = [
      { tipo: 'ram', titulo: 'RAM', icono: 'ram' },
      { tipo: 'procesador', titulo: 'Procesador', icono: 'processor' },
      { tipo: 'disco', titulo: 'Disco', icono: 'disk' },
    ];
    if (grupos.some((r) => this.tipoResumen(r) === 'otro')) {
      tipos.push({ tipo: 'otro', titulo: 'Otros', icono: 'generic' });
    }
    return tipos.map(({ tipo, titulo, icono }) => ({
      tipo,
      titulo,
      icono,
      total: grupos
        .filter((r) => this.tipoResumen(r) === tipo)
        .reduce((acc, r) => acc + r.cantidad, 0),
    }));
  });

  /** Detalle del popup: filas y totales según estado (null = TOTAL) y ubicación (null = todos). */
  readonly compCardDetalle = computed(() => {
    const card = this.compCardSeleccionada();
    if (!card) {
      return {
        filas: [] as { label: string; cantidad: number }[],
        total: 0,
        conteo: {} as Record<string, number>,
        ubicacion: { SUELTO: 0, EN_CPU: 0 } as Record<string, number>,
      };
    }
    const delTipo = this.resumenComp().filter((r) => this.tipoResumen(r) === card.tipo);
    const filas = this.filasComponente(
      card.tipo,
      delTipo,
      this.compCardEstado(),
      this.compCardUbicacion(),
    );
    const conteo: Record<string, number> = {};
    const ubicacion: Record<string, number> = { SUELTO: 0, EN_CPU: 0 };
    for (const r of delTipo) {
      for (const [k, v] of Object.entries(r.porEstado ?? {})) conteo[k] = (conteo[k] ?? 0) + v;
      ubicacion['SUELTO'] += this.cantidadComponente(r, null, 'SUELTO');
      ubicacion['EN_CPU'] += this.cantidadComponente(r, null, 'EN_CPU');
    }
    return { filas, total: filas.reduce((acc, f) => acc + f.cantidad, 0), conteo, ubicacion };
  });

  /** Cantidad de un grupo de componentes para un estado y/o ubicación (true = sueltos / en CPU). */
  private cantidadComponente(
    r: ResumenFisico,
    estado: EstadoFisico | null,
    ubicacion: string | null,
  ): number {
    if (!estado && !ubicacion) return r.cantidad;
    const cross = r.porEstadoUbicacion ?? {};
    if (estado && !ubicacion) return r.porEstado?.[estado] ?? 0;
    if (!estado && ubicacion) {
      const sufijo = '|' + ubicacion;
      return Object.entries(cross)
        .filter(([k]) => k.endsWith(sufijo))
        .reduce((acc, [, v]) => acc + v, 0);
    }
    return cross[`${estado}|${ubicacion}`] ?? 0;
  }

  private filasComponente(
    tipo: string,
    grupos: ResumenFisico[],
    estado?: EstadoFisico | null,
    ubicacion?: string | null,
  ): { label: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const r of grupos) {
      const cantidad = this.cantidadComponente(r, estado ?? null, ubicacion ?? null);
      if (cantidad <= 0) continue;
      let label: string;
      if (tipo === 'ram') {
        label = [r.ramTipo ? RAM_LABELS[r.ramTipo] : null, this.capacidadLabel(r.ramEspacio)]
          .filter(Boolean).join(' - ');
      } else if (tipo === 'disco') {
        label = [r.discoTipo ? DISCO_LABELS[r.discoTipo] : null, this.capacidadLabel(r.discoEspacio)]
          .filter(Boolean).join(' - ');
      } else if (tipo === 'procesador') {
        label = [r.marca?.nombre, r.procesador || r.modelo].filter(Boolean).join(' - ');
      } else {
        label = [r.marca?.nombre, r.modelo].filter(Boolean).join(' - ');
      }
      const clave = label || '—';
      mapa.set(clave, (mapa.get(clave) ?? 0) + cantidad);
    }
    return [...mapa.entries()]
      .map(([label, cantidad]) => ({ label, cantidad }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  abrirCompCard(card: ComponenteCard): void {
    this.compCardSeleccionada.set(card);
    this.compCardEstado.set(null);
    this.compCardUbicacion.set(null);
    this.compCardPopupVisible = true;
  }

  /**
   * Filas de contadores por estado. Cada una trae el total y, si hay datos, el desglose
   * suelto / en CPU. Operativo + Suelto nunca aparece (siempre 0).
   */
  readonly compCardMatriz = computed(() => {
    const card = this.compCardSeleccionada();
    if (!card) return [];
    const delTipo = this.resumenComp().filter((r) => this.tipoResumen(r) === card.tipo);
    const orden: { estado: EstadoFisico; corto: string }[] = [
      { estado: EstadoFisico.OPERATIVO, corto: 'OPE' },
      { estado: EstadoFisico.DANADO, corto: 'DAÑ' },
      { estado: EstadoFisico.EN_ALMACEN, corto: 'ALM' },
      { estado: EstadoFisico.EN_REPARACION, corto: 'REP' },
      { estado: EstadoFisico.OBSOLETO, corto: 'OBS' },
    ];
    return orden
      .map(({ estado, corto }) => {
        const suelto = delTipo.reduce(
          (acc, r) => acc + (r.porEstadoUbicacion?.[`${estado}|SUELTO`] ?? 0), 0);
        const enCpu = delTipo.reduce(
          (acc, r) => acc + (r.porEstadoUbicacion?.[`${estado}|EN_CPU`] ?? 0), 0);
        const totalEstado = delTipo.reduce((acc, r) => acc + (r.porEstado?.[estado] ?? 0), 0);
        const conSplit = suelto + enCpu > 0;
        return {
          estado,
          corto,
          label: ESTADO_FISICO_LABELS[estado],
          suelto,
          enCpu,
          conSplit,
          total: conSplit ? suelto + enCpu : totalEstado,
        };
      })
      .filter((fila) => fila.total > 0);
  });

  filtrarEstado(estado: EstadoFisico): void {
    this.compCardEstado.set(estado);
    this.compCardUbicacion.set(null);
  }

  seleccionarMatriz(estado: EstadoFisico, ubicacion: 'SUELTO' | 'EN_CPU'): void {
    this.compCardEstado.set(estado);
    this.compCardUbicacion.set(ubicacion);
  }

  limpiarMatriz(): void {
    this.compCardEstado.set(null);
    this.compCardUbicacion.set(null);
  }

  get itemsRamOpciones(): { id: number; label: string }[] {
    return this.itemsLibres()
      .filter(i => this.esComponente(i.dispositivo) && this.tipoComponente(i) === 'ram')
      .map(i => ({ id: i.id, label: this.describirComponente(i) }));
  }

  get itemsProcesadorOpciones(): { id: number; label: string }[] {
    return this.itemsLibres()
      .filter(i => this.esComponente(i.dispositivo) && this.tipoComponente(i) === 'procesador')
      .map(i => ({ id: i.id, label: this.describirComponente(i) }));
  }

  get itemsDiscoOpciones(): { id: number; label: string }[] {
    return this.itemsLibres()
      .filter(i => this.esComponente(i.dispositivo) && this.tipoComponente(i) === 'disco')
      .map(i => ({ id: i.id, label: this.describirComponente(i) }));
  }

  onEmpresaChange(): void {
    this.marcasFiltradas.set([]);
    if (this.cpuModo === 'porarmar') {
      this.onCpuModoChange();
    }
  }

  onCpuModoChange(): void {
    if (this.cpuModo === 'porarmar') {
      const empresa = this.auth.empresa() ?? this.empresaForm;
      if (empresa) {
        this.service.libresPorEmpresa(empresa).subscribe({
          next: (data) => this.itemsLibres.set(data),
          error: () => {},
        });
      }
    }
    this.compRamId = null;
    this.compProcesadorId = null;
    this.compDiscoId = null;
    this.armadaComponentes = [];
  }

  readonly Rol = Rol;
  readonly ramOptions = RAM_OPTIONS;
  readonly discoOptions = DISCO_OPTIONS;
  readonly empresaOptions = EMPRESA_OPTIONS;
  readonly procesadorOptions = PROCESADOR_OPTIONS;
  readonly ramCapacidadOptions = RAM_CAPACIDAD_OPTIONS;
  readonly discoCapacidadOptions = DISCO_CAPACIDAD_OPTIONS;
  readonly estadoOptions = ESTADO_FISICO_OPTIONS;
  readonly EstadoFisico = EstadoFisico;

  get isAdmin(): boolean {
    return this.auth.rol() === Rol.ADMIN;
  }

  ngOnInit(): void {
    this.dispositivoService.listar().subscribe({ next: (d) => this.dispositivos.set(d), error: () => {} });

    const empresa = this.auth.empresa();
    const locales$ = empresa
      ? this.localService.listarPorEmpresa(empresa)
      : this.localService.listar();
    locales$.subscribe({ next: (l) => this.locales.set(l), error: () => {} });

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
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 });
      },
    });

    this.cargarResumen(empresa);
    this.cargarResumenComponentes(empresa);
  }

  /** Agrupación de equipos calculada por el backend (respeta el filtro Local / Ubicación). */
  private cargarResumen(empresa?: Empresa | null): void {
    const filtros = {
      localId: this.filtroLocalId() ?? undefined,
      ubicacionId: this.filtroUbicacionId() ?? undefined,
    };
    const resumen$ = empresa
      ? this.service.resumenEquipos(empresa, filtros)
      : forkJoin([
          this.service.resumenEquipos(Empresa.LYBTEL, filtros),
          this.service.resumenEquipos(Empresa.RUNA, filtros),
        ]).pipe(map(([a, b]) => [...a, ...b]));
    resumen$.subscribe({ next: (r) => this.resumenes.set(r), error: () => {} });
  }

  /** Inventario global de componentes (RAM / Procesador / Disco). */
  private cargarResumenComponentes(empresa?: Empresa | null): void {
    const resumen$ = empresa
      ? this.service.resumenComponentes(empresa)
      : forkJoin([
          this.service.resumenComponentes(Empresa.LYBTEL),
          this.service.resumenComponentes(Empresa.RUNA),
        ]).pipe(map(([a, b]) => [...a, ...b]));
    resumen$.subscribe({ next: (r) => this.resumenComp.set(r), error: () => {} });
  }

  onFiltroLocalChange(localId: number | null): void {
    this.filtroLocalId.set(localId);
    this.filtroUbicacionId.set(null);
    this.ubicaciones.set([]);
    if (localId != null) {
      this.ubicacionService.listarPorLocal(localId).subscribe({
        next: (data) => this.ubicaciones.set(data),
        error: () => {},
      });
    }
    this.cargarResumen(this.auth.empresa());
  }

  onFiltroUbicacionChange(ubicacionId: number | null): void {
    this.filtroUbicacionId.set(ubicacionId);
    this.cargarResumen(this.auth.empresa());
  }

  /**
   * Única ida al servidor. El filtrado por Local y Ubicación se deriva en cliente, así que
   * recargar no toca el grupo desplegado ni el contador seleccionado.
   */
  recargar(): void {
    this.cargarTodos();
  }

  toggleDispositivo(key: string): void {
    const yaAbierto = this.dispositivoAbierto() === key;
    this.dispositivoAbierto.set(yaAbierto ? null : key);
    this.subgrupoAbierto.set(null);
    if (!yaAbierto) this.filtroEstado.set(null);
  }

  /** Contador del dispositivo: TOTAL abre sin filtro; OPE/DAÑ/ALM abre y filtra todos sus modelos. */
  filtrarDispositivo(key: string, estado: EstadoFisico | null): void {
    this.dispositivoAbierto.set(key);
    this.subgrupoAbierto.set(null);
    this.filtroEstado.set(estado);
  }

  toggleSubgrupo(key: string): void {
    const yaAbierto = this.subgrupoAbierto() === key;
    this.subgrupoAbierto.set(yaAbierto ? null : key);
  }

  /** Contador del subgrupo marca·modelo: despliega y filtra sus items. */
  filtrarSubgrupo(key: string, estado: EstadoFisico | null): void {
    this.subgrupoAbierto.set(key);
    this.filtroEstado.set(estado);
  }

  get isCpu(): boolean {
    return this.itemDetalle()?.dispositivo?.nombre?.toUpperCase() === 'CPU';
  }

  abrirDetalle(item: InventarioFisicoResponse): void {
    this.itemDetalle.set(item);
    this.detalleVisible = true;
    this.componentesCpu.set([]);
    if (item.dispositivo?.nombre?.toUpperCase() === 'CPU') {
      this.cargarComponentesCpu(item.id);
    }
  }

  abrirDetalleComponente(comp: InventarioFisicoResponse): void {
    this.componenteDetalle.set(comp);
    this.componenteDetalleVisible = true;
  }

  private cargarComponentesCpu(cpuId: number): void {
    this.service.componentes(cpuId).subscribe({
      next: (data) => this.componentesCpu.set(data),
      error: () => this.componentesCpu.set([]),
    });
  }

  abrirAgregarComponente(): void {
    const det = this.itemDetalle();
    const empresa = this.auth.empresa() ?? det?.empresa;
    if (!empresa || !det) return;
    this.componenteSelId = null;
    this.cargarComponentesCpu(det.id);
    this.service.libresPorEmpresa(empresa).subscribe({
      next: (data) => { this.itemsLibres.set(data); this.componenteDrawerVisible = true; },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  confirmarAgregarComponente(): void {
    const det = this.itemDetalle();
    if (!this.componenteSelId || !det) return;
    this.service.asignarACpu(this.componenteSelId, det.id).subscribe({
      next: () => {
        this.componenteDrawerVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Componente agregado', life: 3000 });
        this.cargarComponentesCpu(det.id);
        this.recargar();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  liberarComponente(componente: InventarioFisicoResponse): void {
    const label = [componente.dispositivo?.nombre, componente.marca?.nombre, componente.modelo].filter(Boolean).join(' · ');
    this.confirm.confirm({
      message: `¿Quitar "${label}" del CPU? El componente quedará libre.`,
      header: 'Quitar componente',
      acceptLabel: 'Quitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.quitarDeCpu(componente.id).subscribe({
          next: () => {
            this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Componente liberado', life: 3000 });
            const det = this.itemDetalle();
            if (det) this.cargarComponentesCpu(det.id);
            this.recargar();
          },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  componenteLabel(item: InventarioFisicoResponse): string {
    return [item.dispositivo?.nombre, item.marca?.nombre, item.modelo, item.serie].filter(Boolean).join(' · ');
  }

  abrirEditarDesdeDetalle(): void {
    const det = this.itemDetalle();
    if (!det) return;
    this.detalleVisible = false;
    this.abrirEditar(det);
  }

  abrirNueva(soloComponentes: boolean): void {
    this.editandoId = null;
    this.creandoComponente = soloComponentes;
    this.originalEstacionId = undefined;
    this.resetForm();
    this.drawerVisible = true;
  }

  abrirEditar(item: InventarioFisicoResponse): void {
    this.editandoId = item.id;
    this.originalEstacionId = item.estacionId;
    this.dispositivoId = item.dispositivo?.id;
    this.marcaId = item.marca?.id;
    this.modelo = item.modelo ?? '';
    this.serie = item.serie ?? '';
    this.ramTipo = item.ramTipo;
    this.ramEspacio = item.ramEspacio ?? null;
    this.procesador = item.procesador ?? '';
    this.pulgadas = item.pulgadas ?? null;
    this.discoTipo = item.discoTipo;
    this.discoEspacio = item.discoEspacio ?? null;
    this.estacionId = item.estacionId ?? null;
    this.hostname = item.hostname ?? '';
    // Los estados de ubicación los deriva el backend: sólo se precarga si es una condición
    this.estadoForm = item.estado === EstadoFisico.DANADO
      || item.estado === EstadoFisico.EN_REPARACION
      || item.estado === EstadoFisico.OBSOLETO
      ? item.estado
      : null;
    if (item.dispositivo?.id != null) {
      this.marcaService.listarPorDispositivo(item.dispositivo.id).subscribe({
        next: (marcas) => this.marcasFiltradas.set(marcas),
        error: () => this.marcasFiltradas.set([]),
      });
    }
    this.drawerVisible = true;
  }

  resetForm(): void {
    this.dispositivoId = undefined;
    this.marcaId = undefined;
    this.modelo = '';
    this.serie = '';
    this.ramTipo = undefined;
    this.ramEspacio = null;
    this.procesador = '';
    this.pulgadas = null;
    this.discoTipo = undefined;
    this.discoEspacio = null;
    this.estacionId = null;
    this.empresaForm = undefined;
    this.hostname = '';
    this.estadoForm = null;
    this.cpuModo = 'armada';
    this.compRamId = null;
    this.compProcesadorId = null;
    this.compDiscoId = null;
    this.armadaComponentes = [];
    this.itemsLibres.set([]);
    this.marcasFiltradas.set([]);
  }

  guardar(): void {
    if (!this.dispositivoId || !this.marcaId) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Dispositivo y marca son obligatorios', life: 3000 });
      return;
    }
    if (this.serieObligatoria && !this.serie.trim()) {
      this.ms.add({
        severity: 'warn',
        summary: 'Faltan datos',
        detail: 'La serie es obligatoria para este dispositivo',
        life: 3000,
      });
      return;
    }

    if (!this.selectedEsComponente && !this.modelo.trim()) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'El modelo es obligatorio', life: 3000 });
      return;
    }
    if (this.selectedDispositivoEsCpu && this.cpuModo === 'armada') {
      const componenteIncompleto = this.armadaComponentes.some(
        (c) => !c.dispositivoId || !c.marcaId,
      );
      if (componenteIncompleto) {
        this.ms.add({
          severity: 'warn',
          summary: 'Faltan datos',
          detail: 'Cada componente requiere dispositivo y marca',
          life: 3000,
        });
        return;
      }
    }
    const empresa = this.auth.empresa() ?? this.empresaForm;
    if (!empresa) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona la empresa', life: 3000 });
      return;
    }

    const request: InventarioFisicoRequest = { empresa, dispositivoId: this.dispositivoId, marcaId: this.marcaId };
    if (this.modelo.trim()) request.modelo = this.modelo.trim();
    if (this.editandoId != null || this.serie.trim()) {
      request.serie = this.serie.trim();
    }
    if (this.ramTipo) request.ramTipo = this.ramTipo;
    if (this.ramEspacio != null) request.ramEspacio = this.ramEspacio;
    if (this.procesador.trim()) request.procesador = this.procesador.trim();
    if (this.pulgadas != null) request.pulgadas = this.pulgadas;
    if (this.discoTipo) request.discoTipo = this.discoTipo;
    if (this.discoEspacio != null) request.discoEspacio = this.discoEspacio;
    if (this.estacionId != null) request.estacionId = this.estacionId;
    if (this.hostname.trim()) request.hostname = this.hostname.trim();
    // La condición sólo se edita en items existentes; al crear se omite y manda el default
    // de la entidad. Al limpiarla se envía EN_ALMACEN y el backend recalcula la ubicación.
    if (this.editandoId != null) {
      request.estado = this.estadoForm ?? EstadoFisico.EN_ALMACEN;
    }

    if (this.editandoId == null) {
      this.service.crear(request).pipe(
        switchMap(cpu => {
          if (!this.selectedDispositivoEsCpu) return of(cpu);

          if (this.cpuModo === 'porarmar') {
            const ids = [this.compRamId, this.compProcesadorId, this.compDiscoId].filter((id): id is number => id != null);
            if (ids.length === 0) return of(cpu);
            return forkJoin(ids.map(cId => this.service.asignarACpu(cId, cpu.id)));
          }

          // armada: crear ítems de componentes y vincularlos
          const componentRequests: InventarioFisicoRequest[] = this.armadaComponentes
            .filter(c => c.dispositivoId && c.marcaId)
            .map(c => {
              const r: InventarioFisicoRequest = { empresa: request.empresa, dispositivoId: c.dispositivoId!, marcaId: c.marcaId! };
              if (c.ramTipo) r.ramTipo = c.ramTipo;
              if (c.ramEspacio != null) r.ramEspacio = c.ramEspacio;
              if (c.procesador.trim()) r.procesador = c.procesador.trim();
              if (c.discoTipo) r.discoTipo = c.discoTipo;
              if (c.discoEspacio != null) r.discoEspacio = c.discoEspacio;
              return r;
            });

          if (componentRequests.length === 0) return of(cpu);

          return forkJoin(componentRequests.map(r => this.service.crear(r))).pipe(
            switchMap(creados => forkJoin(creados.map(comp => this.service.asignarACpu(comp.id, cpu.id)))),
          );
        }),
      ).subscribe({
        next: () => this.onSaved('Elemento creado'),
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      });
      return;
    }

    const id = this.editandoId;
    const patch: Partial<InventarioFisicoRequest> = { ...request };
    delete patch.estacionId;

    this.service.actualizar(id, patch)
      .pipe(
        switchMap(() => {
          if (this.estacionId == null && this.originalEstacionId != null) return this.service.quitarEstacion(id);
          if (this.estacionId != null && this.originalEstacionId !== this.estacionId) return this.service.asignarEstacion(id, this.estacionId);
          return of(null);
        }),
      )
      .subscribe({
        next: () => this.onSaved('Elemento actualizado'),
        error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
      });
  }

  private onSaved(detail: string): void {
    this.drawerVisible = false;
    this.ms.add({ severity: 'success', summary: 'Listo', detail, life: 3000 });
    this.recargar();
  }

  abrirAsignarEstacion(item: InventarioFisicoResponse): void {
    this.itemAsignarId = item.id;
    this.estacionAsignarId = item.estacionId ?? null;
    this.asignarDrawerVisible = true;
  }

  confirmarAsignarEstacion(): void {
    if (!this.itemAsignarId || !this.estacionAsignarId) {
      this.ms.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona una estación', life: 3000 });
      return;
    }

    const itemActual = this.items().find(i => i.id === this.itemAsignarId);
    const dispositivoId = itemActual?.dispositivo?.id;
    const nombreDispositivo = itemActual?.dispositivo?.nombre?.toUpperCase() ?? '';
    const maxPorEstacion = nombreDispositivo === 'CABLE PODER' ? 2 : 1;

    const yaAsignados = dispositivoId != null
      ? this.items().filter(i => i.id !== this.itemAsignarId && i.estacionId === this.estacionAsignarId && i.dispositivo?.id === dispositivoId)
      : [];

    if (yaAsignados.length >= maxPorEstacion) {
      const conflicto = yaAsignados[0];
      const nombre = itemActual?.dispositivo?.nombre ?? 'dispositivo';
      const desc = [conflicto.marca?.nombre, conflicto.modelo].filter(Boolean).join(' ');
      this.confirm.confirm({
        message: `La estación ya tiene ${maxPorEstacion === 1 ? 'un' : maxPorEstacion} ${nombre}${maxPorEstacion > 1 ? 's' : ''} asignado${maxPorEstacion > 1 ? 's' : ''} (${desc}). ¿Deseas reemplazarlo? El item anterior quedará en almacén.`,
        header: 'Reemplazar dispositivo',
        acceptLabel: 'Reemplazar',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.ejecutarAsignacionConReemplazo(conflicto.id),
      });
      return;
    }

    this.ejecutarAsignacion();
  }

  private ejecutarAsignacion(): void {
    this.service.asignarEstacion(this.itemAsignarId!, this.estacionAsignarId!).subscribe({
      next: () => {
        this.asignarDrawerVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item asignado a estación', life: 3000 });
        this.recargar();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  private ejecutarAsignacionConReemplazo(viejoId: number): void {
    this.service.quitarEstacion(viejoId).pipe(
      switchMap(() => this.service.asignarEstacion(this.itemAsignarId!, this.estacionAsignarId!)),
    ).subscribe({
      next: () => {
        this.asignarDrawerVisible = false;
        this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Dispositivo reemplazado', life: 3000 });
        this.recargar();
      },
      error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
    });
  }

  eliminar(item: InventarioFisicoResponse): void {
    const label = [item.dispositivo?.nombre, item.marca?.nombre, item.modelo].filter(Boolean).join(' · ');
    this.confirm.confirm({
      message: `¿Eliminar "${label}"? Esta acción no se puede deshacer.`,
      header: 'Eliminar item',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.eliminar(item.id).subscribe({
          next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Elemento eliminado', life: 3000 }); this.recargar(); },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  desasignar(item: InventarioFisicoResponse): void {
    const estacion = this.estacionNombre(item.estacionId);
    this.confirm.confirm({
      message: `¿Liberar "${item.dispositivo?.nombre}" de la estación ${estacion}? El item quedará en almacén.`,
      header: 'Liberar item',
      acceptLabel: 'Liberar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.quitarEstacion(item.id).subscribe({
          next: () => { this.ms.add({ severity: 'success', summary: 'Listo', detail: 'Item liberado', life: 3000 }); this.recargar(); },
          error: (err) => this.ms.add({ severity: 'error', summary: 'Error', detail: parseApiError(err).mensaje, life: 5000 }),
        });
      },
    });
  }

  estacionNombre(id?: number): string {
    if (id == null) return '';
    return this.estaciones().find((e) => e.id === id)?.nombre ?? `#${id}`;
  }

  deviceVisualType(item: InventarioFisicoResponse): string {
    return resolveDeviceIcon(item.dispositivo?.nombre);
  }

  /** Para las filas agrupadas, donde sólo se tiene el dispositivo y no un item. */
  deviceIconDe(dispositivo: DispositivoResponse): string {
    return resolveDeviceIcon(dispositivo?.nombre);
  }
}
