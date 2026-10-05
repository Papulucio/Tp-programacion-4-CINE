import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SupabaseService } from './supabase';
import { limpiarAlmacenamiento } from '../testing/supabase.stub';

describe('SupabaseService', () => {
  function crearServicio(): SupabaseService {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    TestBed.configureTestingModule({});
    return TestBed.inject(SupabaseService);
  }

  it('se crea', () => {
    const servicio = crearServicio();
    expect(servicio).toBeTruthy();
    expect(servicio.disponible).toBe(true);
  });

  it('expone el cliente para los helpers de bajo nivel', () => {
    expect(crearServicio().client).toBeTruthy();
  });

  it('marca la conexión como caída una sola vez', () => {
    const servicio = crearServicio();
    servicio.marcarCaida('sin red');
    expect(servicio.disponible).toBe(false);
  });

  it('devuelve null en lugar de throw cuando la tabla no existe', async () => {
    const servicio = crearServicio();
    // La tabla `no_existe` no está en el proyecto: el helper la trata como caída.
    await expect(servicio.select('no_existe')).resolves.toBeNull();
    expect(servicio.disponible).toBe(false);
  });
});