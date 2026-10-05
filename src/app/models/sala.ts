/** Tipo de fila dentro de una sala. */
export type TipoFila = 'normal' | 'adaptada';

/**
 * Configuración de una fila de la sala.
 * Las butacas se numeran de izquierda a derecha dentro de la fila, en bloques
 * de `bloques`. El número de butaca es correlativo dentro de la fila.
 */
export interface ConfiguracionFila {
  letra: string;
  tipo: TipoFila;
  /** Cantidad de butacas por bloque: [izquierda, centro, derecha]. */
  bloques: [number, number, number];
  /** Sobreprecio aplicado a cada butaca de la fila. 0 = sin recargo. */
  recargo: number;
}

/**
 * Una sala del cine. Todas las salas comparten la misma distribución base
 * (mail del 01/01) pero el admin puede ajustar la cantidad de salas y su
 * distribución (mail del 12/02: "controlar todo lo relacionado a las salas,
 * las funciones, la distribución de las butacas").
 */
export interface Sala {
  id: number;
  nombre: string;
  filas: ConfiguracionFila[];
  activa: boolean;
}

export const COLUMNAS_IZQUIERDA = 4;
export const COLUMNAS_CENTRO = 20;
export const COLUMNAS_DERECHA = 4;

export const COLUMNAS_ADAPTADA_IZQUIERDA = 2;
export const COLUMNAS_ADAPTADA_CENTRO = 10;
export const COLUMNAS_ADAPTADA_DERECHA = 2;

export const LETRAS_FILA = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
];

/** Filas VIP: las últimas 3 de cada sala (mail del 10/03). */
export const FILAS_VIP = ['R', 'S', 'T'];

/**
 * Fila adaptada para personas con discapacidad (mail del 28/02).
 * Se reutiliza la fila J con una distribución 2 / 10 / 2.
 */
export const FILA_ADAPTADA = 'J';

/**
 * El mail del 28/02 pide quitar las filas J y K y dar ese espacio a
 * UNA fila de butacas adaptadas. En la práctica la fila J se convierte
 * en adaptada (2 / 10 / 2) y la fila K desaparece: 19 filas en total.
 */
export const FILA_ELIMINADA_POR_ADAPTADA = 'K';

/** Sobreprecio por butaca de las filas VIP. */
export const RECARGO_VIP = 1500;

/** Distribución por defecto de una sala, respetando el último mail. */
export function crearFilasPorDefecto(): ConfiguracionFila[] {
  return LETRAS_FILA.filter((letra) => letra !== FILA_ELIMINADA_POR_ADAPTADA).map((letra) => {
    const esAdaptada = letra === FILA_ADAPTADA;
    const esVip = FILAS_VIP.includes(letra);
    const bloques: [number, number, number] = esAdaptada
      ? [COLUMNAS_ADAPTADA_IZQUIERDA, COLUMNAS_ADAPTADA_CENTRO, COLUMNAS_ADAPTADA_DERECHA]
      : [COLUMNAS_IZQUIERDA, COLUMNAS_CENTRO, COLUMNAS_DERECHA];
    return {
      letra,
      tipo: esAdaptada ? 'adaptada' : 'normal',
      bloques,
      recargo: esVip ? RECARGO_VIP : 0,
    };
  });
}

/** Total de butacas de una fila a partir de su distribución en bloques. */
export function totalButacasFila(fila: ConfiguracionFila): number {
  return fila.bloques.reduce((acc, n) => acc + n, 0);
}

/** Total de butacas de una sala. */
export function totalButacasSala(filas: ConfiguracionFila[]): number {
  return filas.reduce((acc, f) => acc + totalButacasFila(f), 0);
}