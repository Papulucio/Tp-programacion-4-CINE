# TpCine - Sistema de Gestión Cinematográfica (PWA)

Aplicación web progresiva (PWA) desarrollada en Angular para la administración integral, venta de entradas, combos de Candy Bar y mapa de butacas en tiempo real para salas de cine.

## Enlaces del Proyecto
- **Repositorio GitHub:** [https://github.com/Papulucio/Tp-programacion-4-CINE](https://github.com/Papulucio/Tp-programacion-4-CINE)
- **Aplicación en Producción (Vercel):** [https://tp-programacion-4-cine.vercel.app](https://tp-programacion-4-cine.vercel.app)

---

## Arquitectura y Decisiones Técnicas

### 1. Frontend: Angular 19+
- **Standalone Components:** Estructura modular sin necesidad de `NgModule`, reduciendo el acoplamiento y mejorando los tiempos de carga.
- **Signals & Reactive State:** Manejo del estado reactivo del mapa de butacas, el carrito de compras y la sesión del usuario.
- **Service Worker & PWA:** Implementación de `@angular/service-worker` con manifiesto web (`manifest.webmanifest`) para permitir la instalación de la app como ejecutable nativo.

### 2. Backend & Base de Datos: Supabase
- **PostgreSQL & Row Level Security (RLS):** Persistencia de datos de usuarios, funciones, auditoría de logs y transacciones.
- **Realtime Subscriptions:** Actualización en tiempo real de la selección de butacas entre múltiples usuarios simultáneos.

### 3. Asignación Automática de Salas
Algoritmo en frontend/backend que valida el horario de cada función disponible garantizando que no existan solapamientos entre proyecciones en una misma sala, contemplando la duración exacta del film más 30 minutos obligatorios de sanitización e intervalo.

---

## Funcionalidades Principales

1. **Cartelera e Interacción:**
   - Top 3 de películas más vistas.
   - Buscador por texto y filtrado por múltiples géneros.
   - Restricción de compra según la edad verificada del usuario.

2. **Mapa de Butacas en Tiempo Real:**
   - Identificación visual de butacas Estándar, Adaptadas para Discapacidad (Filas J y K) y VIP (Filas R, S y T).
   - Bloqueo de asientos seleccionados en tiempo real.

3. **Candy Bar, Cupones y Fidelización:**
   - Venta individual y combos especiales de snacks/bebidas.
   - Descuentos dinámicos, cupón de bienvenida y cupones para mayores de 50 años.
   - Sistema de fidelización con acumulación de 1 punto por peso consumido y catálogo de canje.

4. **Entradas PDF y Validación por QR:**
   - Emisión automática de comprobante PDF con código QR.
   - Módulo de escaneo para empleados con invalidación de un solo uso.

5. **Panel Administrativo:**
   - Reportes de facturación exportables a PDF y Excel.
   - Log de auditoría con registro de fecha y hora de cada acción crítica.
