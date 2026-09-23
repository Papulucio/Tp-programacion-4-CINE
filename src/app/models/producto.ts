export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: 'Pochoclos' | 'Bebidas' | 'Golosinas' | 'Combos';
  imagenUrl: string;
}