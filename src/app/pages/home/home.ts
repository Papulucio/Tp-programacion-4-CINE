import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CineService } from '../../services/cine';
import { Pelicula } from '../../models/pelicula';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  
  busquedaTexto: string = '';
  generoSeleccionado: string = '';
  generosDisponibles: string[] = [];

  constructor(public cineService: CineService) {}

  ngOnInit(): void {
    this.generosDisponibles = this.cineService.obtenerGeneros();
  }

  get peliculasFiltradas(): Pelicula[] {
    // Usamos getPeliculasEnCartelera() para excluir preventas y próximas del catálogo general
    return this.cineService.getPeliculasEnCartelera().filter(p => {
      const coincideNombre = p.nombre.toLowerCase().includes(this.busquedaTexto.toLowerCase());
      const coincideGenero = this.generoSeleccionado === '' || p.generos.includes(this.generoSeleccionado);
      return coincideNombre && coincideGenero;
    });
  }

  // --- SECCIÓN PRÓXIMAMENTE Y ALERTAS ---
  get peliculasProximas(): Pelicula[] {
    return typeof (this.cineService as any).getPeliculasProximas === 'function'
      ? (this.cineService as any).getPeliculasProximas()
      : this.cineService.getPeliculas().filter((p: any) => p.esProximamente);
  }

  activarAlerta(peliculaNombre: string) {
    alert(`¡Alerta activada! Te avisaremos por mail cuando las entradas para "${peliculaNombre}" estén disponibles para la venta.`);
  }

  obtenerDetallesResenia(peliculaId: number) {
    return this.cineService.obtenerReseniasPorPelicula(peliculaId);
  }
}