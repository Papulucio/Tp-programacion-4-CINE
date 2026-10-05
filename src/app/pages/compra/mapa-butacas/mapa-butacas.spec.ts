import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { MapaButacasComponent } from './mapa-butacas';
import { CineService } from '../../../services/cine.service';
import { Sala } from '../../../models/sala';
import { ButacaSeleccionada } from '../../../models/butaca';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../../testing/supabase.stub';

describe('MapaButacasComponent', () => {
  let fixture: ComponentFixture<MapaButacasComponent>;
  let componente: MapaButacasComponent;
  let cine: CineService;
  let sala: Sala;
  let seleccion: ButacaSeleccionada[];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [MapaButacasComponent],
      providers: [provideRouter([]), provideSupabaseStub()],
    }).compileComponents();

    cine = TestBed.inject(CineService);
    sala = cine.getSalas()[0];
    seleccion = [];

    fixture = TestBed.createComponent(MapaButacasComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('sala', sala);
    fixture.componentRef.setInput('funcionId', cine.getFunciones()[0].id);
    fixture.componentRef.setInput('seleccion', seleccion);
    fixture.componentRef.setInput('bloqueadas', []);
    fixture.componentRef.setInput('maximo', 8);
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('arma las 19 filas de la sala', () => {
    expect(componente.filas()).toHaveLength(19);
  });

  it('genera los números de cada fila según sus bloques', () => {
    const fila = sala.filas.find((f) => f.letra === 'A')!;
    expect(componente.columnas(fila)).toHaveLength(28);
  });

  it('reparte el pasillo central', () => {
    const fila = sala.filas.find((f) => f.letra === 'A')!;
    expect(componente.esBloqueIzquierdo(fila, fila.bloques[0])).toBe(true);
    expect(componente.esBloqueIzquierdo(fila, fila.bloques[0] + 1)).toBe(false);
    expect(componente.esBloqueDerecho(fila, 28)).toBe(true);
    expect(componente.esBloqueDerecho(fila, 1)).toBe(false);
  });

  it('identifica la fila adaptada y las VIP', () => {
    expect(componente.tipo('J')).toBe('adaptada');
    expect(componente.tipo('R')).toBe('vip');
    expect(componente.tipo('A')).toBe('estandar');
  });

  it('emite la butaca elegida y la vuelve a quitar', () => {
    const fila = sala.filas[0];
    const emitidas: ButacaSeleccionada[][] = [];
    componente.seleccionChange.subscribe((v) => emitidas.push(v));

    componente.alternar(fila, 1);
    expect(emitidas.at(-1)).toEqual([{ id: 'A-1', fila: 'A', numero: 1 }]);

    fixture.componentRef.setInput('seleccion', emitidas.at(-1)!);
    componente.alternar(fila, 1);
    expect(emitidas.at(-1)).toHaveLength(0);
  });

  it('avisa y no emite si la butaca está ocupada', () => {
    fixture.componentRef.setInput('bloqueadas', ['A-1']);
    const emitidas: ButacaSeleccionada[][] = [];
    componente.seleccionChange.subscribe((v) => emitidas.push(v));

    componente.alternar(sala.filas[0], 1);

    expect(componente.aviso()).toContain('ocupada');
    expect(emitidas).toHaveLength(0);
  });

  it('respeta el máximo de butacas por compra', () => {
    fixture.componentRef.setInput('maximo', 2);
    const emitidas: ButacaSeleccionada[][] = [];
    componente.seleccionChange.subscribe((v) => emitidas.push(v));

    componente.alternar(sala.filas[0], 1);
    fixture.componentRef.setInput('seleccion', emitidas.at(-1)!);
    componente.alternar(sala.filas[0], 2);
    fixture.componentRef.setInput('seleccion', emitidas.at(-1)!);
    componente.alternar(sala.filas[0], 3);

    expect(componente.aviso()).toContain('hasta 2 butacas');
    expect(emitidas.at(-1)).toHaveLength(2);
  });

  it('limpia la selección', () => {
    const emitidas: ButacaSeleccionada[][] = [];
    componente.seleccionChange.subscribe((v) => emitidas.push(v));

    componente.limpiar();
    expect(emitidas.at(-1)).toEqual([]);
  });

  it('renderiza las 518 butacas de la sala', () => {
    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll('button.butaca');
    expect(botones.length).toBe(518);

    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Pantalla');
    expect(html).toContain('Adaptada');
  });
});