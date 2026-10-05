import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AdminComponent } from './admin';
import { CineService } from '../../services/cine.service';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../testing/supabase.stub';

/** Los servicios de Supabase devuelven promesas: hay que dejarlas resolver. */
function esperarPromesas(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let componente: AdminComponent;
  let cine: CineService;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideRouter([]), provideSupabaseStub()],
    }).compileComponents();

    cine = TestBed.inject(CineService);
    fixture = TestBed.createComponent(AdminComponent);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('arranca en la sección de películas', () => {
    expect(componente.seccion()).toBe('peliculas');
    expect(componente.peliculas().length).toBeGreaterThan(0);
  });

  it('crea una película', () => {
    const antes = cine.getPeliculas().length;
    componente.nuevaPelicula.update((p) => ({ ...p, nombre: 'Sala Sin Nombre', tituloOriginal: 'Sala Sin Nombre' }));
    componente.crearPelicula();

    expect(componente.error()).toBe('');
    expect(cine.getPeliculas().length).toBe(antes + 1);
    expect(cine.getPeliculas().some((p) => p.nombre === 'Sala Sin Nombre')).toBe(true);
  });

  it('no crea una película sin nombre', () => {
    const antes = cine.getPeliculas().length;
    componente.nuevaPelicula.update((p) => ({ ...p, nombre: '', tituloOriginal: '' }));
    componente.crearPelicula();

    expect(componente.error()).not.toBe('');
    expect(cine.getPeliculas().length).toBe(antes);
  });

  it('edita y borra una película', () => {
    const pelicula = cine.getPeliculas()[0];

    componente.editarPelicula(pelicula.id);
    expect(componente.peliculaEditando()).toBe(pelicula.id);

    componente.edicionPelicula.update((p) => ({ ...p, nombre: 'Titulo Corregido' }));
    componente.guardarPelicula();
    expect(cine.obtenerPelicula(pelicula.id)?.nombre).toBe('Titulo Corregido');

    componente.cancelarEdicionPelicula();
    expect(componente.peliculaEditando()).toBeNull();
  });

  it('no borra una película con funciones programadas', () => {
    const pelicula = cine.getPeliculas()[0];
    const total = cine.getPeliculas().length;

    componente.eliminarPelicula(pelicula.id);

    expect(componente.error()).toContain('función');
    expect(cine.getPeliculas().length).toBe(total);
  });

  it('crea una sala con 518 butacas por defecto', () => {
    const antes = cine.getSalas().length;
    componente.nombreSala.set('Sala 5');
    componente.crearSala();

    const sala = cine.getSalas().find((s) => s.nombre === 'Sala 5');
    expect(sala).toBeDefined();
    expect(cine.totalButacas(sala!.id)).toBe(518);
    expect(cine.getSalas().length).toBe(antes + 1);
  });

  it('ajusta los bloques de una fila y recalcula el total', () => {
    const sala = cine.getSalas()[0];
    componente.editarSala(sala.id);
    const antes = componente.totalButacas(sala.id);

    componente.ajustarBloque(0, 1, -2);
    componente.guardarSala();

    expect(componente.totalButacas(sala.id)).toBe(antes - 2);
    expect(cine.totalButacas(sala.id)).toBe(antes - 2);
  });

  it('rechaza una función que se superpone con otra existente', async () => {
    const funcion = cine.getFunciones()[0];
    const total = cine.getFunciones().length;

    componente.nuevaFuncion.set({
      peliculaId: funcion.peliculaId,
      salaId: funcion.salaId,
      dias: funcion.dias,
      horaInicio: funcion.horaInicio,
      precio: 4000,
    });
    componente.crearFuncion();
    await esperarPromesas();

    expect(componente.error()).toContain('salas');
    expect(cine.getFunciones().length).toBe(total);
  });

  it('crea una función en un horario libre', async () => {
    const total = cine.getFunciones().length;
    const otra = cine.getFunciones().find((f) => f.salaId !== cine.getFunciones()[0].salaId)!;

    componente.nuevaFuncion.set({
      peliculaId: cine.getPeliculas()[1].id,
      salaId: otra.salaId,
      dias: otra.dias,
      horaInicio: '23:45',
      precio: 4500,
    });
    componente.crearFuncion();
    await esperarPromesas();

    expect(componente.error()).toBe('');
    expect(cine.getFunciones().length).toBe(total + 1);
  });

  it('cambia el precio de una función', () => {
    const funcion = cine.getFunciones()[0];
    componente.actualizarPrecioFuncion(funcion.id, 5555);

    expect(cine.obtenerFuncion(funcion.id)?.precio).toBe(5555);
  });

  it('borra una función', () => {
    const total = cine.getFunciones().length;
    componente.eliminarFuncion(cine.getFunciones()[0].id);

    expect(cine.getFunciones().length).toBe(total - 1);
  });

  it('crea productos, cupones y combos', () => {
    const productosAntes = cine.getProductos().length;
    componente.nuevoProducto.update((p) => ({ ...p, nombre: 'Combo nodes Experience' }));
    componente.crearProducto();
    expect(cine.getProductos().length).toBe(productosAntes + 1);

    const cuponesAntes = cine.getCupones().length;
    componente.nuevoCupon.update((c) => ({ ...c, codigo: 'TEST10', porcentajeDescuento: 10 }));
    componente.crearCupon();
    expect(cine.getCupones().length).toBe(cuponesAntes + 1);
    expect(cine.validarCupon('TEST10', 10000).exito).toBe(true);

    const combosAntes = cine.getCombos().length;
    componente.nuevoCombo.update((c) => ({ ...c, nombre: 'Combo Test' }));
    componente.crearCombo();
    expect(cine.getCombos().length).toBe(combosAntes + 1);
  });

  it('alterna el activo de un producto y lo borra', () => {
    const producto = cine.getProductos()[0];
    const activoOriginal = producto.activo;

    componente.alternarProducto(producto.id);
    expect(cine.getProductos().find((p) => p.id === producto.id)?.activo).toBe(!activoOriginal);

    const total = cine.getProductos().length;
    componente.eliminarProducto(producto.id);
    expect(cine.getProductos().length).toBe(total - 1);
  });

  it('guarda la preventa de una película', () => {
    const pelicula = cine.peliculasProximamente()[0] ?? cine.getPeliculas()[0];
    const estreno = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    componente.abrirPreventa(pelicula.id);
    componente.preventaForm.set({ precio: 3800, diasAnticipacion: 7, fechaEstreno: estreno, activa: true });
    componente.guardarPreventa();

    expect(componente.error()).toBe('');
    expect(cine.obtenerPelicula(pelicula.id)?.preventa?.activa).toBe(true);
    expect(componente.estadoPreventa(pelicula.id)).toContain('Preventa');
  });

  it('expone los reportes de facturación, ocupación y bitácora', () => {
    expect(Array.isArray(componente.reporteDiario())).toBe(true);
    expect(Array.isArray(componente.reporteMensual())).toBe(true);
    expect(componente.ocupacion().length).toBe(cine.getSalas().length);
    expect(componente.totalFacturado()).toBeGreaterThanOrEqual(0);
    expect(componente.totalEntradas()).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(componente.logs())).toBe(true);
  });

  it('limpia la bitácora', () => {
    cine.registrarLog('PRUEBA', 'tester', 'mensaje de prueba');
    expect(cine.getLogs().length).toBeGreaterThan(0);

    componente.limpiarLogs();
    // La propia acción de vaciar queda registrada como auditoría.
    expect(cine.getLogs().every((l) => l.accion === 'LIMPIAR_LOGS')).toBe(true);
  });

  it('exporta a CSV sin romper', () => {
    expect(() => componente.exportarFacturacion()).not.toThrow();
    expect(() => componente.exportarMensual()).not.toThrow();
    expect(() => componente.exportarOcupacion()).not.toThrow();
  });

  it('genera los PDF y los Excel sin dejar el botón bloqueado', async () => {
    await componente.exportarFacturacionPDF();
    await componente.exportarOcupacionPDF();
    await componente.exportarFacturacionExcel();
    await componente.exportarOcupacionExcel();

    expect(componente.exportando()).toBe(false);
  });

  it('convierte los valores de los formularios', () => {
    expect(componente.aClasificacion('13')).toBe(13);
    expect(componente.aClasificacion('número')).toBe(0);
    expect(componente.aFormato('4D')).toBe('4D');
    expect(componente.aIdioma('Subtitulada')).toBe('Subtitulada');
    expect(componente.aCategoria('Pochoclos')).toBe('Pochoclos');
    expect(componente.aCategoria('No existe')).toBe('Pochoclos');
  });
});