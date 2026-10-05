import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ButacaSeleccionada, TipoButaca } from '../../../models/butaca';
import { ConfiguracionFila, Sala, totalButacasFila } from '../../../models/sala';
import { CineService } from '../../../services/cine.service';

/**
 * Mapa de butacas de una función.
 *
 * Las filas salen de la configuración de la sala (mail del 12/02), por lo que
 * respeta la fila adaptada 2/10/2 y las filas VIP con recargo.
 */
@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
  templateUrl: './mapa-butacas.html',
})
export class MapaButacasComponent {
  private readonly cine = inject(CineService);

  readonly sala = input.required<Sala>();
  readonly funcionId = input.required<number>();
  readonly bloqueadas = input<string[]>([]);
  readonly seleccion = input<ButacaSeleccionada[]>([]);
  readonly maximo = input(8);

  readonly seleccionChange = output<ButacaSeleccionada[]>();

  readonly aviso = signal('');

  readonly filas = computed(() => this.sala().filas);
  readonly totalSeleccionadas = computed(() => this.seleccion().length);

  constructor() {
    // Mantiene el aviso de "edad no habilitada" visible mientras haya selección inválida.
    effect(() => {
      const mensaje = this.aviso();
      if (!mensaje) return;
      const timer = setTimeout(() => this.aviso.set(''), 4000);
      return () => clearTimeout(timer);
    });
  }

  columnas(fila: ConfiguracionFila): number[] {
    const [izquierda, centro, derecha] = fila.bloques;
    const total = izquierda + centro + derecha;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  /** Los primeros `n` números de la fila están en el bloque izquierdo. */
  esBloqueIzquierdo(fila: ConfiguracionFila, numero: number): boolean {
    return numero <= fila.bloques[0];
  }

  /** Los últimos `n` números de la fila están en el bloque derecho. */
  esBloqueDerecho(fila: ConfiguracionFila, numero: number): boolean {
    return numero > totalButacasFila(fila) - fila.bloques[2];
  }

  estaBloqueada(fila: string, numero: number): boolean {
    return this.bloqueadas().includes(`${fila}-${numero}`);
  }

  estaSeleccionada(fila: string, numero: number): boolean {
    return this.seleccion().some((b) => b.fila === fila && b.numero === numero);
  }

  id(fila: string, numero: number): string {
    return `${fila}-${numero}`;
  }

  tipo(fila: string): TipoButaca {
    return this.cine.tipoButaca(this.sala(), fila);
  }

  precio(fila: string): number {
    const funcion = this.cine.obtenerFuncion(this.funcionId());
    if (!funcion) return 0;
    return this.cine.precioButaca(funcion, this.sala(), { id: `${fila}-1`, fila, numero: 1 });
  }

  alternar(fila: ConfiguracionFila, numero: number): void {
    const id = this.id(fila.letra, numero);
    if (this.estaBloqueada(fila.letra, numero)) {
      this.aviso.set('Esa butaca ya está ocupada.');
      return;
    }

    const actual = this.seleccion();
    const existe = actual.some((b) => b.id === id);

    if (existe) {
      this.seleccionChange.emit(actual.filter((b) => b.id !== id));
      return;
    }

    if (actual.length >= this.maximo()) {
      this.aviso.set(`Podés comprar hasta ${this.maximo()} butacas por compra.`);
      return;
    }

    this.seleccionChange.emit([...actual, { id, fila: fila.letra, numero }]);
  }

  limpiar(): void {
    this.seleccionChange.emit([]);
  }
}