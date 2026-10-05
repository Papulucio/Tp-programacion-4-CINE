import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { adminGuard, empleadoGuard, sesionGuard } from './guards/rol.guard';
import { AuthService } from '../services/auth.service';
import { provideSupabaseStub, limpiarAlmacenamiento } from '../testing/supabase.stub';
import { DIAS_SEMANA, HORAS_POR_DEFECTO } from '../models/funcion';
import { CineService } from '../services/cine.service';

function preparar(): { auth: AuthService; router: Router } {
  TestBed.resetTestingModule();
  limpiarAlmacenamiento();
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideSupabaseStub()] });
  return { auth: TestBed.inject(AuthService), router: TestBed.inject(Router) };
}

function ruta(guard: typeof sesionGuard, estado = '/perfil') {
  return TestBed.runInInjectionContext(() => guard({} as never, { url: estado } as never));
}

describe('sesionGuard', () => {
  it('redirige a /login conservando la URL de origen', () => {
    const { auth } = preparar();
    expect(auth.estaLogueado()).toBe(false);

    const resultado = ruta(sesionGuard, '/perfil');
    expect(resultado instanceof UrlTree).toBe(true);
    expect(String(resultado)).toContain('/login');
    expect(String(resultado)).toContain('retour=%2Fperfil');
  });

  it('deja pasar con cualquier sesión activa', () => {
    const { auth } = preparar();
    auth.login('cliente@cine.com', 'cliente123');

    expect(ruta(sesionGuard)).toBe(true);
  });
});

describe('adminGuard', () => {
  it('manda al login sin sesión', () => {
    preparar();
    expect(String(ruta(adminGuard))).toContain('/login');
  });

  it('manda a /home si el usuario no es administrador', () => {
    const { auth } = preparar();
    auth.login('empleado@cine.com', 'empleado123');

    expect(String(ruta(adminGuard))).toContain('/home');
  });

  it('deja pasar al administrador', () => {
    const { auth } = preparar();
    auth.login('admin@cine.com', 'admin123');

    expect(ruta(adminGuard)).toBe(true);
  });
});

describe('empleadoGuard', () => {
  it('deja pasar al administrador y al empleado', () => {
    let contexto = preparar();
    contexto.auth.login('admin@cine.com', 'admin123');
    expect(ruta(empleadoGuard)).toBe(true);

    contexto = preparar();
    contexto.auth.login('empleado@cine.com', 'empleado123');
    expect(ruta(empleadoGuard)).toBe(true);
  });

  it('manda a /home a un cliente común', () => {
    const { auth } = preparar();
    auth.login('cliente@cine.com', 'cliente123');

    expect(String(ruta(empleadoGuard))).toContain('/home');
  });
});

describe('constantes de la aplicación', () => {
  it('expone los 7 días y el rango de funciones', () => {
    expect(DIAS_SEMANA).toHaveLength(7);
    expect(HORAS_POR_DEFECTO.length).toBeGreaterThan(0);
  });
});

describe('integración del dominio', () => {
  function cine(): CineService {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    TestBed.configureTestingModule({ providers: [provideSupabaseStub()] });
    return TestBed.inject(CineService);
  }

  it('mantiene 4 salas con 518 butacas cada una', () => {
    const servicio = cine();
    expect(servicio.getSalas()).toHaveLength(4);
    for (const sala of servicio.getSalas()) {
      expect(servicio.totalButacas(sala.id)).toBe(518);
    }
  });

  it('solo usa clasificaciones 0, 13 o 18', () => {
    for (const pelicula of cine().getPeliculas()) {
      expect([0, 13, 18]).toContain(pelicula.clasificacionEdad);
    }
  });
});