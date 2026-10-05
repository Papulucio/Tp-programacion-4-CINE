import { DIAS_SEMANA } from '../../models/funcion';

/** Calcula la edad exacta en años a partir de una fecha 'YYYY-MM-DD'. */
export function calcularEdad(fechaNacimiento: string | null | undefined, hoy = new Date()): number {
  if (!fechaNacimiento) return 0;
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
  if (!anio || !mes || !dia) return 0;

  let edad = hoy.getFullYear() - anio;
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();

  if (mesActual < mes || (mesActual === mes && diaActual < dia)) {
    edad--;
  }
  return Math.max(0, edad);
}

/** Devuelve 'YYYY-MM-DD' a partir de un Date (hora local, no UTC). */
export function aIsoFecha(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Devuelve 'YYYY-MM-DD HH:MM:SS' en hora local. */
export function aIsoFechaHora(date: Date): string {
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${aIsoFecha(date)} ${hh}:${mm}:${ss}`;
}

/**
 * Calcula la fecha y hora real de la próxima proyección de una función.
 *
 * `dias` guarda los nombres de día ('Lunes', 'Martes', ...). Buscamos el primer
 * día coincidente a partir de hoy; si ya pasó la hora de inicio de hoy, vamos
 * al siguiente coincidente (inclusive dentro de una semana).
 *
 * Antes existía el bug de guardar `new Date()` (fecha de compra) como fecha de
 * función, lo que hacía imposible cumplir la regla de cancelación de 2 horas.
 */
export function proximaFechaFuncion(dias: string[], horaInicio: string, desde = new Date()): Date {
  const [h, m] = horaInicio.split(':').map(Number);
  const base = new Date(desde);
  base.setSeconds(0, 0);

  for (let offset = 0; offset <= 14; offset++) {
    const candidato = new Date(base);
    candidato.setDate(base.getDate() + offset);
    // getDay(): 0 = domingo. Los días arrancan en lunes.
    const indice = (candidato.getDay() + 6) % 7;
    const nombreDia = DIAS_SEMANA[indice];
    if (!dias.includes(nombreDia)) continue;

    candidato.setHours(h, m, 0, 0);
    if (candidato.getTime() >= base.getTime()) {
      return candidato;
    }
  }

  // Sin coincidencias: devolvemos hoy a la hora de inicio como fallback.
  const fallback = new Date(base);
  fallback.setHours(h, m, 0, 0);
  return fallback;
}

/** Horas que faltan hasta una fecha. Negativo si ya pasó. */
export function horasHasta(fecha: string | Date, desde = new Date()): number {
  const objetivo = fecha instanceof Date ? fecha : new Date(fecha);
  return (objetivo.getTime() - desde.getTime()) / 3_600_000;
}

/**
 * Rango de preventa de una película (mail del 08/03): se abre
 * `diasAnticipacion` días antes del estreno y cierra el día del estreno.
 */
export function preventaAbierta(fechaEstreno: string, diasAnticipacion: number, hoy = new Date()) {
  const estreno = new Date(`${fechaEstreno}T00:00:00`);
  const apertura = new Date(estreno);
  apertura.setDate(apertura.getDate() - diasAnticipacion);

  const inicioHoy = new Date(hoy);
  inicioHoy.setHours(0, 0, 0, 0);
  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);

  return {
    abierta: inicioHoy >= apertura && finHoy < estreno,
    abreEl: apertura,
    cierraEl: estreno,
    faltanDias: Math.max(0, Math.ceil((estreno.getTime() - inicioHoy.getTime()) / 86_400_000)),
  };
}

/** Formatea un monto con el separador de miles argentino. */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto || 0);
}

/** Formatea una fecha ISO a algo legible: "12/03/2026 19:00". */
export function formatearFechaHora(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

/** Etiqueta legible de una restricción de edad. */
export function etiquetaClasificacion(edad: 0 | 13 | 18): string {
  return edad === 0 ? 'Sin restricción' : `+${edad} años`;
}