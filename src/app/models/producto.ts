export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: CategoriaProducto;
  imagenUrl: string;
  activo: boolean;
}

/** Categorías configurables por el admin (mail del 30/01). */
export type CategoriaProducto = 'Pochoclos' | 'Bebidas' | 'Golosinas' | 'Combos';

export const CATEGORIAS_PRODUCTO: CategoriaProducto[] = [
  'Pochoclos',
  'Bebidas',
  'Golosinas',
  'Combos',
];