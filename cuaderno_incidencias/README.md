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

## 🔑 Permisos en educaand (IMPORTANTE)

Para que **ningún profesor tenga problemas de permisos** al registrar incidencias,
generar informes o imprimir, la app debe desplegarse así:

*Implementar → Nueva implementación (o Gestionar implementaciones) → ⚙ Tipo: Aplicación web*

- **Ejecutar como:** **Yo** (`tu_cuenta@g.educaand.es`, la dueña del proyecto).
- **Quién tiene acceso:** **Cualquier usuario de tu organización** (o «Cualquier
  usuario de g.educaand.es»).

Con **«Ejecutar como: Yo»**:

- Todo el código del servidor (leer/escribir las hojas, leer los membretes del
  Drive, generar el PDF, enviar el email) se ejecuta con **tu** cuenta.
- Los profesores **no necesitan** tener acceso a las hojas de cálculo ni a los
  membretes, y **no ven ninguna pantalla de permisos** al entrar.
- No aparece el aviso de «app no verificada» a cada profe (solo tú autorizas una vez).

> ⚠️ Requisito: **tu** cuenta (la que ejecuta) debe tener acceso a las 4 IDs
> configuradas (las dos hojas de cálculo y los dos membretes). Como son tuyas, ya lo cumple.

### Por qué el PDF ahora no da error de permisos

Antes el botón de PDF devolvía un enlace a un Google Doc creado en tu Drive; al
abrirlo, el profesor (que no es el dueño del Doc) recibía **«Necesitas permiso
para acceder»**. Ahora el PDF se genera en el servidor y **se descarga directamente**
en el dispositivo del profe (el Doc temporal se borra solo), así que no hay ningún
acceso cruzado ni permisos que pedir. El botón **🖨 Imprimir** tampoco pide permisos:
el informe se arma en el servidor y se imprime desde el navegador.

## Nota de seguridad

La contraseña del panel se comprueba en el servidor (no viaja en el HTML), pero
para un control de acceso real conviene además **desplegar la app web con acceso
restringido** (por ejemplo, solo usuarios de tu dominio `@g.educaand.es`) desde
las opciones de implementación. La contraseña es una capa adicional, no la única.
