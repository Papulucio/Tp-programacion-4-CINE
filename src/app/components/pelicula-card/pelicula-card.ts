import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';
import { CineService } from '../../services/cine.service';
import { etiquetaClasificacion, formatearMoneda } from '../../core/utils/fecha.util';

@Component({
  selector: 'app-pelicula-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pelicula-card.html',
})
export class PeliculaCardComponent {
  private readonly cine = inject(CineService);

  readonly pelicula = input.required<Pelicula>();
  readonly mostrarAlerta = input(false);
  readonly mostrarControlAdmin = input(false);

  readonly enPreventa = computed(() => this.cine.preventaDe(this.pelicula().id)?.abierta === true);
  readonly diasParaPreventa = computed(() => this.cine.preventaDe(this.pelicula().id)?.faltanDias ?? null);
  readonly tieneAlerta = computed(() => this.cine.auth.tieneAlerta(this.pelicula().id));

  readonly precioDesde = computed(() => {
    const pelicula = this.pelicula();
    if (this.enPreventa() && pelicula.preventa) return pelicula.preventa.precio;

    const funciones = this.cine.funcionesDePelicula(pelicula.id);
    if (funciones.length === 0) return 0;
    return Math.min(...funciones.map((f) => f.precio));
  });

  formatear(monto: number): string {
    return formatearMoneda(monto);
  }

  clasificacion(edad: 0 | 13 | 18): string {
    return etiquetaClasificacion(edad);
  }

  alternarAlerta(): void {
    this.cine.auth.alternarAlerta(this.pelicula().id);
  }

  alternarPeliculaVisible(): void {
    this.cine.togglePeliculaVisible(this.pelicula().id);
  }
}