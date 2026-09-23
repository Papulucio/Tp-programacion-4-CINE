import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CineService } from '../../services/cine';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleado.html'
})
export class EmpleadoComponent {
  cineService = inject(CineService);

  codigoIngresado = '';
  tipoValidacion: 'entrada' | 'candy' = 'entrada';
  resultadoMensaje = '';
  esExito = false;

  procesarCodigo() {
    if (!this.codigoIngresado.trim()) {
      this.resultadoMensaje = 'Ingrese o escanee un código válido.';
      this.esExito = false;
      return;
    }

    const resp = this.cineService.validarCodigoQr(this.codigoIngresado, this.tipoValidacion);
    this.resultadoMensaje = resp.mensaje;
    this.esExito = resp.exito;

    if (resp.exito) {
      this.codigoIngresado = '';
    }
  }
}