import { TipoButaca } from './butaca';

/**
 * Ticket / entrada. Un ticket agrupa las butacas de una función más los
 * productos de candy bar retirados con el mismo QR (mail del 01/01 y 30/01).
 */
export interface Ticket {
  id: number;
  codigoQr: string;
  /** Dueño de la compra. 'anonimo' para compras sin sesión. */
  usuarioEmail: string;
  peliculaId: number;
  peliculaNombre: string;
  posterPelicula: string;
  funcionId: number | null;
  salaId: number;
  /** Texto legible: "Lunes, Miércoles - 19:00hs". */
  frecuencia: string;
  /** ISO con la fecha y hora REAL de la función. Base de la regla de 2h. */
  fechaHoraFuncion: string;
  /** Fecha de la compra (ISO). Base del reporte de facturación por día. */
  fechaVenta: string;
  butacas: ButacaTicket[];
  productosCandy: LineaCandy[];
  /** Combos incluidos, desglosados para poder retirar el candy. */
  combos: LineaCombo[];
  montoTotal: number;
  descuentoAplicado: number;
  cuponUtilizado: string | null;
  creditoUtilizado: number;
  /** 1 punto por cada peso gastado (mail del 03/03). */
  puntosGanados: number;
  validadoEntrada: boolean;
  validadoCandy: boolean;
  estado: 'ACTIVO' | 'CANCELADO';
  /** Aviso de que debe ir un adulto (mail del 28/02). */
  requiereAcompanante: boolean;
  clasificacionEdad: 0 | 13 | 18;
  creadoPorCanje: boolean;
}

export interface ButacaTicket {
  fila: string;
  numero: number;
  etiqueta: string;
  tipo: TipoButaca;
  precio: number;
}

export interface LineaCandy {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface LineaCombo {
  comboId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  entradas: number;
  productos: { productoId: number; nombre: string; cantidad: number }[];
}

/** Acción registrada en el log de auditoría (mail del 10/03). */
export interface LogAuditoria {
  id: number;
  fechaHora: string;
  accion: string;
  usuario: string;
  detalle: string;
}

/** Compra anonymously registrada en el log. */
export const USUARIO_ANONIMO = 'anonimo';