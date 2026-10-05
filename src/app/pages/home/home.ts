import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CineService } from '../../services/cine.service';
import { PeliculaCardComponent } from '../../components/pelicula-card/pelicula-card';
import { formatearMoneda } from '../../core/utils/fecha.util';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink, PeliculaCardComponent],
  templateUrl: './home.html',
})
export class HomeComponent {
  readonly cine = inject(CineService);

  readonly busqueda = signal('');
  readonly generoElegido = signal<string>('');

  readonly generos = this.cine.generos;
  readonly top3 = this.cine.peliculasMasVendidas;
  readonly proximamente = this.cine.peliculasProximamente;
  readonly combos = this.cine.combosActivos;
  readonly candy = computed(() => this.cine.productosPorCategoria('Pochoclos'));

  /** Cartelera filtrada por texto y género (mail del 16/01). */
  readonly cartelera = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const genero = this.generoElegido();

    return this.cine.peliculasEnCartelera().filter((p) => {
      if (genero && !p.generos.includes(genero)) return false;
      if (!texto) return true;
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.sinopsis.toLowerCase().includes(texto) ||
        p.generos.some((g) => g.toLowerCase().includes(texto))
      );
    });
  });

  /** "Mis películas": títulos ya vistos por el usuario (mail del 08/03). */
  readonly misPeliculas = computed(() => {
    const vistas = new Set(
      this.cine
        .ticketsUsuario()
        .filter((t) => t.estado === 'ACTIVO')
        .map((t) => t.peliculaId),
    );
    return this.cine.peliculasEnCartelera().filter((p) => vistas.has(p.id));
  });

  readonly resumenPuntos = computed(() => this.cine.puntosUsuario());
  readonly resumenCredito = computed(() => this.cine.creditoUsuario());

  formatear(monto: number): string {
    return formatearMoneda(monto);
  }

  resenyasDe(peliculaId: number): string {
    const { promedio, total } = this.cine.obtenerReseniasPorPelicula(peliculaId);
    if (promedio === null) return 'Sin reseñas';
    return `${promedio} ★ (${total})`;
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.generoElegido.set('');
  }
}