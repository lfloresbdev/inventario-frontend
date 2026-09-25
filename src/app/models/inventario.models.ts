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
}

export interface InventarioLogicoRequest {
  empresa: Empresa;
  tipoAcceso: TipoAcceso;
  identificador: string;
  contrasena?: string;
  estacionId?: number;
}

export type InventarioLogicoUpdate = Partial<InventarioLogicoRequest>;

export interface InventarioLogicoResponse {
  id: number;
  estacionId?: number;
  tipoAcceso: TipoAcceso;
  identificador: string;
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
