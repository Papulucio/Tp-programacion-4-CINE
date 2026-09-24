import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CineService, Ticket } from '../../services/cine';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

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

  get misPeliculas(): string[] {
    const ticketsUsuario = this.misTickets;
    const peliculas = ticketsUsuario.map(t => t.peliculaNombre);
    return Array.from(new Set(peliculas)); 
  }

  canjear(recompensaId: number) {
    const res = this.cineService.canjearRecompensa(recompensaId, this.usuarioEmail);
    this.mensaje = res.mensaje;
  }

  cancelarReserva(ticketId: number) {
    const ticket = this.misTickets.find(t => t.id === ticketId);
    if (!ticket) {
      this.mensaje = 'No se encontró el ticket seleccionado.';
      return;
    }

    // VALIDACIÓN DE 2 HORAS ANTES DE LA FUNCIÓN
    if (ticket.fechaHoraFuncion) {
      const fechaFuncion = new Date(ticket.fechaHoraFuncion).getTime();
      const horaActual = new Date().getTime();
      const diferenciaHoras = (fechaFuncion - horaActual) / (1000 * 60 * 60);

      if (diferenciaHoras < 2) {
        this.mensaje = 'No es posible cancelar la reserva: falta menos de 2 horas para el inicio de la función.';
        return;
      }
    }

    // Procesa la cancelación y acreditación de saldo en el servicio
    const res = this.cineService.cancelarReserva(ticketId, this.usuarioEmail);
    this.mensaje = res.mensaje || `Reserva cancelada con éxito. Se acreditaron $${ticket.montoTotal} en tu saldo de crédito.`;
  }

  async descargarPDF(ticket: any) {
    const doc = new jsPDF();
    const codigoEntrada = ticket.codigoQr || `CINE-${ticket.id}`;
    
    const qrDataUrl = await QRCode.toDataURL(codigoEntrada, { width: 150 });

    doc.setFontSize(22);
    doc.text('CineApp - Entrada Digital', 20, 25);

    doc.setFontSize(14);
    doc.text(`Película: ${ticket.peliculaNombre}`, 20, 45);
    doc.text(`Función: ${ticket.frecuencia}`, 20, 55);
    doc.text(`Monto Pagado: $${ticket.montoTotal}`, 20, 65);
    doc.text(`Código de Ticket: ${codigoEntrada}`, 20, 75);

    doc.addImage(qrDataUrl, 'PNG', 20, 85, 60, 60);

    doc.save(`Entrada_${codigoEntrada}.pdf`);
  }
}