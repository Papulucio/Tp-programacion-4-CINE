import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CineService, CUPON_BIENVENIDA } from '../../services/cine.service';
import { AuthService } from '../../services/auth.service';
import { MapaButacasComponent } from './mapa-butacas/mapa-butacas';
import { QrCodeComponent } from '../../components/qr-code/qr-code';
import { ButacaSeleccionada } from '../../models/butaca';
import { Producto } from '../../models/producto';
import { Cupon } from '../../models/cupon';
import { ComboEspecial } from '../../models/fidelizacion';
import { formatearFechaHora, formatearMoneda } from '../../core/utils/fecha.util';
import { Ticket, USUARIO_ANONIMO } from '../../models/ticket';

type Paso = 'butacas' | 'candy' | 'confirmar';

@Component({
  selector: 'app-compra',
  standalone: true,
  imports: [RouterLink, MapaButacasComponent, QrCodeComponent],
  templateUrl: './compra.html',
})
export class CompraComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cine = inject(CineService);
  readonly auth = inject(AuthService);

  readonly cuponBienvenida = CUPON_BIENVENIDA;

  readonly peliculaId = signal<number>(0);
  readonly paso = signal<Paso>('butacas');
  readonly seleccion = signal<ButacaSeleccionada[]>([]);
  readonly candy = signal<Record<number, number>>({});
  readonly combos = signal<Record<number, number>>({});
  readonly cupon = signal<Cupon | null>(null);
  readonly codigoCupon = signal('');
  readonly usarCredito = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly ticketEmitido = signal<Ticket | null>(null);
  readonly procesando = signal(false);

  readonly pelicula = computed(() => this.cine.obtenerPelicula(this.peliculaId()));

  readonly funciones = computed(() => {
    const pelicula = this.pelicula();
    if (!pelicula) return [];
    return this.cine
      .funcionesDePelicula(pelicula.id)
      .map((f) => ({ funcion: f, fecha: f.proximaFecha }));
  });

  readonly funcionElegida = signal<number | null>(null);

  readonly funcion = computed(() => {
    const id = this.funcionElegida();
    if (id !== null) return this.cine.obtenerFuncion(id);
    return this.funciones()[0]?.funcion ?? null;
  });

  readonly sala = computed(() => {
    const funcion = this.funcion();
    return funcion ? (this.cine.obtenerSala(funcion.salaId) ?? null) : null;
  });

  readonly puedeComprar = computed(() => {
    const pelicula = this.pelicula();
    if (!pelicula) return { exito: false, mensaje: 'Película no encontrada.' };
    return this.cine.puedeComprarFuncion(pelicula, this.auth.emailEfectivo());
  });

  readonly bloqueoEdad = computed(() => (this.puedeComprar().exito ? '' : this.puedeComprar().mensaje));

  readonly totalButacasSala = computed(() => (this.sala() ? this.cine.totalButacas(this.sala()!.id) : 0));

  readonly productos = computed(() => this.cine.getProductos().filter((p) => p.activo));
  readonly combosDisponibles = computed(() => this.cine.combosActivos());

  readonly candyElegido = computed(() =>
    Object.entries(this.candy())
      .map(([id, cantidad]) => ({ producto: this.productoPorId(Number(id)), cantidad }))
      .filter((c): c is { producto: Producto; cantidad: number } => c.producto !== undefined && c.cantidad > 0),
  );

  readonly combosElegidos = computed(() =>
    Object.entries(this.combos())
      .map(([id, cantidad]) => ({ combo: this.comboPorId(Number(id)), cantidad }))
      .filter((c): c is { combo: ComboEspecial; cantidad: number } => c.combo !== undefined && c.cantidad > 0),
  );

  readonly cotizacion = computed(() => {
    const funcion = this.funcion();
    const sala = this.sala();
    if (!funcion || !sala) return null;

    const pelicula = this.pelicula();
    if (!pelicula) return null;

    return this.cine.calcularCotizacion({
      pelicula,
      funcion,
      sala,
      butacas: this.seleccion(),
      candy: this.candyElegido(),
      combos: this.combosElegidos(),
      cupon: this.cupon(),
      porcentajeDescuento: this.cupon()?.porcentajeDescuento ?? 0,
      creditoUtilizado: this.usarCredito() ? this.cine.creditoUsuario() : 0,
    });
  });

  readonly creditoDisponible = computed(() => this.cine.creditoUsuario());
  readonly puntosGanara = computed(() => Math.floor(this.cotizacion()?.total ?? 0));

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.peliculaId.set(Number.isFinite(id) ? id : 0);

    const pelicula = this.pelicula();
    if (!pelicula) {
      this.error.set('La película solicitada no existe.');
      return;
    }

    // El cupón de primera compra se ofrece automáticamente (mail del 01/01).
    if (this.auth.estaLogueado() && this.auth.tieneCuponPrimeraCompra) {
      this.aplicarCupon(this.cuponBienvenida, true);
    }
  }

  private productoPorId(id: number): Producto | undefined {
    return this.cine.getProductos().find((p) => p.id === id);
  }

  private comboPorId(id: number): ComboEspecial | undefined {
    return this.cine.getCombos().find((c) => c.id === id);
  }

  formatear(monto: number): string {
    return formatearMoneda(monto);
  }

  fechaLegible(iso: string): string {
    return formatearFechaHora(iso);
  }

  /** Precio de la butaca considerando preventa (mail del 08/03). */
  precioButaca(fila: string, numero: number): number {
    const funcion = this.funcion();
    const sala = this.sala();
    if (!funcion || !sala) return 0;
    const base = this.cine.precioButaca(funcion, sala, { id: `${fila}-${numero}`, fila, numero });
    const vigente = this.cine.precioVigente(funcion);
    return vigente.enPreventa ? Math.max(0, vigente.precio + (base - funcion.precio)) : base;
  }

  cambiarFuncion(id: number): void {
    this.funcionElegida.set(id);
    this.seleccion.set([]);
  }

  irAlSiguientePaso(): void {
    this.error.set('');
    if (this.paso() === 'butacas') {
      if (!this.puedeComprar().exito) {
        this.error.set(this.puedeComprar().mensaje);
        return;
      }
      if (this.seleccion().length === 0) {
        this.error.set('Elegí al menos una butaca.');
        return;
      }
      this.paso.set('candy');
      return;
    }
    this.paso.set('confirmar');
  }

  volverAlPaso(paso: Paso): void {
    this.error.set('');
    this.paso.set(paso);
  }

  ajustarCandy(productoId: number, delta: number): void {
    const actual = this.candy()[productoId] ?? 0;
    const siguiente = Math.max(0, Math.min(10, actual + delta));
    this.candy.update((mapa) => ({ ...mapa, [productoId]: siguiente }));
  }

  ajustarCombo(comboId: number, delta: number): void {
    const actual = this.combos()[comboId] ?? 0;
    const siguiente = Math.max(0, Math.min(5, actual + delta));
    this.combos.update((mapa) => ({ ...mapa, [comboId]: siguiente }));
  }

  cantidadCandy(productoId: number): number {
    return this.candy()[productoId] ?? 0;
  }

  cantidadCombo(comboId: number): number {
    return this.combos()[comboId] ?? 0;
  }

  /** Aplica el cupón de primera compra o el que el usuario teclea. */
  aplicarCupon(codigo: string, silencioso = false): void {
    const cotizacion = this.cotizacion();
    const subtotal = cotizacion?.subtotal ?? 0;

    if (codigo === this.cuponBienvenida) {
      if (!this.auth.estaLogueado() || !this.auth.tieneCuponPrimeraCompra) {
        if (!silencioso) this.error.set('Ese cupón ya fue usado o no te corresponde.');
        return;
      }
      const encontrado = this.cine.getCupones().find((c) => c.codigo === this.cuponBienvenida);
      if (!encontrado) {
        if (!silencioso) this.error.set('El cupón de primera compra no está disponible.');
        return;
      }
      this.cupon.set(encontrado);
      this.mensaje.set('Cupón de primera compra aplicado: 20% de descuento.');
      return;
    }

    const resultado = this.cine.validarCupon(codigo, subtotal);
    if (!resultado.exito) {
      this.cupon.set(null);
      if (!silencioso) this.error.set(resultado.mensaje);
      return;
    }
    this.cupon.set(resultado.cupon ?? null);
    this.mensaje.set(resultado.mensaje);
  }

  quitarCupon(): void {
    this.cupon.set(null);
    this.codigoCupon.set('');
    this.mensaje.set('');
  }

  async confirmar(): Promise<void> {
    const funcion = this.funcion();
    const sala = this.sala();
    const pelicula = this.pelicula();
    if (!funcion || !sala || !pelicula) return;

    this.error.set('');
    this.mensaje.set('');
    this.procesando.set(true);

    const resultado = await this.cine.finalizarCompra({
      pelicula,
      funcion,
      sala,
      butacas: this.seleccion(),
      candy: this.candyElegido(),
      combos: this.combosElegidos(),
      cupon: this.cupon(),
      porcentajeDescuento: this.cupon()?.porcentajeDescuento ?? 0,
      creditoUtilizado: this.usarCredito() ? this.creditoDisponible() : 0,
      usuarioEmail: this.auth.emailEfectivo(),
      creadoPorCanje: false,
    });

    this.procesando.set(false);

    if (!resultado.exito || !resultado.ticket) {
      this.error.set(resultado.mensaje);
      return;
    }

    this.ticketEmitido.set(resultado.ticket);
    this.mensaje.set(resultado.mensaje);
  }

  esAnonima(): boolean {
    return this.auth.emailEfectivo() === USUARIO_ANONIMO;
  }

  requiereAcompanante(): boolean {
    const pelicula = this.pelicula();
    return pelicula ? this.cine.requiereAcompanante(pelicula) : false;
  }

  volver(): void {
    void this.router.navigate(['/home']);
  }
}