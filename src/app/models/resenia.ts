/** Reseña de una película: estrellas + comentario corto (mail del 16/01). */
export interface Resenia {
  id: number;
  peliculaId: number;
  /** Email del autor, o 'anonimo' si sereseñó sin sesión. */
  usuarioEmail: string;
  usuarioNombre: string;
  estrellas: number;
  comentario: string;
  fecha: string;
}