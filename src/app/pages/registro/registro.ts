import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { calcularEdad } from '../../core/utils/fecha.util';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly coloresOjos = ['Marrón', 'Azul', 'Verde', 'Miel', 'Negro'];

  readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    fechaNacimiento: ['', [Validators.required]],
    tipoSangre: ['', [Validators.required]],
    colorOjos: ['', [Validators.required]],
    diasVacaciones: [0, [Validators.required, Validators.min(0), Validators.max(365)]],
  });

  mensaje = '';
  error = '';

  /** Edad calculada en vivo: sirve para explicar el bloqueo por clasificación. */
  get edad(): number {
    return calcularEdad(this.formulario.controls.fechaNacimiento.value);
  }

  registrar(): void {
    this.mensaje = '';
    this.error = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error = 'Revisá los campos marcados.';
      return;
    }

    const resultado = this.auth.registrar(this.formulario.getRawValue());
    if (!resultado.exito) {
      this.error = resultado.mensaje;
      return;
    }

    this.mensaje = resultado.mensaje;
    void this.router.navigate(['/perfil']);
  }
}