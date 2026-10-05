import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CineService } from '../../services/cine.service';
import { Ticket } from '../../models/ticket';
import { QrCodeComponent } from '../../components/qr-code/qr-code';
import { descargarTicketPDF } from '../../core/utils/exportar';
import { formatearFechaHora, formatearMoneda, horasHasta } from '../../core/utils/fecha.util';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink, QrCodeComponent],
  templateUrl: './perfil.html',
})
export class PerfilComponent {
  readonly auth = inject(AuthService);
  readonly cine = inject(CineService);

  readonly mensaje = signal('');
  readonly error = signal('');
  readonly exportando = signal(false);
  readonly ticketAmpliado = signal<Ticket | null>(null);

  readonly usuario = this.auth.usuarioActual;
  readonly tickets = this.cine.ticketsUsuario;
  readonly canjes = this.cine.canjesUsuario;
  readonly recompensas = this.cine.getRecompensas;
  readonly puntos = this.cine.puntosUsuario;
  readonly credito = this.cine.creditoUsuario;

  /** Tickets todavía cancelables (regla de las 2 horas, mail del 10/03). */
  readonly ticketsCancelables = computed(() =>
    this.tickets().filter((t) => t.estado === 'ACTIVO' && horasHasta(t.fechaHoraFuncion) >= 2),
  );

  readonly proximosEstrenos = computed(() =>
    this.cine.peliculasProximamente().filter((p) => this.auth.tieneAlerta(p.id)),
  );

  formatear(monto: number): string {
    return formatearMoneda(monto);
  }

  fecha(iso: string): string {
    return formatearFechaHora(iso);
  }

  horasRestantes(ticket: Ticket): string {
    const horas = horasHasta(ticket.fechaHoraFuncion);
    if (horas < 0) return 'La función ya pasó';
    if (horas < 2) return `Faltan ${horas.toFixed(1)} h: ya no se puede cancelar`;
    return `Faltan ${Math.floor(horas)} h ${Math.round((horas % 1) * 60)} min`;
  }

  puedeCancelar(ticket: Ticket): boolean {
    return ticket.estado === 'ACTIVO' && horasHasta(ticket.fechaHoraFuncion) >= 2;
  }

  cancelar(ticket: Ticket): void {
    this.error.set('');
    this.mensaje.set('');

    const resultado = this.cine.cancelarReserva(ticket.id);
    if (!resultado.exito) {
      this.error.set(resultado.mensaje);
      return;
    }
    this.mensaje.set(resultado.mensaje);
  }

  canjear(recompensaId: number): void {
    this.error.set('');
    this.mensaje.set('');

    const resultado = this.cine.canjearRecompensa(recompensaId);
    if (!resultado.exito) {
      this.error.set(resultado.mensaje);
      return;
    }
    this.mensaje.set(resultado.mensaje);
    if (resultado.ticket) this.ticketAmpliado.set(resultado.ticket);
  }

  verTicket(ticket: Ticket): void {
    this.ticketAmpliado.set(ticket);
  }

  /** Ticket en PDF con el QR incluido, para imprimirlo o compartirlo. */
  async descargarTicket(ticket: Ticket): Promise<void> {
    this.error.set('');
    this.exportando.set(true);
    try {
      await descargarTicketPDF(`ticket-${ticket.codigoQr}.pdf`, {
        codigoQr: ticket.codigoQr,
        pelicula: ticket.peliculaNombre,
        funcion: ticket.frecuencia,
        fechaFuncion: formatearFechaHora(ticket.fechaHoraFuncion),
        sala: ticket.salaId ? `Sala ${ticket.salaId}` : '—',
        butacas: ticket.butacas.map((b) => `${b.etiqueta} (${b.tipo})`),
        candy: ticket.productosCandy.map((c) => `${c.cantidad} x ${c.nombre}`),
        total: formatearMoneda(ticket.montoTotal),
        estado: ticket.estado,
      });
      this.mensaje.set('Ticket descargado en PDF.');
    } catch (error) {
      this.error.set(`No se pudo generar el PDF: ${String(error)}`);
    } finally {
      this.exportando.set(false);
    }
  }

  cerrarTicket(): void {
    this.ticketAmpliado.set(null);
  }

  totalGastado(): number {
    return this.tickets()
      .filter((t) => t.estado === 'ACTIVO')
      .reduce((acc, t) => acc + t.montoTotal, 0);
  }
}