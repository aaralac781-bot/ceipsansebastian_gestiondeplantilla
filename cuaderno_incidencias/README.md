# Cuaderno de Incidencias — CEIP San Sebastián

App de Google Apps Script para registrar incidencias del alumnado, con informes
imprimibles, panel de Dirección y aviso por email.

## Archivos

- **`Codigo.gs`** → pégalo en el archivo de código del editor de Apps Script.
- **`Index.html`** → el archivo HTML debe llamarse exactamente **`Index`**
  (sin `.html`), porque el backend lo carga con `createHtmlOutputFromFile('Index')`.

## Cómo actualizar tu proyecto

1. Abre tu proyecto en [script.google.com](https://script.google.com).
2. Sustituye el contenido de tu archivo `.gs` por el de `Codigo.gs`.
3. Sustituye el contenido de tu archivo `Index` por el de `Index.html`.
4. Guarda (💾).
5. **Vuelve a autorizar los permisos** (el envío de email es un permiso nuevo):
   - Ejecuta una vez la función `autorizarPermisos` desde el editor y acepta los permisos, **o**
   - simplemente registra una incidencia de prueba y acepta el aviso de permisos que aparezca.
6. **Vuelve a desplegar** la app web: *Implementar → Gestionar implementaciones →
   ✏️ (editar) → Versión: «Nueva versión» → Implementar*. Si no creas versión
   nueva, la URL seguirá mostrando el código antiguo.

## Novedades de esta versión

- **Informe rediseñado (Imprimir y PDF)**: cada incidencia se muestra como una
  ficha. Los datos cortos (fecha, gravedad, docente) van arriba y bien ajustados,
  y la descripción y las medidas van debajo ocupando todo el ancho del folio.
- **Botón «🖨 Imprimir»**: genera el informe con los membretes superior e inferior
  del centro y abre el diálogo de impresión (puedes imprimir en papel o «Guardar
  como PDF» desde el propio navegador).
- **Panel de Dirección** (botón «🔒 Acceso Dirección»): protegido con contraseña,
  muestra un resumen por cursos de todos los alumnos con incidencias, con recuento
  por gravedad, y permite ver el historial e imprimir el informe de cada uno.
- **Aviso por email**: cada incidencia registrada envía un correo con todos los
  datos a la dirección configurada.

## Configuración (parte superior de `Codigo.gs`)

```js
const EMAIL_AVISOS   = '41003522@g.educaand.es'; // Destinatario de los avisos
const CLAVE_DIRECCION = 'Ssnet2026';             // Contraseña del panel de Dirección
```

## Nota de seguridad

La contraseña del panel se comprueba en el servidor (no viaja en el HTML), pero
para un control de acceso real conviene además **desplegar la app web con acceso
restringido** (por ejemplo, solo usuarios de tu dominio `@g.educaand.es`) desde
las opciones de implementación. La contraseña es una capa adicional, no la única.
