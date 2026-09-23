export interface Recompensa {
  id: number;
  nombre: string;
  tipo: 'entrada' | 'candy';
  puntosRequeridos: number;
}

export interface Canje {
  id: number;
  usuarioEmail: string;
  recompensaNombre: string;
  puntosUtilizados: number;
  fecha: string;
}

export interface ComboEspecial {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl?: string;
}