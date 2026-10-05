import { Provider } from '@angular/core';
import { SupabaseService } from '../services/supabase';

/**
 * Doble de prueba de `SupabaseService`.
 *
 * En los tests no queremos tocar la red: el doble devuelve `null` (como hace
 * el servicio real cuando la tabla no existe) para que la app caiga al
 * almacenamiento local, que es justamente el modo tolerante a fallos.
 */
export class SupabaseServiceStub {
  readonly select = () => Promise.resolve(null);
  readonly insert = () => Promise.resolve(null);
  readonly update = () => Promise.resolve(null);
  readonly remove = () => Promise.resolve(true);
  readonly disponible = false;
  readonly client = null;
  readonly marcarCaida = () => undefined;
}

export function provideSupabaseStub(): Provider {
  return { provide: SupabaseService, useValue: new SupabaseServiceStub() };
}

/** Limpia el `localStorage` para que cada test arranque con la app en blanco. */
export function limpiarAlmacenamiento(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.clear();
}