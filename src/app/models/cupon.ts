/**
 * Cupón de descuento (mails del 01/01 y 30/01).
 *
 * `soloMayores50` lo convierte en un cupón condicional para mayores de 50 años.
 * `soloPrimeraCompra` modela el beneficio de registro: 20% en la primera compra.
 * `porcentajeDescuento` es configurable por el admin.
 */
export interface Cupon {
  id: number;
  codigo: string;
  porcentajeDescuento: number;
  soloMayores50: boolean;
  soloPrimeraCompra: boolean;
  activo: boolean;
  descripcion: string;
  /** Cantidad máxima de usos. 0 = ilimitado. */
  usosMaximos: number;
  usos: number;
}