import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class RegistroComponent {
  registroForm: FormGroup;

  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  coloresOjos = ['Marrón', 'Azul', 'Verde', 'Miel', 'Negro'];

  constructor(private fb: FormBuilder, private router: Router) {
    this.registroForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required]],
      tipoSangre: ['', [Validators.required]],
      colorOjos: ['', [Validators.required]],
      diasVacaciones: [0, [Validators.required, Validators.min(0)]]
    });
  }

  registrarUsuario() {
    if (this.registroForm.valid) {
      const usuarioNuevo = {
        ...this.registroForm.value,
        esRegistrado: true,
        tieneCuponPrimeraCompra: true 
      };
      
      localStorage.setItem('usuario_activo', JSON.stringify(usuarioNuevo));
      alert('¡Registro exitoso! Haz obtenido un cupón de 20% de descuento para tu primera compra.');
      this.router.navigate(['/home']);
    } else {
      this.registroForm.markAllAsTouched();
    }
  }
}
