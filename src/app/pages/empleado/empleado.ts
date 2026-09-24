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

  // Email del empleado logueado para el registro de auditoría
  empleadoEmail = 'empleado.control@cine.com';

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

    const resp = this.cineService.validarCodigoQr(
      this.codigoIngresado, 
      this.tipoValidacion, 
      this.empleadoEmail
    );
    
    this.resultadoMensaje = resp.mensaje;
    this.esExito = resp.exito;

    // Si el servicio no registra el log internamente, lo forzamos desde el componente:
    if (typeof (this.cineService as any).registrarLogActividad === 'function') {
      const tipoTexto = this.tipoValidacion === 'entrada' ? 'Entrada Cine' : 'Candy Bar';
      const accion = resp.exito 
        ? `Validación EXITOSA de QR (${tipoTexto}) - Código: ${this.codigoIngresado}` 
        : `Intento FALLIDO de validación QR (${tipoTexto}) - Código: ${this.codigoIngresado}`;
      
      (this.cineService as any).registrarLogActividad(this.empleadoEmail, accion);
    }

    if (resp.exito) {
      this.codigoIngresado = '';
    }
  }
}