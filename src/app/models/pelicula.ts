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
  esDestacada?: boolean;
}