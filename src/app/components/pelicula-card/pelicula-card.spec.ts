import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PeliculaCardComponent } from './pelicula-card';
import { CineService } from '../../services/cine.service';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../testing/supabase.stub';
import { Pelicula } from '../../models/pelicula';

describe('PeliculaCardComponent', () => {
  let fixture: ComponentFixture<PeliculaCardComponent>;
  let componente: PeliculaCardComponent;
  let cine: CineService;
  let pelicula: Pelicula;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [PeliculaCardComponent],
      providers: [provideRouter([]), provideSupabaseStub()],
    }).compileComponents();

    cine = TestBed.inject(CineService);
    pelicula = cine.peliculasEnCartelera()[0];

    fixture = TestBed.createComponent(PeliculaCardComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('pelicula', pelicula);
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('muestra el título y el precio de referencia', () => {
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain(pelicula.nombre);
    expect(html).toContain('Desde');
  });

  it('enlaza a la compra de esa película', () => {
    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a.boton--primario');
    expect(enlace?.getAttribute('href')).toBe(`/compra/${pelicula.id}`);
  });

  it('muestra la clasificación etaria legible', () => {
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const esperada = pelicula.clasificacionEdad === 0 ? 'Sin restricción' : `+${pelicula.clasificacionEdad}`;
    expect(html).toContain(esperada);
  });
});