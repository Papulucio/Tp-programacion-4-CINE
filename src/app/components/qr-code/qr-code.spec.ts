import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { QrCodeComponent } from './qr-code';

describe('QrCodeComponent', () => {
  let fixture: ComponentFixture<QrCodeComponent>;

  async function montar(valor: string): Promise<SVGSVGElement | null> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [QrCodeComponent] }).compileComponents();
    fixture = TestBed.createComponent(QrCodeComponent);
    fixture.componentRef.setInput('valor', valor);
    await fixture.whenStable();

    return (fixture.nativeElement as HTMLElement).querySelector('svg');
  }

  it('se crea', async () => {
    await montar('CINE-12345678');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('dibuja el QR como SVG', async () => {
    const svg = await montar('CINE-12345678');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-label')).toBe('Código QR CINE-12345678');

    const trazo = svg?.querySelector('path')?.getAttribute('d') ?? '';
    expect(trazo.startsWith('M')).toBe(true);
    expect(trazo.length).toBeGreaterThan(500);
  });

  it('respeta la zona quieta de la norma', async () => {
    const svg = await montar('CINE-12345678');
    const lado = Number(svg?.getAttribute('viewBox')?.split(' ')[3]);

    // 21 módulos (versión 1) + 4 de zona quieta.
    expect(lado).toBe(25);
  });

  it('genera un trazo distinto para cada código', async () => {
    const primero = (await montar('CINE-AAAA1111'))?.querySelector('path')?.getAttribute('d');
    const segundo = (await montar('CINE-BBBB2222'))?.querySelector('path')?.getAttribute('d');

    expect(primero).not.toBe(segundo);
  });

  it('no rompe con un código vacío', async () => {
    const svg = await montar('');
    expect(svg).toBeNull();
  });
});