import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CineService } from '../../services/cine';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html'
})
export class AdminComponent implements OnInit {
  cineService = inject(CineService);

  nuevoCodigo = '';
  nuevoPorcentaje = 20;
  soloMayores50 = false;

  peliculaSeleccionadaId: number | null = null;
  diasSeleccionados: string[] = [];
  horaInicio = '18:00';
  precioFuncion = 4000;
  mensajeAsignacion = '';
  esExito = false;

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  nuevoProductoNombre = '';
  nuevoProductoCategoria: 'Pochoclos' | 'Bebidas' | 'Golosinas' | 'Combos' = 'Pochoclos';
  nuevoProductoPrecio = 0;
  productosCandy: Producto[] = [];

  // VARIABLES MAIL 7: COMBOS ESPECIALES Y RECOMPENSAS
  nuevoComboNombre = '';
  nuevoComboDescripcion = '';
  nuevoComboPrecio = 0;

  ngOnInit() {
    this.cargarProductos();
  }

  // GETTERS MAIL 7
  get recompensas() {
    return this.cineService.getRecompensas();
  }

  get combos() {
    return this.cineService.getCombosEspeciales();
  }

  cargarProductos() {
    this.productosCandy = this.cineService.getProductosCandy();
  }

  crearProductoCandy() {
    if (!this.nuevoProductoNombre.trim() || this.nuevoProductoPrecio <= 0) {
      alert('Ingresa un nombre y un precio válido.');
      return;
    }

    const nuevoProd: Producto = {
      id: Date.now(),
      nombre: this.nuevoProductoNombre,
      categoria: this.nuevoProductoCategoria,
      precio: this.nuevoProductoPrecio,
      imagenUrl: 'https://via.placeholder.com/150'
    };

    this.cineService.agregarProductoCandy(nuevoProd);
    this.cargarProductos();

    this.nuevoProductoNombre = '';
    this.nuevoProductoPrecio = 0;
  }

  guardarCupon() {
    if (!this.nuevoCodigo.trim()) return;
    this.cineService.crearCupon(this.nuevoCodigo.trim().toUpperCase(), this.nuevoPorcentaje, this.soloMayores50);
    this.nuevoCodigo = '';
    this.nuevoPorcentaje = 20;
    this.soloMayores50 = false;
  }

  modificarDescuento(cuponId: number, evento: Event) {
    const valor = Number((evento.target as HTMLInputElement).value);
    if (!isNaN(valor)) {
      this.cineService.actualizarPorcentajeCupon(cuponId, valor);
    }
  }

  toggleDia(dia: string) {
    if (this.diasSeleccionados.includes(dia)) {
      this.diasSeleccionados = this.diasSeleccionados.filter(d => d !== dia);
    } else {
      this.diasSeleccionados.push(dia);
    }
  }

  async programarFuncion() {
    if (!this.peliculaSeleccionadaId || this.diasSeleccionados.length === 0 || !this.horaInicio) {
      this.mensajeAsignacion = 'Por favor complete todos los campos requeridos.';
      this.esExito = false;
      return;
    }

    const resultado = await this.cineService.crearFuncionAutomatica(
      Number(this.peliculaSeleccionadaId),
      this.diasSeleccionados,
      this.horaInicio,
      this.precioFuncion
    );

    this.mensajeAsignacion = resultado.mensaje;
    this.esExito = resultado.exito;

    if (resultado.exito) {
      this.diasSeleccionados = [];
      this.peliculaSeleccionadaId = null;
    }
  }

  // MÉTODOS MAIL 7
  modificarPuntosRecompensa(recompensaId: number, evento: Event) {
    const puntos = Number((evento.target as HTMLInputElement).value);
    if (!isNaN(puntos) && puntos > 0) {
      this.cineService.actualizarPuntosRecompensa(recompensaId, puntos);
    }
  }

  crearCombo() {
    if (!this.nuevoComboNombre.trim() || this.nuevoComboPrecio <= 0) {
      alert('Ingresa un nombre y un precio válido para el combo.');
      return;
    }

    this.cineService.crearComboEspecial(
      this.nuevoComboNombre,
      this.nuevoComboDescripcion,
      this.nuevoComboPrecio
    );

    this.nuevoComboNombre = '';
    this.nuevoComboDescripcion = '';
    this.nuevoComboPrecio = 0;
  }
}