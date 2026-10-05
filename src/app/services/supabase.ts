import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const TABLA_FUNCIONES = 'funciones';
export const TABLA_RESERVAS_BUTACAS = 'reservas_butacas';

/**
 * Cliente de Supabase.
 *
 * La app está pensada para funcionar aunque Supabase no esté disponible
 * (las acciones críticas caen a localStorage), por eso expone `disponible`
 * y los helpers devuelven `null` en lugar de tirar.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  /** Se pone en false si la primera consulta falla (red caída / tabla inexistente). */
  private readonly estado = { conectado: true };

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: { persistSession: false },
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get disponible(): boolean {
    return this.estado.conectado && environment.resilient !== false;
  }

  /** Marca la conexión como caída para no seguir reintentando en cada llamada. */
  marcarCaida(motivo: string): void {
    if (this.estado.conectado) {
      this.estado.conectado = false;
      console.warn(
        `[Supabase] Sin conexión (${motivo}). La app sigue operando con almacenamiento local.`,
      );
    }
  }

  async select<T>(tabla: string, columns = '*'): Promise<T[] | null> {
    try {
      const { data, error } = await this.supabase.from(tabla).select(columns);
      if (error) {
        this.marcarCaida(error.message);
        return null;
      }
      return (data as T[]) ?? [];
    } catch (error) {
      this.marcarCaida(String(error));
      return null;
    }
  }

  async insert<T>(tabla: string, payload: Record<string, unknown>): Promise<T[] | null> {
    try {
      const { data, error } = await this.supabase.from(tabla).insert([payload]).select();
      if (error) {
        this.marcarCaida(error.message);
        return null;
      }
      return (data as T[]) ?? [];
    } catch (error) {
      this.marcarCaida(String(error));
      return null;
    }
  }

  async update<T>(
    tabla: string,
    id: number,
    cambios: Record<string, unknown>,
  ): Promise<T[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(tabla)
        .update(cambios)
        .eq('id', id)
        .select();
      if (error) {
        this.marcarCaida(error.message);
        return null;
      }
      return (data as T[]) ?? [];
    } catch (error) {
      this.marcarCaida(String(error));
      return null;
    }
  }

  async remove(tabla: string, filtros: Record<string, unknown>): Promise<boolean> {
    try {
      let query = this.supabase.from(tabla).delete();
      for (const [columna, valor] of Object.entries(filtros)) {
        query = query.eq(columna, valor);
      }
      const { error } = await query;
      if (error) {
        this.marcarCaida(error.message);
        return false;
      }
      return true;
    } catch (error) {
      this.marcarCaida(String(error));
      return false;
    }
  }
}

export function injectSupabase(): SupabaseService {
  return inject(SupabaseService);
}