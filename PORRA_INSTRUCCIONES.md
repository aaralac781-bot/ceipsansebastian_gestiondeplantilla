# ⚽ Porra del CEIP San Sebastián · Instrucciones

App de la **Tercera Porra del CEIP San Sebastián**, organizada por Antonio Jiménez. 💚🤍

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `porra.html` | La aplicación (lo que abre el claustro en el móvil). |
| `porra_core.js` | Las reglas de la porra: bote, pagos, duplicados, cierre, clasificación y reparto. |
| `porra_apps_script.gs` | El "servidor" gratuito en Google, que guarda los datos en una Hoja de cálculo. |
| `antonio_porra.png` | La foto de Antonio con la capa del Betis, sin fondo. |
| `manifest-porra.json` | Para instalar la porra en el móvil como si fuera una app. |

Sin conectarla a Google, la app funciona en **modo prueba**: los datos se guardan solo en el móvil u ordenador donde se usa. Sirve para trastear, pero no para jugar con todo el claustro. Para eso hay que hacer los pasos de abajo, que se hacen una sola vez y llevan unos 10 minutos.

---

## Paso 1 · Crear la "base de datos" (una Hoja de Google)

> 💡 Mejor con una **cuenta personal de Gmail** (de Antonio o tuya). Las cuentas `@g.educaand.es` no suelen permitir que entre gente de fuera del dominio, y entonces no podría entrar nadie sin iniciar sesión.

1. Entra en <https://sheets.google.com> y crea una hoja en blanco. Llámala **Porra CEIP San Sebastián**.
2. En el menú: **Extensiones → Apps Script**.
3. Se abre el editor con un archivo `Código.gs`. Borra lo que tenga y pega **todo** el contenido de `porra_apps_script.gs`.
4. Pulsa **＋ (Añadir archivo) → Secuencia de comandos**, llámalo `porra_core` y pega **todo** el contenido de `porra_core.js`.
5. Guarda (💾).
6. Arriba, en el desplegable de funciones, elige **`configurarPorra`** y pulsa **▶ Ejecutar**. Google te pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a … (no seguro) → Permitir*. Es normal, porque el script es tuyo.
   Al terminar verás en la hoja las pestañas `participantes`, `jornadas`, `pronosticos`, `config` y `escudos`.

## Paso 2 · Publicarlo

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. En el engranaje ⚙️, elige el tipo **Aplicación web**.
3. Rellena así:
   - **Ejecutar como:** *Yo*
   - **Quién tiene acceso:** *Cualquier usuario*
4. Pulsa **Implementar** y **copia la URL**, que termina en `/exec`.

## Paso 3 · Pegar la URL en la app

1. Abre `porra.html` (en GitHub: botón ✏️ *Edit*).
2. Busca esta línea, que está casi al principio del bloque `<script>`:
   ```js
   var PORRA_API = '';
   ```
3. Pega la URL entre las comillas:
   ```js
   var PORRA_API = 'https://script.google.com/macros/s/AKfy..../exec';
   ```
4. Guarda (*Commit changes*). El aviso amarillo de "Modo prueba" desaparecerá.

La porra queda en la misma web que la app de gestión:
`https://aaralac781-bot.github.io/ceipsansebastian_gestiondeplantilla/porra.html`
(si GitHub Pages publica la rama `main`, estos archivos tienen que estar en `main`).

## Paso 4 · Contraseñas (¡cámbialas!)

| | Contraseña inicial |
|---|---|
| Contraseña de la porra (para el claustro) | `betis` |
| Contraseña de Antonio (zona privada) | `antonio1907` |

Antonio entra en **🔒 Zona privada de Antonio** (abajo del todo, o con `porra.html#antonio`), va a **⚙️ Ajustes** y las cambia.

---

## 🧑‍🏫 Cómo se usa (participantes)

1. Abren el enlace y meten la **contraseña de la porra**.
2. La primera vez pulsan **"Apuntarme por primera vez"**, escriben su nombre e inventan un **PIN de 4 números**. Con ese PIN entran desde cualquier móvil, y nadie más puede tocar su pronóstico.
3. Rellenan los tres resultados y pulsan **"¡Me mojo!"**. Antonio les contesta: *"¡Gracias, fiera! Pero hasta que no me pagues el euro…"* 😄
4. Pueden cambiar su pronóstico hasta el cierre (viernes a las 12:30).
5. Los pronósticos de los demás son **secretos hasta el cierre**. Solo se ve quién ha jugado y quién ha pagado (💶 o ⏳).
6. Pestañas: **Jornada**, **Clasificación** (con el bote y el reparto final si el curso acabara hoy), **Historial** y **Normas**.

## 😎 Cómo se usa (Antonio)

- **📅 Jornadas:** crear la jornada de la semana. Viene preparada con el partido del Betis, el del Sevilla y uno sorpresa, y con el cierre puesto el próximo **viernes a las 12:30**. También puede editarla, cerrarla antes de tiempo, reabrirla o borrarla.
- **💶 Pagos y pronósticos:** ve todos los pronósticos y pulsa **"Marcar pagado"** cuando le dan el euro. **Un pronóstico sin marcar como pagado no cuenta para nada**: ni premio, ni bote, ni clasificación. También puede añadir pronósticos a mano (de quien se lo dé en papel), incluso con la jornada ya cerrada.
- **🧮 Resultados:** mete los resultados reales. Con los tres puestos, la app calcula sola si hay pleno, quién se lleva el bote o si el bote se acumula.
- **👥 Participantes:** poner un PIN nuevo a quien lo olvide, renombrar o borrar.
- **🛡️ Escudos:** cada equipo sale con un escudo dibujado con sus colores. Si se quiere el oficial, se sube una imagen desde el móvil o se pega su dirección web.
- **⚙️ Ajustes:** contraseñas, aportación por jornada (1 €) y bote inicial.

## 📜 Reglas que aplica la app automáticamente

- **Pleno = acertar los 3 resultados exactos.** Quien lo consigue se lleva el bote. Si hay varios, se reparte a partes iguales.
- **1 € por jornada.** El bote suma solo los pronósticos pagados.
- **No se pueden repetir los tres resultados.** Si alguien intenta guardar uno idéntico al de otro compañero, la app no le deja ("¡Copión!" 😂). Coincidir en dos sí se permite.
- **Cierre:** a la hora fijada (viernes 12:30) ya no se puede pronosticar ni cambiar.
- **Sin pleno, el bote se acumula** para la semana siguiente.
- **Reparto final** (si nadie hace pleno en todo el curso): 50 % / 30 % / 20 % según el total de partidos acertados. Los empatados suman los porcentajes de las posiciones que ocupan y se los reparten:
  - empate entre 2.º y 3.º → 50 % entre los dos;
  - empate entre 3.º, 4.º y 5.º → 20 % entre los tres;
  - empate entre los tres primeros → 100 % entre los tres.
  - ⚠️ **Empate entre 1.º y 2.º:** el reglamento dice "70 %", pero 50 + 30 suman **80 %**. La app reparte el 80 % (40 % cada uno) y el 20 % restante al siguiente. Si Antonio quiere otra cosa, se cambia.

## ❓ Problemas frecuentes

- **"No hay conexión con el servidor"**: revisa que la URL pegada termina en `/exec` y que el acceso es *Cualquier usuario*.
- **Cambié el código de Apps Script y no se nota**: hay que ir a *Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar*. La URL no cambia.
- **Copia de seguridad**: todo está en la Hoja de Google. Basta con *Archivo → Hacer una copia*.
