import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import QRCode from 'qrcode';

const ZONA_QUIETA = 2;

@Component({
  selector: 'app-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (qr(); as codigo) {
      <svg
        class="qr"
        [attr.viewBox]="'0 0 ' + codigo.lado + ' ' + codigo.lado"
        [attr.width]="tamanio()"
        [attr.height]="tamanio()"
        role="img"
        [attr.aria-label]="'Código QR ' + valor()"
      >
        <rect [attr.width]="codigo.lado" [attr.height]="codigo.lado" fill="#ffffff" />
        <path [attr.d]="codigo.trazo" fill="#101828" shape-rendering="crispEdges" />
      </svg>
    }
  `,
  styles: [
    `
      .qr {
        display: block;
        width: 100%;
        max-width: 220px;
        height: auto;
        background: #fff;
        padding: 8px;
        border-radius: 8px;
      }
    `,
  ],
})
export class QrCodeComponent {
  readonly valor = input.required<string>();
  readonly tamanio = input(220);

  readonly qr = computed(() => this.construir(this.valor()));

  private construir(texto: string): { lado: number; trazo: string } | null {
    if (!texto) return null;

    try {
      const matriz = QRCode.create(texto, { errorCorrectionLevel: 'M' });
      const modulos = matriz.modules.size;
      const datos = matriz.modules.data;
      const lado = modulos + ZONA_QUIETA * 2;

      const trazo: string[] = [];
      for (let fila = 0; fila < modulos; fila++) {
        for (let columna = 0; columna < modulos; columna++) {
          if (!datos[fila * modulos + columna]) continue;
          trazo.push(`M${columna + ZONA_QUIETA} ${fila + ZONA_QUIETA}h1v1h-1z`);
        }
      }

      return { lado, trazo: trazo.join('') };
    } catch {
      // Un código vacío o corrupto no debe romper la pantalla del ticket.
      return null;
    }
  }
}