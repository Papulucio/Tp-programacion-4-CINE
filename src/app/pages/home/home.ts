import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CineService } from '../../services/cine';
import { Pelicula } from '../../models/pelicula';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
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
    return this.cineService.getPeliculas().filter(p => {
      const coincideNombre = p.nombre.toLowerCase().includes(this.busquedaTexto.toLowerCase());
      const coincideGenero = this.generoSeleccionado === '' || p.generos.includes(this.generoSeleccionado);
      return coincideNombre && coincideGenero;
    });
  }

  obtenerDetallesResenia(peliculaId: number) {
    return this.cineService.obtenerReseniasPorPelicula(peliculaId);
  }
}
