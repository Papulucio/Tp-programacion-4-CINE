/**
 * Una película de la cartelera.
 *
 * `clasificacionEdad` responde al mail del 28/02: 18, 13 o 0 (sin restricción).
 * `preventa` responde al mail del 08/03: venta abierta 7 días antes del estreno
 * con un precio especial configurable película por película.
 */
export interface Pelicula {
  id: number;
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  imagenUrl: string;
  generos: string[];
  formato: '2D' | '3D' | '4D' | '5D';
  idioma: 'Castellano' | 'Subtitulada';
  ventasTotales: number;
  /** 0 = sin restricción, 13 = +13, 18 = +18. */
  clasificacionEdad: 0 | 13 | 18;
  /** Si es false, el admin la saca de la cartelera (mail del 01/01). */
  visibleEnCartelera: boolean;
  esProximamente: boolean;
  fechaEstreno?: string;
  preventa?: ConfiguracionPreventa;
}

export interface ConfiguracionPreventa {
  /** Precio especial de preventa. */
  precio: number;
  /** Días de anticipación con los que se abre la venta (7 según el mail). */
  diasAnticipacion: number;
  /** Fecha de estreno. La preventa se abre `diasAnticipacion` días antes. */
  fechaEstreno: string;
  activa: boolean;
}