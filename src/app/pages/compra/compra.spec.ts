import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CompraComponent } from './compra';
import { CineService } from '../../services/cine.service';
import { Pelicula } from '../../models/pelicula';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../testing/supabase.stub';

describe('CompraComponent', () => {
  let fixture: ComponentFixture<CompraComponent>;
  let componente: CompraComponent;
  let cine: CineService;
  let idRuta: number;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [CompraComponent],
      providers: [
        provideRouter([]),
        provideSupabaseStub(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { get paramMap() { return { get: () => String(idRuta) }; } } },
        },
      ],
    }).compileComponents();

    cine = TestBed.inject(CineService);
  });

  function montar(pelicula: Pelicula): void {
    idRuta = pelicula.id;
    fixture = TestBed.createComponent(CompraComponent);
    componente = fixture.componentInstance;
  }

  const libre = () => cine.peliculasEnCartelera().find((p) => p.clasificacionEdad === 0)!;
  const restringida = () => cine.getPeliculas().find((p) => p.clasificacionEdad === 18)!;

  it('se crea con la película de la ruta', async () => {
    montar(libre());
    await fixture.whenStable();

    expect(componente).toBeTruthy();
    expect(componente.pelicula()?.id).toBe(libre().id);
    expect(componente.error()).toBe('');
  });

  it('avisa si la película de la ruta no existe', async () => {
    montar({ ...libre(), id: 9999 });
    await fixture.whenStable();

    expect(componente.pelicula()).toBeUndefined();
    expect(componente.error()).toContain('no existe');
  });

  it('exige sesión para comprar una película +18', async () => {
    montar(restringida());
    await fixture.whenStable();

    expect(componente.puedeComprar().exito).toBe(false);
    expect(componente.bloqueoEdad()).toContain('18');
  });

  it('no deja avanzar sin elegir butacas', async () => {
    montar(libre());
    await fixture.whenStable();

    componente.seleccion.set([]);
    componente.irAlSiguientePaso();

    expect(componente.paso()).toBe('butacas');
    expect(componente.error()).toContain('al menos una butaca');
  });

  it('avanza a candy con butacas elegidas', async () => {
    montar(libre());
    await fixture.whenStable();

    componente.seleccion.set([{ id: 'A-1', fila: 'A', numero: 1 }]);
    componente.irAlSiguientePaso();
    expect(componente.paso()).toBe('candy');

    componente.irAlSiguientePaso();
    expect(componente.paso()).toBe('confirmar');

    componente.volverAlPaso('butacas');
    expect(componente.paso()).toBe('butacas');
  });

  it('suma el recargo VIP al total', async () => {
    montar(libre());
    await fixture.whenStable();

    const funcion = componente.funcion()!;
    const sala = componente.sala()!;
    const vip = cine.precioButaca(funcion, sala, { id: 'R-1', fila: 'R', numero: 1 });
    const normal = cine.precioButaca(funcion, sala, { id: 'A-1', fila: 'A', numero: 1 });

    componente.seleccion.set([
      { id: 'A-1', fila: 'A', numero: 1 },
      { id: 'R-1', fila: 'R', numero: 1 },
    ]);
    componente.irAlSiguientePaso();
    componente.irAlSiguientePaso();

    expect(componente.paso()).toBe('confirmar');
    expect(componente.cotizacion()?.cantidadButacas).toBe(2);
    expect(componente.cotizacion()?.subtotalButacas).toBe(normal + vip);
    expect(componente.cotizacion()?.incluyeVip).toBe(true);
    expect(componente.cotizacion()?.total).toBe(normal + vip);
  });

  it('rechaza el cupón de primera compra sin sesión y lo acepta con una', async () => {
    montar(libre());
    await fixture.whenStable();

    componente.aplicarCupon(componente.cuponBienvenida);
    expect(componente.cupon()).toBeNull();
    expect(componente.error()).toContain('no te corresponde');

    componente.auth.registrar({
      email: 'comprador@test.com',
      nombre: 'Com',
      apellido: 'Prador',
      fechaNacimiento: '1990-05-05',
      tipoSangre: 'O+',
      colorOjos: 'Castaño',
      diasVacaciones: 8,
    });
    componente.aplicarCupon(componente.cuponBienvenida);

    expect(componente.cupon()?.codigo).toBe(componente.cuponBienvenida);
    expect(componente.mensaje()).toContain('20%');
  });

  it('quita el cupón aplicado', async () => {
    montar(libre());
    await fixture.whenStable();

    componente.auth.registrar({
      email: 'otro@test.com',
      nombre: 'Ot',
      apellido: 'Ro',
      fechaNacimiento: '1991-01-01',
      tipoSangre: 'A+',
      colorOjos: 'Azul',
      diasVacaciones: 3,
    });
    componente.aplicarCupon(componente.cuponBienvenida);
    componente.quitarCupon();

    expect(componente.cupon()).toBeNull();
    expect(componente.mensaje()).toBe('');
  });

  it('acota el candy y los combos a valores válidos', async () => {
    montar(libre());
    await fixture.whenStable();

    const producto = componente.productos()[0];
    componente.ajustarCandy(producto.id, 2);
    expect(componente.cantidadCandy(producto.id)).toBe(2);

    componente.ajustarCandy(producto.id, -5);
    expect(componente.cantidadCandy(producto.id)).toBe(0);

    componente.ajustarCandy(producto.id, 99);
    expect(componente.cantidadCandy(producto.id)).toBe(10);
  });

  it('confirma la compra y emite el ticket con QR', async () => {
    montar(libre());
    await fixture.whenStable();

    componente.seleccion.set([{ id: 'B-3', fila: 'B', numero: 3 }]);
    componente.irAlSiguientePaso();
    componente.irAlSiguientePaso();
    await componente.confirmar();

    expect(componente.error()).toBe('');
    expect(componente.ticketEmitido()?.codigoQr).toMatch(/^CINE-/);
    expect(cine.butacasBloqueadas(componente.funcion()!.id)).toContain('B-3');
    expect(componente.procesando()).toBe(false);
  });

  it('limpia la selección al cambiar de función', async () => {
    montar(libre());
    await fixture.whenStable();

    componente.seleccion.set([{ id: 'A-1', fila: 'A', numero: 1 }]);
    const otra = componente.funciones()[1]?.funcion;
    if (otra) {
      componente.cambiarFuncion(otra.id);
      expect(componente.seleccion()).toHaveLength(0);
      expect(componente.funcion()?.id).toBe(otra.id);
    }
  });
});