import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CineService } from './cine.service';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../testing/supabase.stub';
import { crearFilasPorDefecto, totalButacasSala } from '../models/sala';
import { Funcion, funcionesSeSolapan, rangoFuncion } from '../models/funcion';
import { horasHasta, proximaFechaFuncion } from '../core/utils/fecha.util';
import { USUARIO_ANONIMO } from '../models/ticket';

function crearServicio(): CineService {
  TestBed.resetTestingModule();
  limpiarAlmacenamiento();
  TestBed.configureTestingModule({ providers: [provideSupabaseStub()] });
  return TestBed.inject(CineService);
}

/**
 * Función de una película sin restricción etaria: así el anónimo puede comprar
 * sin tener que abrir sesión.
 */
function funcionLibre(cine: CineService): Funcion {
  return cine
    .getFunciones()
    .find((f) => cine.puedeComprarFuncion(cine.obtenerPelicula(f.peliculaId)!, USUARIO_ANONIMO).exito)!;
}

/** Función cuya próxima sesión empieza en más de 2 h (regla de cancelación). */
function funcionCancelable(cine: CineService): Funcion {
  return cine
    .getFunciones()
    .find((f) => horasHasta(new Date(proximaFechaFuncion(f.dias, f.horaInicio).toISOString()).toISOString()) > 3)!;
}

describe('modelo de sala', () => {
  it('deja 19 filas: J pasa a adaptada y K desaparece', () => {
    const filas = crearFilasPorDefecto();
    const letras = filas.map((f) => f.letra);

    expect(filas).toHaveLength(19);
    expect(letras).not.toContain('K');
    expect(letras).toContain('J');
    expect(filas.find((f) => f.letra === 'J')?.tipo).toBe('adaptada');
  });

  it('suma 518 butacas por sala', () => {
    // 18 filas normales de 28 + 1 fila adaptada de 14.
    expect(totalButacasSala(crearFilasPorDefecto())).toBe(18 * 28 + 14);
    expect(totalButacasSala(crearFilasPorDefecto())).toBe(518);
  });

  it('marca R, S y T como VIP con recargo', () => {
    const filas = crearFilasPorDefecto();
    const vip = filas.filter((f) => f.recargo > 0).map((f) => f.letra);
    expect(vip).toEqual(['R', 'S', 'T']);
  });
});

describe('solapamiento de funciones', () => {
  it('respeta los 30 minutos de sanitización', () => {
    // 14:00 + 120 min de película = 16:00, más 30 min => 16:30.
    expect(funcionesSeSolapan(
      { dias: ['Lunes'], horaInicio: '14:00', horaFin: '16:30' },
      { dias: ['Lunes'], horaInicio: '16:30', horaFin: '18:30' },
    )).toBe(false);

    expect(funcionesSeSolapan(
      { dias: ['Lunes'], horaInicio: '14:00', horaFin: '16:30' },
      { dias: ['Lunes'], horaInicio: '16:29', horaFin: '18:29' },
    )).toBe(true);
  });

  it('no se solapa si los días no coinciden', () => {
    expect(funcionesSeSolapan(
      { dias: ['Lunes'], horaInicio: '14:00', horaFin: '16:30' },
      { dias: ['Martes'], horaInicio: '14:00', horaFin: '16:30' },
    )).toBe(false);
  });

  it('desarma el cruce de medianoche', () => {
    const rango = rangoFuncion('23:30', '01:00');
    expect(rango.hasta - rango.desde).toBe(90);
  });
});

describe('CineService', () => {
  it('se crea con datos de semilla', () => {
    const cine = crearServicio();
    expect(cine.getPeliculas().length).toBeGreaterThan(0);
    expect(cine.getSalas().length).toBe(4);
    expect(cine.totalButacas(1)).toBe(518);
  });

  it('bloquea la compra anónima de películas +18', () => {
    const cine = crearServicio();
    const pelicula = cine.getPeliculas().find((p) => p.clasificacionEdad === 18);
    expect(pelicula).toBeDefined();

    const resultado = cine.puedeComprarFuncion(pelicula!, USUARIO_ANONIMO);
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('18');
  });

  it('deja comprar sin restricción a cualquiera', () => {
    const cine = crearServicio();
    const pelicula = cine.getPeliculas().find((p) => p.clasificacionEdad === 0);
    expect(cine.puedeComprarFuncion(pelicula!, USUARIO_ANONIMO).exito).toBe(true);
  });

  it('calcula el total con recargo VIP', () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;
    const vip = cine.precioButaca(funcion, sala, { id: 'R-1', fila: 'R', numero: 1 });

    const cotizacion = cine.calcularCotizacion({
      pelicula,
      funcion,
      sala,
      butacas: [
        { id: 'A-1', fila: 'A', numero: 1 },
        { id: 'R-1', fila: 'R', numero: 1 },
      ],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
    });

    expect(cotizacion.subtotalButacas).toBe(funcion.precio + vip);
    expect(vip).toBe(funcion.precio + 1500);
    expect(cotizacion.incluyeVip).toBe(true);
    expect(cotizacion.total).toBe(cotizacion.subtotal);
  });

  it('aplica el descuento del cupón correctamente', () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;

    const cotizacion = cine.calcularCotizacion({
      pelicula,
      funcion,
      sala,
      butacas: [{ id: 'A-1', fila: 'A', numero: 1 }],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 20,
      creditoUtilizado: 0,
    });

    expect(cotizacion.descuento).toBe(Math.round(cotizacion.subtotal * 0.2));
    expect(cotizacion.total).toBe(cotizacion.subtotal - cotizacion.descuento);
  });

  it('emite un ticket con QR y acumula 1 punto por peso', async () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;

    const resultado = await cine.finalizarCompra({
      pelicula,
      funcion,
      sala,
      butacas: [{ id: 'B-4', fila: 'B', numero: 4 }],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
      usuarioEmail: USUARIO_ANONIMO,
      creadoPorCanje: false,
    });

    expect(resultado.exito).toBe(true);
    expect(resultado.ticket?.codigoQr).toMatch(/^CINE-/);
    expect(resultado.ticket?.puntosGanados).toBe(resultado.ticket?.montoTotal);
    expect(cine.butacasBloqueadas(funcion.id)).toContain('B-4');
  });

  it('valida el QR una sola vez', async () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;

    const compra = await cine.finalizarCompra({
      pelicula,
      funcion,
      sala,
      butacas: [{ id: 'C-7', fila: 'C', numero: 7 }],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
      usuarioEmail: USUARIO_ANONIMO,
      creadoPorCanje: false,
    });

    const codigo = compra.ticket!.codigoQr;
    expect(cine.validarCodigoQr(codigo, 'entrada').exito).toBe(true);
    expect(cine.validarCodigoQr(codigo, 'entrada').exito).toBe(false);
  });

  it('no deja crear dos funciones superpuestas en la misma sala', async () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const datos = {
      peliculaId: funcion.peliculaId,
      salaId: funcion.salaId,
      dias: funcion.dias,
      horaInicio: funcion.horaInicio,
      precio: 4000,
    };

    const segunda = await cine.crearFuncionAutomatica(datos);
    expect(segunda.exito).toBe(false);
    expect(segunda.mensaje).toContain('salas');
  });

  it('acredita el saldo en vez de devolver dinero al cancelar', async () => {
    const cine = crearServicio();
    cine.auth.login('cliente@cine.com', 'cliente123');

    const funcion = funcionCancelable(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;

    const compra = await cine.finalizarCompra({
      pelicula,
      funcion,
      sala,
      butacas: [{ id: 'D-5', fila: 'D', numero: 5 }],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
      usuarioEmail: cine.auth.emailEfectivo(),
      creadoPorCanje: false,
    });

    const cancelacion = cine.cancelarReserva(compra.ticket!.id);
    expect(cancelacion.exito).toBe(true);
    expect(cine.creditoUsuario()).toBeGreaterThanOrEqual(compra.ticket!.montoTotal);
    expect(compra.ticket!.estado).toBe('ACTIVO');
    expect(cine.getTickets().find((t) => t.id === compra.ticket!.id)?.estado).toBe('CANCELADO');
  });

  it('suma las ventas de la película comprada', async () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;
    const antes = pelicula.ventasTotales;

    await cine.finalizarCompra({
      pelicula,
      funcion,
      sala,
      butacas: [
        { id: 'E-1', fila: 'E', numero: 1 },
        { id: 'E-2', fila: 'E', numero: 2 },
      ],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
      usuarioEmail: USUARIO_ANONIMO,
      creadoPorCanje: false,
    });

    expect(cine.obtenerPelicula(pelicula.id)?.ventasTotales).toBe(antes + 2);
  });

  it('registra la compra en la bitácora', async () => {
    const cine = crearServicio();
    const funcion = funcionLibre(cine);
    const sala = cine.obtenerSala(funcion.salaId)!;
    const pelicula = cine.obtenerPelicula(funcion.peliculaId)!;

    await cine.finalizarCompra({
      pelicula,
      funcion,
      sala,
      butacas: [{ id: 'F-9', fila: 'F', numero: 9 }],
      candy: [],
      combos: [],
      cupon: null,
      porcentajeDescuento: 0,
      creditoUtilizado: 0,
      usuarioEmail: USUARIO_ANONIMO,
      creadoPorCanje: false,
    });

    expect(cine.getLogs().some((l) => l.accion === 'COMPRA')).toBe(true);
  });
});