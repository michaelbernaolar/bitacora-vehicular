# Bitácora vehicular

Página web para llevar el control de una **moto o un auto**: cargas de combustible, mantenimientos, reparaciones y gastos. Avisa cuándo toca el próximo servicio (cambio de aceite, SOAT, revisión técnica, etc.) según el kilometraje o la fecha, lo que llegue primero.

No necesita Play Store: se abre con un enlace desde el navegador. En Chrome (Android) se puede usar **“Agregar a pantalla de inicio”** para tenerla como un ícono más, y funciona sin conexión.

## Qué hace

- Varios vehículos en un mismo “garaje”, cada uno de tipo moto o auto.
- Registros de combustible (galones o litros, tanque lleno), mantenimiento, reparación y otros gastos.
- **Plan de servicio** con intervalos por km y/o meses. Al crear el vehículo se carga un plan base para moto o para auto que se puede editar.
- **Sticker de próximo servicio**, como el que pegan en el lubricentro, con estado al día / pronto / vencido.
- Rendimiento en km/gal (método de tanque lleno a tanque lleno), gasto del mes, gasto total y gráfico de los últimos 6 meses.
- Respaldo: descarga y restauración de los datos en un archivo `.json`.
- **Cuentas de usuario** (opcional): cada persona crea su cuenta con correo y contraseña, y su bitácora se guarda en la nube. Puede abrirla desde cualquier celular o PC. Sin cuenta, todo se guarda solo en el dispositivo.
- Datos de ejemplo para probar, que se quitan con un botón, y opción de borrar todo para empezar de cero.

## Cómo funciona por dentro

- HTML, CSS y JavaScript puro, sin paso de compilación. La única librería es `supabase-js` (incluida en `vendor/`), para las cuentas.
- Los datos siempre se guardan en el navegador (`localStorage`), así la app funciona sin señal.
- Si el usuario inició sesión, la bitácora también se guarda en Supabase (una fila por usuario en la tabla `bitacoras`). Cuando hay cambios en dos dispositivos, gana la versión modificada más recientemente.
- `sw.js` (service worker) guarda una copia de la app para que abra sin internet.

```
index.html            estructura de la página
css/app.css           estilos
js/store.js           datos, plan base de mantenimiento y cálculos
js/app.js             pantallas y formularios
js/sync.js            cuentas de usuario y sincronización con Supabase
js/config.js          URL y clave del proyecto Supabase
supabase/esquema.sql  tabla y reglas de seguridad para Supabase
vendor/supabase.js    librería oficial de Supabase (licencia MIT)
sw.js                 funcionamiento sin conexión
manifest.webmanifest  nombre e ícono al agregarla a la pantalla de inicio
fonts/                tipografía Barlow (licencia SIL OFL, ver fonts/OFL.txt)
```

## Probar en tu PC

Cualquier servidor estático sirve. Con Python:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

## Publicar con GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
3. En uno o dos minutos queda en `https://<tu-usuario>.github.io/bitacora-vehicular/`.

Cuando publiques cambios, sube el valor de `VERSION` en `sw.js` (por ejemplo `bitacora-v2`) para que los celulares descarguen la versión nueva.

## Activar las cuentas de usuario (Supabase, plan gratuito)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (región: São Paulo, la más cercana a Perú).
2. En el proyecto: **SQL Editor → New query**, pega el contenido de `supabase/esquema.sql` y presiona **Run**. Esto crea la tabla y las reglas para que cada usuario vea solo sus datos.
3. **Authentication → URL Configuration**:
   - *Site URL*: `https://michaelbernaolar.github.io/bitacora-vehicular/`
   - *Redirect URLs*: agrega la misma dirección (y `http://localhost:8000/` si pruebas en tu PC).
4. **Project Settings → API Keys**: copia la *Project URL* y la *publishable key* (o *anon key*) y pégalas en `js/config.js`.
5. Sube el cambio. Aparecerá la opción “Crea tu cuenta o inicia sesión” en la pantalla principal.

Por defecto Supabase pide confirmar el correo al crear la cuenta. Se puede desactivar en **Authentication → Sign In / Providers → Email → Confirm email**, aunque es mejor dejarlo activo.

En el plan gratuito, Supabase pausa el proyecto si pasa una semana sin uso. Se reactiva desde el panel y los datos no se pierden; mientras tanto la app sigue funcionando con la copia del dispositivo.

La clave *publishable/anon* puede estar en el código público. Lo que protege los datos de cada usuario son las reglas (RLS) del paso 2. Nunca pongas aquí la clave *secret* o *service_role*.

## Ideas para la versión de taller

- Que el cliente comparta un vehículo con el taller, para que el taller vea su historial.
- Registro del servicio desde el taller, con el sticker digital enviado al cliente por WhatsApp.
- Recordatorios automáticos cuando se acerca el próximo servicio.
- Fotos de comprobantes y del tablero.

## Nota

Los intervalos del plan base son referenciales. Lo correcto es ajustarlos según el manual de cada vehículo.
