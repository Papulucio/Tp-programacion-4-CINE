import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  clave = '';
  readonly mensaje = signal('');
  readonly error = signal('');

  readonly cuentasDemo = this.auth.cuentasDemo;

  usarCuenta(email: string, clave: string): void {
    this.email = email;
    this.clave = clave;
  }

  entrar(): void {
    this.error.set('');
    const resultado = this.auth.login(this.email, this.clave);
    if (!resultado.exito) {
      this.error.set(resultado.mensaje);
      return;
    }

    this.mensaje.set(resultado.mensaje);
    const retorno = this.route.snapshot.queryParamMap.get('retour');
    if (retorno) {
      void this.router.navigateByUrl(retorno);
      return;
    }
    void this.router.navigate([this.auth.esAdmin() ? '/admin' : this.homeDe(this.auth.sesionActual()?.rol)]);
  }

  private homeDe(rol: string | undefined): string {
    if (rol === 'empleado') return '/empleado';
    return '/home';
  }
}