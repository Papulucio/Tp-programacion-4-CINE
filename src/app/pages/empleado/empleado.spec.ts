import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { EmpleadoComponent } from './empleado';
import { CineService } from '../../services/cine.service';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../testing/supabase.stub';

describe('EmpleadoComponent', () => {
  let fixture: ComponentFixture<EmpleadoComponent>;
  let componente: EmpleadoComponent;
  let cine: CineService;

  async function comprar(): Promise<string> {
    const funcion = cine.getFunciones().find(
      (f) => cine.puedeComprarFuncion(cine.obtenerPelicula(f.peliculaId)!, 'cliente@cine.com').exito,
    )!;
    const sala = cine.obtenerSala(funcion.salaId)!;
    const compra = await cine.finalizarCompra({
      pelicula: cine.obtenerPelicula(funcion.peliculaId)!,
      funcion,
      sala,
      butacas: [{ id: 'H-2', fila: 'H', numero: 2 }],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
      usuarioEmail: 'cliente@cine.com',
      creadoPorCanje: false,
    });
    return compra.ticket!.codigoQr;
  }

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [EmpleadoComponent],
      providers: [provideRouter([]), provideSupabaseStub()],
    }).compileComponents();

    cine = TestBed.inject(CineService);
    fixture = TestBed.createComponent(EmpleadoComponent);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('rechaza el código vacío', () => {
    componente.validar('   ');

    expect(componente.resultado()?.exito).toBe(false);
    expect(componente.resultado()?.mensaje).toContain('código');
  });

  it('valida un QR de entrada una sola vez', async () => {
    const codigo = await comprar();

    componente.validar(codigo);
    expect(componente.resultado()?.exito).toBe(true);
    expect(componente.resultado()?.ticket?.validadoEntrada).toBe(true);

    componente.validar(codigo);
    expect(componente.resultado()?.exito).toBe(false);
    expect(componente.resultado()?.mensaje).toContain('ya fue utilizado');
  });

  it('informa un QR inexistente', () => {
    componente.validar('CINE-123456-FAKE');

    expect(componente.resultado()?.exito).toBe(false);
    expect(componente.resultado()?.mensaje).toContain('no encontrado');
  });

  it('limpia el campo tras validar y guarda el historial', async () => {
    const codigo = await comprar();
    componente.codigo.set(codigo);

    componente.validar();

    expect(componente.codigo()).toBe('');
    expect(componente.historial()).toHaveLength(1);
    expect(componente.historial()[0].exito).toBe(true);
  });

  it('cambia el tipo de validación y borra el resultado', async () => {
    const codigo = await comprar();
    componente.validar(codigo);
    expect(componente.resultado()).not.toBeNull();

    componente.cambiarTipo('candy');

    expect(componente.tipo()).toBe('candy');
    expect(componente.resultado()).toBeNull();
  });

  it('cuenta los tickets activos pendientes', async () => {
    expect(componente.ticketsActivos()).toBe(0);
    await comprar();
    expect(componente.ticketsActivos()).toBe(1);
  });

  it('informa cuando el navegador no soporta BarcodeDetector', async () => {
    await componente.encenderCamara();

    expect(componente.camaraActiva()).toBe(false);
    expect(componente.errorCamara()).toContain('Usá el ingreso manual');
  });

  it('apagar la cámara no rompe el componente', () => {
    componente.apagarCamara();
    expect(componente.camaraActiva()).toBe(false);
  });
});