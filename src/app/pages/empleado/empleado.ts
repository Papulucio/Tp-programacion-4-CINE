import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CineService } from '../../services/cine.service';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../models/ticket';
import { formatearFechaHora, formatearMoneda } from '../../core/utils/fecha.util';

interface ResultadoValidacion {
  exito: boolean;
  mensaje: string;
  ticket?: Ticket;
}

/**
 * `BarcodeDetector` todavía no está en la librería de tipos del DOM de
 * TypeScript, así que declaramos la parte mínima que usamos.
 */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function obtenerBarcodeDetector(): BarcodeDetectorConstructor | null {
  const constructor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  return constructor ?? null;
}

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './empleado.html',
})
export class EmpleadoComponent implements OnDestroy {
  readonly cine = inject(CineService);
  readonly auth = inject(AuthService);

  readonly tipo = signal<'entrada' | 'candy'>('entrada');
  readonly codigo = signal('');
  readonly resultado = signal<ResultadoValidacion | null>(null);
  readonly historial = signal<{ fecha: string; mensaje: string; exito: boolean }[]>([]);
  readonly camaraActiva = signal(false);
  readonly errorCamara = signal('');

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  private stream: MediaStream | null = null;
  private lector: BarcodeDetectorLike | null = null;
  private rafId = 0;

  readonly ticketsActivos = computed(() =>
    this.cine.getTickets().filter((t) => t.estado === 'ACTIVO' && !t.validadoEntrada).length,
  );

  formatear(monto: number): string {
    return formatearMoneda(monto);
  }

  fecha(iso: string): string {
    return formatearFechaHora(iso);
  }

  validar(codigo = this.codigo()): void {
    const limpio = codigo.trim();
    if (!limpio) {
      this.resultado.set({ exito: false, mensaje: 'Ingresá o escaneá un código.' });
      return;
    }

    const respuesta = this.cine.validarCodigoQr(limpio, this.tipo());
    this.resultado.set(respuesta);
    this.codigo.set('');
    this.historial.update((lista) => [
      { fecha: new Date().toLocaleTimeString('es-AR'), mensaje: respuesta.mensaje, exito: respuesta.exito },
      ...lista.slice(0, 19),
    ]);
  }

  cambiarTipo(tipo: 'entrada' | 'candy'): void {
    this.tipo.set(tipo);
    this.resultado.set(null);
  }

  async encenderCamara(): Promise<void> {
    this.errorCamara.set('');

    const BarcodeDetector = obtenerBarcodeDetector();
    if (!BarcodeDetector) {
      this.errorCamara.set('Este navegador no soporta lectura de códigos. Usá el ingreso manual.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorCamara.set('No se pudo acceder a la cámara. Revisá los permisos del navegador.');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const elemento = this.video()?.nativeElement;
      if (!elemento) return;
      elemento.srcObject = this.stream;
      await elemento.play();
      this.camaraActiva.set(true);
      this.lector = new BarcodeDetector({ formats: ['qr_code'] });
      void this.escanear();
    } catch (error) {
      this.errorCamara.set(`No se pudo abrir la cámara: ${String(error)}`);
      this.apagarCamara();
    }
  }

  private async escanear(): Promise<void> {
    const elemento = this.video()?.nativeElement;
    if (!elemento || !this.lector || !this.camaraActiva()) return;

    try {
      const encontrados = await this.lector.detect(elemento);
      if (encontrados.length > 0) {
        this.validar(String(encontrados[0].rawValue));
        return;
      }
    } catch {
      this.errorCamara.set('Falló la lectura. Probá de nuevo o ingresá el código a mano.');
      this.apagarCamara();
      return;
    }

    this.rafId = requestAnimationFrame(() => void this.escanear());
  }

  apagarCamara(): void {
    this.camaraActiva.set(false);
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  ngOnDestroy(): void {
    this.apagarCamara();
  }
}