# ClaritaNet — contexto del proyecto (léeme antes de tocar nada)

Este repositorio contiene **ClaritaNet**, el portal docente del **CEIP Clara Campoamor**,
derivado de la app "San Sebastián Net" (SSNet), cuyo autor es Ángel Arana. Un equipo del
CEIP Clara Campoamor continúa la personalización contigo (Claude) desde su propia cuenta.

## Reglas que NO se rompen
- **CERO datos de SSNet / CEIP San Sebastián.** Ni nombres del profesorado, ni ids de
  hojas o carpetas, ni enlaces, ni alumnado de ese centro. Si aparece algo de SSNet, es
  un error: quítalo.
- **Marca:** siempre **ClaritaNet** (C y N mayúsculas) y **CEIP Clara Campoamor**.
- **Identidad visual (paleta "Clara"):** vino `#7A1B39`, ciruela `#5B2A5F`, cobre `#BE5A2C`,
  lila `#7E4E97`, rosa `#B84E86`, ciencia `#2E7D64`; fondos crema/rosados. Valores del
  centro: ciencia, igualdad, respeto, convivencia. El logo es la ilustración de Clara
  Campoamor, incrustada en `claritanet/Membretes.html` (variable `CLARITA_LOGO`).

## Arquitectura (3 piezas + 1 hoja)
1. **Portal** (`claritanet/`): aplicación de **Google Apps Script** (web app). Archivos:
   `Codigo.gs`, `Index.html`, `Styles.html`, `Scripts.html`, `Membretes.html`,
   `crearAlumnos.gs`, `appsscript.json`. El bloque `CONFIG` (arriba de `Codigo.gs`) tiene
   `SPREADSHEET_ID`, títulos, prefijo de correo y P27. Es lo que ve el claustro: login,
   Al día (tablón, horario, sustituciones, recreo), Agenda, Cuadernos, Proyectos,
   Utilidades.
2. **App de Gestión** (`index.html` en la raíz): web/PWA **cliente** (guarda en
   localStorage, clave `clarita_dat_v7`). El equipo directivo monta plantilla, horarios,
   sustituciones y reservas. **No toca Google Sheets directamente**: exporta al portal por
   `SCRIPT_URL`. Config en las líneas ~340-341 (`SHEET_ID`, `SCRIPT_URL`).
3. **Mini-apps aparte** (pendientes de personalizar): Portal de Actas de Evaluación,
   Cuadernos de Sustituciones/Incidencias/Enfermedades, Centro de Comunicaciones. Cada una
   es **su propio proyecto de Apps Script** con sus datos; se personalizan una a una
   pegando su código, igual que se hizo con el portal.
4. **Hoja compartida `BD_ClaritaNet`** (id `1rYYBau4Jtn2Y3VwzZXHBGwXtcLuP2fylvR0g4A0dRNs`):
   la gestión escribe (a través del portal) y el portal lee.

Cadena de datos:
`Gestión → SCRIPT_URL (/exec del portal) → _acc del portal (guardar / publicarHorarios / …) → BD_ClaritaNet → el portal lo muestra`.

## Grupos del centro (23)
- Infantil: I3A I3B · I4A I4B · I5A I5B
- Primaria: 1ºA 1ºB · 2ºA 2ºB · 3ºA 3ºB 3ºC · 4ºA 4ºB 4ºC 4ºD · 5ºA 5ºB 5ºC · 6ºA 6ºB 6ºC

Claves en el código: `3anosA…5anosB` y `1oA…6oC`. Ya están puestas en
`claritanet/Scripts.html` (`TODOS_CURSOS`, `CURSOS_LABELS`), `claritanet/Index.html`
(`CURSOS`/`GRUPOS`) y en la gestión (`grupos` por nivel: 2·2·2·2·2·3·4·3·3).

## Estado (25-09-2026)
- **Hecho:** portal funcionando (login, tema Clara, iconos del menú, logo de Clara);
  gestión personalizada (identidad, 23 grupos, plantilla de ejemplo vaciada,
  `SHEET_ID`=BD_ClaritaNet); marca "ClaritaNet" en todo; cero datos de SSNet en el código.
- **Pendiente:** rellenar enlaces (MEET_URLS, cuadernos, radio, actas, comunicaciones),
  `FOTOS_FOLDER_ID`, `LIBROS_FOLDER_ID`, `YT_USER`, membretes, festivos de Sevilla;
  poner `SCRIPT_URL` del portal en la gestión; retheme visual de la gestión; personalizar
  las mini-apps; vaciar/rellenar las pestañas de BD_ClaritaNet. (Detalle en el documento
  del proyecto "ClaritaNet · Qué falta para completarla".)

## Cómo desplegar
- **Portal:** pega los archivos de `claritanet/` en un proyecto de Apps Script →
  Implementar como aplicación web (ejecutar como *usuario que implementa*, acceso
  *cualquiera*) → al cambiar algo, reimplantar con **Nueva versión**.
- **Gestión:** aloja el `index.html` (GitHub Pages u otro) y, en su **Configuración**,
  pon `SCRIPT_URL` = la URL `/exec` del portal ClaritaNet.

## Al editar (para Claude)
- Valida la sintaxis de los `.gs`/`.html` antes de dar algo por bueno.
- No incrustes ids ni nombres del centro anterior.
- Mantén las funciones y el cableado heredados (features): P27, reservas, salidas,
  control de libros, cartelera, cumpleaños, horarios, etc.
- Entrega los archivos listos para pegar y explica el paso a paso al usuario.
