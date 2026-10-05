# TP Programación IV · Cine

Aplicación web de un cine: cartelera, compra de entradas con selección de butacas,
candy bar, combos, cupones, fidelización por puntos, panel de administración con
reportes y validación de entradas por QR.

- **Angular** 22 (standalone, signals, control flow con `@if` / `@for`)
- **Supabase** como persistencia remota de funciones y butacas, con respaldo en
  `localStorage` para que la app siga funcionando si la red falla
- **PWA** instalable y operable sin conexión

## Puesta en marcha

```bash
npm install
npm start        # servidor de desarrollo en http://localhost:4200
npm run build    # build de producción en dist/tp-cine
npm test         # suite de tests (Vitest)
```

## Cuentas de demostración

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin@cine.com` | `admin123` |
| Empleado (boletería) | `empleado@cine.com` | `empleado123` |
| Cliente | `cliente@cine.com` | `cliente123` |
| Cliente senior (+13) | `senior@cine.com` | `senior123` |

También se puede comprar sin registrado: en ese caso el ticket queda asociado al
usuario anónimo y no se acumulan puntos.

## Reglas de negocio implementadas

- **Butacas**: 19 filas por sala. 18 filas de 28 butacas y una fila adaptada de 14.
  La distribución parte de A–T, se elimina la fila K y J queda como fila adaptada:
  **518 butacas por sala**. Las filas R, S y T son VIP con recargo.
- **Funciones**: entre dos funciones de la misma sala hay una separación mínima de
  30 minutos contados desde el final de la película.
- **Clasificación etaria**: solo `0`, `13` y `18`. Las películas restringidas bloquean la
  compra de menores sin tutor y de compras anónimas.
- **Preventa**: se abre 7 días antes del estreno, con precio propio y aviso en la app.
- **Compra anónima**: permitida salvo en películas con clasificación etaria.
- **Cancelación**: hasta 2 horas antes de la función. No se devuelve dinero: se
  acredita el saldo en la cuenta del cliente.
- **Cupones**: cupón de primera compra (20%), cupones con descuento porcentual,
  límite de edad, de primera compra y de cantidad de usos.
- **Fidelización**: 1 punto por cada peso gastado, con recompensas canjeables que
  generan un ticket con QR propio.
- **QR**: cada ticket tiene un código único. Sirve tanto para el ingreso como para
  retirar el candy bar, y se dibuja como SVG real para que la cámara lo lea.

## Estructura

```
src/app
├── core
│   ├── guards/rol.guard.ts     sesionGuard, adminGuard, empleadoGuard
│   ├── services/               storage.service.ts (localStorage tipado)
│   └── utils/                  fecha.util.ts, exportar.ts (CSV / Excel / PDF)
├── models/                     sala, funcion, pelicula, ticket, cupon, fidelizacion...
├── services/
│   ├── auth.service.ts         registro, login, roles, alertas de estreno
│   ├── cine.service.ts         dominio: butacas, funciones, compras, reportes, bitácora
│   └── supabase.ts             cliente remoto tolerante a fallos
├── components/                 pelicula-card, qr-code
└── pages/                      home, login, registro, compra, perfil, admin, empleado
```

## Reportes y facturación

El panel de administración incluye facturación diaria y mensual, ocupación por sala,
top de películas por semana y por mes, productos de candy más vendidos y bitácora de
operaciones. Todo se exporta en **PDF**, **Excel** y **CSV**. Las librerías de PDF y
Excel se cargan de forma diferida (`import()` dinámico), así que no forman parte del
bundle inicial.

Desde el perfil del cliente se puede descargar el **ticket en PDF** con el QR
impreso para presentarlo en la boletería.

## Persistencia

- `localStorage` con el prefijo `tpcine:` guarda películas, salas, funciones, butacas,
  productos, cupones, combos, tickets, usuarios, canjes y bitácora.
- Supabase guarda funciones y reservas de butacas. Si la tabla no existe o la red
  falla, el servicio marca la conexión como caída y la app sigue con los datos
  locales: nunca se corta una compra por un error de red.

## PWA

`ngsw-config.json` cachea el shell de la aplicación y las imágenes de las películas. Las
llamadas a Supabase usan estrategia de red con respaldo en caché. El service worker
solo se registra en builds de producción.

## Tests

131 tests en 15 suites, sobre Vitest:

```
src/app/app.spec.ts                              shell y navegación
src/app/core/core.spec.ts                        guards y reglas transversales
src/app/core/services/storage.service.spec.ts    persistencia
src/app/services/cine.service.spec.ts            dominio, compras, QR, reportes
src/app/services/auth.service.spec.ts            registro, login, edad, preventa
src/app/services/supabase.spec.ts                cliente remoto
src/app/components/qr-code/qr-code.spec.ts       generación del QR
src/app/components/pelicula-card/…               tarjeta de película
src/app/pages/…                                  una suite por pantalla
```

Los tests no tocan la red: `src/app/testing/supabase.stub.ts` reemplaza el cliente
remoto por un doble que devuelve `null`, que es exactamente lo que hace el servicio
real cuando la tabla no existe.