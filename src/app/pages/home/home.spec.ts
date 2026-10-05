import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { HomeComponent } from './home';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../testing/supabase.stub';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let componente: HomeComponent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideSupabaseStub()],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('muestra la cartelera', () => {
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Cartelera');
    expect(componente.cartelera().length).toBeGreaterThan(0);
  });

  it('filtra por texto', () => {
    const total = componente.cartelera().length;
    componente.busqueda.set('zzzz-no-existe');
    expect(componente.cartelera()).toHaveLength(0);

    componente.busqueda.set('');
    expect(componente.cartelera().length).toBe(total);
  });

  it('filtra por género', () => {
    const genero = componente.generos()[0];
    componente.generoElegido.set(genero);

    const resultados = componente.cartelera();
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((p) => p.generos.includes(genero))).toBe(true);
  });

  it('expone el podio de 3 películas', () => {
    expect(componente.top3().length).toBeLessThanOrEqual(3);
  });

  it('limpia los filtros', () => {
    componente.busqueda.set('algo');
    componente.generoElegido.set('Terror');
    componente.limpiarFiltros();

    expect(componente.busqueda()).toBe('');
    expect(componente.generoElegido()).toBe('');
  });
});