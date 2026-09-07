export interface Usuario {
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: string;
  colorOjos: string;
  diasVacaciones: number;
  esRegistrado: boolean;
  tieneCuponPrimeraCompra?: boolean;
}