import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefijo = 'tpcine:';

  private disponible(): boolean {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  leer<T>(clave: string, porDefecto: T): T {
    if (!this.disponible()) return porDefecto;
    try {
      const raw = localStorage.getItem(this.prefijo + clave);
      if (raw === null) return porDefecto;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[Storage] No se pudo leer "${clave}", se usa el valor por defecto.`, error);
      return porDefecto;
    }
  }

  escribir(clave: string, valor: unknown): void {
    if (!this.disponible()) return;
    try {
      localStorage.setItem(this.prefijo + clave, JSON.stringify(valor));
    } catch (error) {
      console.warn(`[Storage] No se pudo escribir "${clave}".`, error);
    }
  }

  eliminar(clave: string): void {
    if (!this.disponible()) return;
    try {
      localStorage.removeItem(this.prefijo + clave);
    } catch {
    }
  }
}