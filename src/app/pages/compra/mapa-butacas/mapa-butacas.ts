import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { SupabaseService } from '../../../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Pelicula {
  id: number;
  titulo: string;
  clasificacion_edad: number; 
}

@Component({
  selector: 'app-mapa-butacas',
  templateUrl: './mapa-butacas.html',
  styleUrls: ['./mapa-butacas.css']
})
export class MapaButacasComponent implements OnInit, OnDestroy {
  funcionId = 1; 
  usuarioFechaNacimiento: string | null = null;
  peliculaActual: Pelicula = { id: 1, titulo: 'Película Acción +18', clasificacion_edad: 18 };

  filas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

  butacasOcupadas = signal<string[]>([]);
  butacasSeleccionadas = signal<string[]>([]);
  
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

  // IDENTIFICACIÓN DE FILAS ADAPTADAS
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

  async seleccionarButaca(fila: string, columna: number) {
    if (!this.esAptoParaEdad) {
      alert(`Atención: Esta película es para +${this.peliculaActual.clasificacion_edad} años. Debe ser comprada e ir acompañado por un adulto.`);
    }

    if (this.esFilaVIP(fila)) {
      console.log(`Seleccionaste la butaca VIP ${fila}-${columna}. Tiene costo preferencial.`);
    }

    const key = `${fila}-${columna}`;
    if (this.butacasOcupadas().includes(key)) return;

    const { error } = await this.supabaseService.client
      .from('reservas_butacas')
      .insert({ funcion_id: this.funcionId, fila, columna, estado: 'ocupada' });

    if (error) console.error(error);
  }

  ngOnDestroy() {
    if (this.canalRealtime) {
      this.supabaseService.client.removeChannel(this.canalRealtime);
    }
  }
}