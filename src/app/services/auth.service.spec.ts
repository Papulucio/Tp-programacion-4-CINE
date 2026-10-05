import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { calcularEdad, preventaAbierta, proximaFechaFuncion } from '../core/utils/fecha.util';
import { limpiarAlmacenamiento } from '../testing/supabase.stub';
import { USUARIO_ANONIMO } from '../models/ticket';

function crearAuth(): AuthService {
  TestBed.resetTestingModule();
  limpiarAlmacenamiento();
  TestBed.configureTestingModule({});
  return TestBed.inject(AuthService);
}

describe('calcularEdad', () => {
  it('cumple años recién el día exacto', () => {
    const hoy = new Date(2026, 2, 12);
    expect(calcularEdad('2013-03-12', hoy)).toBe(13);
    expect(calcularEdad('2013-03-13', hoy)).toBe(12);
  });

  it('devuelve 0 sin fecha de nacimiento', () => {
    expect(calcularEdad(null)).toBe(0);
    expect(calcularEdad('')).toBe(0);
  });
});

describe('proximaFechaFuncion', () => {
  it('devuelve la próxima coincidencia, no una fecha en el pasado', () => {
    const desde = new Date(2026, 2, 12, 20, 0); // jueves 20:00
    const fecha = proximaFechaFuncion(['Lunes'], '14:00', desde);
    expect(fecha.getTime()).toBeGreaterThan(desde.getTime());
    expect(fecha.getDay()).toBe(1);
    expect(fecha.getHours()).toBe(14);
  });

  it('usa la función de hoy si todavía no empezó', () => {
    const desde = new Date(2026, 2, 12, 10, 0); // jueves 10:00
    const fecha = proximaFechaFuncion(['Jueves'], '19:00', desde);
    expect(fecha.getDate()).toBe(12);
    expect(fecha.getHours()).toBe(19);
  });
});

describe('preventaAbierta', () => {
  it('abre 7 días antes del estreno y cierra el día del estreno', () => {
    const hoy = new Date(2026, 2, 12);
    const dentroDeVentana = preventaAbierta('2026-03-15', 7, hoy);
    expect(dentroDeVentana.abierta).toBe(true);

    const yaEstreno = preventaAbierta('2026-03-10', 7, hoy);
    expect(yaEstreno.abierta).toBe(false);
  });
});

describe('AuthService', () => {
  it('arranca sin sesión y con email anónimo', () => {
    const auth = crearAuth();
    expect(auth.estaLogueado()).toBe(false);
    expect(auth.emailEfectivo()).toBe(USUARIO_ANONIMO);
  });

  it('valida las credenciales de demostración', () => {
    const auth = crearAuth();

    expect(auth.login('admin@cine.com', 'clave-mala').exito).toBe(false);
    expect(auth.login('nadie@cine.com', 'algo').exito).toBe(false);

    const ok = auth.login('admin@cine.com', 'admin123');
    expect(ok.exito).toBe(true);
    expect(auth.esAdmin()).toBe(true);
    expect(auth.emailEfectivo()).toBe('admin@cine.com');
  });

  it('registra un cliente con cupón de primera compra', () => {
    const auth = crearAuth();
    const resultado = auth.registrar({
      email: 'Nuevo@Test.com',
      nombre: 'Nuevo',
      apellido: 'Cliente',
      fechaNacimiento: '1995-04-04',
      tipoSangre: 'O+',
      colorOjos: 'Negro',
      diasVacaciones: 10,
    });

    expect(resultado.exito).toBe(true);
    expect(auth.estaLogueado()).toBe(true);
    expect(auth.esAdmin()).toBe(false);
    expect(auth.tieneCuponPrimeraCompra).toBe(true);

    auth.consumirCuponPrimeraCompra();
    expect(auth.tieneCuponPrimeraCompra).toBe(false);
  });

  it('no permite registrar dos veces el mismo email', () => {
    const auth = crearAuth();
    const datos = {
      email: 'dup@test.com',
      nombre: 'Dup',
      apellido: 'Licado',
      fechaNacimiento: '1990-01-01',
      tipoSangre: 'A+',
      colorOjos: 'Azul',
      diasVacaciones: 5,
    };

    expect(auth.registrar(datos).exito).toBe(true);
    auth.logout();
    expect(auth.registrar(datos).exito).toBe(false);
  });
});

describe('StorageService', () => {
  it('expone las cuentas de demostración', () => {
    const auth = crearAuth();
    const cuentas = auth.cuentasDemo.map((c) => c.email);

    expect(cuentas).toContain('admin@cine.com');
    expect(cuentas).toContain('empleado@cine.com');
    expect(cuentas).toContain('cliente@cine.com');
    expect(cuentas).toContain('senior@cine.com');
  });
});