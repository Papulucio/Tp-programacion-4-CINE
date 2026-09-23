import { Injectable, signal, computed, inject } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Resenia } from '../models/resenia';
import { Producto } from '../models/producto';
import { Cupon } from '../models/cupon';
import { Funcion } from '../models/funcion';
import { SupabaseService } from './supabase';
import { Recompensa, Canje, ComboEspecial } from '../models/fidelizacion';

export interface Ticket {
  id: number;
  codigoQr: string;
  usuarioEmail: string;
  peliculaNombre: string;
  frecuencia: string;
  fechaHoraFuncion: string; 
  productosCandy: string[];
  montoTotal: number;
  validadoEntrada: boolean;
  validadoCandy: boolean;
  estado: 'ACTIVO' | 'CANCELADO';
}

export interface LogAuditoria {
  id: number;
  fechaHora: string;
  accion: string;
  usuario: string;
  detalle: string;
}

@Injectable({
  providedIn: 'root'
})
export class CineService {
  private supabase = inject(SupabaseService).client;

  private peliculas = signal<Pelicula[]>([
    {
      id: 1,
      nombre: 'Avatar: El Camino del Agua',
      sinopsis: 'Jake Sully vive con su nueva familia en el planeta Pandora.',
      duracionMinutos: 192,
      imagenUrl: 'https://static.wikia.nocookie.net/doblaje/images/e/ed/AVATAR-El_Camino_del_Agua_p%C3%B3ster.jpg/revision/latest?cb=20221102143411&path-prefix=es',
      generos: ['Acción', 'Ciencia Ficción', 'Aventura'],
      formato: '3D',
      idioma: 'Subtitulada',
      ventasTotales: 1500
    },
    {
      id: 2,
      nombre: 'El Senor de los Anillos',
      sinopsis: 'Un joven hobbit emprende un viaje para destruir un anillo único.',
      duracionMinutos: 178,
      imagenUrl: 'https://es.web.img2.acsta.net/c_310_420/medias/nmedia/18/89/67/45/20061512.jpg',
      generos: ['Fantasía', 'Aventura'],
      formato: '2D',
      idioma: 'Castellano',
      ventasTotales: 2300
    },
    {
      id: 3,
      nombre: 'Batman: El Caballero de la Noche',
      sinopsis: 'Batman combate la amenaza del Guasón en Ciudad Gótica.',
      duracionMinutos: 152,
      imagenUrl: 'https://static.wikia.nocookie.net/doblaje/images/9/9c/Batman_el_Caballero_de_la_Noche.png/revision/latest/thumbnail/width/360/height/360?cb=20110602012240&path-prefix=es',
      generos: ['Acción', 'Crimen', 'Drama'],
      formato: '2D',
      idioma: 'Subtitulada',
      ventasTotales: 1800
    },
    {
      id: 4,
      nombre: 'Mi Vecino Totoro',
      sinopsis: 'Dos hermanas entablan amistad con los espíritus del bosque.',
      duracionMinutos: 86,
      imagenUrl: 'https://images.cdn2.buscalibre.com/fit-in/660x660/aa/55/aa55c7aad7c5ef1bed42b6e3a4183c2d.jpg',
      generos: ['Animación', 'Fantasía', 'Familiar'],
      formato: '2D',
      idioma: 'Castellano',
      ventasTotales: 950
    }
  ]);

  private resenias = signal<Resenia[]>([
    { id: 1, peliculaId: 1, usuarioNombre: 'Juan', estrellas: 5, comentario: 'Excelente efectos 3D', fecha: '2026-01-10' },
    { id: 2, peliculaId: 1, usuarioNombre: 'Maria', estrellas: 4, comentario: 'Un poco larga pero muy buena', fecha: '2026-01-12' },
    { id: 3, peliculaId: 2, usuarioNombre: 'Carlos', estrellas: 5, comentario: 'Una obra de arte del cine', fecha: '2026-01-15' }
  ]);

  private productosCandy = signal<Producto[]>([
    { id: 1, nombre: 'Pochoclos Grandes', precio: 3500, categoria: 'Pochoclos', imagenUrl: 'https://via.placeholder.com/150' },
    { id: 2, nombre: 'Gaseosa 500ml', precio: 1800, categoria: 'Bebidas', imagenUrl: 'https://via.placeholder.com/150' }
  ]);

  private cupones = signal<Cupon[]>([
    { id: 1, codigo: 'BIENVENIDA20', porcentajeDescuento: 20, soloMayores50: false },
    { id: 2, codigo: 'SENIOR50', porcentajeDescuento: 30, soloMayores50: true }
  ]);

  private salas = [1, 2, 3, 4];
  private funciones = signal<Funcion[]>([]);

  private tickets = signal<Ticket[]>([
    {
      id: 1,
      codigoQr: 'CINE-8823',
      usuarioEmail: 'test@cine.com',
      peliculaNombre: 'Avatar: El Camino del Agua',
      frecuencia: 'Lunes 18:00hs',
      fechaHoraFuncion: new Date(Date.now() + 86400000).toISOString(), // Mañana
      productosCandy: ['Pochoclos Grandes'],
      montoTotal: 8000,
      validadoEntrada: false,
      validadoCandy: false,
      estado: 'ACTIVO'
    }
  ]);

  private puntosUsuario = signal<number>(1200);
  private historialCanjes = signal<Canje[]>([]);

  private recompensas = signal<Recompensa[]>([
    { id: 1, nombre: 'Entrada General Gratis', tipo: 'entrada', puntosRequeridos: 500 },
    { id: 2, nombre: 'Pochoclo Grande Gratis', tipo: 'candy', puntosRequeridos: 150 },
    { id: 3, nombre: 'Gaseosa 500ml Gratis', tipo: 'candy', puntosRequeridos: 100 }
  ]);

  private combosEspeciales = signal<ComboEspecial[]>([
    {
      id: 1,
      nombre: 'Combo Cine En Pareja',
      descripcion: '2 Entradas + 1 Pochoclo Grande + 2 Gaseosas',
      precio: 8500
    }
  ]);

  private logsAuditoria = signal<LogAuditoria[]>([]);
  private creditoUsuario = signal<number>(0);

  constructor() {
    this.cargarFuncionesDesdeSupabase();
  }

  async cargarFuncionesDesdeSupabase() {
    const { data, error } = await this.supabase.from('funciones').select('*');
    if (error) {
      console.error('Error al recuperar funciones de Supabase:', error);
      return;
    }

    if (data) {
      const funcionesMapeadas: Funcion[] = data.map((f: any) => ({
        id: f.id,
        peliculaId: f.pelicula_id,
        salaId: f.sala_id,
        dias: f.dias,
        horaInicio: f.hora_inicio,
        horaFin: f.hora_fin,
        precio: f.precio
      }));
      this.funciones.set(funcionesMapeadas);
    }
  }

  peliculasMasVendidas = computed(() => {
    return [...this.peliculas()]
      .sort((a, b) => b.ventasTotales - a.ventasTotales)
      .slice(0, 3);
  });

  getPeliculas(): Pelicula[] {
    return this.peliculas();
  }

  obtenerGeneros(): string[] {
    const todosLosGeneros = this.peliculas().flatMap(p => p.generos);
    return Array.from(new Set(todosLosGeneros));
  }

  obtenerReseniasPorPelicula(peliculaId: number) {
    const lista = this.resenias().filter(r => r.peliculaId === peliculaId);
    const promedio = lista.length > 0
      ? (lista.reduce((acc, r) => acc + r.estrellas, 0) / lista.length).toFixed(1)
      : 'Sin calificaciones';

    return { lista, promedio };
  }

  agregarResenia(nuevaResenia: Omit<Resenia, 'id' | 'fecha'>) {
    const reseniaCompleta: Resenia = {
      ...nuevaResenia,
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0]
    };
    this.resenias.update(list => [...list, reseniaCompleta]);
  }

  getProductosCandy = (): Producto[] => this.productosCandy();
  getCupones = (): Cupon[] => this.cupones();
  getFunciones = (): Funcion[] => this.funciones();
  getTickets = (): Ticket[] => this.tickets();
  getPuntosUsuario = (): number => this.puntosUsuario();
  getRecompensas = (): Recompensa[] => this.recompensas();
  getHistorialCanjes = (): Canje[] => this.historialCanjes();
  getCombosEspeciales = (): ComboEspecial[] => this.combosEspeciales();
  getLogsAuditoria = (): LogAuditoria[] => this.logsAuditoria();
  getCreditoUsuario = (): number => this.creditoUsuario();

  registrarLog(accion: string, usuario: string, detalle: string) {
    const nuevoLog: LogAuditoria = {
      id: Date.now(),
      fechaHora: new Date().toLocaleString(),
      accion,
      usuario,
      detalle
    };
    this.logsAuditoria.update(logs => [nuevoLog, ...logs]);
  }

  descontarCredito(monto: number) {
    this.creditoUsuario.update(c => Math.max(0, c - monto));
  }

  cancelarReserva(ticketId: number, usuarioEmail: string): { exito: boolean; mensaje: string } {
    const ticket = this.tickets().find(t => t.id === ticketId);
    if (!ticket) return { exito: false, mensaje: 'Ticket no encontrado.' };

    if (ticket.estado === 'CANCELADO') {
      return { exito: false, mensaje: 'El ticket ya se encuentra cancelado.' };
    }

    const horaFuncion = new Date(ticket.fechaHoraFuncion).getTime();
    const ahora = new Date().getTime();
    const diferenciaHoras = (horaFuncion - ahora) / (1000 * 60 * 60);

    if (diferenciaHoras < 2) {
      return { exito: false, mensaje: 'No podés cancelar con menos de 2 horas de anticipación a la función.' };
    }

    ticket.estado = 'CANCELADO';
    this.creditoUsuario.update(c => c + ticket.montoTotal);

    this.registrarLog('CANCELACIÓN_RESERVA', usuarioEmail, `Cancelación de ticket #${ticket.id}. Crédito acreditado: $${ticket.montoTotal}`);

    return { exito: true, mensaje: `Reserva cancelada. Se han acreditado $${ticket.montoTotal} de saldo en tu perfil.` };
  }

  actualizarPorcentajeCupon(cuponId: number, nuevoPorcentaje: number, usuarioAdmin: string = 'Admin') {
    this.cupones.update(lista =>
      lista.map(c => (c.id === cuponId ? { ...c, porcentajeDescuento: nuevoPorcentaje } : c))
    );
    this.registrarLog('MODIFICACION_CUPON', usuarioAdmin, `Modificó descuento del cupón #${cuponId} a ${nuevoPorcentaje}%`);
  }

  crearCupon(codigo: string, porcentaje: number, soloMayores50: boolean, usuarioAdmin: string = 'Admin') {
    const nuevo: Cupon = { id: Date.now(), codigo, porcentajeDescuento: porcentaje, soloMayores50 };
    this.cupones.update(lista => [...lista, nuevo]);
    this.registrarLog('CREACION_CUPON', usuarioAdmin, `Creó el cupón ${codigo} con ${porcentaje}% de descuento.`);
  }

  agregarProductoCandy(producto: Producto, usuarioAdmin: string = 'Admin') {
    this.productosCandy.update(lista => [...lista, producto]);
    this.registrarLog('CREACION_PRODUCTO_CANDY', usuarioAdmin, `Agregó producto: ${producto.nombre}`);
  }

  async crearFuncionAutomatica(peliculaId: number, dias: string[], horaInicio: string, precio: number, usuarioAdmin: string = 'Admin'): Promise<{ exito: boolean; mensaje: string }> {
    const pelicula = this.peliculas().find(p => p.id === peliculaId);
    if (!pelicula) return { exito: false, mensaje: 'Película no encontrada' };

    const [horas, minutos] = horaInicio.split(':').map(Number);
    const inicioEnMinutos = horas * 60 + minutos;
    const finEnMinutos = inicioEnMinutos + pelicula.duracionMinutos + 30;

    for (const sala of this.salas) {
      const tieneSolapamiento = this.funciones().some(f => {
        if (f.salaId !== sala) return false;
        const diasCoincidentes = f.dias.some(d => dias.includes(d));
        if (!diasCoincidentes) return false;

        const [fHoraIni, fMinIni] = f.horaInicio.split(':').map(Number);
        const [fHoraFin, fMinFin] = f.horaFin.split(':').map(Number);
        const fIniMin = fHoraIni * 60 + fMinIni;
        const fFinMin = fHoraFin * 60 + fMinFin;

        return Math.max(inicioEnMinutos, fIniMin) < Math.min(finEnMinutos, fFinMin);
      });

      if (!tieneSolapamiento) {
        const horaFinStr = `${Math.floor(finEnMinutos / 60).toString().padStart(2, '0')}:${(finEnMinutos % 60).toString().padStart(2, '0')}`;
        
        const payloadSupabase = {
          pelicula_id: peliculaId,
          sala_id: sala,
          dias: dias,
          hora_inicio: horaInicio,
          hora_fin: horaFinStr,
          precio: precio
        };

        const { data, error } = await this.supabase
          .from('funciones')
          .insert([payloadSupabase])
          .select();

        if (error) {
          console.error('Error guardando la función en Supabase:', error);
          return { exito: false, mensaje: 'Error al persistir la función en la base de datos.' };
        }

        if (data && data.length > 0) {
          const nuevaFuncion: Funcion = {
            id: data[0].id,
            peliculaId,
            salaId: sala,
            dias,
            horaInicio,
            horaFin: horaFinStr,
            precio
          };
          this.funciones.update(l => [...l, nuevaFuncion]);
          this.registrarLog('CREACION_FUNCION', usuarioAdmin, `Creó función para ${pelicula.nombre} en Sala ${sala}`);
          return { exito: true, mensaje: `Función asignada automáticamente a la Sala ${sala}` };
        }
      }
    }
    return { exito: false, mensaje: 'No hay salas disponibles en los días y horarios seleccionados.' };
  }

  validarCodigoQr(codigo: string, tipo: 'entrada' | 'candy', empleadoEmail: string = 'Empleado'): { exito: boolean; mensaje: string } {
    const ticket = this.tickets().find(t => t.codigoQr.toLowerCase() === codigo.trim().toLowerCase());
    
    if (!ticket) return { exito: false, mensaje: 'Código QR no encontrado.' };
    if (ticket.estado === 'CANCELADO') return { exito: false, mensaje: 'Entrada DENEGADA: La reserva fue cancelada.' };

    if (tipo === 'entrada') {
      if (ticket.validadoEntrada) return { exito: false, mensaje: 'Entrada DENEGADA: El QR ya fue utilizado.' };
      ticket.validadoEntrada = true;
      this.registrarLog('VALIDACION_QR_ENTRADA', empleadoEmail, `Validó entrada QR ${ticket.codigoQr} (${ticket.peliculaNombre})`);
      return { exito: true, mensaje: `Entrada VALIDADA para ${ticket.peliculaNombre}.` };
    } else {
      if (ticket.validadoCandy) return { exito: false, mensaje: 'Candy Bar DENEGADO: El pedido ya fue entregado.' };
      ticket.validadoCandy = true;
      this.registrarLog('VALIDACION_QR_CANDY', empleadoEmail, `Entregó pedido Candy QR ${ticket.codigoQr}`);
      return { exito: true, mensaje: `Candy Bar ENTREGADO: ${ticket.productosCandy.join(', ')}.` };
    }
  }

  acumularPuntos(montoGastado: number) {
    this.puntosUsuario.update(p => p + Math.floor(montoGastado));
  }

  canjearRecompensa(recompensaId: number, usuarioEmail: string): { exito: boolean; mensaje: string } {
    const recompensa = this.recompensas().find(r => r.id === recompensaId);
    if (!recompensa) return { exito: false, mensaje: 'Recompensa no encontrada.' };

    if (this.puntosUsuario() < recompensa.puntosRequeridos) {
      return { exito: false, mensaje: 'Puntos insuficientes para realizar este canje.' };
    }

    this.puntosUsuario.update(p => p - recompensa.puntosRequeridos);

    const nuevoCanje: Canje = {
      id: Date.now(),
      usuarioEmail,
      recompensaNombre: recompensa.nombre,
      puntosUtilizados: recompensa.puntosRequeridos,
      fecha: new Date().toISOString().split('T')[0]
    };

    this.historialCanjes.update(h => [nuevoCanje, ...h]);
    this.registrarLog('CANJE_PUNTOS', usuarioEmail, `Canjeó recompensa: ${recompensa.nombre}`);
    return { exito: true, mensaje: `¡Canjeaste exitosamente: ${recompensa.nombre}!` };
  }

  actualizarPuntosRecompensa(recompensaId: number, nuevosPuntos: number, usuarioAdmin: string = 'Admin') {
    this.recompensas.update(lista =>
      lista.map(r => r.id === recompensaId ? { ...r, puntosRequeridos: nuevosPuntos } : r)
    );
    this.registrarLog('MODIFICACION_RECOMPENSA', usuarioAdmin, `Actualizó costo de recompensa #${recompensaId} a ${nuevosPuntos} puntos`);
  }

  crearComboEspecial(nombre: string, descripcion: string, precio: number, usuarioAdmin: string = 'Admin') {
    const nuevoCombo: ComboEspecial = { id: Date.now(), nombre, descripcion, precio };
    this.combosEspeciales.update(lista => [...lista, nuevoCombo]);
    this.registrarLog('CREACION_COMBO', usuarioAdmin, `Creó nuevo combo especial: ${nombre}`);
  }
}