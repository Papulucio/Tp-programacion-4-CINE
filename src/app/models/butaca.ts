/** Butaca seleccionada por el usuario en el mapa. */
export interface ButacaSeleccionada {
  id: string;
  fila: string;
  numero: number;
}

/** Butaca ocupada/reservada de una función concreta (tabla `reservas_butacas`). */
export interface ButacaOcupada extends ButacaSeleccionada {
  estado: 'ocupada' | 'liberada';
  ticketId?: number;
  /** Epoch ms. Las reservas retenidas expiran pasado este momento. */
  expiraEn?: number;
}

/** Rango de una butaca según su tipo. */
export type TipoButaca = 'estandar' | 'adaptada' | 'vip';