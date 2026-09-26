export enum Empresa {
  LYBTEL = 'LYBTEL',
  RUNA = 'RUNA',
}

export enum Rol {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum RamTipo {
  DDR3 = 'DDR3',
  DDR4 = 'DDR4',
  DDR5 = 'DDR5',
}

export enum DiscoTipo {
  SSD = 'SSD',
  HDD = 'HDD',
  M2 = 'M2',
}

/**
 * Sólo las condiciones (DANADO, EN_REPARACION, OBSOLETO) se persisten de verdad:
 * EN_ALMACEN y OPERATIVO los recalcula el backend según la asignación a estación.
 */
export enum EstadoFisico {
  EN_ALMACEN = 'EN_ALMACEN',
  OPERATIVO = 'OPERATIVO',
  DANADO = 'DANADO',
  EN_REPARACION = 'EN_REPARACION',
  OBSOLETO = 'OBSOLETO',
}

/** Mismo criterio: ASIGNADO y SIN_ASIGNAR se derivan en el backend. */
export enum EstadoLogico {
  SIN_ASIGNAR = 'SIN_ASIGNAR',
  ASIGNADO = 'ASIGNADO',
  BLOQUEADO = 'BLOQUEADO',
  NUMERO_PERDIDO = 'NUMERO_PERDIDO',
  SIN_ACCESO = 'SIN_ACCESO',
}

export enum TipoAcceso {
  DISCORD = 'DISCORD',
  GOOGLE = 'GOOGLE',
  USUARIOR = 'USUARIOR',
  WINFORCE = 'WINFORCE',
  SICACENTER = 'SICACENTER',
  ISSABEL = 'ISSABEL',
  WHATSAPP = 'WHATSAPP',
  ALBRU = 'ALBRU',
}

export interface LocalResponse {
  id: number;
  nombre: string;
  empresa: Empresa;
  activo: boolean;
}

export interface UbicacionFisicaResponse {
  id: number;
  nombre: string;
  local: LocalResponse;
  activo: boolean;
}

export interface DispositivoResponse {
  id: number;
  nombre: string;
  esComponenteCpu: boolean;
  requiereSerie: boolean;
  marcas: MarcaResponse[];
}

export interface MarcaResponse {
  id: number;
  nombre: string;
}

export interface EstacionRequest {
  empresa: Empresa;
  localId: number;
  ubicacionFisicaId: number;
  itemIds: number[];
}

export interface EstacionUpdateRequest {
  empresa: Empresa;
  localId: number;
  ubicacionFisicaId: number;
}

export interface EstacionResponse {
  id: number;
  nombre: string;
  empresa: Empresa;
  local: LocalResponse;
  ubicacionFisica: UbicacionFisicaResponse;
  numero: number;
  creadoEn: string;
  activo: boolean;
}

export interface InventarioFisicoRequest {
  empresa: Empresa;
  dispositivoId: number;
  marcaId: number;
  modelo?: string;
  serie?: string;
  ramTipo?: RamTipo;
  ramEspacio?: number;
  procesador?: string;
  pulgadas?: number;
  discoTipo?: DiscoTipo;
  discoEspacio?: number;
  estacionId?: number;
  hostname?: string;
  estado?: EstadoFisico;
}

export type InventarioFisicoUpdate = Partial<InventarioFisicoRequest>;

export interface InventarioFisicoResponse {
  id: number;
  empresa: Empresa;
  estacionId?: number;
  parentId?: number;
  parentHostname?: string;
  dispositivo: DispositivoResponse;
  marca: MarcaResponse;
  modelo?: string;
  serie?: string;
  ramTipo?: RamTipo;
  ramEspacio?: number;
  procesador?: string;
  pulgadas?: number;
  discoTipo?: DiscoTipo;
  discoEspacio?: number;
  hostname?: string;
  local?: LocalResponse;
  estado: EstadoFisico;
}

export interface InventarioLogicoRequest {
  empresa: Empresa;
  tipoAcceso: TipoAcceso;
  identificador: string;
  contrasena?: string;
  estacionId?: number;
  estado?: EstadoLogico;
}

export type InventarioLogicoUpdate = Partial<InventarioLogicoRequest>;

export interface InventarioLogicoResponse {
  id: number;
  estacionId?: number;
  tipoAcceso: TipoAcceso;
  identificador: string;
  estado: EstadoLogico;
}

export interface ContrasenaResponse {
  contrasena: string;
}

export interface ErrorResponseDTO {
  timestamp: string;
  status: number;
  mensaje: string;
  detalles: string[];
}
