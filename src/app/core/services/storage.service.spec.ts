import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';
import { limpiarAlmacenamiento } from '../../testing/supabase.stub';

describe('StorageService', () => {
  function crearServicio(): StorageService {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    TestBed.configureTestingModule({});
    return TestBed.inject(StorageService);
  }

  it('escribe y lee con el prefijo de la app', () => {
    const storage = crearServicio();
    storage.escribir('demo', { hola: 'mundo' });

    expect(storage.leer('demo', null)).toEqual({ hola: 'mundo' });
    expect(localStorage.getItem('tpcine:demo')).toContain('mundo');
  });

  it('devuelve el valor por defecto si no existe la clave', () => {
    const storage = crearServicio();
    expect(storage.leer('inexistente', 'por defecto')).toBe('por defecto');
  });

  it('elimina la clave', () => {
    const storage = crearServicio();
    storage.escribir('demo', 1);
    storage.eliminar('demo');
    expect(storage.leer('demo', 0)).toBe(0);
  });
});