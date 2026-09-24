import { Component, OnInit, OnDestroy, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Pelicula {
  id: number;
  titulo: string;
  clasificacion_edad: number; 
}

@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-butacas.html',
  styleUrls: ['./mapa-butacas.css']
})
export class MapaButacasComponent implements OnInit, OnDestroy {
  funcionId = 1; 
  usuarioFechaNacimiento: string | null = null;
  peliculaActual: Pelicula = { id: 1, titulo: 'Película Acción +18', clasificacion_edad: 18 };

  filas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

  butacasOcupadas = signal<string[]>([]);
  butacasSeleccionadas = signal<{ id: string; fila: string; numero: number }[]>([]);

  // NUEVO: Emitimos los cambios de butacas hacia el componente padre (CompraComponent)
  butacasChange = output<{ id: string; fila: string; numero: number }[]>();
  
  private canalRealtime!: RealtimeChannel;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.cargarUsuarioLogueado();
    await this.cargarButacasOcupadas();
    this.suscribirATiempoReal();
  }

  cargarUsuarioLogueado() {
    const userStr = localStorage.getItem('usuario_activo');
    if (userStr) {
      const usuario = JSON.parse(userStr);
      if (usuario.fechaNacimiento) {
        this.usuarioFechaNacimiento = usuario.fechaNacimiento;
      }
    }
  }

  get esAptoParaEdad(): boolean {
    if (this.peliculaActual.clasificacion_edad === 0) return true;
    if (!this.usuarioFechaNacimiento) return false;

    const [anio, mes, dia] = this.usuarioFechaNacimiento.split('-').map(Number);
    const hoy = new Date();
    
    let edad = hoy.getFullYear() - anio;
    const mesActual = hoy.getMonth() + 1;
    const diaActual = hoy.getDate();

    if (mesActual < mes || (mesActual === mes && diaActual < dia)) {
      edad--;
    }

    return edad >= this.peliculaActual.clasificacion_edad;
  }

  esFilaVIP(fila: string): boolean {
    return ['R', 'S', 'T'].includes(fila);
  }

  esFilaDiscapacidad(fila: string): boolean {
    return ['J', 'K'].includes(fila);
  }

  obtenerColumnasPorFila(fila: string) {
    if (this.esFilaDiscapacidad(fila)) {
      return { colIzquierda: [1, 2], colCentro: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], colDerecha: [13, 14] };
    }
    return {
      colIzquierda: [1, 2, 3, 4],
      colCentro: Array.from({ length: 20 }, (_, i) => i + 5),
      colDerecha: Array.from({ length: 4 }, (_, i) => i + 25)
    };
  }

  async cargarButacasOcupadas() {
    const { data, error } = await this.supabaseService.client
      .from('reservas_butacas')
      .select('fila, columna')
      .eq('funcion_id', this.funcionId);

    if (!error && data) {
      const keys = data.map((b) => `${b.fila}-${b.columna}`);
      this.butacasOcupadas.set(keys);
    }
  }

  suscribirATiempoReal() {
    this.canalRealtime = this.supabaseService.client
      .channel(`butacas_funcion_${this.funcionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas_butacas',
          filter: `funcion_id=eq.${this.funcionId}`
        },
        () => {
          this.cargarButacasOcupadas();
        }
      )
      .subscribe();
  }

  // Modificado para alternar selección local y emitir hacia el componente de Compra
  async seleccionarButaca(fila: string, columna: number) {
    const key = `${fila}-${columna}`;
    if (this.butacasOcupadas().includes(key)) return;

    if (!this.esAptoParaEdad) {
      alert(`Atención: Esta película es para +${this.peliculaActual.clasificacion_edad} años.`);
    }

    const seleccionActual = [...this.butacasSeleccionadas()];
    const index = seleccionActual.findIndex(b => b.id === key);

    if (index > -1) {
      // Si ya estaba seleccionada, la quitamos
      seleccionActual.splice(index, 1);
    } else {
      // Si no estaba, la agregamos
      seleccionActual.push({ id: key, fila, numero: columna });
    }

    this.butacasSeleccionadas.set(seleccionActual);
    this.butacasChange.emit(seleccionActual); // ¡Acá se comunica con CompraComponent!
  }

  isSeleccionada(fila: string, columna: number): boolean {
    return this.butacasSeleccionadas().some(b => b.id === `${fila}-${columna}`);
  }

  ngOnDestroy() {
    if (this.canalRealtime) {
      this.supabaseService.client.removeChannel(this.canalRealtime);
    }
  }
}