import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CineService } from '../../services/cine.service';
import { AuthService } from '../../services/auth.service';
import { DIAS_SEMANA, HORAS_POR_DEFECTO } from '../../models/funcion';
import { ConfiguracionFila } from '../../models/sala';
import { CATEGORIAS_PRODUCTO, Producto } from '../../models/producto';
import { formatearFechaHora, formatearMoneda } from '../../core/utils/fecha.util';
import { descargarCSV, descargarExcel, descargarPDF, Fila } from '../../core/utils/exportar';

type SeccionAdmin = 'peliculas' | 'funciones' | 'salas' | 'productos' | 'cupones' | 'combos' | 'reportes' | 'logs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin.html',
})
export class AdminComponent {
  readonly cine = inject(CineService);
  readonly auth = inject(AuthService);

  readonly secciones: { id: SeccionAdmin; etiqueta: string }[] = [
    { id: 'peliculas', etiqueta: 'Películas' },
    { id: 'funciones', etiqueta: 'Funciones' },
    { id: 'salas', etiqueta: 'Salas y butacas' },
    { id: 'productos', etiqueta: 'Candy bar' },
    { id: 'cupones', etiqueta: 'Cupones' },
    { id: 'combos', etiqueta: 'Combos' },
    { id: 'reportes', etiqueta: 'Reportes' },
    { id: 'logs', etiqueta: 'Bitácora' },
  ];

  readonly seccion = signal<SeccionAdmin>('peliculas');
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly exportando = signal(false);

  readonly diasSemana = DIAS_SEMANA;
  readonly horasPorDefecto = HORAS_POR_DEFECTO;
  readonly categorias = CATEGORIAS_PRODUCTO;

  formatear(monto: number): string {
    return formatearMoneda(monto);
  }

  /** El `<select>` devuelve string: lo convertimos a la unión válida. */
  aClasificacion(valor: number | string): 0 | 13 | 18 {
    const numero = Number(valor);
    return numero === 13 || numero === 18 ? numero : 0;
  }

  aFormato(valor: string): '2D' | '3D' | '4D' | '5D' {
    return valor === '3D' || valor === '4D' || valor === '5D' ? valor : '2D';
  }

  aIdioma(valor: string): 'Castellano' | 'Subtitulada' {
    return valor === 'Subtitulada' ? 'Subtitulada' : 'Castellano';
  }

  aCategoria(valor: string): Producto['categoria'] {
    return (CATEGORIAS_PRODUCTO as string[]).includes(valor) ? (valor as Producto['categoria']) : 'Pochoclos';
  }

  fecha(iso: string): string {
    return formatearFechaHora(iso);
  }

  avisar(exito: boolean, texto: string): void {
    this.error.set(exito ? '' : texto);
    this.mensaje.set(exito ? texto : '');
  }

  // --------------------------------------------------------------- películas

  readonly peliculas = this.cine.getPeliculas;

  readonly nuevaPelicula = signal({
    nombre: '',
    sinopsis: '',
    duracionMinutos: 120,
    imagenUrl: '',
    generos: '',
    formato: '2D' as '2D' | '3D' | '4D' | '5D',
    idioma: 'Castellano' as 'Castellano' | 'Subtitulada',
    clasificacionEdad: 0 as 0 | 13 | 18,
  });

  readonly peliculaEditando = signal<number | null>(null);
  readonly edicionPelicula = signal({ ...this.nuevaPelicula() });

  crearPelicula(): void {
    const datos = this.nuevaPelicula();
    if (!datos.nombre.trim()) {
      this.avisar(false, 'El nombre de la película es obligatorio.');
      return;
    }

    const resultado = this.cine.crearPelicula({
      nombre: datos.nombre.trim(),
      sinopsis: datos.sinopsis.trim() || 'Sin sinopsis cargada.',
      duracionMinutos: Math.max(1, Number(datos.duracionMinutos) || 120),
      imagenUrl: datos.imagenUrl.trim() || this.cine.peliculasEnCartelera()[0]?.imagenUrl || '',
      generos: datos.generos
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      formato: datos.formato,
      idioma: datos.idioma,
      clasificacionEdad: datos.clasificacionEdad,
      visibleEnCartelera: true,
      esProximamente: false,
    });

    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.nuevaPelicula.set({ ...this.nuevaPelicula(), nombre: '', sinopsis: '', generos: '' });
  }

  editarPelicula(peliculaId: number): void {
    const pelicula = this.cine.obtenerPelicula(peliculaId);
    if (!pelicula) return;
    this.peliculaEditando.set(peliculaId);
    this.edicionPelicula.set({
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis,
      duracionMinutos: pelicula.duracionMinutos,
      imagenUrl: pelicula.imagenUrl,
      generos: pelicula.generos.join(', '),
      formato: pelicula.formato,
      idioma: pelicula.idioma,
      clasificacionEdad: pelicula.clasificacionEdad,
    });
  }

  guardarPelicula(): void {
    const id = this.peliculaEditando();
    if (id === null) return;
    const datos = this.edicionPelicula();

    const resultado = this.cine.actualizarPelicula(id, {
      nombre: datos.nombre.trim(),
      sinopsis: datos.sinopsis.trim(),
      duracionMinutos: Math.max(1, Number(datos.duracionMinutos) || 120),
      imagenUrl: datos.imagenUrl.trim(),
      generos: datos.generos
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      formato: datos.formato,
      idioma: datos.idioma,
      clasificacionEdad: datos.clasificacionEdad,
    });

    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.peliculaEditando.set(null);
  }

  cancelarEdicionPelicula(): void {
    this.peliculaEditando.set(null);
  }

  eliminarPelicula(peliculaId: number): void {
    const resultado = this.cine.eliminarPelicula(peliculaId);
    this.avisar(resultado.exito, resultado.mensaje);
  }

  // ------------------------------------------------------------ preventa

  readonly preventaPelicula = signal<number | null>(null);
  readonly preventaForm = signal({ precio: 4000, diasAnticipacion: 7, fechaEstreno: '', activa: true });

  abrirPreventa(peliculaId: number): void {
    const pelicula = this.cine.obtenerPelicula(peliculaId);
    if (!pelicula) return;
    this.preventaPelicula.set(peliculaId);
    this.preventaForm.set({
      precio: pelicula.preventa?.precio ?? Math.round(pelicula.ventasTotales > 0 ? 4000 : 3500),
      diasAnticipacion: pelicula.preventa?.diasAnticipacion ?? 7,
      fechaEstreno: pelicula.fechaEstreno ?? pelicula.preventa?.fechaEstreno ?? '',
      activa: pelicula.preventa?.activa ?? true,
    });
  }

  guardarPreventa(): void {
    const id = this.preventaPelicula();
    if (id === null) return;
    const datos = this.preventaForm();
    const resultado = this.cine.configurarPreventa(
      id,
      Number(datos.precio),
      Number(datos.diasAnticipacion),
      datos.fechaEstreno,
      datos.activa,
    );
    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.preventaPelicula.set(null);
  }

  estadoPreventa(peliculaId: number): string {
    const preventa = this.cine.preventaDe(peliculaId);
    if (!preventa) return 'Sin preventa';
    if (preventa.abierta) return 'Preventa abierta';
    return `Abre el ${preventa.abreEl.toLocaleDateString('es-AR')}`;
  }

  // ------------------------------------------------------------ funciones

  readonly funciones = this.cine.getFunciones;
  readonly salas = this.cine.getSalas;

  readonly nuevaFuncion = signal({
    peliculaId: 0,
    salaId: 1,
    dias: ['Lunes'] as string[],
    horaInicio: '14:00',
    precio: 4000,
  });

  crearFuncion(): void {
    const datos = this.nuevaFuncion();
    if (!datos.peliculaId) {
      this.avisar(false, 'Elegí una película.');
      return;
    }
    if (diasVacias(datos.dias)) {
      this.avisar(false, 'Elegí al menos un día.');
      return;
    }

    void this.cine.crearFuncionAutomatica({
      peliculaId: Number(datos.peliculaId),
      salaId: Number(datos.salaId),
      dias: datos.dias,
      horaInicio: datos.horaInicio,
      precio: Number(datos.precio),
    }).then((resultado) => this.avisar(resultado.exito, resultado.mensaje));
  }

  alternarDia(dia: string): void {
    this.nuevaFuncion.update((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia],
    }));
  }

  actualizarPrecioFuncion(id: number, precio: number): void {
    void this.cine.actualizarFuncion(id, { precio: Number(precio) }).then((r) => this.avisar(r.exito, r.mensaje));
  }

  eliminarFuncion(id: number): void {
    void this.cine.eliminarFuncion(id).then((r) => this.avisar(r.exito, r.mensaje));
  }

  // ---------------------------------------------------------------- salas

  readonly salaEditando = signal<number | null>(null);
  readonly filasEditadas = signal<ConfiguracionFila[]>([]);
  readonly nombreSala = signal('');

  editarSala(salaId: number): void {
    const sala = this.cine.obtenerSala(salaId);
    if (!sala) return;
    this.salaEditando.set(salaId);
    this.nombreSala.set(sala.nombre);
    this.filasEditadas.set(sala.filas.map((f) => ({ ...f, bloques: [...f.bloques] as [number, number, number] })));
  }

  guardarSala(): void {
    const id = this.salaEditando();
    if (id === null) return;
    const resultado = this.cine.actualizarDistribucionSala(id, this.filasEditadas());
    if (!resultado.exito) {
      this.avisar(false, resultado.mensaje);
      return;
    }
    const renombre = this.cine.actualizarSala(id, { nombre: this.nombreSala().trim() || 'Sala' });
    this.avisar(renombre.exito, renombre.mensaje);
    this.salaEditando.set(null);
  }

  ajustarBloque(indiceFila: number, indiceBloque: number, delta: number): void {
    this.filasEditadas.update((filas) =>
      filas.map((fila, i) => {
        if (i !== indiceFila) return fila;
        const bloques = [...fila.bloques] as [number, number, number];
        bloques[indiceBloque] = Math.max(0, Math.min(30, bloques[indiceBloque] + delta));
        return { ...fila, bloques };
      }),
    );
  }

  alternarTipoFila(indiceFila: number): void {
    this.filasEditadas.update((filas) =>
      filas.map((fila, i) => (i === indiceFila ? { ...fila, tipo: fila.tipo === 'adaptada' ? 'normal' : 'adaptada' } : fila)),
    );
  }

  crearSala(): void {
    const nombre = this.nombreSala().trim() || `Sala ${this.salas().length + 1}`;
    const resultado = this.cine.crearSala(nombre);
    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.nombreSala.set('');
  }

  eliminarSala(salaId: number): void {
    const resultado = this.cine.eliminarSala(salaId);
    this.avisar(resultado.exito, resultado.mensaje);
  }

  totalButacas(salaId: number): number {
    return this.cine.totalButacas(salaId);
  }

  // ------------------------------------------------------------ productos

  readonly productos = this.cine.getProductos;

  readonly nuevoProducto = signal({
    nombre: '',
    precio: 2000,
    categoria: 'Pochoclos' as Producto['categoria'],
    imagenUrl: '',
  });

  crearProducto(): void {
    const datos = this.nuevoProducto();
    const resultado = this.cine.crearProducto({
      nombre: datos.nombre.trim(),
      precio: Number(datos.precio),
      categoria: datos.categoria,
      imagenUrl: datos.imagenUrl.trim(),
    });
    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.nuevoProducto.set({ ...this.nuevoProducto(), nombre: '', imagenUrl: '' });
  }

  alternarProducto(id: number): void {
    const producto = this.productos().find((p) => p.id === id);
    if (!producto) return;
    this.cine.actualizarProducto(id, { activo: !producto.activo });
  }

  eliminarProducto(id: number): void {
    const resultado = this.cine.eliminarProducto(id);
    this.avisar(resultado.exito, resultado.mensaje);
  }

  // -------------------------------------------------------------- cupones

  readonly cupones = this.cine.getCupones;
  readonly cuponBienvenida = this.cine.cuponBienvenida();

  readonly nuevoCupon = signal({
    codigo: '',
    porcentajeDescuento: 10,
    soloMayores50: false,
    soloPrimeraCompra: false,
    descripcion: '',
    usosMaximos: 0,
  });

  crearCupon(): void {
    const datos = this.nuevoCupon();
    const resultado = this.cine.crearCupon({
      codigo: datos.codigo.trim().toUpperCase(),
      porcentajeDescuento: Number(datos.porcentajeDescuento),
      soloMayores50: datos.soloMayores50,
      soloPrimeraCompra: datos.soloPrimeraCompra,
      activo: true,
      descripcion: datos.descripcion.trim(),
      usosMaximos: Number(datos.usosMaximos),
    });
    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.nuevoCupon.set({ ...this.nuevoCupon(), codigo: '', descripcion: '' });
  }

  cambiarPorcentajeCuponesBienvenida(valor: number): void {
    const cupon = this.cuponBienvenida;
    if (!cupon) return;
    const resultado = this.cine.actualizarCupon(cupon.id, { porcentajeDescuento: Number(valor) });
    this.avisar(resultado.exito, resultado.mensaje);
  }

  eliminarCupon(id: number): void {
    const resultado = this.cine.eliminarCupon(id);
    this.avisar(resultado.exito, resultado.mensaje);
  }

  // --------------------------------------------------------------- combos

  readonly combos = this.cine.getCombos;

  readonly nuevoCombo = signal({
    nombre: '',
    descripcion: '',
    precio: 12000,
    entradas: 1,
    productoIds: [] as number[],
  });

  crearCombo(): void {
    const datos = this.nuevoCombo();
    const resultado = this.cine.crearCombo({
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion.trim(),
      precio: Number(datos.precio),
      entradas: Number(datos.entradas),
      productos: datos.productoIds.map((id) => ({ productoId: id, cantidad: 1 })),
    });
    this.avisar(resultado.exito, resultado.mensaje);
    if (resultado.exito) this.nuevoCombo.set({ ...this.nuevoCombo(), nombre: '', descripcion: '', productoIds: [] });
  }

  alternarProductoEnCombo(productoId: number): void {
    this.nuevoCombo.update((c) => ({
      ...c,
      productoIds: c.productoIds.includes(productoId)
        ? c.productoIds.filter((id) => id !== productoId)
        : [...c.productoIds, productoId],
    }));
  }

  eliminarCombo(id: number): void {
    const resultado = this.cine.eliminarCombo(id);
    this.avisar(resultado.exito, resultado.mensaje);
  }

  // ------------------------------------------------------------- reportes

  readonly reporteDiario = this.cine.reporteFacturacionDiaria;
  readonly reporteMensual = this.cine.reporteMensual;
  readonly topSemana = this.cine.peliculasMasVistasSemana;
  readonly topMes = this.cine.peliculasMasVistasMes;
  readonly candyMasVendido = this.cine.productoCandyMasVendido;
  readonly ocupacion = this.cine.ocupacionPorSala;
  readonly totalFacturado = this.cine.totalFacturado;
  readonly totalEntradas = this.cine.totalEntradasVendidas;

  readonly maximoFacturado = computed(() =>
    Math.max(1, ...this.reporteDiario().map((f) => f.totalFacturado)),
  );
  readonly maximoMensual = computed(() =>
    Math.max(1, ...this.reporteMensual().map((f) => f.totalFacturado)),
  );
  readonly maximoOcupacion = computed(() => Math.max(1, ...this.ocupacion().map((o) => o.cantidad)));

  exportarFacturacion(): void {
    descargarCSV('facturacion-diaria.csv', this.filasFacturacionDiaria());
    this.avisar(true, 'Reporte de facturación descargado.');
  }

  exportarMensual(): void {
    descargarCSV('facturacion-mensual.csv', this.filasFacturacionMensual());
    this.avisar(true, 'Reporte mensual descargado.');
  }

  exportarOcupacion(): void {
    descargarCSV('ocupacion-salas.csv', this.filasOcupacion());
    this.avisar(true, 'Reporte de ocupación descargado.');
  }

  // ------------------------------------------------------- PDF y Excel (lazy)

  async exportarFacturacionPDF(): Promise<void> {
    await this.descargando(
      descargarPDF('facturacion-diaria.pdf', {
        titulo: 'Facturación diaria',
        subtitulo: `Generado el ${new Date().toLocaleString('es-AR')}`,
        columnas: ['Fecha', 'Entradas vendidas', 'Total facturado'],
        filas: this.reporteDiario().map((f) => [f.fecha, f.entradasVendidas, this.formatear(f.totalFacturado)]),
        resumen: [
          { etiqueta: 'Total facturado', valor: this.formatear(this.totalFacturado()) },
          { etiqueta: 'Entradas vendidas', valor: String(this.totalEntradas()) },
        ],
      }),
      'Reporte de facturación descargado en PDF.',
    );
  }

  async exportarFacturacionExcel(): Promise<void> {
    await this.descargando(
      descargarExcel('facturacion-diaria.xlsx', [{ nombre: 'Diaria', filas: this.filasFacturacionDiaria() }]),
      'Reporte de facturación descargado en Excel.',
    );
  }

  async exportarMensualPDF(): Promise<void> {
    await this.descargando(
      descargarPDF('facturacion-mensual.pdf', {
        titulo: 'Facturación mensual',
        orientacion: 'l',
        columnas: ['Mes', 'Entradas vendidas', 'Total facturado'],
        filas: this.reporteMensual().map((f) => [f.fecha, f.entradasVendidas, this.formatear(f.totalFacturado)]),
      }),
      'Reporte mensual descargado en PDF.',
    );
  }

  async exportarMensualExcel(): Promise<void> {
    await this.descargando(
      descargarExcel('facturacion-mensual.xlsx', [{ nombre: 'Mensual', filas: this.filasFacturacionMensual() }]),
      'Reporte mensual descargado en Excel.',
    );
  }

  async exportarOcupacionPDF(): Promise<void> {
    await this.descargando(
      descargarPDF('ocupacion-salas.pdf', {
        titulo: 'Ocupación por sala',
        columnas: ['Sala', 'Butacas ocupadas'],
        filas: this.ocupacion().map((o) => [o.etiqueta, o.cantidad]),
      }),
      'Reporte de ocupación descargado en PDF.',
    );
  }

  async exportarOcupacionExcel(): Promise<void> {
    await this.descargando(
      descargarExcel('ocupacion-salas.xlsx', [{ nombre: 'Ocupación', filas: this.filasOcupacion() }]),
      'Reporte de ocupación descargado en Excel.',
    );
  }

  /** Muestra el resultado de la descarga o el error si falló. */
  private async descargando(pendiente: Promise<void>, exito: string): Promise<void> {
    this.exportando.set(true);
    try {
      await pendiente;
      this.avisar(true, exito);
    } catch (error) {
      this.avisar(false, `No se pudo generar el archivo: ${String(error)}`);
    } finally {
      this.exportando.set(false);
    }
  }

  private filasFacturacionDiaria(): Fila[] {
    return [
      ['Fecha', 'Entradas vendidas', 'Total facturado'],
      ...this.reporteDiario().map((f) => [f.fecha, f.entradasVendidas, this.formatear(f.totalFacturado)]),
    ];
  }

  private filasFacturacionMensual(): Fila[] {
    return [
      ['Mes', 'Entradas vendidas', 'Total facturado'],
      ...this.reporteMensual().map((f) => [f.fecha, f.entradasVendidas, this.formatear(f.totalFacturado)]),
    ];
  }

  private filasOcupacion(): Fila[] {
    return [
      ['Sala', 'Butacas ocupadas'],
      ...this.ocupacion().map((o) => [o.etiqueta, o.cantidad]),
    ];
  }

  // ----------------------------------------------------------------- logs

  readonly logs = this.cine.getLogs;

  limpiarLogs(): void {
    this.cine.limpiarLogs();
    this.avisar(true, 'Bitácora vaciada.');
  }
}

function diasVacias(dias: string[]): boolean {
  return dias.length === 0;
}