import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PerfilComponent } from './perfil';
import { CineService } from '../../services/cine.service';
import { AuthService } from '../../services/auth.service';
import { Pelicula } from '../../models/pelicula';
import { USUARIO_ANONIMO } from '../../models/ticket';
import { limpiarAlmacenamiento, provideSupabaseStub } from '../../testing/supabase.stub';

describe('PerfilComponent', () => {
  let fixture: ComponentFixture<PerfilComponent>;
  let componente: PerfilComponent;
  let cine: CineService;
  let auth: AuthService;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    limpiarAlmacenamiento();
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideRouter([]), provideSupabaseStub()],
    }).compileComponents();

    cine = TestBed.inject(CineService);
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(PerfilComponent);
    componente = fixture.componentInstance;
    await fixture.whenStable();
  });

  function comprarComo(email: string): Promise<Pelicula> {
    auth.login(email, email.startsWith('cliente') ? 'cliente123' : 'senior123');
    const pelicula = cine.getPeliculas().find(
      (p) => p.clasificacionEdad === 0 && cine.puedeComprarFuncion(p, email).exito,
    )!;
    const funcion = cine.funcionesDePelicula(pelicula.id)[0];
    const sala = cine.obtenerSala(funcion.salaId)!;

    return cine
      .finalizarCompra({
        pelicula,
        funcion,
        sala,
        butacas: [{ id: 'G-1', fila: 'G', numero: 1 }],
        candy: [],
        combos: [],
        cupon: null,
        porcentajeDescuento: 0,
        creditoUtilizado: 0,
        usuarioEmail: auth.emailEfectivo(),
        creadoPorCanje: false,
      })
      .then(() => pelicula);
  }

  it('se crea', () => {
    expect(componente).toBeTruthy();
  });

  it('muestra los datos del usuario logueado', async () => {
    auth.login('cliente@cine.com', 'cliente123');
    await fixture.whenStable();

    expect(componente.usuario()?.email).toBe('cliente@cine.com');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('cliente@cine.com');
  });

  it('no tiene tickets sin compras', async () => {
    auth.login('cliente@cine.com', 'cliente123');
    await fixture.whenStable();

    expect(componente.tickets()).toHaveLength(0);
    expect(componente.totalGastado()).toBe(0);
  });

  it('lista los tickets comprados y suma lo gastado', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    expect(componente.tickets().length).toBeGreaterThan(0);
    expect(componente.totalGastado()).toBeGreaterThan(0);
    expect(componente.totalGastado()).toBe(
      componente.tickets().filter((t) => t.estado === 'ACTIVO').reduce((a, t) => a + t.montoTotal, 0),
    );
  });

  it('acredita el saldo al cancelar y actualiza la lista', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    const ticket = componente.tickets()[0];
    const creditoAntes = cine.creditoUsuario();

    componente.cancelar(ticket);

    expect(componente.error()).toBe('');
    expect(cine.creditoUsuario()).toBeGreaterThan(creditoAntes);
    expect(componente.tickets().find((t) => t.id === ticket.id)?.estado).toBe('CANCELADO');
  });

  it('no puede cancelar una función ya pasada', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    const ticket = componente.tickets()[0];
    ticket.fechaHoraFuncion = '2020-01-01T10:00:00';

    expect(componente.puedeCancelar(ticket)).toBe(false);
    expect(componente.horasRestantes(ticket)).toContain('pasó');
  });

  it('avisa cuando la función está a menos de 2 horas', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    const ticket = componente.tickets()[0];
    ticket.fechaHoraFuncion = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    expect(componente.puedeCancelar(ticket)).toBe(false);
    expect(componente.horasRestantes(ticket)).toContain('ya no se puede cancelar');
  });

  it('filtra los canjes y recompensas del usuario', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    expect(Array.isArray(componente.canjes())).toBe(true);
    expect(componente.recompensas().length).toBeGreaterThan(0);
    expect(componente.puntos()).toBeGreaterThan(0);
  });

  it('no deja canjear sin puntos suficientes', async () => {
    auth.login('cliente@cine.com', 'cliente123');
    await fixture.whenStable();

    const cara = componente.recompensas().sort((a, b) => b.puntosRequeridos - a.puntosRequeridos)[0];
    componente.canjear(cara.id);

    expect(componente.error()).not.toBe('');
    expect(componente.mensaje()).toBe('');
  });

  it('genera el ticket en PDF sin romper', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    await componente.descargarTicket(componente.tickets()[0]);

    expect(componente.error()).toBe('');
    expect(componente.exportando()).toBe(false);
  });

  it('amplía y cierra el ticket', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    const ticket = componente.tickets()[0];
    componente.verTicket(ticket);
    expect(componente.ticketAmpliado()).toBe(ticket);

    componente.cerrarTicket();
    expect(componente.ticketAmpliado()).toBeNull();
  });

  it('solo lista estrenos con alerta activa', async () => {
    await comprarComo('cliente@cine.com');
    await fixture.whenStable();

    const proxima = cine.peliculasProximamente()[0];
    expect(componente.proximosEstrenos()).toHaveLength(0);

    auth.alternarAlerta(proxima.id);
    expect(componente.proximosEstrenos().map((p) => p.id)).toContain(proxima.id);
  });

  it('el anónimo no ve historial personal', async () => {
    expect(auth.emailEfectivo()).toBe(USUARIO_ANONIMO);
    expect(componente.tickets()).toHaveLength(0);
  });
});