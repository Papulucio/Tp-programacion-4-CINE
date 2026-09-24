import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CineService } from '../../services/cine';
import { Pelicula } from '../../models/pelicula';
import { Funcion } from '../../models/funcion';
import { Producto } from '../../models/producto';
import { MapaButacasComponent } from './mapa-butacas/mapa-butacas';

@Component({
  selector: 'app-compra',
  standalone: true,
  imports: [CommonModule, FormsModule, MapaButacasComponent],
  templateUrl: './compra.html'
})
export class CompraComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  cineService = inject(CineService);

  pelicula: Pelicula | undefined;
  funcionesDisponibles: Funcion[] = [];
  funcionSeleccionada: Funcion | null = null;

  // NUEVO: Array para almacenar las butacas seleccionadas desde el mapa
  butacasSeleccionadas: { id: string; fila: string; numero: number }[] = [];

  productosSeleccionados: { producto: Producto; cantidad: number }[] = [];
  combosSeleccionados: { combo: any; cantidad: number }[] = [];
  combosEspecialesDisponibles: any[] = [];

  codigoCupon = 'BIENVENIDA20';
  descuentoAplicado = 0;
  mensajeCupon = '';
  compraFinalizada = false;
  codigoQrGenerado = '';

  usuarioLogueado: any = null;

  // --- VARIABLES Y PROPIEDADES PARA RESEÑAS ---
  nuevaCalificacion: number = 5;
  nuevoComentario: string = '';
  resenas: Array<{ usuario: string; estrellas: number; comentario: string }> = [];

  ngOnInit() {
    const userStr = localStorage.getItem('usuario_activo');
    if (userStr) {
      this.usuarioLogueado = JSON.parse(userStr);
    }

    const peliculaId = Number(this.route.snapshot.paramMap.get('id'));
    const listaPeliculas = this.cineService.getPeliculas();
    this.pelicula = listaPeliculas.find(p => p.id === peliculaId);

    if (this.pelicula) {
      this.funcionesDisponibles = this.cineService.getFunciones().filter(f => f.peliculaId === peliculaId);
      this.cargarResenas();
    }

    const productos = this.cineService.getProductosCandy();
    this.productosSeleccionados = productos.map(p => ({ producto: p, cantidad: 0 }));

    // Cargar combos especiales configurados por el admin
    if (typeof this.cineService.getCombosEspeciales === 'function') {
      this.combosEspecialesDisponibles = this.cineService.getCombosEspeciales();
      this.combosSeleccionados = this.combosEspecialesDisponibles.map(c => ({ combo: c, cantidad: 0 }));
    }
  }

  // NUEVO: Método que escucha al componente hijo (MapaButacasComponent)
  onButacasChange(butacas: { id: string; fila: string; numero: number }[]) {
    this.butacasSeleccionadas = butacas;
  }

  cargarResenas() {
    if (!this.pelicula) return;
    
    const { lista } = this.cineService.obtenerReseniasPorPelicula(this.pelicula.id);
    this.resenas = lista.map(r => ({
      usuario: r.usuarioNombre,
      estrellas: r.estrellas,
      comentario: r.comentario
    }));
  }

  guardarResena() {
    if (!this.nuevoComentario.trim() || !this.pelicula) return;

    const nombreUsuario = this.usuarioLogueado?.email || 'Anónimo';

    this.cineService.agregarResenia({
      peliculaId: this.pelicula.id,
      usuarioNombre: nombreUsuario,
      estrellas: Number(this.nuevaCalificacion),
      comentario: this.nuevoComentario
    });

    this.cargarResenas();
    this.nuevoComentario = '';
    this.nuevaCalificacion = 5;
  }

  calcularEdad(fechaNacimientoStr: string): number {
    if (!fechaNacimientoStr) return 0;
    const [anio, mes, dia] = fechaNacimientoStr.split('-').map(Number);
    const hoy = new Date();
    
    let edad = hoy.getFullYear() - anio;
    const mesActual = hoy.getMonth() + 1;
    const diaActual = hoy.getDate();

    if (mesActual < mes || (mesActual === mes && diaActual < dia)) {
      edad--;
    }

    return edad;
  }

  seleccionarFuncion(funcion: Funcion) {
    this.funcionSeleccionada = funcion;
    this.butacasSeleccionadas = []; // Resetea las butacas al cambiar de función
  }

  modificarCantidadCandy(index: number, cambio: number) {
    const nuevaCant = this.productosSeleccionados[index].cantidad + cambio;
    if (nuevaCant >= 0) {
      this.productosSeleccionados[index].cantidad = nuevaCant;
    }
  }

  modificarCantidadCombo(index: number, cambio: number) {
    const nuevaCant = this.combosSeleccionados[index].cantidad + cambio;
    if (nuevaCant >= 0) {
      this.combosSeleccionados[index].cantidad = nuevaCant;
    }
  }

  aplicarCupon() {
    this.mensajeCupon = '';
    const cupon = this.cineService.getCupones().find(c => c.codigo.toUpperCase() === this.codigoCupon.trim().toUpperCase());

    if (!cupon) {
      alert('Cupón no válido');
      this.descuentoAplicado = 0;
      return;
    }

    if (cupon.soloMayores50) {
      const fechaNac = this.usuarioLogueado?.fechaNacimiento;
      const edad = this.calcularEdad(fechaNac);

      if (!fechaNac || edad < 50) {
        alert(`Este cupón es exclusivo para mayores de 50 años. (Tu edad registrada: ${edad} años)`);
        this.descuentoAplicado = 0;
        return;
      }
    }

    this.descuentoAplicado = cupon.porcentajeDescuento;
    this.mensajeCupon = `¡Cupón del ${cupon.porcentajeDescuento}% aplicado con éxito!`;
  }

  calcularSubtotal(): number {
    const precioBase = this.funcionSeleccionada ? this.funcionSeleccionada.precio : 0;
    
    // Suma las entradas considerando recargo VIP en filas R, S y T
    let totalEntradas = 0;
    this.butacasSeleccionadas.forEach(butaca => {
      const esVip = ['R', 'S', 'T'].includes(butaca.fila.toUpperCase());
      const precioButaca = esVip ? precioBase + 1500 : precioBase; // Podés ajustar el monto extra VIP si lo deseas
      totalEntradas += precioButaca;
    });

    const totalCandy = this.productosSeleccionados.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
    const totalCombos = this.combosSeleccionados.reduce((sum, item) => sum + (item.combo.precio * item.cantidad), 0);
    
    return totalEntradas + totalCandy + totalCombos;
  }

  calcularTotal(): number {
    const subtotal = this.calcularSubtotal();
    return subtotal - (subtotal * (this.descuentoAplicado / 100));
  }

  finalizarCompra() {
    if (!this.funcionSeleccionada) {
      alert('Por favor selecciona una función.');
      return;
    }

    if (this.butacasSeleccionadas.length === 0) {
      alert('Por favor selecciona al menos una butaca.');
      return;
    }

    const montoTotal = this.calcularTotal();
    this.codigoQrGenerado = 'CINE-' + Math.floor(1000 + Math.random() * 9000);

    const listaCandy = this.productosSeleccionados
      .filter(item => item.cantidad > 0)
      .map(item => `${item.cantidad}x ${item.producto.nombre}`);

    const listaCombos = this.combosSeleccionados
      .filter(item => item.cantidad > 0)
      .map(item => `${item.cantidad}x ${item.combo.nombre} (Combo)`);

    const detalleButacas = `Butacas: ${this.butacasSeleccionadas.map(b => `${b.fila}${b.numero}`).join(', ')}`;
    const productosTotales = [detalleButacas, ...listaCandy, ...listaCombos];
    const diasTexto = this.funcionSeleccionada.dias ? this.funcionSeleccionada.dias.join(', ') : '';

    this.cineService.agregarTicket({
      codigoQr: this.codigoQrGenerado,
      usuarioEmail: this.usuarioLogueado?.email || 'Anónimo',
      peliculaNombre: this.pelicula?.nombre || 'Película',
      frecuencia: `${diasTexto} - ${this.funcionSeleccionada.horaInicio}hs`,
      fechaHoraFuncion: new Date().toISOString(),
      productosCandy: productosTotales,
      montoTotal: montoTotal
    });

    this.compraFinalizada = true;
  }

  volverAHome() {
    this.router.navigate(['/home']);
  }
}