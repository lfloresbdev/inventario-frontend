import { DiscoTipo, Empresa, RamTipo, TipoAcceso } from '../models/inventario.models';

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

const toOptions = <T extends string>(labels: Record<string, string>, values: T[]): EnumOption<T>[] =>
  values.map((value) => ({ value, label: labels[value] ?? String(value) }));

export const RAM_OPTIONS: EnumOption<RamTipo>[] = toOptions(RAM_LABELS, Object.values(RamTipo));

export const DISCO_OPTIONS: EnumOption<DiscoTipo>[] = toOptions(DISCO_LABELS, Object.values(DiscoTipo));

export const TIPO_ACCESO_OPTIONS: EnumOption<TipoAcceso>[] = toOptions(
  TIPO_ACCESO_LABELS,
  Object.values(TipoAcceso),
);

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
