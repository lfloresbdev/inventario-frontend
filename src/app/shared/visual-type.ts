/**
 * Mapeo presentacional: nombre de dispositivo / tipo de acceso -> clave de icono.
 * Las claves coinciden con los `@case` de IconComponent y con las clases
 * `.device-*` / `.access-*` que definen el acento de color.
 */

/** Los nombres de dispositivo son texto libre de BD; el seed usa AUDÍFONOS y CÁMARA. */
export function deviceVisualType(nombre: string | null | undefined): string {
  const name = (nombre ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  if (name.includes('MOUSE')) return 'mouse';
  if (name.includes('AUDIF') || name.includes('HEADPHONE')) return 'headphones';
  if (name.includes('TECLADO') || name.includes('KEYBOARD')) return 'keyboard';
  // CARGADOR antes que LAPTOP: "CARGADOR DE LAPTOP" contiene ambos
  if (name.includes('CARGADOR')) return 'charger';
  if (name.includes('LAPTOP')) return 'laptop';
  if (name.includes('TV')) return 'tv';
  if (name.includes('PROYECTOR')) return 'projector';
  if (name.includes('MONITOR')) return 'monitor';
  // CPU es el gabinete que contiene PROCESADOR, RAM y DISCO: iconos distintos
  if (name.includes('PROCESADOR')) return 'processor';
  if (name === 'CPU') return 'cpu';
  if (name.includes('RAM') || name.includes('MEMORIA')) return 'ram';
  if (name.includes('DISCO')) return 'disk';
  if (name.includes('CELULAR')) return 'phone';
  if (name.includes('CAMARA')) return 'camera';
  if (name.includes('COOLER')) return 'cooler';
  if (name.includes('REFRIGERADOR')) return 'fridge';
  if (name.includes('MICROONDAS')) return 'microwave';
  // CABLE PODER antes que CABLE genérico
  if (name.includes('PODER')) return 'power';
  if (name.includes('CABLE') || name.includes('VGA') || name.includes('HDMI')) return 'cable';
  return 'generic';
}

/** TipoAcceso es un enum cerrado; sus valores en minúscula ya son las claves. */
export function accessVisualType(tipoAcceso: string | null | undefined): string {
  return (tipoAcceso ?? '').toLowerCase();
}
