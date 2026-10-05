import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../core/services/storage.service';
import { Rol, Sesion, Usuario } from '../models/usuario';
import { USUARIO_ANONIMO } from '../models/ticket';

const CLAVE_USUARIOS = 'usuarios';
const CLAVE_SESION = 'sesion';

type UsuariosDB = Record<string, Usuario>;

const USUARIOS_SEMILLA: UsuariosDB = {
  'admin@cine.com': {
    email: 'admin@cine.com',
    nombre: 'Empresario',
    apellido: 'Importante',
    fechaNacimiento: '1975-05-20',
    tipoSangre: 'O+',
    colorOjos: 'Marrón',
    diasVacaciones: 20,
    rol: 'admin',
    tieneCuponPrimeraCompra: false,
    alertasEstreno: [],
    createdAt: '2026-01-01T09:00:00.000Z',
  },
  'empleado@cine.com': {
    email: 'empleado@cine.com',
    nombre: 'Carla',
    apellido: 'Ruiz',
    fechaNacimiento: '1998-03-14',
    tipoSangre: 'A+',
    colorOjos: 'Marrón',
    diasVacaciones: 15,
    rol: 'empleado',
    tieneCuponPrimeraCompra: true,
    alertasEstreno: [],
    createdAt: '2026-01-01T09:05:00.000Z',
  },
  'cliente@cine.com': {
    email: 'cliente@cine.com',
    nombre: 'Lucía',
    apellido: 'Fernández',
    fechaNacimiento: '1990-07-02',
    tipoSangre: 'B+',
    colorOjos: 'Verde',
    diasVacaciones: 12,
    rol: 'cliente',
    tieneCuponPrimeraCompra: true,
    alertasEstreno: [],
    createdAt: '2026-01-01T09:10:00.000Z',
  },
  'senior@cine.com': {
    email: 'senior@cine.com',
    nombre: 'Jorge',
    apellido: 'Méndez',
    fechaNacimiento: '1965-11-30',
    tipoSangre: 'O-',
    colorOjos: 'Azul',
    diasVacaciones: 30,
    rol: 'cliente',
    tieneCuponPrimeraCompra: true,
    alertasEstreno: [],
    createdAt: '2026-01-01T09:15:00.000Z',
  },
};

const CLAVES_DEMO: Record<string, string> = {
  'admin@cine.com': 'admin123',
  'empleado@cine.com': 'empleado123',
  'cliente@cine.com': 'cliente123',
  'senior@cine.com': 'senior123',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);

  private readonly usuarios = signal<UsuariosDB>(this.cargarUsuarios());
  private readonly sesion = signal<Sesion | null>(this.cargarSesion());

  readonly usuarioActual = computed<Usuario | null>(() => {
    const s = this.sesion();
    if (!s) return null;
    return this.usuarios()[s.email] ?? null;
  });

  readonly sesionActual = computed<Sesion | null>(() => this.sesion());
  readonly estaLogueado = computed(() => this.sesion() !== null);
  readonly esAdmin = computed(() => this.sesion()?.rol === 'admin');
  readonly esEmpleado = computed(() => this.sesion()?.rol === 'empleado');
  readonly puedeComprar = computed(() => this.sesion() !== null);

  /** Email del usuario efectivo: el de la sesión o el de compra anónima. */
  readonly emailEfectivo = computed(() => this.sesion()?.email ?? USUARIO_ANONIMO);

  readonly nombreUsuario = computed(() => {
    const u = this.usuarioActual();
    return u ? `${u.nombre} ${u.apellido}`.trim() : 'Visitante';
  });

  private cargarUsuarios(): UsuariosDB {
    const guardados = this.storage.leer<UsuariosDB>(CLAVE_USUARIOS, {});
    return { ...USUARIOS_SEMILLA, ...guardados };
  }

  private cargarSesion(): Sesion | null {
    return this.storage.leer<Sesion | null>(CLAVE_SESION, null);
  }

  private persistirUsuarios(): void {
    // No sobreescribimos las cuentas de semilla: se regeneran en cada arranque.
    const propios: UsuariosDB = {};
    for (const [email, usuario] of Object.entries(this.usuarios())) {
      if (!(email in USUARIOS_SEMILLA)) {
        propios[email] = usuario;
      }
    }
    this.storage.escribir(CLAVE_USUARIOS, propios);
  }

  private persistirSesion(): void {
    if (this.sesion()) {
      this.storage.escribir(CLAVE_SESION, this.sesion());
    } else {
      this.storage.eliminar(CLAVE_SESION);
    }
  }


  login(email: string, clave: string): { exito: boolean; mensaje: string } {
    const normalizado = email.trim().toLowerCase();
    if (!normalizado || !clave.trim()) {
      return { exito: false, mensaje: 'Ingresá tu email y tu contraseña.' };
    }

    const usuario = this.usuarios()[normalizado];
    if (!usuario) {
      return { exito: false, mensaje: 'No existe una cuenta con ese email.' };
    }

    const claveDemo = CLAVES_DEMO[normalizado];
    if (claveDemo && claveDemo !== clave.trim()) {
      return { exito: false, mensaje: 'Contraseña incorrecta.' };
    }
    if (!claveDemo && clave.trim().length < 4) {
      return { exito: false, mensaje: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    this.sesion.set({ email: usuario.email, rol: usuario.rol, nombre: this.nombreDe(usuario) });
    this.persistirSesion();
    return { exito: true, mensaje: `¡Bienvenido/a, ${usuario.nombre}!` };
  }

  logout(): void {
    this.sesion.set(null);
    this.persistirSesion();
  }

  /** Registro de cliente (mail del 01/01). */
  registrar(datos: Omit<Usuario, 'rol' | 'tieneCuponPrimeraCompra' | 'alertasEstreno' | 'createdAt'>): {
    exito: boolean;
    mensaje: string;
  } {
    const email = datos.email.trim().toLowerCase();
    if (this.usuarios()[email]) {
      return { exito: false, mensaje: 'Ya existe una cuenta con ese email.' };
    }

    const nuevo: Usuario = {
      ...datos,
      email,
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      rol: 'cliente',
      tieneCuponPrimeraCompra: true,
      alertasEstreno: [],
      createdAt: new Date().toISOString(),
    };

    this.usuarios.update((db) => ({ ...db, [email]: nuevo }));
    this.persistirUsuarios();

    this.sesion.set({ email: nuevo.email, rol: nuevo.rol, nombre: this.nombreDe(nuevo) });
    this.persistirSesion();
    return { exito: true, mensaje: '¡Registro exitoso! Tenés 20% de descuento en tu primera compra.' };
  }

  /** Consume el cupón de primera compra. */
  consumirCuponPrimeraCompra(): void {
    const s = this.sesion();
    if (!s) return;
    this.usuarios.update((db) => {
      const u = db[s.email];
      if (!u || !u.tieneCuponPrimeraCompra) return db;
      return { ...db, [s.email]: { ...u, tieneCuponPrimeraCompra: false } };
    });
    this.persistirUsuarios();
  }

  get tieneCuponPrimeraCompra(): boolean {
    const s = this.sesion();
    if (!s) return false;
    return this.usuarios()[s.email]?.tieneCuponPrimeraCompra ?? false;
  }

  /** Marca/desmarca la alerta de estreno de una película (mail del 08/03). */
  alternarAlerta(peliculaId: number): boolean {
    const s = this.sesion();
    if (!s) return false;
    let activa = false;
    this.usuarios.update((db) => {
      const u = db[s.email];
      if (!u) return db;
      const yaEsta = u.alertasEstreno.includes(peliculaId);
      activa = !yaEsta;
      const alertas = yaEsta
        ? u.alertasEstreno.filter((id) => id !== peliculaId)
        : [...u.alertasEstreno, peliculaId];
      return { ...db, [s.email]: { ...u, alertasEstreno: alertas } };
    });
    this.persistirUsuarios();
    return activa;
  }

  tieneAlerta(peliculaId: number): boolean {
    const s = this.sesion();
    if (!s) return false;
    return this.usuarios()[s.email]?.alertasEstreno.includes(peliculaId) ?? false;
  }

  private nombreDe(u: Usuario): string {
    return `${u.nombre} ${u.apellido}`.trim();
  }

  /** Cuentas de demostración para mostrar en la pantalla de login. */
  get cuentasDemo(): { email: string; clave: string; rol: Rol; etiqueta: string }[] {
    return [
      { email: 'admin@cine.com', clave: 'admin123', rol: 'admin', etiqueta: 'Administrador' },
      { email: 'empleado@cine.com', clave: 'empleado123', rol: 'empleado', etiqueta: 'Empleado' },
      { email: 'cliente@cine.com', clave: 'cliente123', rol: 'cliente', etiqueta: 'Cliente' },
      { email: 'senior@cine.com', clave: 'senior123', rol: 'cliente', etiqueta: 'Cliente +50' },
    ];
  }
}