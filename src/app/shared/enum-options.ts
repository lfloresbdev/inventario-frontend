import {
  DiscoTipo,
  Empresa,
  EstadoFisico,
  EstadoLogico,
  RamTipo,
  TipoAcceso,
} from '../models/inventario.models';

export interface EnumOption<T> {
  value: T;
  label: string;
}

export const RAM_LABELS: Record<RamTipo, string> = {
  [RamTipo.DDR3]: 'DDR3',
  [RamTipo.DDR4]: 'DDR4',
  [RamTipo.DDR5]: 'DDR5',
};

export const DISCO_LABELS: Record<DiscoTipo, string> = {
  [DiscoTipo.SSD]: 'SSD',
  [DiscoTipo.HDD]: 'HDD',
  [DiscoTipo.M2]: 'M.2',
};

export const TIPO_ACCESO_LABELS: Record<TipoAcceso, string> = {
  [TipoAcceso.DISCORD]: 'DISCORD',
  [TipoAcceso.GOOGLE]: 'GOOGLE',
  [TipoAcceso.USUARIOR]: 'USUARIOR',
  [TipoAcceso.WINFORCE]: 'WINFORCE',
  [TipoAcceso.SICACENTER]: 'SICACENTER',
  [TipoAcceso.ISSABEL]: 'ISSABEL',
  [TipoAcceso.WHATSAPP]: 'WHATSAPP',
  [TipoAcceso.ALBRU]: 'ALBRU',
};

export const ESTADO_FISICO_LABELS: Record<EstadoFisico, string> = {
  [EstadoFisico.EN_ALMACEN]: 'En almacén',
  [EstadoFisico.OPERATIVO]: 'Operativo',
  [EstadoFisico.DANADO]: 'Dañado',
  [EstadoFisico.EN_REPARACION]: 'En reparación',
  [EstadoFisico.OBSOLETO]: 'Obsoleto',
};

export const ESTADO_LOGICO_LABELS: Record<EstadoLogico, string> = {
  [EstadoLogico.SIN_ASIGNAR]: 'Sin asignar',
  [EstadoLogico.ASIGNADO]: 'Asignado',
  [EstadoLogico.BLOQUEADO]: 'Bloqueado',
  [EstadoLogico.NUMERO_PERDIDO]: 'N° perdido',
  [EstadoLogico.SIN_ACCESO]: 'Sin acceso',
};

const toOptions = <T extends string>(labels: Record<string, string>, values: T[]): EnumOption<T>[] =>
  values.map((value) => ({ value, label: labels[value] ?? String(value) }));

export const RAM_OPTIONS: EnumOption<RamTipo>[] = toOptions(RAM_LABELS, Object.values(RamTipo));

export const DISCO_OPTIONS: EnumOption<DiscoTipo>[] = toOptions(DISCO_LABELS, Object.values(DiscoTipo));

export const TIPO_ACCESO_OPTIONS: EnumOption<TipoAcceso>[] = toOptions(
  TIPO_ACCESO_LABELS,
  Object.values(TipoAcceso),
);

/**
 * Sólo las condiciones son elegibles: "Operativo" y "En almacén" los deriva el backend de la
 * asignación a estación, así que ofrecerlos en el formulario sería engañoso.
 */
export const ESTADO_FISICO_OPTIONS: EnumOption<EstadoFisico>[] = toOptions(ESTADO_FISICO_LABELS, [
  EstadoFisico.DANADO,
  EstadoFisico.EN_REPARACION,
  EstadoFisico.OBSOLETO,
]);

export const ESTADO_LOGICO_OPTIONS: EnumOption<EstadoLogico>[] = toOptions(ESTADO_LOGICO_LABELS, [
  EstadoLogico.BLOQUEADO,
  EstadoLogico.NUMERO_PERDIDO,
  EstadoLogico.SIN_ACCESO,
]);

export const EMPRESA_OPTIONS: EnumOption<Empresa>[] = [
  { value: Empresa.LYBTEL, label: 'LYBTEL' },
  { value: Empresa.RUNA, label: 'RUNA' },
];

export const PROCESADOR_OPTIONS: EnumOption<string>[] = [
  { value: 'Core i3', label: 'Core i3' },
  { value: 'Core i5', label: 'Core i5' },
  { value: 'Core i7', label: 'Core i7' },
  { value: 'Core i9', label: 'Core i9' },
];

export const RAM_CAPACIDAD_OPTIONS: EnumOption<number>[] = [
  { value: 8, label: '8GB' },
  { value: 16, label: '16GB' },
  { value: 32, label: '32GB' },
];

export const DISCO_CAPACIDAD_OPTIONS: EnumOption<number>[] = [
  { value: 256, label: '256GB' },
  { value: 512, label: '512GB' },
  { value: 1024, label: '1TB' },
];
