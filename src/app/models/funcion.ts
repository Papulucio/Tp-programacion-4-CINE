/**
 * Una función proyectada en una sala.
 *
 * El mail del 01/01 exige que entre funciones de una misma sala haya siempre
 * 30 minutos de margen: `horaFin` ya viene calculado como
 * `horaInicio + duracionMinutos + 30`.
 */
export interface Funcion {
  id: number;
  peliculaId: number;
  salaId: number;
  dias: string[];
  horaInicio: string;
  horaFin: string;
  precio: number;
  formato: string;
  idioma: string;
}

export const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const HORAS_POR_DEFECTO = ['14:00', '16:30', '19:00', '21:30'];

/** Minutos de sanitización obligatorios entre funciones de una misma sala. */
export const MINUTOS_SANITIZACION = 30;

/** Convierte "19:30" a minutos desde medianoche. */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Convierte minutos desde medianoche a "HH:MM" soportando el cruce de medianoche. */
export function minutosAHora(minutos: number): string {
  const normalizado = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calcula el rango real de una función en minutos, unwrapeando el cruce de
 * medianoche. Si la hora de fin es menor que la de inicio, asumimos que la
 * función termina al día siguiente.
 */
export function rangoFuncion(horaInicio: string, horaFin: string): { desde: number; hasta: number } {
  const desde = horaAMinutos(horaInicio);
  let hasta = horaAMinutos(horaFin);
  if (hasta <= desde) hasta += 1440;
  return { desde, hasta };
}

/**
 * ¿Se solapan dos funciones si comparten al menos un día y sala?
 * `Math.max(desde) < Math.min(hasta)` es la condición estándar de solapamiento
 * de intervalos: tocar el borde no es solaparse (permitimos el cambio de sala
 * exacto al terminar los 30 minutos).
 */
export function funcionesSeSolapan(
  a: { dias: string[]; horaInicio: string; horaFin: string },
  b: { dias: string[]; horaInicio: string; horaFin: string },
): boolean {
  const diasComunes = a.dias.filter((d) => b.dias.includes(d));
  if (diasComunes.length === 0) return false;

  const rangoA = rangoFuncion(a.horaInicio, a.horaFin);
  const rangoB = rangoFuncion(b.horaInicio, b.horaFin);

  return Math.max(rangoA.desde, rangoB.desde) < Math.min(rangoA.hasta, rangoB.hasta);
}