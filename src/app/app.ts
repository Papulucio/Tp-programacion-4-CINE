import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CineService } from './services/cine.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class AppComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly cine = inject(CineService);

  readonly anio = new Date().getFullYear();

  /** Estrenos con alerta activada por el usuario (mail del 08/03). */
  readonly alertas = computed(() =>
    this.cine.peliculasProximamente().flatMap((p) => {
      if (!this.auth.tieneAlerta(p.id)) return [];
      const preventa = this.cine.preventaDe(p.id);
      return [
        {
          id: p.id,
          nombre: p.nombre,
          fechaEstreno: p.fechaEstreno ?? p.preventa?.fechaEstreno ?? '',
          preventaAbierta: preventa?.abierta === true,
          faltanDias: preventa?.faltanDias ?? null,
        },
      ];
    }),
  );

  readonly cantidadAlertas = computed(() => this.alertas().length);

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigate(['/home']);
  }
}