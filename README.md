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

## Cómo funciona por dentro

- HTML, CSS y JavaScript puro, sin dependencias ni paso de compilación.
- Los datos se guardan en el navegador (`localStorage`), en el mismo dispositivo.
- `sw.js` (service worker) guarda una copia de la app para que abra sin internet.

```
index.html            estructura de la página
css/app.css           estilos
js/store.js           datos, plan base de mantenimiento y cálculos
js/app.js             pantallas y formularios
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

## Ideas para la versión de taller

- Cuentas de usuario y datos en la nube (por ejemplo Supabase o Firebase) para que el taller vea los vehículos de sus clientes.
- Registro del servicio desde el taller, con el sticker digital enviado al cliente por WhatsApp.
- Recordatorios automáticos cuando se acerca el próximo servicio.
- Fotos de comprobantes y del tablero.

## Nota

Los intervalos del plan base son referenciales. Lo correcto es ajustarlos según el manual de cada vehículo.
