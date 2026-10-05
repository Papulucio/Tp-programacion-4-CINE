import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from '../core/services/storage.service';
import {
  aIsoFecha,
  calcularEdad,
  formatearFechaHora,
  preventaAbierta,
  proximaFechaFuncion,
} from '../core/utils/fecha.util';
import { ButacaOcupada, ButacaSeleccionada, TipoButaca } from '../models/butaca';
import { Cupon } from '../models/cupon';
import {
  DIAS_SEMANA,
  Funcion,
  MINUTOS_SANITIZACION,
  funcionesSeSolapan,
  horaAMinutos,
  minutosAHora,
} from '../models/funcion';
import {
  Canje,
  ComboEspecial,
  Recompensa,
} from '../models/fidelizacion';
import { Pelicula } from '../models/pelicula';
import { CategoriaProducto, Producto } from '../models/producto';
import { Resenia } from '../models/resenia';
import { ConfiguracionFila, Sala, crearFilasPorDefecto, totalButacasFila, totalButacasSala } from '../models/sala';
import {
  ButacaTicket,
  LineaCandy,
  LineaCombo,
  LogAuditoria,
  Ticket,
  USUARIO_ANONIMO,
} from '../models/ticket';
import { AuthService } from './auth.service';
import {
  TABLA_FUNCIONES,
  TABLA_RESERVAS_BUTACAS,
  SupabaseService,
} from './supabase';

const K = {
  peliculas: 'peliculas',
  salas: 'salas',
  funciones: 'funciones',
  tickets: 'tickets',
  resenias: 'resenias',
  productos: 'productos',
  cupones: 'cupones',
  recompensas: 'recompensas',
  canjes: 'canjes',
  combos: 'combos',
  logs: 'logs',
  puntos: 'puntos',
  credito: 'credito',
  reservas: 'reservas',
  contadorId: 'contador-id',
} as const;

/** Minutos que una butaca queda retenida mientras se completa la compra. */
export const MINUTOS_RETENCION_BUTACA = 10;

export interface ResultadoOperacion {
  exito: boolean;
  mensaje: string;
}

export interface FilaReporte {
  fecha: string;
  entradasVendidas: number;
  totalFacturado: number;
}

export interface ItemRanking {
  etiqueta: string;
  cantidad: number;
}

export interface CompraPayload {
  pelicula: Pelicula;
  funcion: Funcion;
  sala: Sala;
  butacas: ButacaSeleccionada[];
  candy: { producto: Producto; cantidad: number }[];
  combos: { combo: ComboEspecial; cantidad: number }[];
  cupon: Cupon | null;
  porcentajeDescuento: number;
  creditoUtilizado: number;
  usuarioEmail: string;
  creadoPorCanje: boolean;
}

@Injectable({ providedIn: 'root' })
export class CineService {
  private readonly storage = inject(StorageService);
  private readonly supabase = inject(SupabaseService);
  readonly auth = inject(AuthService);

  // ---------------------------------------------------------------- estado
  private readonly peliculas = signal<Pelicula[]>(this.storage.leer(K.peliculas, []).length ? this.storage.leer(K.peliculas, []) : PELICULAS_SEMILLA);
  private readonly salas = signal<Sala[]>(this.storage.leer(K.salas, []).length ? this.storage.leer(K.salas, []) : SALAS_SEMILLA);
  private readonly funciones = signal<Funcion[]>(this.storage.leer(K.funciones, []));
  private readonly tickets = signal<Ticket[]>(this.storage.leer(K.tickets, []));
  private readonly resenias = signal<Resenia[]>(this.storage.leer(K.resenias, RESENIAS_SEMILLA));
  private readonly productos = signal<Producto[]>(this.storage.leer(K.productos, []).length ? this.storage.leer(K.productos, []) : PRODUCTOS_SEMILLA);
  private readonly cupones = signal<Cupon[]>(this.storage.leer(K.cupones, []).length ? this.storage.leer(K.cupones, []) : CUPONES_SEMILLA);
  private readonly recompensas = signal<Recompensa[]>(this.storage.leer(K.recompensas, []).length ? this.storage.leer(K.recompensas, []) : RECOMPENSAS_SEMILLA);
  private readonly canjes = signal<Canje[]>(this.storage.leer(K.canjes, []));
  private readonly combos = signal<ComboEspecial[]>(this.storage.leer(K.combos, []).length ? this.storage.leer(K.combos, []) : COMBOS_SEMILLA);
  private readonly logs = signal<LogAuditoria[]>(this.storage.leer(K.logs, []));
  private readonly puntos = signal<Record<string, number>>(this.storage.leer(K.puntos, {}));
  private readonly credito = signal<Record<string, number>>(this.storage.leer(K.credito, {}));

  /** Reservas de butacas por función: `{ [funcionId]: ButacaOcupada[] }`. */
  private readonly reservas = signal<Record<string, ButacaOcupada[]>>(this.storage.leer(K.reservas, {}));

  private contadorId = this.storage.leer<number>(K.contadorId, 1000);
  /** Email al que se atribuyen los tickets anónimos. */
  private readonly usuarioAnonimo = USUARIO_ANONIMO;

  constructor() {
    // Persistencia reactiva: cualquier cambio de signal se guarda.
    effect(() => this.storage.escribir(K.peliculas, this.peliculas()));
    effect(() => this.storage.escribir(K.salas, this.salas()));
    effect(() => this.storage.escribir(K.funciones, this.funciones()));
    effect(() => this.storage.escribir(K.tickets, this.tickets()));
    effect(() => this.storage.escribir(K.resenias, this.resenias()));
    effect(() => this.storage.escribir(K.productos, this.productos()));
    effect(() => this.storage.escribir(K.cupones, this.cupones()));
    effect(() => this.storage.escribir(K.recompensas, this.recompensas()));
    effect(() => this.storage.escribir(K.canjes, this.canjes()));
    effect(() => this.storage.escribir(K.combos, this.combos()));
    effect(() => this.storage.escribir(K.logs, this.logs()));
    effect(() => this.storage.escribir(K.puntos, this.puntos()));
    effect(() => this.storage.escribir(K.credito, this.credito()));
    effect(() => this.storage.escribir(K.reservas, this.reservas()));

    this.cargarFuncionesDesdeSupabase();
    this.sembrarFuncionesSiEstaVacio();
  }

  private siguienteId(): number {
    this.contadorId += 1;
    this.storage.escribir(K.contadorId, this.contadorId);
    return this.contadorId;
  }

  private ahora(): string {
    return new Date().toISOString();
  }

  private idButaca(fila: string, numero: number): string {
    return `${fila}-${numero}`;
  }

  // --------------------------------------------------------------- lecturas

  getPeliculas = computed(() => this.peliculas());
  getSalas = computed(() => this.salas());
  getFunciones = computed(() => this.funciones());
  getTickets = computed(() => this.tickets());
  getProductos = computed(() => this.productos());
  getCupones = computed(() => this.cupones());
  getRecompensas = computed(() => this.recompensas());
  getCanjes = computed(() => this.canjes());
  getCombos = computed(() => this.combos());
  getLogs = computed(() => this.logs());

  /** Películas visibles en la cartelera (mail del 01/01: el admin elige cuáles). */
  peliculasEnCartelera = computed(() =>
    this.peliculas().filter((p) => p.visibleEnCartelera && !p.esProximamente),
  );

  /** Top 3 más vendidas (mail del 16/01). */
  peliculasMasVendidas = computed(() =>
    [...this.peliculasEnCartelera()].sort((a, b) => b.ventasTotales - a.ventasTotales).slice(0, 3),
  );

  /** Sección "Próximamente" (mail del 08/03). */
  peliculasProximamente = computed(() =>
    this.peliculas().filter((p) => p.esProximamente || this.peliculaEnPreventa(p.id)),
  );

  /** Todos los géneros, para el buscador. */
  generos = computed(() => Array.from(new Set(this.peliculas().flatMap((p) => p.generos))).sort());

  /** Puntos del usuario actual (mail del 03/03). */
  puntosUsuario = computed(() => this.puntos()[this.auth.emailEfectivo()] ?? 0);

  /** Crédito del usuario actual (mail del 10/03). */
  creditoUsuario = computed(() => this.credito()[this.auth.emailEfectivo()] ?? 0);

  /** Tickets del usuario actual. */
  ticketsUsuario = computed(() =>
    this.tickets()
      .filter((t) => t.usuarioEmail === this.auth.emailEfectivo())
      .sort((a, b) => b.fechaVenta.localeCompare(a.fechaVenta)),
  );

  /** Historial de canjes del usuario actual. */
  canjesUsuario = computed(() =>
    this.canjes()
      .filter((c) => c.usuarioEmail === this.auth.emailEfectivo())
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  );

  obtenerPelicula(id: number): Pelicula | undefined {
    return this.peliculas().find((p) => p.id === id);
  }

  obtenerSala(id: number): Sala | undefined {
    return this.salas().find((s) => s.id === id);
  }

  obtenerFuncion(id: number): Funcion | undefined {
    return this.funciones().find((f) => f.id === id);
  }

  /** Reseñas de una película con su promedio (mail del 16/01). */
  obtenerReseniasPorPelicula(peliculaId: number): { lista: Resenia[]; promedio: number | null; total: number } {
    const lista = this.resenias()
      .filter((r) => r.peliculaId === peliculaId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const total = lista.length;
    const promedio =
      total === 0
        ? null
        : Math.round((lista.reduce((acc, r) => acc + r.estrellas, 0) / total) * 10) / 10;
    return { lista, promedio, total };
  }

  /** ¿Está la preventa de esta película abierta hoy? (mail del 08/03) */
  preventaDe(peliculaId: number) {
    const pelicula = this.obtenerPelicula(peliculaId);
    if (!pelicula?.preventa?.activa) return null;
    return preventaAbierta(pelicula.preventa.fechaEstreno, pelicula.preventa.diasAnticipacion);
  }

  private peliculaEnPreventa(peliculaId: number): boolean {
    return this.preventaDe(peliculaId)?.abierta === true;
  }

  /** Precio vigente de una butaca: base de la función + recargo de fila. */
  precioButaca(funcion: Funcion, sala: Sala, butaca: ButacaSeleccionada): number {
    const fila = sala.filas.find((f) => f.letra === butaca.fila);
    return funcion.precio + (fila?.recargo ?? 0);
  }

  /** Tipo de una butaca según la fila (mail del 10/03 y 28/02). */
  tipoButaca(sala: Sala, fila: string): TipoButaca {
    const config = sala.filas.find((f) => f.letra === fila);
    if (!config) return 'estandar';
    if (config.tipo === 'adaptada') return 'adaptada';
    if (config.recargo > 0) return 'vip';
    return 'estandar';
  }

  /** Número total de butacas de una sala. */
  totalButacas(salaId: number): number {
    const sala = this.obtenerSala(salaId);
    return sala ? totalButacasSala(sala.filas) : 0;
  }

  // ----------------------------------------------------------- disponibilidad

  /**
   * ¿Puede este usuario comprar esta función?
   * Mail del 28/02: a los menores de 13 o 18 años no se les deja comprar, y
   * la entrada debe aclarar que debe ir un adulto.
   */
  puedeComprarFuncion(pelicula: Pelicula, usuarioEmail: string): ResultadoOperacion {
    const requerida = pelicula.clasificacionEdad;
    if (requerida === 0) return { exito: true, mensaje: '' };

    if (usuarioEmail === USUARIO_ANONIMO) {
      return {
        exito: false,
        mensaje: `Esta película es +${requerida} años. Registrate o iniciá sesión para verificar tu edad y comprar.`,
      };
    }

    const usuario = this.auth.usuarioActual();
    const edad = calcularEdad(usuario?.fechaNacimiento);
    if (edad < requerida) {
      return {
        exito: false,
        mensaje: `Tenés ${edad} años y esta película es +${requerida}. No podés comprar esta entrada.`,
      };
    }
    return { exito: true, mensaje: '' };
  }

  /** La entrada requiere un adulto acompañante (mail del 28/02). */
  requiereAcompanante(pelicula: Pelicula): boolean {
    return pelicula.clasificacionEdad > 0;
  }

  // ------------------------------------------------------------ butacas OCR

  /** Butacas ocupadas/reservadas de una función, con las retenciones vencidas purgadas. */
  butacasOcupadas(funcionId: number): ButacaOcupada[] {
    this.purgarReservasVencidas();
    return this.reservas()[String(funcionId)] ?? [];
  }

  /** IDs de butacas no disponibles de una función. */
  butacasBloqueadas(funcionId: number): string[] {
    return this.butacasOcupadas(funcionId)
      .filter((b) => b.estado === 'ocupada')
      .map((b) => b.id);
  }

  private purgarReservasVencidas(): void {
    const ahora = Date.now();
    let cambio = false;
    const copia: Record<string, ButacaOcupada[]> = {};

    for (const [funcionId, lista] of Object.entries(this.reservas())) {
      const vigentes = lista.filter((b) => {
        if (b.estado === 'liberada') {
          cambio = true;
          return false;
        }
        if (b.expiraEn !== undefined && b.expiraEn < ahora) {
          cambio = true;
          return false;
        }
        return true;
      });
      copia[funcionId] = vigentes;
    }

    if (cambio) this.reservas.set(copia);
  }

  /**
   * Retiene butacas mientras el usuario completa la compra. Se escribe en
   * Supabase para que el realtime lo vea el resto de los usuarios, y en
   * localStorage como respaldo.
   */
  async retenerButacas(
    funcionId: number,
    butacas: ButacaSeleccionada[],
    usuarioEmail: string,
  ): Promise<ResultadoOperacion> {
    if (butacas.length === 0) return { exito: true, mensaje: '' };

    this.purgarReservasVencidas();
    const bloqueadas = new Set(this.butacasBloqueadas(funcionId));

    const nuevas = butacas
      .filter((b) => !bloqueadas.has(b.id))
      .map((b) => ({
        ...b,
        estado: 'ocupada' as const,
        expiraEn: Date.now() + MINUTOS_RETENCION_BUTACA * 60_000,
      }));

    if (nuevas.length !== butacas.length) {
      return {
        exito: false,
        mensaje: 'Algunas butacas acaban de ser ocupadas por otra compra. Volvé a elegir.',
      };
    }

    const clave = String(funcionId);
    this.reservas.update((mapa) => ({ ...mapa, [clave]: [...(mapa[clave] ?? []), ...nuevas] }));

    const filas = nuevas.map((b) => ({
      funcion_id: funcionId,
      fila: b.fila,
      columna: b.numero,
      estado: 'ocupada',
      usuario_email: usuarioEmail,
      expira_en: new Date(Date.now() + MINUTOS_RETENCION_BUTACA * 60_000).toISOString(),
    }));
    await this.supabase.insert(TABLA_RESERVAS_BUTACAS, filas[0]);
    for (const f of filas.slice(1)) {
      await this.supabase.insert(TABLA_RESERVAS_BUTACAS, f);
    }

    return { exito: true, mensaje: 'Butacas retenidas por 10 minutos.' };
  }

  /** Libera las butacas retenidas por el usuario (al cancelar o al terminar). */
  async liberarButacas(funcionId: number, butacas: ButacaSeleccionada[]): Promise<void> {
    if (butacas.length === 0) return;
    const clave = String(funcionId);
    const ids = new Set(butacas.map((b) => b.id));

    this.reservas.update((mapa) => ({
      ...mapa,
      [clave]: (mapa[clave] ?? []).map((b) =>
        ids.has(b.id) ? { ...b, estado: 'liberada' as const, expiraEn: undefined } : b,
      ),
    }));

    for (const b of butacas) {
      await this.supabase.remove(TABLA_RESERVAS_BUTACAS, {
        funcion_id: funcionId,
        fila: b.fila,
        columna: b.numero,
      });
    }
  }

  /** Marca como ocupadas definitivamente las butacas de un ticket. */
  async confirmarButacas(funcionId: number | null, butacas: ButacaSeleccionada[], ticketId: number): Promise<void> {
    if (funcionId === null || butacas.length === 0) return;
    const clave = String(funcionId);

    // Se actualizan las butacas ya retenidas y se agregan las que nunca se
    // retuvieron: una compra directa (sin pasar por la retención) también tiene
    // que dejar la butaca ocupada para el resto de los compradores.
    this.reservas.update((mapa) => {
      const actuales = mapa[clave] ?? [];
      const elegidas = new Set(butacas.map((b) => b.id));

      const actualizadas = actuales.map((b) =>
        elegidas.has(b.id) ? { ...b, estado: 'ocupada' as const, ticketId, expiraEn: undefined } : b,
      );

      const faltantes = butacas
        .filter((b) => !actuales.some((x) => x.id === b.id))
        .map((b) => ({ ...b, estado: 'ocupada' as const, ticketId, expiraEn: undefined }));

      return { ...mapa, [clave]: [...actualizadas, ...faltantes] };
    });

    // Solo se liberan las butacas de este ticket: nunca se borra la función completa,
    // porque hay reservas de otros usuarios en la misma sesión.
    for (const b of butacas) {
      await this.supabase.remove(TABLA_RESERVAS_BUTACAS, {
        funcion_id: funcionId,
        fila: b.fila,
        columna: b.numero,
      });
      await this.supabase.insert(TABLA_RESERVAS_BUTACAS, {
        funcion_id: funcionId,
        fila: b.fila,
        columna: b.numero,
        estado: 'confirmada',
        ticket_id: ticketId,
        usuario_email: this.auth.emailEfectivo(),
        expira_en: null,
      });
    }
  }

  // --------------------------------------------------------------- funciones

  private async cargarFuncionesDesdeSupabase(): Promise<void> {
    const remotas = await this.supabase.select<Record<string, unknown>>(TABLA_FUNCIONES);
    if (!remotas || remotas.length === 0) return;

    const mapeadas: Funcion[] = remotas.map((f) => ({
      id: Number(f['id']),
      peliculaId: Number(f['pelicula_id']),
      salaId: Number(f['sala_id']),
      dias: Array.isArray(f['dias']) ? (f['dias'] as string[]) : [],
      horaInicio: String(f['hora_inicio'] ?? '00:00'),
      horaFin: String(f['hora_fin'] ?? '00:00'),
      precio: Number(f['precio'] ?? 0),
      formato: String(f['formato'] ?? '2D'),
      idioma: String(f['idioma'] ?? 'Castellano'),
    }));

    this.funciones.set(mapeadas);
  }

  /** Si no hay ninguna función, crea una cartelera base para que la app arranque usable. */
  private sembrarFuncionesSiEstaVacio(): void {
    if (this.funciones().length > 0) return;

    const base: Omit<Funcion, 'id'>[] = [
      { peliculaId: 1, salaId: 1, dias: ['Lunes', 'Miércoles', 'Viernes'], horaInicio: '19:00', horaFin: '22:42', precio: 5500, formato: '3D', idioma: 'Subtitulada' },
      { peliculaId: 2, salaId: 2, dias: ['Martes', 'Jueves'], horaInicio: '16:30', horaFin: '19:38', precio: 5000, formato: '2D', idioma: 'Castellano' },
      { peliculaId: 3, salaId: 3, dias: ['Viernes', 'Sábado'], horaInicio: '21:30', horaFin: '00:32', precio: 6000, formato: '2D', idioma: 'Subtitulada' },
      { peliculaId: 4, salaId: 1, dias: ['Sábado', 'Domingo'], horaInicio: '14:00', horaFin: '16:26', precio: 4500, formato: '2D', idioma: 'Castellano' },
    ];

    this.funciones.set(base.map((f) => ({ ...f, id: this.siguienteId() })));
    this.registrarLog('CARGAR_FUNCIONES', 'sistema', `Se cargaron ${base.length} funciones base.`);
  }

  /**
   * Crear función con asignación automática de sala (mail del 12/02).
   * Nunca asigna una sala donde ya haya otra función que se solape, y calcula
   * el fin como `inicio + duración + 30` (mails del 01/01 y 12/02).
   */
  async crearFuncionAutomatica(datos: {
    peliculaId: number;
    /** Si se indica, se respeta esa sala; si no, se elige la primera libre. */
    salaId?: number;
    dias: string[];
    horaInicio: string;
    precio: number;
    formato?: string;
    idioma?: string;
  }): Promise<ResultadoOperacion & { funcion?: Funcion }> {
    const pelicula = this.obtenerPelicula(datos.peliculaId);
    if (!pelicula) return { exito: false, mensaje: 'Película no encontrada.' };
    if (datos.dias.length === 0) {
      return { exito: false, mensaje: 'Elegí al menos un día de proyección.' };
    }

    const inicio = horaAMinutos(datos.horaInicio);
    const fin = inicio + pelicula.duracionMinutos + MINUTOS_SANITIZACION;
    const horaFin = minutosAHora(fin);
    const salasActivas = this.salas().filter((s) => s.activa && (datos.salaId === undefined || s.id === datos.salaId));
    const formato = datos.formato ?? pelicula.formato;
    const idioma = datos.idioma ?? pelicula.idioma;

    for (const sala of salasActivas) {
      const ocupada = this.funciones().some(
        (f) =>
          f.salaId === sala.id &&
          funcionesSeSolapan(f, { dias: datos.dias, horaInicio: datos.horaInicio, horaFin }),
      );
      if (ocupada) continue;

      const id = this.siguienteId();
      const nueva: Funcion = {
        id,
        peliculaId: datos.peliculaId,
        salaId: sala.id,
        dias: [...datos.dias],
        horaInicio: datos.horaInicio,
        horaFin,
        precio: datos.precio,
        formato,
        idioma,
      };

      this.funciones.update((lista) => [...lista, nueva]);
      await this.supabase.insert(TABLA_FUNCIONES, {
        id,
        pelicula_id: nueva.peliculaId,
        sala_id: nueva.salaId,
        dias: nueva.dias,
        hora_inicio: nueva.horaInicio,
        hora_fin: nueva.horaFin,
        precio: nueva.precio,
        formato: nueva.formato,
        idioma: nueva.idioma,
      });

      this.registrarLog(
        'CREAR_FUNCION',
        this.auth.emailEfectivo(),
        `Creó la función de "${pelicula.nombre}" en ${sala.nombre} (${nueva.dias.join(', ')} ${nueva.horaInicio}) — asignada automáticamente.`,
      );

      return {
        exito: true,
        mensaje: `Función asignada automáticamente a ${sala.nombre} (termina ${horaFin} con los ${MINUTOS_SANITIZACION} min de sanitización).`,
        funcion: nueva,
      };
    }

    return {
      exito: false,
      mensaje: 'No hay salas disponibles en los días y horarios seleccionados. Probá con otro horario.',
    };
  }

  async actualizarFuncion(id: number, cambios: Partial<Funcion>): Promise<ResultadoOperacion> {
    const actual = this.obtenerFuncion(id);
    if (!actual) return { exito: false, mensaje: 'Función no encontrada.' };

    const candidata: Funcion = { ...actual, ...cambios };
    const choque = this.funciones().find(
      (f) =>
        f.id !== id &&
        f.salaId === candidata.salaId &&
        funcionesSeSolapan(f, candidata),
    );
    if (choque) {
      return {
        exito: false,
        mensaje: `Ese horario se pisa con otra función en la misma sala (${choque.dias.join(', ')} ${choque.horaInicio}).`,
      };
    }

    this.funciones.update((lista) => lista.map((f) => (f.id === id ? candidata : f)));
    await this.supabase.update(TABLA_FUNCIONES, id, {
      pelicula_id: candidata.peliculaId,
      sala_id: candidata.salaId,
      dias: candidata.dias,
      hora_inicio: candidata.horaInicio,
      hora_fin: candidata.horaFin,
      precio: candidata.precio,
      formato: candidata.formato,
      idioma: candidata.idioma,
    });
    this.registrarLog('MODIFICAR_FUNCION', this.auth.emailEfectivo(), `Modificó la función #${id}.`);
    return { exito: true, mensaje: 'Función actualizada.' };
  }

  async eliminarFuncion(id: number): Promise<ResultadoOperacion> {
    const actual = this.obtenerFuncion(id);
    if (!actual) return { exito: false, mensaje: 'Función no encontrada.' };
    this.funciones.update((lista) => lista.filter((f) => f.id !== id));
    await this.supabase.remove(TABLA_FUNCIONES, { id });
    this.registrarLog('ELIMINAR_FUNCION', this.auth.emailEfectivo(), `Eliminó la función #${id}.`);
    return { exito: true, mensaje: 'Función eliminada.' };
  }

  /** Funciones de una película, con la fecha real de la próxima proyección. */
  funcionesDePelicula(peliculaId: number): (Funcion & { proximaFecha: Date })[] {
    return this.funciones()
      .filter((f) => f.peliculaId === peliculaId)
      .map((f) => ({ ...f, proximaFecha: proximaFechaFuncion(f.dias, f.horaInicio) }))
      .sort((a, b) => a.proximaFecha.getTime() - b.proximaFecha.getTime());
  }

  // --------------------------------------------------------------- peliculas

  crearPelicula(datos: Omit<Pelicula, 'id' | 'ventasTotales'>): ResultadoOperacion & { pelicula?: Pelicula } {
    if (!datos.nombre.trim()) return { exito: false, mensaje: 'El nombre es obligatorio.' };
    const nueva: Pelicula = { ...datos, id: this.siguienteId(), ventasTotales: 0 };
    this.peliculas.update((lista) => [...lista, nueva]);
    this.registrarLog('CREAR_PELICULA', this.auth.emailEfectivo(), `Creó la película "${nueva.nombre}".`);
    return { exito: true, mensaje: `Película "${nueva.nombre}" agregada a la cartelera.`, pelicula: nueva };
  }

  actualizarPelicula(id: number, cambios: Partial<Pelicula>): ResultadoOperacion {
    if (!this.obtenerPelicula(id)) return { exito: false, mensaje: 'Película no encontrada.' };
    this.peliculas.update((lista) => lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    this.registrarLog('MODIFICAR_PELICULA', this.auth.emailEfectivo(), `Modificó la película #${id}.`);
    return { exito: true, mensaje: 'Película actualizada.' };
  }

  /** Muestra u oculta una película de la cartelera (mail del 01/01). */
  togglePeliculaVisible(id: number): ResultadoOperacion {
    const pelicula = this.obtenerPelicula(id);
    if (!pelicula) return { exito: false, mensaje: 'Película no encontrada.' };
    const visible = !pelicula.visibleEnCartelera;
    this.actualizarPelicula(id, { visibleEnCartelera: visible });
    return {
      exito: true,
      mensaje: visible
        ? `"${pelicula.nombre}" volvió a la cartelera.`
        : `"${pelicula.nombre}" se sacó de la cartelera.`,
    };
  }

  eliminarPelicula(id: number): ResultadoOperacion {
    const pelicula = this.obtenerPelicula(id);
    if (!pelicula) return { exito: false, mensaje: 'Película no encontrada.' };
    const conFunciones = this.funciones().filter((f) => f.peliculaId === id).length;
    if (conFunciones > 0) {
      return { exito: false, mensaje: `No se puede eliminar: tiene ${conFunciones} función/es programada/s.` };
    }
    this.peliculas.update((lista) => lista.filter((p) => p.id !== id));
    this.registrarLog('ELIMINAR_PELICULA', this.auth.emailEfectivo(), `Eliminó "${pelicula.nombre}".`);
    return { exito: true, mensaje: 'Película eliminada.' };
  }

  // ------------------------------------------------------------------ salas

  crearSala(nombre: string): ResultadoOperacion {
    const limpio = nombre.trim();
    if (!limpio) return { exito: false, mensaje: 'El nombre de la sala es obligatorio.' };
    if (this.salas().some((s) => s.nombre.toLowerCase() === limpio.toLowerCase())) {
      return { exito: false, mensaje: 'Ya existe una sala con ese nombre.' };
    }
    const id = this.siguienteId();
    this.salas.update((lista) => [
      ...lista,
      { id, nombre: limpio, filas: crearFilasPorDefecto(), activa: true },
    ]);
    this.registrarLog('CREAR_SALA', this.auth.emailEfectivo(), `Creó la sala "${limpio}".`);
    return { exito: true, mensaje: `Sala "${limpio}" creada con ${totalButacasSala(crearFilasPorDefecto())} butacas.` };
  }

  actualizarSala(id: number, cambios: Partial<Sala>): ResultadoOperacion {
    if (!this.obtenerSala(id)) return { exito: false, mensaje: 'Sala no encontrada.' };
    this.salas.update((lista) => lista.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
    this.registrarLog('MODIFICAR_SALA', this.auth.emailEfectivo(), `Modificó la sala #${id}.`);
    return { exito: true, mensaje: 'Sala actualizada.' };
  }

  eliminarSala(id: number): ResultadoOperacion {
    const sala = this.obtenerSala(id);
    if (!sala) return { exito: false, mensaje: 'Sala no encontrada.' };
    if (this.funciones().some((f) => f.salaId === id)) {
      return { exito: false, mensaje: 'No se puede eliminar: la sala tiene funciones programadas.' };
    }
    this.salas.update((lista) => lista.filter((s) => s.id !== id));
    this.registrarLog('ELIMINAR_SALA', this.auth.emailEfectivo(), `Eliminó la sala "${sala.nombre}".`);
    return { exito: true, mensaje: 'Sala eliminada.' };
  }

  /** Modifica la distribución de butacas de una sala (mail del 12/02). */
  actualizarDistribucionSala(id: number, filas: ConfiguracionFila[]): ResultadoOperacion {
    return this.actualizarSala(id, { filas });
  }

  // ------------------------------------------------------------------ compra

  /** Calcula el desglose económico de una compra sin registrarla. */
  calcularCotizacion(payload: Omit<CompraPayload, 'usuarioEmail' | 'creadoPorCanje'>) {
    const { funcion, sala, butacas, candy, combos } = payload;

    const lineasButacas: ButacaTicket[] = butacas.map((b) => {
      const tipo = this.tipoButaca(sala, b.fila);
      return {
        fila: b.fila,
        numero: b.numero,
        etiqueta: `${b.fila}${b.numero}`,
        tipo,
        precio: this.precioButaca(funcion, sala, b),
      };
    });

    const subtotalButacas = lineasButacas.reduce((acc, b) => acc + b.precio, 0);
    const subtotalCandy = candy.reduce((acc, c) => acc + c.producto.precio * c.cantidad, 0);
    const subtotalCombos = combos.reduce((acc, c) => acc + c.combo.precio * c.cantidad, 0);

    const subtotal = subtotalButacas + subtotalCandy + subtotalCombos;
    const descuento = Math.round(subtotal * (payload.porcentajeDescuento / 100));
    const creditoDisponible = this.creditoUsuario();
    const creditoUtilizado = Math.min(payload.creditoUtilizado, creditoDisponible, subtotal - descuento);

    const total = Math.max(0, subtotal - descuento - creditoUtilizado);

    return {
      lineasButacas,
      subtotalButacas,
      subtotalCandy,
      subtotalCombos,
      subtotal,
      descuento,
      creditoUtilizado,
      total,
      cantidadButacas: butacas.length,
      cantidadCandy: candy.reduce((acc, c) => acc + c.cantidad, 0),
      cantidadCombos: combos.reduce((acc, c) => acc + c.cantidad, 0),
      incluyeVip: lineasButacas.some((b) => b.tipo === 'vip'),
      incluyeAdaptada: lineasButacas.some((b) => b.tipo === 'adaptada'),
    };
  }

  /**
   * Registra la compra y emite el ticket con QR (mail del 01/01).
   * Valida edad, bloqueo de butacas, cupón y crédito antes de confirmar.
   */
  async finalizarCompra(payload: CompraPayload): Promise<ResultadoOperacion & { ticket?: Ticket }> {
    const { pelicula, funcion, sala, butacas } = payload;

    if (butacas.length === 0) {
      return { exito: false, mensaje: 'Elegí al menos una butaca.' };
    }

    const edad = this.puedeComprarFuncion(pelicula, payload.usuarioEmail);
    if (!edad.exito) return edad;

    const cotizacion = this.calcularCotizacion(payload);
    if (cotizacion.total < 0) {
      return { exito: false, mensaje: 'El crédito no puede superar el total de la compra.' };
    }

    const bloqueo = this.butacasBloqueadas(funcion.id).filter((id) =>
      butacas.some((b) => b.id === id),
    );
    if (bloqueo.length > 0) {
      return {
        exito: false,
        mensaje: `La butaca ${bloqueo[0]} acaba de ser ocupada por otra compra. Volvé a elegir.`,
      };
    }

    const id = this.siguienteId();
    const fechaFuncion = proximaFechaFuncion(funcion.dias, funcion.horaInicio);

    const lineasCandy: LineaCandy[] = payload.candy
      .filter((c) => c.cantidad > 0)
      .map((c) => ({
        productoId: c.producto.id,
        nombre: c.producto.nombre,
        cantidad: c.cantidad,
        precioUnitario: c.producto.precio,
      }));

    const lineasCombo: LineaCombo[] = [];
    for (const { combo, cantidad } of payload.combos.filter((c) => c.cantidad > 0)) {
      lineasCombo.push({
        comboId: combo.id,
        nombre: combo.nombre,
        cantidad,
        precioUnitario: combo.precio,
        entradas: combo.entradas,
        productos: combo.productos.map((p) => ({
          productoId: p.productoId,
          nombre: this.productoPorId(p.productoId)?.nombre ?? `Producto ${p.productoId}`,
          cantidad: p.cantidad * cantidad,
        })),
      });
    }

    const ticket: Ticket = {
      id,
      codigoQr: this.generarCodigoQr(),
      usuarioEmail: payload.usuarioEmail,
      peliculaId: pelicula.id,
      peliculaNombre: pelicula.nombre,
      posterPelicula: pelicula.imagenUrl,
      funcionId: funcion.id,
      salaId: sala.id,
      frecuencia: `${funcion.dias.join(', ')} - ${funcion.horaInicio}hs`,
      fechaHoraFuncion: fechaFuncion.toISOString(),
      fechaVenta: this.ahora(),
      butacas: cotizacion.lineasButacas,
      productosCandy: lineasCandy,
      combos: lineasCombo,
      montoTotal: cotizacion.total,
      descuentoAplicado: cotizacion.descuento,
      cuponUtilizado: payload.cupon?.codigo ?? null,
      creditoUtilizado: cotizacion.creditoUtilizado,
      puntosGanados: Math.floor(cotizacion.total),
      validadoEntrada: false,
      validadoCandy: false,
      estado: 'ACTIVO',
      requiereAcompanante: this.requiereAcompanante(pelicula),
      clasificacionEdad: pelicula.clasificacionEdad,
      creadoPorCanje: payload.creadoPorCanje,
    };

    this.tickets.update((lista) => [...lista, ticket]);
    await this.confirmarButacas(funcion.id, butacas, id);

    if (cotizacion.creditoUtilizado > 0) {
      this.descontarCredito(cotizacion.creditoUtilizado, payload.usuarioEmail);
    }
    if (payload.cupon) {
      this.consumirCupon(payload.cupon.id);
    }
    if (payload.usuarioEmail !== USUARIO_ANONIMO) {
      this.acumularPuntos(ticket.puntosGanados, payload.usuarioEmail);
      this.auth.consumirCuponPrimeraCompra();
    }
    this.registrarVentas(pelicula.id, butacas.length);

    this.registrarLog(
      'COMPRA',
      payload.usuarioEmail,
      `Compra de "${pelicula.nombre}" (${butacas.length} butaca/s, total ${cotizacion.total}). QR ${ticket.codigoQr}.`,
    );

    return { exito: true, mensaje: 'Compra confirmada.', ticket };
  }

  private generarCodigoQr(): string {
    const aleatorio =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8).toUpperCase()
        : Math.random().toString(36).slice(2, 10).toUpperCase();
    return `CINE-${aleatorio}`;
  }

  private registrarVentas(peliculaId: number, butacas: number): void {
    this.peliculas.update((lista) =>
      lista.map((p) => (p.id === peliculaId ? { ...p, ventasTotales: p.ventasTotales + butacas } : p)),
    );
  }

  private productoPorId(id: number): Producto | undefined {
    return this.productos().find((p) => p.id === id);
  }

  // ------------------------------------------------------- cancelaciones (10/03)

  /**
   * Cancelación hasta 2 horas antes de la función (mail del 10/03).
   * No se devuelve dinero: se acredita saldo en la cuenta del usuario.
   */
  cancelarReserva(ticketId: number): ResultadoOperacion {
    const ticket = this.tickets().find((t) => t.id === ticketId);
    if (!ticket) return { exito: false, mensaje: 'Ticket no encontrado.' };
    if (ticket.estado === 'CANCELADO') return { exito: false, mensaje: 'La reserva ya estaba cancelada.' };
    if (ticket.usuarioEmail !== this.auth.emailEfectivo()) {
      return { exito: false, mensaje: 'Solo podés cancelar tus propias reservas.' };
    }

    const horasFaltantes = (new Date(ticket.fechaHoraFuncion).getTime() - Date.now()) / 3_600_000;
    if (horasFaltantes < 2) {
      return {
        exito: false,
        mensaje: `No se puede cancelar con menos de 2 horas para la función (faltan ${Math.max(0, Math.floor(horasFaltantes))}h).`,
      };
    }

    this.tickets.update((lista) =>
      lista.map((t) => (t.id === ticketId ? { ...t, estado: 'CANCELADO' as const } : t)),
    );

    // El crédito no es transferible: va a la cuenta del mismo usuario.
    this.sumarCredito(ticket.montoTotal, ticket.usuarioEmail);
    // Se devuelven los puntos acumulados por esta compra.
    this.descontarPuntos(ticket.puntosGanados, ticket.usuarioEmail);

    void this.liberarButacas(
      ticket.funcionId ?? 0,
      ticket.butacas.map((b) => ({ id: `${b.fila}-${b.numero}`, fila: b.fila, numero: b.numero })),
    );

    this.registrarLog(
      'CANCELAR_RESERVA',
      ticket.usuarioEmail,
      `Canceló el ticket ${ticket.codigoQr} de "${ticket.peliculaNombre}". Se acreditaron $${ticket.montoTotal} y se devolvieron ${ticket.puntosGanados} puntos.`,
    );

    return {
      exito: true,
      mensaje: `Reserva cancelada. Se acreditó $${ticket.montoTotal} de crédito en tu perfil.`,
    };
  }

  // ------------------------------------------------------- validación por QR

  /**
   * Validación de un QR por parte de un empleado (mail del 12/02).
   * Un QR es de un solo uso: al validar la entrada deja de servir, y al
   * entregar el candy también (mail del 12/02).
   */
  validarCodigoQr(codigo: string, tipo: 'entrada' | 'candy'): ResultadoOperacion & { ticket?: Ticket } {
    const limpio = codigo.trim();
    if (!limpio) return { exito: false, mensaje: 'Ingresá un código.' };

    const ticket = this.tickets().find((t) => t.codigoQr.toLowerCase() === limpio.toLowerCase());
    const usuario = this.auth.emailEfectivo();

    if (!ticket) {
      this.registrarLog('VALIDAR_QR', usuario, `Código desconocido: "${limpio}".`);
      return { exito: false, mensaje: 'Código QR no encontrado.' };
    }
    if (ticket.estado === 'CANCELADO') {
      this.registrarLog('VALIDAR_QR', usuario, `Código ${limpio} rechazado: reserva cancelada.`);
      return { exito: false, mensaje: 'DENEGADO: la reserva fue cancelada.' };
    }

    if (tipo === 'entrada') {
      if (ticket.validadoEntrada) {
        this.registrarLog('VALIDAR_QR', usuario, `Código ${limpio} rechazado: entrada ya usada.`);
        return { exito: false, mensaje: 'DENEGADO: el QR de entrada ya fue utilizado.' };
      }
      this.tickets.update((lista) =>
        lista.map((t) => (t.id === ticket.id ? { ...t, validadoEntrada: true } : t)),
      );

      const datos = `${ticket.peliculaNombre} · ${ticket.frecuencia} · Sala ${ticket.salaId}`;
      this.registrarLog('VALIDAR_ENTRADA', usuario, `Validó ${ticket.codigoQr} (${datos}).`);
      return {
        exito: true,
        mensaje: `ENTRADA VALIDADA — ${ticket.peliculaNombre}, ${ticket.frecuencia}, butacas ${ticket.butacas.map((b) => b.etiqueta).join(', ')}.`,
        ticket: { ...ticket, validadoEntrada: true },
      };
    }

    if (ticket.validadoCandy) {
      this.registrarLog('VALIDAR_QR', usuario, `Código ${limpio} rechazado: candy ya entregado.`);
      return { exito: false, mensaje: 'DENEGADO: el pedido ya fue entregado.' };
    }
    this.tickets.update((lista) =>
      lista.map((t) => (t.id === ticket.id ? { ...t, validadoCandy: true } : t)),
    );

    const detalle = this.resumenCandy(ticket);
    this.registrarLog('VALIDAR_CANDY', usuario, `Entregó candy de ${ticket.codigoQr}: ${detalle || 'sin productos'}.`);
    return {
      exito: true,
      mensaje: `CANDY ENTREGADO — ${detalle || 'el ticket no incluye productos de candy bar'}.`,
      ticket,
    };
  }

  private resumenCandy(ticket: Ticket): string {
    const partes: string[] = [];
    for (const p of ticket.productosCandy) partes.push(`${p.cantidad}x ${p.nombre}`);
    for (const c of ticket.combos) {
      partes.push(`${c.cantidad}x ${c.nombre}`);
      for (const p of c.productos) partes.push(`${p.cantidad}x ${p.nombre}`);
    }
    return partes.join(', ');
  }

  // --------------------------------------------------------------- reseñas

  agregarResenia(datos: Omit<Resenia, 'id' | 'fecha' | 'usuarioEmail' | 'usuarioNombre'>): ResultadoOperacion {
    if (!datos.comentario.trim()) return { exito: false, mensaje: 'Escribí un comentario.' };
    if (datos.estrellas < 1 || datos.estrellas > 5) {
      return { exito: false, mensaje: 'La puntuación debe ir de 1 a 5 estrellas.' };
    }
    const usuario = this.auth.usuarioActual();
    const nueva: Resenia = {
      ...datos,
      id: this.siguienteId(),
      usuarioEmail: this.auth.emailEfectivo(),
      usuarioNombre: usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : 'Anónimo',
      fecha: aIsoFecha(new Date()),
    };
    this.resenias.update((lista) => [nueva, ...lista]);
    this.registrarLog('RESENIA', nueva.usuarioEmail, `Reseñó "${this.obtenerPelicula(nueva.peliculaId)?.nombre ?? '?'}" con ${nueva.estrellas} estrellas.`);
    return { exito: true, mensaje: '¡Reseña publicada!' };
  }

  eliminarResenia(id: number): void {
    this.resenias.update((lista) => lista.filter((r) => r.id !== id));
  }

  // --------------------------------------------------------------- candy bar

  crearProducto(datos: Omit<Producto, 'id' | 'activo'>): ResultadoOperacion {
    if (!datos.nombre.trim()) return { exito: false, mensaje: 'El nombre es obligatorio.' };
    if (datos.precio <= 0) return { exito: false, mensaje: 'El precio debe ser mayor a 0.' };
    const nuevo: Producto = { ...datos, id: this.siguienteId(), activo: true };
    this.productos.update((lista) => [...lista, nuevo]);
    this.registrarLog('CREAR_PRODUCTO', this.auth.emailEfectivo(), `Creó el producto "${nuevo.nombre}" (${nuevo.categoria}).`);
    return { exito: true, mensaje: `Producto "${nuevo.nombre}" creado.` };
  }

  actualizarProducto(id: number, cambios: Partial<Producto>): ResultadoOperacion {
    if (!this.productoPorId(id)) return { exito: false, mensaje: 'Producto no encontrado.' };
    this.productos.update((lista) => lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    this.registrarLog('MODIFICAR_PRODUCTO', this.auth.emailEfectivo(), `Modificó el producto #${id}.`);
    return { exito: true, mensaje: 'Producto actualizado.' };
  }

  eliminarProducto(id: number): ResultadoOperacion {
    const producto = this.productoPorId(id);
    if (!producto) return { exito: false, mensaje: 'Producto no encontrado.' };
    this.productos.update((lista) => lista.filter((p) => p.id !== id));
    this.registrarLog('ELIMINAR_PRODUCTO', this.auth.emailEfectivo(), `Eliminó "${producto.nombre}".`);
    return { exito: true, mensaje: 'Producto eliminado.' };
  }

  productosPorCategoria(categoria: CategoriaProducto): Producto[] {
    return this.productos().filter((p) => p.categoria === categoria && p.activo);
  }

  // ---------------------------------------------------------------- cupones

  crearCupon(datos: Omit<Cupon, 'id' | 'usos'>): ResultadoOperacion {
    const codigo = datos.codigo.trim().toUpperCase();
    if (!codigo) return { exito: false, mensaje: 'El código es obligatorio.' };
    if (this.cupones().some((c) => c.codigo === codigo)) {
      return { exito: false, mensaje: `Ya existe el cupón "${codigo}".` };
    }
    if (datos.porcentajeDescuento <= 0 || datos.porcentajeDescuento > 100) {
      return { exito: false, mensaje: 'El descuento debe estar entre 1 y 100.' };
    }
    const nuevo: Cupon = { ...datos, codigo, id: this.siguienteId(), usos: 0 };
    this.cupones.update((lista) => [...lista, nuevo]);
    this.registrarLog('CREAR_CUPON', this.auth.emailEfectivo(), `Creó el cupón ${codigo} (${nuevo.porcentajeDescuento}%).`);
    return { exito: true, mensaje: `Cupón ${codigo} creado.` };
  }

  actualizarCupon(id: number, cambios: Partial<Cupon>): ResultadoOperacion {
    if (!this.cupones().some((c) => c.id === id)) return { exito: false, mensaje: 'Cupón no encontrado.' };
    if (cambios.porcentajeDescuento !== undefined &&
        (cambios.porcentajeDescuento <= 0 || cambios.porcentajeDescuento > 100)) {
      return { exito: false, mensaje: 'El descuento debe estar entre 1 y 100.' };
    }
    this.cupones.update((lista) => lista.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    this.registrarLog('MODIFICAR_CUPON', this.auth.emailEfectivo(), `Actualizó el cupón #${id}.`);
    return { exito: true, mensaje: 'Cupón actualizado.' };
  }

  eliminarCupon(id: number): ResultadoOperacion {
    this.cupones.update((lista) => lista.filter((c) => c.id !== id));
    this.registrarLog('ELIMINAR_CUPON', this.auth.emailEfectivo(), `Eliminó el cupón #${id}.`);
    return { exito: true, mensaje: 'Cupón eliminado.' };
  }

  /**
   * Valida un cupón contra el usuario actual (mails del 01/01 y 30/01).
   * - El cupón de primera compra solo sirve si el usuarioRegistered still has it.
   * - Los cupones "soloMayores50" requieren edad >= 50.
   */
  validarCupon(codigo: string, subtotal: number): ResultadoOperacion & { cupon?: Cupon } {
    const limpio = codigo.trim().toUpperCase();
    const cupon = this.cupones().find((c) => c.codigo === limpio);

    if (!cupon) return { exito: false, mensaje: `El cupón "${limpio}" no existe.` };
    if (!cupon.activo) return { exito: false, mensaje: `El cupón "${limpio}" está desactivado.` };
    if (cupon.usosMaximos > 0 && cupon.usos >= cupon.usosMaximos) {
      return { exito: false, mensaje: `El cupón "${limpio}" ya alcanzó su límite de usos.` };
    }

    if (cupon.soloPrimeraCompra) {
      if (this.auth.emailEfectivo() === USUARIO_ANONIMO) {
        return { exito: false, mensaje: 'El cupón de primera compra es solo para usuarios registrados.' };
      }
      if (!this.auth.tieneCuponPrimeraCompra) {
        return { exito: false, mensaje: 'Ya usaste tu cupón de primera compra.' };
      }
    }

    if (cupon.soloMayores50) {
      const edad = calcularEdad(this.auth.usuarioActual()?.fechaNacimiento);
      if (this.auth.emailEfectivo() === USUARIO_ANONIMO || edad < 50) {
        return {
          exito: false,
          mensaje: `Este cupón es exclusivo para mayores de 50 años. Tu edad registrada: ${edad} años.`,
        };
      }
    }

    if (subtotal <= 0) {
      return { exito: false, mensaje: 'No hay nada sobre lo que aplicar el descuento.' };
    }

    return {
      exito: true,
      mensaje: `Cupón aplicado: ${cupon.porcentajeDescuento}% de descuento.`,
      cupon,
    };
  }

  private consumirCupon(id: number): void {
    this.cupones.update((lista) => lista.map((c) => (c.id === id ? { ...c, usos: c.usos + 1 } : c)));
  }

  /** El cupón de bienvenida, con el % configurable por el admin (mails 01/01 y 30/01). */
  cuponBienvenida(): Cupon | undefined {
    return this.cupones().find((c) => c.codigo === CUPON_BIENVENIDA);
  }

  // ------------------------------------------------------------ fidelización

  private sumarCredito(monto: number, email: string): void {
    this.credito.update((mapa) => ({ ...mapa, [email]: (mapa[email] ?? 0) + monto }));
  }

  descontarCredito(monto: number, email = this.auth.emailEfectivo()): void {
    this.credito.update((mapa) => ({ ...mapa, [email]: Math.max(0, (mapa[email] ?? 0) - monto) }));
  }

  private acumularPuntos(puntos: number, email: string): void {
    this.puntos.update((mapa) => ({ ...mapa, [email]: (mapa[email] ?? 0) + puntos }));
  }

  private descontarPuntos(puntos: number, email: string): void {
    this.puntos.update((mapa) => ({ ...mapa, [email]: Math.max(0, (mapa[email] ?? 0) - puntos) }));
  }

  actualizarRecompensa(id: number, puntosRequeridos: number): ResultadoOperacion {
    if (puntosRequeridos <= 0) return { exito: false, mensaje: 'El costo debe ser mayor a 0.' };
    if (!this.recompensas().some((r) => r.id === id)) {
      return { exito: false, mensaje: 'Recompensa no encontrada.' };
    }
    this.recompensas.update((lista) =>
      lista.map((r) => (r.id === id ? { ...r, puntosRequeridos } : r)),
    );
    this.registrarLog('MODIFICAR_RECOMPENSA', this.auth.emailEfectivo(), `La recompensa #${id} ahora cuesta ${puntosRequeridos} puntos.`);
    return { exito: true, mensaje: `Costo actualizado a ${puntosRequeridos} puntos.` };
  }

  /**
   * Canje de puntos (mail del 03/03). Si la recompensa es una entrada, emite
   * un ticket con QR válido; si es candy, genera un ticket de retiro.
   */
  canjearRecompensa(recompensaId: number): ResultadoOperacion & { ticket?: Ticket } {
    const recompensa = this.recompensas().find((r) => r.id === recompensaId);
    if (!recompensa) return { exito: false, mensaje: 'Recompensa no encontrada.' };
    if (!recompensa.activa) return { exito: false, mensaje: 'Esa recompensa no está disponible.' };

    const email = this.auth.emailEfectivo();
    if (email === USUARIO_ANONIMO) {
      return { exito: false, mensaje: 'Iniciá sesión para canjear puntos.' };
    }

    const disponibles = this.puntosUsuario();
    if (disponibles < recompensa.puntosRequeridos) {
      return {
        exito: false,
        mensaje: `Te faltan ${recompensa.puntosRequeridos - disponibles} puntos.`,
      };
    }

    this.descontarPuntos(recompensa.puntosRequeridos, email);

    const id = this.siguienteId();
    let ticket: Ticket;

    if (recompensa.tipo === 'entrada') {
      const pelicula = this.peliculasEnCartelera()[0];
      const funcion = pelicula ? this.funciones().find((f) => f.peliculaId === pelicula.id) : undefined;
      const sala = funcion ? this.obtenerSala(funcion.salaId) : undefined;

      ticket = {
        id,
        codigoQr: this.generarCodigoQr(),
        usuarioEmail: email,
        peliculaId: pelicula?.id ?? 0,
        peliculaNombre: `${recompensa.nombre} (canje)`,
        posterPelicula: pelicula?.imagenUrl ?? '',
        funcionId: funcion?.id ?? null,
        salaId: funcion?.salaId ?? 0,
        frecuencia: funcion ? `${funcion.dias.join(', ')} - ${funcion.horaInicio}hs` : 'Entrada sin función asignada',
        fechaHoraFuncion: funcion
          ? proximaFechaFuncion(funcion.dias, funcion.horaInicio).toISOString()
          : new Date(Date.now() + 86_400_000).toISOString(),
        fechaVenta: this.ahora(),
        butacas: [],
        productosCandy: [],
        combos: [],
        montoTotal: 0,
        descuentoAplicado: 0,
        cuponUtilizado: null,
        creditoUtilizado: 0,
        puntosGanados: 0,
        validadoEntrada: false,
        validadoCandy: false,
        estado: 'ACTIVO',
        requiereAcompanante: false,
        clasificacionEdad: 0,
        creadoPorCanje: true,
      };
      this.tickets.update((lista) => [...lista, ticket]);
      void sala;
    } else {
      const producto = recompensa.productoId ? this.productoPorId(recompensa.productoId) : undefined;
      ticket = {
        id,
        codigoQr: this.generarCodigoQr(),
        usuarioEmail: email,
        peliculaId: 0,
        peliculaNombre: `Retiro candy · ${recompensa.nombre}`,
        posterPelicula: producto?.imagenUrl ?? '',
        funcionId: null,
        salaId: 0,
        frecuencia: 'Retiro en candy bar',
        fechaHoraFuncion: new Date(Date.now() + 86_400_000).toISOString(),
        fechaVenta: this.ahora(),
        butacas: [],
        productosCandy: producto
          ? [{ productoId: producto.id, nombre: producto.nombre, cantidad: 1, precioUnitario: 0 }]
          : [],
        combos: [],
        montoTotal: 0,
        descuentoAplicado: 0,
        cuponUtilizado: null,
        creditoUtilizado: 0,
        puntosGanados: 0,
        validadoEntrada: true,
        validadoCandy: false,
        estado: 'ACTIVO',
        requiereAcompanante: false,
        clasificacionEdad: 0,
        creadoPorCanje: true,
      };
      this.tickets.update((lista) => [...lista, ticket]);
    }

    const canje: Canje = {
      id,
      usuarioEmail: email,
      recompensaId: recompensa.id,
      recompensaNombre: recompensa.nombre,
      puntosUtilizados: recompensa.puntosRequeridos,
      fecha: aIsoFecha(new Date()),
      codigoTicket: ticket.codigoQr,
    };
    this.canjes.update((lista) => [canje, ...lista]);

    this.registrarLog('CANJE', email, `Canjeó "${recompensa.nombre}" por ${recompensa.puntosRequeridos} puntos. QR ${ticket.codigoQr}.`);
    return {
      exito: true,
      mensaje: `Canjeaste "${recompensa.nombre}". Tu código es ${ticket.codigoQr}.`,
      ticket,
    };
  }

  // ------------------------------------------------------------------ combos

  crearCombo(datos: Omit<ComboEspecial, 'id' | 'activo'>): ResultadoOperacion {
    if (!datos.nombre.trim()) return { exito: false, mensaje: 'El nombre del combo es obligatorio.' };
    if (datos.precio <= 0) return { exito: false, mensaje: 'El precio debe ser mayor a 0.' };
    const nuevo: ComboEspecial = { ...datos, id: this.siguienteId(), activo: true };
    this.combos.update((lista) => [...lista, nuevo]);
    this.registrarLog('CREAR_COMBO', this.auth.emailEfectivo(), `Creó el combo "${nuevo.nombre}" a $${nuevo.precio}.`);
    return { exito: true, mensaje: `Combo "${nuevo.nombre}" creado.` };
  }

  actualizarCombo(id: number, cambios: Partial<ComboEspecial>): ResultadoOperacion {
    if (!this.combos().some((c) => c.id === id)) return { exito: false, mensaje: 'Combo no encontrado.' };
    this.combos.update((lista) => lista.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    this.registrarLog('MODIFICAR_COMBO', this.auth.emailEfectivo(), `Actualizó el combo #${id}.`);
    return { exito: true, mensaje: 'Combo actualizado.' };
  }

  eliminarCombo(id: number): ResultadoOperacion {
    this.combos.update((lista) => lista.filter((c) => c.id !== id));
    this.registrarLog('ELIMINAR_COMBO', this.auth.emailEfectivo(), `Eliminó el combo #${id}.`);
    return { exito: true, mensaje: 'Combo eliminado.' };
  }

  combosActivos = computed(() => this.combos().filter((c) => c.activo));

  // --------------------------------------------------------------- preventa

  /**
   * Configura la preventa de una película (mail del 08/03): se abre
   * `diasAnticipacion` días antes del estreno con precio especial.
   */
  configurarPreventa(
    peliculaId: number,
    precio: number,
    diasAnticipacion: number,
    fechaEstreno: string,
    activa: boolean,
  ): ResultadoOperacion {
    const pelicula = this.obtenerPelicula(peliculaId);
    if (!pelicula) return { exito: false, mensaje: 'Película no encontrada.' };
    if (precio <= 0) return { exito: false, mensaje: 'El precio de preventa debe ser mayor a 0.' };
    if (diasAnticipacion < 0 || diasAnticipacion > 30) {
      return { exito: false, mensaje: 'La anticipación debe estar entre 0 y 30 días.' };
    }
    if (!fechaEstreno) return { exito: false, mensaje: 'Indicá la fecha de estreno.' };

    this.actualizarPelicula(peliculaId, {
      preventa: { precio, diasAnticipacion, fechaEstreno, activa },
      fechaEstreno,
      esProximamente: activa,
      visibleEnCartelera: !activa,
    });

    this.registrarLog(
      'CONFIGURAR_PREVENTA',
      this.auth.emailEfectivo(),
      `Preventa de "${pelicula.nombre}": $${precio} desde ${diasAnticipacion} días antes del ${fechaEstreno} (${activa ? 'activa' : 'inactiva'}).`,
    );
    return {
      exito: true,
      mensaje: activa
        ? `Preventa de "${pelicula.nombre}" programada: $${precio} desde el ${diasAnticipacion} días previo al estreno.`
        : `Preventa de "${pelicula.nombre}" desactivada.`,
    };
  }

  /**
   * Precio vigente de una función: si la película está en.preventa abierta,
   * se aplica el precio de preventa (mail del 08/03).
   */
  precioVigente(funcion: Funcion): { precio: number; enPreventa: boolean } {
    const pelicula = this.obtenerPelicula(funcion.peliculaId);
    const preventa = this.preventaDe(funcion.peliculaId);
    if (pelicula?.preventa && preventa?.abierta && !this.bloqueadaPorEdad(pelicula)) {
      return { precio: pelicula.preventa.precio, enPreventa: true };
    }
    return { precio: funcion.precio, enPreventa: false };
  }

  private bloqueadaPorEdad(pelicula: Pelicula): boolean {
    return !this.puedeComprarFuncion(pelicula, this.auth.emailEfectivo()).exito;
  }

  // ---------------------------------------------------------------- reportes

  /**
   * Reporte de facturación por día (mails del 03/03 y 10/03).
   * Agrupa por FECHA DE VENTA (no por la fecha de la función) y cuenta
   * butacas, no tickets.
   */
  reporteFacturacionDiaria = computed<FilaReporte[]>(() => {
    const mapa = new Map<string, FilaReporte>();

    for (const t of this.tickets()) {
      if (t.estado === 'CANCELADO' || t.creadoPorCanje) continue;
      const fecha = t.fechaVenta ? aIsoFecha(new Date(t.fechaVenta)) : 'Sin fecha';
      const fila = mapa.get(fecha) ?? { fecha, entradasVendidas: 0, totalFacturado: 0 };
      fila.entradasVendidas += t.butacas.length;
      fila.totalFacturado += t.montoTotal;
      mapa.set(fecha, fila);
    }

    return Array.from(mapa.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  totalFacturado = computed(() =>
    this.reporteFacturacionDiaria().reduce((acc, f) => acc + f.totalFacturado, 0),
  );

  totalEntradasVendidas = computed(() =>
    this.reporteFacturacionDiaria().reduce((acc, f) => acc + f.entradasVendidas, 0),
  );

  /** Tickets pagados (sin canjes) agrupados por día, para el gráfico mensual. */
  reporteMensual = computed<FilaReporte[]>(() => {
    const mapa = new Map<string, FilaReporte>();
    for (const t of this.tickets()) {
      if (t.estado === 'CANCELADO' || t.creadoPorCanje) continue;
      const d = new Date(t.fechaVenta);
      const clave = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const fila = mapa.get(clave) ?? { fecha: clave, entradasVendidas: 0, totalFacturado: 0 };
      fila.entradasVendidas += t.butacas.length;
      fila.totalFacturado += t.montoTotal;
      mapa.set(clave, fila);
    }
    return Array.from(mapa.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  });

  /** Top películas por entradas vendidas en los últimos 7 días (mail del 10/03). */
  peliculasMasVistasSemana = computed<ItemRanking[]>(() => this.rankingPeliculas(7));

  /** Top películas por entradas vendidas en los últimos 30 días (mail del 10/03). */
  peliculasMasVistasMes = computed<ItemRanking[]>(() => this.rankingPeliculas(30));

  private rankingPeliculas(dias: number): ItemRanking[] {
    const limite = Date.now() - dias * 86_400_000;
    const conteo = new Map<number, number>();

    for (const t of this.tickets()) {
      if (t.estado === 'CANCELADO' || t.creadoPorCanje) continue;
      if (new Date(t.fechaVenta).getTime() < limite) continue;
      conteo.set(t.peliculaId, (conteo.get(t.peliculaId) ?? 0) + t.butacas.length);
    }

    return Array.from(conteo.entries())
      .map(([peliculaId, cantidad]) => ({
        etiqueta: this.obtenerPelicula(peliculaId)?.nombre ?? `Película ${peliculaId}`,
        cantidad,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
  }

  /** Producto de candy bar más vendido (mail del 10/03). */
  productoCandyMasVendido = computed<ItemRanking | null>(() => {
    const conteo = new Map<string, number>();

    for (const t of this.tickets()) {
      if (t.estado === 'CANCELADO') continue;
      for (const p of t.productosCandy) {
        conteo.set(p.nombre, (conteo.get(p.nombre) ?? 0) + p.cantidad);
      }
      for (const c of t.combos) {
        for (const p of c.productos) {
          conteo.set(p.nombre, (conteo.get(p.nombre) ?? 0) + p.cantidad);
        }
      }
    }

    const entradas = Array.from(conteo.entries()).map(([etiqueta, cantidad]) => ({ etiqueta, cantidad }));
    if (entradas.length === 0) return null;
    return entradas.sort((a, b) => b.cantidad - a.cantidad)[0];
  });

  /** Occupación por sala en porcentaje. */
  ocupacionPorSala = computed(() =>
    this.salas().map((sala) => {
      const total = totalButacasSala(sala.filas);
      const ocupadas = this.tickets()
        .filter(
          (t) =>
            t.estado === 'ACTIVO' &&
            t.salaId === sala.id &&
            new Date(t.fechaHoraFuncion).getTime() > Date.now(),
        )
        .reduce((acc, t) => acc + t.butacas.length, 0);
      return {
        etiqueta: sala.nombre,
        cantidad: total === 0 ? 0 : Math.round((ocupadas / total) * 100),
      };
    }),
  );

  // ------------------------------------------------------------------- logs

  registrarLog(accion: string, usuario: string, detalle: string): void {
    const nuevo: LogAuditoria = {
      id: this.siguienteId(),
      fechaHora: formatearFechaHora(this.ahora()),
      accion,
      usuario,
      detalle,
    };
    this.logs.update((lista) => [nuevo, ...lista].slice(0, 500));
  }

  limpiarLogs(): void {
    this.logs.set([]);
    this.registrarLog('LIMPIAR_LOGS', this.auth.emailEfectivo(), 'Se vació el log de actividad.');
  }

  // --------------------------------------------------------------- redondeo

  }

export const CUPON_BIENVENIDA = 'BIENVENIDA20';

// ---------------------------------------------------------------- datos semilla

const SALAS_SEMILLA: Sala[] = [1, 2, 3, 4].map((n) => ({
  id: n,
  nombre: `Sala ${n}`,
  filas: crearFilasPorDefecto(),
  activa: true,
}));

const PELICULAS_SEMILLA: Pelicula[] = [
  {
    id: 1,
    nombre: 'Avatar: El Camino del Agua',
    sinopsis:
      'Jake Sully llega al planeta Pandora para proteger a su familia y termina liderando a los Na’vi.',
    duracionMinutos: 192,
    imagenUrl:
      'https://static.wikia.nocookie.net/doblaje/images/e/ed/AVATAR-El_Camino_del_Agua_p%C3%B3ster.jpg/revision/latest?cb=20221102143411&path-prefix=es',
    generos: ['Acción', 'Ciencia Ficción', 'Aventura'],
    formato: '3D',
    idioma: 'Subtitulada',
    ventasTotales: 1500,
    clasificacionEdad: 13,
    visibleEnCartelera: true,
    esProximamente: false,
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
    ventasTotales: 2300,
    clasificacionEdad: 13,
    visibleEnCartelera: true,
    esProximamente: false,
  },
  {
    id: 3,
    nombre: 'Batman: El Caballero de la Noche',
    sinopsis: 'Batman combate la amenaza del Guasón en Ciudad Gótica.',
    duracionMinutos: 152,
    imagenUrl:
      'https://static.wikia.nocookie.net/doblaje/images/9/9c/Batman_el_Caballero_de_la_Noche.png/revision/latest/thumbnail/width/360/height/360?cb=20110602012240&path-prefix=es',
    generos: ['Acción', 'Crimen', 'Drama'],
    formato: '2D',
    idioma: 'Subtitulada',
    ventasTotales: 1800,
    clasificacionEdad: 18,
    visibleEnCartelera: true,
    esProximamente: false,
  },
  {
    id: 4,
    nombre: 'Mi Vecino Totoro',
    sinopsis: 'Dos hermanas entablan amistad con los espíritus del bosque.',
    duracionMinutos: 86,
    imagenUrl:
      'https://images.cdn2.buscalibre.com/fit-in/660x660/aa/55/aa55c7aad7c5ef1bed42b6e3a4183c2d.jpg',
    generos: ['Animación', 'Fantasía', 'Familiar'],
    formato: '2D',
    idioma: 'Castellano',
    ventasTotales: 950,
    clasificacionEdad: 0,
    visibleEnCartelera: true,
    esProximamente: false,
  },
  {
    id: 5,
    nombre: 'Dune: Parte Tres',
    sinopsis:
      'La saga de Arrakis llega a su capítulo final mientras las casas se preparan para la guerra.',
    duracionMinutos: 165,
    imagenUrl:
      'https://m.media-amazon.com/images/M/MV5BYjk1NjgwZDMtYzI5OS00Y2Q4LWI1NmItNTE5OGU2NDVmMTAxXkEyXkFqcGc@._V1_.jpg',
    generos: ['Ciencia Ficción', 'Aventura'],
    formato: '4D',
    idioma: 'Subtitulada',
    ventasTotales: 0,
    clasificacionEdad: 13,
    visibleEnCartelera: false,
    esProximamente: true,
    fechaEstreno: fechaEstrenoEnDias(21),
    preventa: {
      precio: 4800,
      diasAnticipacion: 7,
      fechaEstreno: fechaEstrenoEnDias(21),
      activa: true,
    },
  },
  {
    id: 6,
    nombre: 'El Faro de Piedras Blancas',
    sinopsis: 'Dos exploradores comparten un invierno aislado en la costa.',
    duracionMinutos: 141,
    imagenUrl:
      'https://images.cdn2.buscalibre.com/fit-in/660x660/aa/55/aa55c7aad7c5ef1bed42b6e3a4183c2d.jpg',
    generos: ['Suspenso', 'Drama'],
    formato: '2D',
    idioma: 'Castellano',
    ventasTotales: 0,
    clasificacionEdad: 18,
    visibleEnCartelera: true,
    esProximamente: false,
  },
];

function fechaEstrenoEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const PRODUCTOS_SEMILLA: Producto[] = [
  {
    id: 1,
    nombre: 'Pochoclos Grandes',
    precio: 3500,
    categoria: 'Pochoclos',
    imagenUrl:
      'https://acdn-us.mitiendanube.com/stores/005/692/871/products/d_nq_np_2x_826480-mla84353844951_052025-f-4ab3dc7ab537e3d90417474011436925-640-0.webp',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Gaseosa 500ml',
    precio: 1800,
    categoria: 'Bebidas',
    imagenUrl:
      'https://www.casa-segal.com/wp-content/uploads/2020/03/coca-cola-500cc-almacen-gaseosas-casa-segal-mendoza-600x600.jpg',
    activo: true,
  },
  {
    id: 3,
    nombre: 'Pochoclos Medianos',
    precio: 2600,
    categoria: 'Pochoclos',
    imagenUrl: '',
    activo: true,
  },
  {
    id: 4,
    nombre: 'Gaseosa 1.5L',
    precio: 3200,
    categoria: 'Bebidas',
    imagenUrl: '',
    activo: true,
  },
  {
    id: 5,
    nombre: 'Chocolates',
    precio: 1200,
    categoria: 'Golosinas',
    imagenUrl: '',
    activo: true,
  },
  {
    id: 6,
    nombre: 'Dulces de fruta',
    precio: 900,
    categoria: 'Golosinas',
    imagenUrl: '',
    activo: true,
  },
];

const CUPONES_SEMILLA: Cupon[] = [
  {
    id: 1,
    codigo: CUPON_BIENVENIDA,
    porcentajeDescuento: 20,
    soloMayores50: false,
    soloPrimeraCompra: true,
    activo: true,
    descripcion: '20% de descuento en la primera compra de un usuario registrado.',
    usosMaximos: 0,
    usos: 0,
  },
  {
    id: 2,
    codigo: 'SENIOR50',
    porcentajeDescuento: 30,
    soloMayores50: true,
    soloPrimeraCompra: false,
    activo: true,
    descripcion: '30% exclusivo para usuarios mayores de 50 años.',
    usosMaximos: 0,
    usos: 0,
  },
];

const RECOMPENSAS_SEMILLA: Recompensa[] = [
  {
    id: 1,
    nombre: 'Entrada General Gratis',
    tipo: 'entrada',
    puntosRequeridos: 500,
    duracionMinutos: 120,
    activa: true,
  },
  {
    id: 2,
    nombre: 'Pochoclo Grande Gratis',
    tipo: 'candy',
    puntosRequeridos: 150,
    productoId: 1,
    activa: true,
  },
  {
    id: 3,
    nombre: 'Gaseosa 500ml Gratis',
    tipo: 'candy',
    puntosRequeridos: 100,
    productoId: 2,
    activa: true,
  },
  {
    id: 4,
    nombre: 'Chocolates Gratis',
    tipo: 'candy',
    puntosRequeridos: 200,
    productoId: 5,
    activa: true,
  },
];

const COMBOS_SEMILLA: ComboEspecial[] = [
  {
    id: 1,
    nombre: 'Combo Cine en Pareja',
    descripcion: '2 entradas + 1 pochoclo grande + 2 gaseosas',
    precio: 12500,
    entradas: 2,
    productos: [
      { productoId: 1, cantidad: 1 },
      { productoId: 2, cantidad: 2 },
    ],
    activo: true,
  },
  {
    id: 2,
    nombre: 'Combo Familiar',
    descripcion: '4 entradas + 2 pochoclos grandes + 1 gaseosa 1.5L',
    precio: 22000,
    entradas: 4,
    productos: [
      { productoId: 1, cantidad: 2 },
      { productoId: 4, cantidad: 1 },
    ],
    activo: true,
  },
];

const RESENIAS_SEMILLA: Resenia[] = [
  { id: 1, peliculaId: 1, usuarioEmail: 'juan@mail.com', usuarioNombre: 'Juan', estrellas: 5, comentario: 'Excelentes efectos 3D y banda sonora impresionante.', fecha: '2026-01-10' },
  { id: 2, peliculaId: 1, usuarioEmail: 'maria@mail.com', usuarioNombre: 'María', estrellas: 4, comentario: 'Un poco larga pero visualmente es una joya.', fecha: '2026-01-12' },
  { id: 3, peliculaId: 2, usuarioEmail: 'carlos@mail.com', usuarioNombre: 'Carlos', estrellas: 5, comentario: 'Una obra maestra del cine de fantasía.', fecha: '2026-01-15' },
  { id: 4, peliculaId: 2, usuarioEmail: 'lucia@mail.com', usuarioNombre: 'Lucía', estrellas: 5, comentario: 'La vi 10 veces y sigue emocionando como el primer día.', fecha: '2026-01-18' },
  { id: 5, peliculaId: 3, usuarioEmail: 'pedro@mail.com', usuarioNombre: 'Pedro', estrellas: 5, comentario: 'La actuación del Guasón es inolvidable.', fecha: '2026-01-20' },
  { id: 6, peliculaId: 4, usuarioEmail: 'sofia@mail.com', usuarioNombre: 'Sofía', estrellas: 4, comentario: 'Hermosa película para ver en familia.', fecha: '2026-01-22' },
];