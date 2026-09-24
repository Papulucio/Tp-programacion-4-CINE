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

  // Actualizado con tus películas reales + la nueva película en preventa
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
      nombre: 'El Señor de los Anillos',
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
    },
    {
      id: 99,
      nombre: 'Dune: Parte Tres (Preventa)',
      sinopsis: 'Próxima gran superproducción de ciencia ficción. Asegurá tus entradas antes del estreno oficial.',
      duracionMinutos: 165,
      generos: ['Ciencia Ficción', 'Aventura'],
      formato: '2D',
      idioma: 'Subtitulada',
      imagenUrl: 'https://m.media-amazon.com/images/M/MV5BYjk1NjgwZDMtYzI5OS00Y2Q4LWI1NmItNTE5OGU2NDVmMTAxXkEyXkFqcGc@._V1_.jpg',
      esProximamente: true,
      enPreventa: true,
      precioPreventa: 3200,
      fechaEstreno: '2026-04-15',
      ventasTotales: 0
    }
  ]);

  private reseniasIniciales: Resenia[] = [
    { id: 1, peliculaId: 1, usuarioNombre: 'Juan', estrellas: 5, comentario: 'Excelentes efectos 3D y banda sonora impresionante.', fecha: '2026-01-10' },
    { id: 2, peliculaId: 1, usuarioNombre: 'María', estrellas: 4, comentario: 'Un poco larga pero visualmente es una joya.', fecha: '2026-01-12' },
    { id: 3, peliculaId: 2, usuarioNombre: 'Carlos', estrellas: 5, comentario: 'Una obra maestra del cine de fantasía.', fecha: '2026-01-15' },
    { id: 4, peliculaId: 2, usuarioNombre: 'Lucía', estrellas: 5, comentario: 'La vi 10 veces y me sigue emocionando como el primer día.', fecha: '2026-01-18' },
    { id: 5, peliculaId: 3, usuarioNombre: 'Pedro', estrellas: 5, comentario: 'La actuación del Guasón es inolvidable. Subliminal.', fecha: '2026-01-20' },
    { id: 6, peliculaId: 4, usuarioNombre: 'Sofía', estrellas: 4, comentario: 'Hermosa película para disfrutar en familia, muy tierna.', fecha: '2026-01-22' }
  ];

  private resenias = signal<Resenia[]>(this.obtenerReseniasDeStorage());

  private productosCandy = signal<Producto[]>([
    { id: 1, nombre: 'Pochoclos Grandes', precio: 3500, categoria: 'Pochoclos', imagenUrl: 'https://acdn-us.mitiendanube.com/stores/005/692/871/products/d_nq_np_2x_826480-mla84353844951_052025-f-4ab3dc7ab537e3d90417474011436925-640-0.webp' },
    { id: 2, nombre: 'Gaseosa 500ml', precio: 1800, categoria: 'Bebidas', imagenUrl: 'https://www.casa-segal.com/wp-content/uploads/2020/03/coca-cola-500cc-almacen-gaseosas-casa-segal-mendoza-600x600.jpg' }
  ]);

  private cupones = signal<Cupon[]>([
    { id: 1, codigo: 'BIENVENIDA20', porcentajeDescuento: 20, soloMayores50: false },
    { id: 2, codigo: 'SENIOR50', porcentajeDescuento: 30, soloMayores50: true }
  ]);

  private salas = [1, 2, 3, 4];
  private funciones = signal<Funcion[]>([]);

  // Tickets y datos de usuario sincronizados con localStorage
  private tickets = signal<Ticket[]>(this.obtenerTicketsDeStorage());
  private puntosUsuario = signal<number>(this.obtenerPuntosDeStorage());
  private creditoUsuario = signal<number>(this.obtenerCreditoDeStorage());
  private historialCanjes = signal<Canje[]>(this.obtenerHistorialDeStorage());

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

  private logsAuditoria = signal<LogAuditoria[]>([
    { id: 1, fechaHora: '2026-03-10 14:32', accion: 'INICIO_SISTEMA', usuario: 'admin@cine.com', detalle: 'Sistema inicializado correctamente.' }
  ]);

  constructor() {
    this.cargarFuncionesDesdeSupabase();
  }

  // --- MÉTODOS DE PERSISTENCIA LOCAL ---
  private obtenerTicketsDeStorage(): Ticket[] {
    const data = localStorage.getItem('tickets_db');
    if (data) {
      try { return JSON.parse(data); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 1,
        codigoQr: 'CINE-8823',
        usuarioEmail: 'test@cine.com',
        peliculaNombre: 'Avatar: El Camino del Agua',
        frecuencia: 'Lunes 18:00hs',
        fechaHoraFuncion: new Date(Date.now() + 86400000).toISOString(),
        productosCandy: ['Pochoclos Grandes'],
        montoTotal: 8000,
        validadoEntrada: false,
        validadoCandy: false,
        estado: 'ACTIVO'
      }
    ];
  }

  private guardarTicketsEnStorage(lista: Ticket[]) {
    localStorage.setItem('tickets_db', JSON.stringify(lista));
  }

  private obtenerReseniasDeStorage(): Resenia[] {
    const data = localStorage.getItem('resenias_db');
    if (data) {
      try { return JSON.parse(data); } catch (e) { console.error(e); }
    }
    return this.reseniasIniciales;
  }

  private guardarReseniasEnStorage(lista: Resenia[]) {
    localStorage.setItem('resenias_db', JSON.stringify(lista));
  }

  private obtenerPuntosDeStorage(): number {
    const data = localStorage.getItem('puntos_db');
    return data !== null ? Number(data) : 1200;
  }

  private guardarPuntosEnStorage(puntos: number) {
    localStorage.setItem('puntos_db', puntos.toString());
  }

  private obtenerCreditoDeStorage(): number {
    const data = localStorage.getItem('credito_db');
    return data !== null ? Number(data) : 0;
  }

  private guardarCreditoEnStorage(credito: number) {
    localStorage.setItem('credito_db', credito.toString());
  }

  private obtenerHistorialDeStorage(): Canje[] {
    const data = localStorage.getItem('historial_canjes_db');
    if (data) {
      try { return JSON.parse(data); } catch (e) { console.error(e); }
    }
    return [];
  }

  private guardarHistorialDeStorage(historial: Canje[]) {
    localStorage.setItem('historial_canjes_db', JSON.stringify(historial));
  }
  // -------------------------------------

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
        precio: f.precio,
        formato: f.formato || '2D',        
        idioma: f.idioma || 'Castellano'   
      }));
      this.funciones.set(funcionesMapeadas);
    }
  }

  peliculasMasVendidas = computed(() => {
    return [...this.peliculas()]
      .sort((a, b) => b.ventasTotales - a.ventasTotales)
      .slice(0, 3);
  });

  getPeliculas(): Pelicula[] { return this.peliculas(); }
  getPeliculasEnCartelera(): Pelicula[] { return this.peliculas().filter(p => !p.enPreventa && !p.esProximamente); }
  getPeliculasEnPreventa(): Pelicula[] { return this.peliculas().filter(p => p.enPreventa === true); }

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

    this.resenias.update(list => {
      const nuevaLista = [...list, reseniaCompleta];
      this.guardarReseniasEnStorage(nuevaLista);
      return nuevaLista;
    });
  }

  agregarTicket(nuevoTicket: Omit<Ticket, 'id' | 'validadoEntrada' | 'validadoCandy' | 'estado'>) {
    const ticketCompleto: Ticket = {
      ...nuevoTicket,
      id: Date.now(),
      validadoEntrada: false,
      validadoCandy: false,
      estado: 'ACTIVO'
    };

    this.tickets.update(lista => {
      const nuevaLista = [...lista, ticketCompleto];
      this.guardarTicketsEnStorage(nuevaLista);
      return nuevaLista;
    });
    
    this.acumularPuntos(nuevoTicket.montoTotal);

    this.registrarLog(
      'COMPRA_TICKET',
      nuevoTicket.usuarioEmail,
      `Compra realizada: ${nuevoTicket.peliculaNombre} - QR: ${nuevoTicket.codigoQr}`
    );

    return ticketCompleto;
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
  getLogActividad = (): LogAuditoria[] => this.logsAuditoria();

  getReporteFacturacionDiaria() {
    const ticketsActivos = this.tickets().filter(t => t.estado !== 'CANCELADO');
    const reporteMap: { [fecha: string]: { entradasVendidas: number; totalFacturado: number } } = {};

    ticketsActivos.forEach(ticket => {
      const fecha = ticket.fechaHoraFuncion ? ticket.fechaHoraFuncion.split('T')[0] : 'Sin Fecha';
      if (!reporteMap[fecha]) {
        reporteMap[fecha] = { entradasVendidas: 0, totalFacturado: 0 };
      }
      reporteMap[fecha].entradasVendidas += 1;
      reporteMap[fecha].totalFacturado += ticket.montoTotal || 0;
    });

    return Object.keys(reporteMap).map(fecha => ({
      fecha,
      entradasVendidas: reporteMap[fecha].entradasVendidas,
      totalFacturado: reporteMap[fecha].totalFacturado
    })).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  exportarExcelReal() {
    const reporte = this.getReporteFacturacionDiaria();
    let csvContent = "data:text/csv;charset=utf-8,Fecha,Entradas Vendidas,Total Facturado\r\n";
    
    reporte.forEach(row => {
      csvContent += `${row.fecha},${row.entradasVendidas},$${row.totalFacturado}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_facturacion.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.registrarLog('EXPORTAR_EXCEL', 'admin@cine.com', 'Exportación de reporte de facturación a formato CSV/Excel.');
  }

  exportarPDFReal() {
    const reporte = this.getReporteFacturacionDiaria();
    let contenidoHtml = `
      <h2 style="font-family: sans-serif; color: #333;">Reporte de Facturación - Cine</h2>
      <table border="1" style="width:100%; border-collapse:collapse; font-family: sans-serif; text-align: left;">
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px;">Fecha</th>
          <th style="padding: 8px;">Entradas Vendidas</th>
          <th style="padding: 8px;">Total Facturado</th>
        </tr>`;
    
    reporte.forEach(r => {
      contenidoHtml += `<tr>
        <td style="padding: 8px;">${r.fecha}</td>
        <td style="padding: 8px;">${r.entradasVendidas}</td>
        <td style="padding: 8px;">$${r.totalFacturado}</td>
      </tr>`;
    });
    contenidoHtml += `</table>`;

    const ventana = window.open('', '', 'height=600,width=800');
    if (ventana) {
      ventana.document.write('<html><head><title>Reporte PDF</title></head><body>');
      ventana.document.write(contenidoHtml);
      ventana.document.write('</body></html>');
      ventana.document.close();
      ventana.print();
    }

    this.registrarLog('EXPORTAR_PDF', 'admin@cine.com', 'Exportación de reporte de facturación a PDF.');
  }

  registrarLog(accion: string, usuario: string, detalle: string) {
    const nuevoLog: LogAuditoria = {
      id: Date.now(),
      fechaHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
      accion,
      usuario,
      detalle
    };
    this.logsAuditoria.update(logs => [nuevoLog, ...logs]);
  }

  descontarCredito(monto: number) {
    this.creditoUsuario.update(c => {
      const nuevo = Math.max(0, c - monto);
      this.guardarCreditoEnStorage(nuevo);
      return nuevo;
    });
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

    this.tickets.update(lista => {
      const actualizados = lista.map(t => t.id === ticketId ? { ...t, estado: 'CANCELADO' as const } : t);
      this.guardarTicketsEnStorage(actualizados);
      return actualizados;
    });

    this.creditoUsuario.update(c => {
      const nuevo = c + ticket.montoTotal;
      this.guardarCreditoEnStorage(nuevo);
      return nuevo;
    });

    this.registrarLog('CANCELACIÓN_RESERVA', usuarioEmail, `Cancelación de ticket #${ticket.id}. Crédito acreditado: $${ticket.montoTotal}`);

    return { exito: true, mensaje: `Reserva cancelada. Se han acreditado $${ticket.montoTotal} de saldo en tu perfil.` };
  }

  actualizarPorcentajeCupon(cuponId: number, nuevoPorcentaje: number, usuarioAdmin: string = 'admin@cine.com') {
    this.cupones.update(lista =>
      lista.map(c => (c.id === cuponId ? { ...c, porcentajeDescuento: nuevoPorcentaje } : c))
    );
    this.registrarLog('MODIFICACION_CUPON', usuarioAdmin, `Modificó descuento del cupón #${cuponId} a ${nuevoPorcentaje}%`);
  }

  crearCupon(codigo: string, porcentaje: number, soloMayores50: boolean, usuarioAdmin: string = 'admin@cine.com') {
    const nuevo: Cupon = { id: Date.now(), codigo, porcentajeDescuento: porcentaje, soloMayores50 };
    this.cupones.update(lista => [...lista, nuevo]);
    this.registrarLog('CREACION_CUPON', usuarioAdmin, `Creó el cupón ${codigo} con ${porcentaje}% de descuento.`);
  }

  agregarProductoCandy(producto: Producto, usuarioAdmin: string = 'admin@cine.com') {
    this.productosCandy.update(lista => [...lista, producto]);
    this.registrarLog('CREACION_PRODUCTO_CANDY', usuarioAdmin, `Agregó producto: ${producto.nombre}`);
  }

  async crearFuncionAutomatica(
    peliculaId: number, 
    dias: string[], 
    horaInicio: string, 
    precio: number, 
    formato: string = '2D', 
    idioma: string = 'Castellano', 
    usuarioAdmin: string = 'admin@cine.com'
  ): Promise<{ exito: boolean; mensaje: string }> {
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
          precio: precio,
          formato: formato,
          idioma: idioma
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
            precio,
            formato, 
            idioma   
          };
          this.funciones.update(l => [...l, nuevaFuncion]);
          this.registrarLog('CREACION_FUNCION', usuarioAdmin, `Creó función para ${pelicula.nombre} en Sala ${sala}`);
          return { exito: true, mensaje: `Función asignada automáticamente a la Sala ${sala}` };
        }
      }
    }
    return { exito: false, mensaje: 'No hay salas disponibles en los días y horarios seleccionados.' };
  }

  validarCodigoQr(codigo: string, tipo: 'entrada' | 'candy', empleadoEmail: string = 'empleado@cine.com'): { exito: boolean; mensaje: string } {
    const listaActual = this.tickets();
    const ticket = listaActual.find(t => t.codigoQr.toLowerCase() === codigo.trim().toLowerCase());
    
    if (!ticket) return { exito: false, mensaje: 'Código QR no encontrado.' };
    if (ticket.estado === 'CANCELADO') return { exito: false, mensaje: 'Entrada DENEGADA: La reserva fue cancelada.' };

    if (tipo === 'entrada') {
      if (ticket.validadoEntrada) return { exito: false, mensaje: 'Entrada DENEGADA: El QR ya fue utilizado.' };
      
      this.tickets.update(lista => {
        const actualizados = lista.map(t => t.id === ticket.id ? { ...t, validadoEntrada: true } : t);
        this.guardarTicketsEnStorage(actualizados);
        return actualizados;
      });

      this.registrarLog('VALIDACION_QR_ENTRADA', empleadoEmail, `Validó entrada QR ${ticket.codigoQr} (${ticket.peliculaNombre})`);
      return { exito: true, mensaje: `Entrada VALIDADA para ${ticket.peliculaNombre}.` };
    } else {
      if (ticket.validadoCandy) return { exito: false, mensaje: 'Candy Bar DENEGADO: El pedido ya fue entregado.' };
      
      this.tickets.update(lista => {
        const actualizados = lista.map(t => t.id === ticket.id ? { ...t, validadoCandy: true } : t);
        this.guardarTicketsEnStorage(actualizados);
        return actualizados;
      });

      this.registrarLog('VALIDACION_QR_CANDY', empleadoEmail, `Entregó pedido Candy QR ${ticket.codigoQr}`);
      
      const detalleCandy = ticket.productosCandy.length > 0 
        ? ticket.productosCandy.join(', ') 
        : 'Sin productos de Candy Bar seleccionados';

      return { exito: true, mensaje: `Candy Bar ENTREGADO: ${detalleCandy}.` };
    }
  }

  acumularPuntos(montoGastado: number) {
    this.puntosUsuario.update(p => {
      const nuevo = p + Math.floor(montoGastado);
      this.guardarPuntosEnStorage(nuevo);
      return nuevo;
    });
  }

  canjearRecompensa(recompensaId: number, usuarioEmail: string): { exito: boolean; mensaje: string } {
    const recompensa = this.recompensas().find(r => r.id === recompensaId);
    if (!recompensa) return { exito: false, mensaje: 'Recompensa no encontrada.' };

    if (this.puntosUsuario() < recompensa.puntosRequeridos) {
      return { exito: false, mensaje: 'Puntos insuficientes para realizar este canje.' };
    }

    this.puntosUsuario.update(p => {
      const nuevo = p - recompensa.puntosRequeridos;
      this.guardarPuntosEnStorage(nuevo);
      return nuevo;
    });

    const nuevoCanje: Canje = {
      id: Date.now(),
      usuarioEmail,
      recompensaNombre: recompensa.nombre,
      puntosUtilizados: recompensa.puntosRequeridos,
      fecha: new Date().toISOString().split('T')[0]
    };

    this.historialCanjes.update(h => {
      const nuevoHistorial = [nuevoCanje, ...h];
      this.guardarHistorialDeStorage(nuevoHistorial);
      return nuevoHistorial;
    });

    this.registrarLog('CANJE_PUNTOS', usuarioEmail, `Canjeó recompensa: ${recompensa.nombre}`);
    return { exito: true, mensaje: `¡Canjeaste exitosamente: ${recompensa.nombre}!` };
  }

  actualizarPuntosRecompensa(recompensaId: number, nuevosPuntos: number, usuarioAdmin: string = 'admin@cine.com') {
    this.recompensas.update(lista =>
      lista.map(r => r.id === recompensaId ? { ...r, puntosRequeridos: nuevosPuntos } : r)
    );
    this.registrarLog('MODIFICACION_RECOMPENSA', usuarioAdmin, `Actualizó costo de recompensa #${recompensaId} a ${nuevosPuntos} puntos`);
  }

  crearComboEspecial(nombre: string, descripcion: string, precio: number, usuarioAdmin: string = 'admin@cine.com') {
    const nuevoCombo: ComboEspecial = { id: Date.now(), nombre, descripcion, precio };
    this.combosEspeciales.update(lista => [...lista, nuevoCombo]);
    this.registrarLog('CREACION_COMBO', usuarioAdmin, `Creó nuevo combo especial: ${nombre}`);
  }
}