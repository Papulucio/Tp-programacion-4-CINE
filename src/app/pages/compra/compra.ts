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

  productosSeleccionados: { producto: Producto; cantidad: number }[] = [];

  codigoCupon = 'BIENVENIDA20';
  descuentoAplicado = 0;
  mensajeCupon = '';
  compraFinalizada = false;
  codigoQrGenerado = '';

  usuarioLogueado: any = null;

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
  }

  const productos = this.cineService.getProductosCandy();
  this.productosSeleccionados = productos.map(p => ({ producto: p, cantidad: 0 }));
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
  }

  modificarCantidadCandy(index: number, cambio: number) {
    const nuevaCant = this.productosSeleccionados[index].cantidad + cambio;
    if (nuevaCant >= 0) {
      this.productosSeleccionados[index].cantidad = nuevaCant;
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
    const precioEntrada = this.funcionSeleccionada ? this.funcionSeleccionada.precio : 0;
    const totalEntradas = precioEntrada; 
    const totalCandy = this.productosSeleccionados.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
    return totalEntradas + totalCandy;
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

    const montoTotal = this.calcularTotal();

    this.cineService.acumularPuntos(montoTotal);

    this.codigoQrGenerado = 'CINE-' + Math.floor(1000 + Math.random() * 9000);
    this.compraFinalizada = true;
  }

  volverAHome() {
    this.router.navigate(['/home']);
  }
}