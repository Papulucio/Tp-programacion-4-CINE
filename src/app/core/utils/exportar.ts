export type Fila = (string | number)[];

export interface HojaExcel {
  nombre: string;
  filas: Fila[];
}

export interface OpcionesPdf {
  titulo: string;
  subtitulo?: string;
  columnas: string[];
  filas: Fila[];
  resumen?: { etiqueta: string; valor: string }[];
  orientacion?: 'p' | 'l';
}

function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(url);
}

export function descargarCSV(nombre: string, filas: Fila[]): void {
  const csv = filas.map((fila) => fila.join(';')).join('\n');
  descargar(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }), nombre);
}

export async function descargarExcel(nombre: string, hojas: HojaExcel[]): Promise<void> {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();

  for (const hoja of hojas) {
    const tabla = XLSX.utils.aoa_to_sheet(hoja.filas);
    XLSX.utils.book_append_sheet(libro, tabla, hoja.nombre.slice(0, 31));
  }

  XLSX.writeFile(libro, nombre);
}

export async function descargarPDF(nombre: string, opciones: OpcionesPdf): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: opciones.orientacion ?? 'p', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text(opciones.titulo, 40, 48);

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(opciones.subtitulo ?? `Generado el ${new Date().toLocaleString('es-AR')}`, 40, 66);

  autoTable(doc, {
    startY: 84,
    head: [opciones.columnas],
    body: opciones.filas.map((fila) => fila.map((celda) => String(celda))),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [16, 24, 40] },
    margin: { left: 40, right: 40 },
  });

  if (opciones.resumen?.length) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    doc.setFontSize(10);
    doc.setTextColor(20);
    for (const [indice, item] of opciones.resumen.entries()) {
      doc.text(`${item.etiqueta}:`, 40, y + indice * 16);
      doc.text(item.valor, 190, y + indice * 16);
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text('TP Programación IV · Cine', 40, doc.internal.pageSize.getHeight() - 24);

  doc.save(nombre);
}

export interface DatosTicketPdf {
  codigoQr: string;
  pelicula: string;
  funcion: string;
  fechaFuncion: string;
  sala: string;
  butacas: string[];
  candy: string[];
  total: string;
  estado: string;
}

export async function descargarTicketPDF(nombre: string, ticket: DatosTicketPdf): Promise<void> {
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')]);

  const doc = new jsPDF({ unit: 'pt', format: [320, 520] });
  doc.setFillColor(16, 24, 40);
  doc.rect(0, 0, 320, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('TP Cine · Ticket', 24, 40);

  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.text(ticket.pelicula, 24, 100, { maxWidth: 272 });

  const filas: [string, string][] = [
    ['Función', ticket.funcion],
    ['Fecha', ticket.fechaFuncion],
    ['Sala', ticket.sala],
    ['Butacas', ticket.butacas.join(', ') || '—'],
    ['Candy', ticket.candy.join(', ') || '—'],
    ['Total', ticket.total],
    ['Estado', ticket.estado],
  ];

  let y = 132;
  for (const [etiqueta, valor] of filas) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(etiqueta, 24, y);
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(valor, 110, y, { maxWidth: 186 });
    y += 20;
  }

  try {
    const matriz = QRCode.default.create(ticket.codigoQr, { errorCorrectionLevel: 'M' });
    const modulos = matriz.modules.size;
    const datos = matriz.modules.data;
    const escala = 2.6;
    const margen = 2;
    const lado = (modulos + margen * 2) * escala;
    const origenX = (320 - lado) / 2;
    const origenY = y + 16;

    doc.setFillColor(255, 255, 255);
    doc.rect(origenX - 6, origenY - 6, lado + 12, lado + 12, 'F');
    doc.setFillColor(16, 24, 40);

    for (let fila = 0; fila < modulos; fila++) {
      for (let columna = 0; columna < modulos; columna++) {
        if (!datos[fila * modulos + columna]) continue;
        doc.rect(
          origenX + (columna + margen) * escala,
          origenY + (fila + margen) * escala,
          escala,
          escala,
          'F',
        );
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Presentá este código en la boletería', 160, origenY + lado + 22, { align: 'center' });
  } catch {
    doc.setFontSize(9);
    doc.text(`Código: ${ticket.codigoQr}`, 160, y + 40, { align: 'center' });
  }

  doc.save(nombre);
}