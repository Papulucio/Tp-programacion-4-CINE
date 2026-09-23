import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CineService, Ticket } from '../../services/cine';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.html'
})
export class PerfilComponent {
  cineService = inject(CineService);
  usuarioEmail = 'test@cine.com';
  mensaje = '';

  get puntos() {
    return this.cineService.getPuntosUsuario();
  }

  get recompensas() {
    return this.cineService.getRecompensas();
  }

  get historial() {
    return this.cineService.getHistorialCanjes();
  }

  get credito() {
    return this.cineService.getCreditoUsuario();
  }

  get misTickets(): Ticket[] {
    return this.cineService.getTickets().filter(t => t.usuarioEmail === this.usuarioEmail);
  }

  canjear(recompensaId: number) {
    const res = this.cineService.canjearRecompensa(recompensaId, this.usuarioEmail);
    this.mensaje = res.mensaje;
  }

  // Cancela la reserva si faltan al menos 2 horas para la función
  cancelarReserva(ticketId: number) {
    const res = this.cineService.cancelarReserva(ticketId, this.usuarioEmail);
    this.mensaje = res.mensaje;
  }
}