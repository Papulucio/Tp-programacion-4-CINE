import { Injectable, signal, computed } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Resenia } from '../models/resenia';
import { Usuario } from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class CineService {

  private peliculas = signal<Pelicula[]>([
    {
      id: 1,
      nombre: 'Avatar: El Camino del Agua',
      sinopsis: 'Jake Sully vive con su nueva familia en el planeta Pandora.',
      duracionMinutos: 192,
      imagenUrl: 'https://static.wikia.nocookie.net/doblaje/images/e/ed/AVATAR-El_Camino_del_Agua_p%C3%B3ster.jpg/revision/latest?cb=20221102143411&path-prefix=es',
      generos: ['Acción', 'Ciencia Ficción', 'Aventura'],
      formato: '3D',
      idioma: 'Subtitulada',
      ventasTotales: 1500
    },
    {
      id: 2,
      nombre: 'El Senor de los Anillos',
      sinopsis: 'Un joven hobbit emprende un viaje para destruir un anillo único.',
      duracionMinutos: 178,
      imagenUrl: 'https://pics.filmaffinity.com/El_seanor_de_los_anillos_La_comunidad_del_anillo-952398002-large.jpg',
      generos: ['Fantasía', 'Aventura'],
      formato: '2D',
      idioma: 'Castellano',
      ventasTotales: 2300
    },
    {
      id: 3,
      nombre: 'Batman: El Caballero de la Noche',
      sinopsis: 'Batman combate la amenaza del Guasón en Ciudad Gótica.',
      duracionMinutos: 152,
      imagenUrl: 'https://static.wikia.nocookie.net/doblaje/images/9/9c/Batman_el_Caballero_de_la_Noche.png/revision/latest/thumbnail/width/360/height/360?cb=20110602012240&path-prefix=es',
      generos: ['Acción', 'Crimen', 'Drama'],
      formato: '2D',
      idioma: 'Subtitulada',
      ventasTotales: 1800
    },
    {
      id: 4,
      nombre: 'Mi Vecino Totoro',
      sinopsis: 'Dos hermanas entablan amistad con los espíritus del bosque.',
      duracionMinutos: 86,
      imagenUrl: 'https://images.cdn2.buscalibre.com/fit-in/660x660/aa/55/aa55c7aad7c5ef1bed42b6e3a4183c2d.jpg',
      generos: ['Animación', 'Fantasía', 'Familiar'],
      formato: '2D',
      idioma: 'Castellano',
      ventasTotales: 950
    }
  ]);

  private resenias = signal<Resenia[]>([
    { id: 1, peliculaId: 1, usuarioNombre: 'Juan', estrellas: 5, comentario: 'Excelente efectos 3D', fecha: '2026-01-10' },
    { id: 2, peliculaId: 1, usuarioNombre: 'Maria', estrellas: 4, comentario: 'Un poco larga pero muy buena', fecha: '2026-01-12' },
    { id: 3, peliculaId: 2, usuarioNombre: 'Carlos', estrellas: 5, comentario: 'Una obra de arte del cine', fecha: '2026-01-15' }
  ]);

  peliculasMasVendidas = computed(() => {
    return [...this.peliculas()]
      .sort((a, b) => b.ventasTotales - a.ventasTotales)
      .slice(0, 3);
  });

  obtenerGeneros(): string[] {
    const todosLosGeneros = this.peliculas().flatMap(p => p.generos);
    return Array.from(new Set(todosLosGeneros));
  }

  getPeliculas(): Pelicula[] {
    return this.peliculas();
  }

  obtenerReseniasPorPelicula(peliculaId: number) {
    const lista = this.resenias().filter(r => r.peliculaId === peliculaId);
    const promedio = lista.length > 0
      ? (lista.reduce((acc, r) => acc + r.estrellas, 0) / lista.length).toFixed(1)
      : 'Sin calificaciones';

    return { lista, promedio };
  }

  agregarResenia(nuevaResenia: Omit<Resenia, 'id' | 'fecha'>) {
    const reseniaCompleta: Resenia = {
      ...nuevaResenia,
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0]
    };
    this.resenias.update(list => [...list, reseniaCompleta]);
  }
}
