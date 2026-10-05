import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { RegistroComponent } from './registro';
import { limpiarAlmacenamiento } from '../../testing/supabase.stub';

describe('RegistroComponent', () => {
  let fixture: ComponentFixture<RegistroComponent>;
  let componente: RegistroComponent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [RegistroComponent],
      providers: [provideRouter([{ path: 'perfil', children: [] }, { path: '**', children: [] }])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroComponent);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  function completar(overrides: Partial<Record<string, string | number>> = {}): void {
    const valores = {
      email: 'nuevo@test.com',
      nombre: 'Nuevo',
      apellido: 'Cliente',
      fechaNacimiento: '1995-06-15',
      tipoSangre: 'O+',
      colorOjos: 'Marrón',
      diasVacaciones: 10,
      ...overrides,
    };
    componente.formulario.setValue(valores as never);
  }

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('no registra un formulario vacío', () => {
    componente.registrar();

    expect(componente.error).toContain('Revisá');
    expect(componente.formulario.touched).toBe(true);
  });

  it('rechaza un email inválido', () => {
    completar({ email: 'no-es-un-mail' });
    componente.registrar();

    expect(componente.error).toContain('Revisá');
    expect(componente.mensaje).toBe('');
  });

  it('calcula la edad en vivo', () => {
    completar();
    expect(componente.edad).toBeGreaterThan(18);

    componente.formulario.controls.fechaNacimiento.setValue('2020-01-01');
    expect(componente.edad).toBeLessThan(18);
  });

  it('registra y navega al perfil', async () => {
    completar();
    componente.registrar();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    expect(componente.error).toBe('');
    expect(router.url).toContain('/perfil');
  });

  it('informa cuando el email ya existe', () => {
    completar();
    componente.registrar();
    componente.formulario.reset();
    completar();
    componente.registrar();

    expect(componente.error).toContain('existe');
  });
});