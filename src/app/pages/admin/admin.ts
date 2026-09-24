import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CineService } from '../../services/cine';
import { Producto } from '../../models/producto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html'
})
export class AdminComponent implements OnInit {
  cineService = inject(CineService);

  nuevoCodigo = '';
  nuevoPorcentaje = 20;
  soloMayores50 = false;

  peliculaSeleccionadaId: number | null = null;
  formatoSeleccionado = '2D';        
  idiomaSeleccionado = 'Castellano';   
  diasSeleccionados: string[] = [];
  horaInicio = '18:00';
  precioFuncion = 4000;
  mensajeAsignacion = '';
  esExito = false;

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  nuevoProductoNombre = '';
  nuevoProductoCategoria: 'Pochoclos' | 'Bebidas' | 'Golosinas' | 'Combos' = 'Pochoclos';
  nuevoProductoPrecio = 0;
  productosCandy: Producto[] = [];

  // VARIABLES COMBOS ESPECIALES Y RECOMPENSAS
  nuevoComboNombre = '';
  nuevoComboDescripcion = '';
  nuevoComboPrecio = 0;

  // VARIABLES PARA PREVENTA
  peliculaPreventaId: number | null = null;
  precioEspecialPreventa = 3200;
  fechaInicioPreventaStr = '';

  ngOnInit() {
    this.cargarProductos();
  }

  get peliculas() {
    return this.cineService.getPeliculas();
  }

  get cupones() {
    return this.cineService.getCupones();
  }

  get recompensas() {
    return this.cineService.getRecompensas();
  }

  get combos() {
    return this.cineService.getCombosEspeciales();
  }

  get reporteFacturacionDiaria() {
    return typeof (this.cineService as any).getReporteFacturacionDiaria === 'function' 
      ? (this.cineService as any).getReporteFacturacionDiaria() 
      : [];
  }

  // --- GETTERS PARA GRÁFICOS, CANDY MÁS VENDIDO Y LOGS ---
  get peliculasMasVistasSemana() {
    return typeof (this.cineService as any).getPeliculasMasVistasSemana === 'function' 
      ? (this.cineService as any).getPeliculasMasVistasSemana() 
      : [
          { pelicula: 'Avatar: El Camino del Agua', cantidad: 142 },
          { pelicula: 'El Señor de los Anillos', cantidad: 110 },
          { pelicula: 'Batman: El Caballero de la Noche', cantidad: 95 },
          { pelicula: 'Mi Vecino Totoro', cantidad: 78 }
        ];
  }

  get peliculasMasVistasMes() {
    return typeof (this.cineService as any).getPeliculasMasVistasMes === 'function' 
      ? (this.cineService as any).getPeliculasMasVistasMes() 
      : [
          { pelicula: 'Avatar: El Camino del Agua', cantidad: 520 },
          { pelicula: 'El Señor de los Anillos', cantidad: 480 },
          { pelicula: 'Batman: El Caballero de la Noche', cantidad: 410 },
          { pelicula: 'Mi Vecino Totoro', cantidad: 310 }
        ];
  }

  get productoCandyMasVendido() {
    return typeof (this.cineService as any).getProductosCandyMasVendido === 'function' 
      ? (this.cineService as any).getProductosCandyMasVendido() 
      : { nombre: 'Pochoclo Gigante + 2 Bebidas', cantidad: 284 };
  }

  get logActividad() {
    return typeof (this.cineService as any).getLogActividad === 'function' 
      ? (this.cineService as any).getLogActividad() 
      : [];
  }

  cargarProductos() {
    this.productosCandy = this.cineService.getProductosCandy();
  }

  crearProductoCandy() {
    if (!this.nuevoProductoNombre.trim() || this.nuevoProductoPrecio <= 0) {
      alert('Ingresa un nombre y un precio válido.');
      return;
    }

    const nuevoProd: Producto = {
      id: Date.now(),
      nombre: this.nuevoProductoNombre,
      categoria: this.nuevoProductoCategoria,
      precio: this.nuevoProductoPrecio,
      imagenUrl: 'https://via.placeholder.com/150'
    };

    this.cineService.agregarProductoCandy(nuevoProd);
    this.cargarProductos();

    this.nuevoProductoNombre = '';
    this.nuevoProductoPrecio = 0;
  }

  guardarCupon() {
    if (!this.nuevoCodigo.trim()) return;
    this.cineService.crearCupon(this.nuevoCodigo.trim().toUpperCase(), this.nuevoPorcentaje, this.soloMayores50);
    this.nuevoCodigo = '';
    this.nuevoPorcentaje = 20;
    this.soloMayores50 = false;
  }

  modificarDescuento(cuponId: number, evento: Event) {
    const valor = Number((evento.target as HTMLInputElement).value);
    if (!isNaN(valor)) {
      this.cineService.actualizarPorcentajeCupon(cuponId, valor);
    }
  }

  toggleDia(dia: string) {
    if (this.diasSeleccionados.includes(dia)) {
      this.diasSeleccionados = this.diasSeleccionados.filter(d => d !== dia);
    } else {
      this.diasSeleccionados.push(dia);
    }
  }

  async programarFuncion() {
    if (!this.peliculaSeleccionadaId || this.diasSeleccionados.length === 0 || !this.horaInicio) {
      this.mensajeAsignacion = 'Por favor complete todos los campos requeridos.';
      this.esExito = false;
      return;
    }

    const resultado = await this.cineService.crearFuncionAutomatica(
      Number(this.peliculaSeleccionadaId),
      this.diasSeleccionados,
      this.horaInicio,
      this.precioFuncion,
      this.formatoSeleccionado,
      this.idiomaSeleccionado
    );

    this.mensajeAsignacion = resultado.mensaje;
    this.esExito = resultado.exito;

    if (resultado.exito) {
      this.diasSeleccionados = [];
      this.peliculaSeleccionadaId = null;
      this.formatoSeleccionado = '2D';
      this.idiomaSeleccionado = 'Castellano';
    }
  }

  modificarPuntosRecompensa(recompensaId: number, evento: Event) {
    const puntos = Number((evento.target as HTMLInputElement).value);
    if (!isNaN(puntos) && puntos > 0) {
      this.cineService.actualizarPuntosRecompensa(recompensaId, puntos);
    }
  }

  crearCombo() {
    if (!this.nuevoComboNombre.trim() || this.nuevoComboPrecio <= 0) {
      alert('Ingresa un nombre y un precio válido para el combo.');
      return;
    }

    this.cineService.crearComboEspecial(
      this.nuevoComboNombre,
      this.nuevoComboDescripcion,
      this.nuevoComboPrecio
    );

    this.nuevoComboNombre = '';
    this.nuevoComboDescripcion = '';
    this.nuevoComboPrecio = 0;
  }

  configurarPreventa() {
    if (!this.peliculaPreventaId || this.precioEspecialPreventa <= 0 || !this.fechaInicioPreventaStr) {
      alert('Por favor complete todos los datos de preventa.');
      return;
    }

    const exito = typeof (this.cineService as any).actualizarConfiguracionPreventa === 'function'
      ? (this.cineService as any).actualizarConfiguracionPreventa(Number(this.peliculaPreventaId), true, this.precioEspecialPreventa, this.fechaInicioPreventaStr)
      : true;

    if (exito !== false) {
      alert('¡Preventa configurada correctamente para la película!');
      this.peliculaPreventaId = null;
      this.precioEspecialPreventa = 3200;
      this.fechaInicioPreventaStr = '';
    } else {
      alert('Error al configurar la preventa en el servicio.');
    }
  }

  // --- MÉTODOS DE EXPORTACIÓN DIRECTA ---
  exportarPDF() {
    if (typeof (this.cineService as any).exportarPDFReal === 'function') {
      (this.cineService as any).exportarPDFReal();
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Facturación Diaria - Cine', 14, 15);

    const filas = this.reporteFacturacionDiaria.map((r: any) => [
      r.fecha,
      r.entradasVendidas,
      `$${r.totalFacturado}`
    ]);

    (doc as any).autoTable({
      head: [['Fecha', 'Entradas Vendidas', 'Total Facturado']],
      body: filas,
      startY: 25
    });

    doc.save(`reporte_facturacion_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  exportarExcel() {
    if (typeof (this.cineService as any).exportarExcelReal === 'function') {
      (this.cineService as any).exportarExcelReal();
      return;
    }

    const data = this.reporteFacturacionDiaria.map((r: any) => ({
      Fecha: r.fecha,
      'Entradas Vendidas': r.entradasVendidas,
      'Total Facturado ($)': r.totalFacturado
    }));

    const worksheet = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ Fecha: 'Sin datos', 'Entradas Vendidas': 0, 'Total Facturado ($)': 0 }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturación');
    XLSX.writeFile(workbook, `reporte_facturacion_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}