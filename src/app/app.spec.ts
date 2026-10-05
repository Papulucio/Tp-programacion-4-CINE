import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AppComponent } from './app';
import { limpiarAlmacenamiento, provideSupabaseStub } from './testing/supabase.stub';
import { routes } from './app.routes';

describe('AppComponent', () => {
  async function preparar() {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideSupabaseStub()],
    }).compileComponents();
    return TestBed.createComponent(AppComponent);
  }

  it('se crea', async () => {
    const fixture = await preparar();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el menú público sin sesión', async () => {
    const fixture = await preparar();
    await fixture.whenStable();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(html).toContain('Cartelera');
    expect(html).toContain('Ingresar');
    expect(html).not.toContain('Administración');
    expect(html).not.toContain('Mis entradas');
  });

  it('muestra los accesos del administrador cuando corresponde', async () => {
    const fixture = await preparar();
    const app = fixture.componentInstance;
    app.auth.login('admin@cine.com', 'admin123');
    await fixture.whenStable();

    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Administración');
    expect(html).toContain('Validar entradas');
    expect(html).toContain('Mis entradas');
  });
});