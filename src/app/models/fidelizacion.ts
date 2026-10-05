/** Recompensa del catálogo de canje (mail del 03/03). */
export interface Recompensa {
  id: number;
  nombre: string;
  tipo: 'entrada' | 'candy';
  puntosRequeridos: number;
  /** Para tipo 'candy': id del producto que se entrega. */
  productoId?: number;
  /** Para tipo 'entrada': duración de la entrada gratuita en minutos. */
  duracionMinutos?: number;
  activa: boolean;
}

/** Canje realizado por un usuario. */
export interface Canje {
  id: number;
  usuarioEmail: string;
  recompensaId: number;
  recompensaNombre: string;
  puntosUtilizados: number;
  fecha: string;
  /** Código del ticket generado, si la recompensa fue una entrada. */
  codigoTicket?: string;
}

/**
 * Combo especial (mail del 08/03): entrada + pochoclos + bebida a un precio fijo
 * configurable desde el panel de admin.
 */
export interface ComboEspecial {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  /** Cantidad de entradas que incluye el combo. */
  entradas: number;
  /** Productos de candy bar incluidos. */
  productos: { productoId: number; cantidad: number }[];
  imagenUrl?: string;
  activo: boolean;
}