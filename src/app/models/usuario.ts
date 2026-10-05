/** Rol de un usuario del sistema. */
export type Rol = 'admin' | 'empleado' | 'cliente';

/** Datos que pide el mail del 01/01 para los usuarios registrados. */
export interface Usuario {
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: string;
  colorOjos: string;
  diasVacaciones: number;
  rol: Rol;
  /** El cupón de primera compra se consume en la primera compra y se apaga. */
  tieneCuponPrimeraCompra: boolean;
  /** Marcar alerta de estreno (mail del 08/03). Guarda ids de películas. */
  alertasEstreno: number[];
  createdAt: string;
}

/** Sesión mínima persistida en el navegador. */
export interface Sesion {
  email: string;
  rol: Rol;
  nombre: string;
}