# ⚽ Porra del CEIP San Sebastián · Instrucciones

App de la **Tercera Porra del CEIP San Sebastián**, organizada por Antonio Jiménez. 💚🤍

## ✅ Forma fácil: todo dentro de Google (2 archivos)

En la carpeta `apps_script/` hay **dos archivos listos para copiar y pegar**. No hace falta GitHub ni pegar ninguna URL.

| En el editor de Apps Script… | …pega el contenido de |
|---|---|
| **`Código.gs`** | `apps_script/Codigo.gs` |
| **`Index.html`** | `apps_script/Index.html` |

> 💡 Mejor con una **cuenta personal de Gmail**. Las cuentas `@g.educaand.es` no suelen dejar entrar a gente sin iniciar sesión.

1. Abre la Hoja de la porra → **Extensiones → Apps Script**. Si no tienes ninguna, crea una hoja en blanco en <https://sheets.google.com> y luego haz esto.
2. A la izquierda pulsa **`Código.gs`**. Selecciona todo (Ctrl+A), bórralo y pega **todo** `apps_script/Codigo.gs`.
3. Pulsa **`Index.html`**. Selecciona todo (Ctrl+A), bórralo y pega **todo** `apps_script/Index.html`.
   - Si no existe `Index.html`: pulsa **＋ → HTML** y llámalo exactamente `Index`.
   - Si tienes otros archivos que no sean estos dos, bórralos (⋮ → Eliminar).
4. Guarda (💾).
5. En la barra de arriba, en el desplegable que está al lado de *Depuración*, elige **`configurarPorra`** y pulsa **▶ Ejecutar**. Acepta los permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a… → Permitir*. En la hoja aparecerán las pestañas `participantes`, `jornadas`, `pronosticos`, `config` y `escudos`.
6. **Implementar**:
   - Si es la primera vez: **Implementar → Nueva implementación → ⚙️ Aplicación web**. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier usuario**. Pulsa **Implementar**.
   - Si ya estaba implementada: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**.
7. Copia la **URL de la aplicación web** (termina en `/exec`). **Ese es el enlace de la porra** que se manda al claustro.

Cada vez que haya una versión nueva, se repiten los pasos 2, 3, 4 y 6 (el 6 con «Nueva versión»). Los datos no se pierden.

---

## Otra forma: web en GitHub + servidor en Google

Los archivos sueltos de la raíz son para alojar la web en GitHub Pages:

| Archivo | Para qué sirve |
|---|---|
| `porra.html` | La aplicación. |
| `porra_core.js` | Las reglas: bote, pagos, duplicados, cierre, clasificación y reparto. |
| `porra_apps_script.gs` | El servidor en Google. |
| `antonio_porra.png` | La foto de Antonio, sin fondo. |
| `manifest-porra.json` | Para instalarla en el móvil como app. |

Pasos: en Apps Script crea `porra_core` con el contenido de `porra_core.js` y `Código.gs` con el de `porra_apps_script.gs`. Ejecuta `configurarPorra` e implementa como en la forma fácil. Después pega la URL `/exec` en `porra.html`, en la línea `var PORRA_API = '';`.

Si no se conecta a Google, `porra.html` funciona en **modo prueba**: los datos se quedan solo en ese dispositivo.

Para regenerar los dos archivos de `apps_script/` después de cambiar el código: `python3 apps_script/construir.py`.

## Paso 4 · Contraseñas (¡cámbialas!)

| | Contraseña inicial |
|---|---|
| Contraseña de la porra (para el claustro) | `betis` |
| Contraseña de Antonio (zona privada) | `antonio1907` |

Antonio entra en **🔒 Zona privada de Antonio** (enlace abajo del todo de la porra), va a **⚙️ Ajustes** y las cambia.

---

## 🧑‍🏫 Cómo se usa (participantes)

1. Abren el enlace y meten la **contraseña de la porra**.
2. La primera vez pulsan **"Apuntarme por primera vez"**, escriben su nombre e inventan un **PIN de 4 números**. Con ese PIN entran desde cualquier móvil, y nadie más puede tocar su pronóstico.
3. Rellenan los tres resultados y pulsan **"¡Me mojo!"**. Antonio les contesta: *"¡Gracias, fiera! Pero hasta que no me pagues el euro…"* 😄
4. **Pueden cambiar su pronóstico hasta las 12:30 horas del viernes (si aún no han pagado).** Cuando Antonio lo marca como pagado, queda bloqueado. Si hay que corregir uno ya pagado, Antonio puede hacerlo desde *Añadir pronóstico a mano*.
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

- **"No hay conexión con el servidor"** (solo en la versión GitHub): revisa que la URL pegada termina en `/exec` y que el acceso es *Cualquier usuario*.
- **Cambié el código de Apps Script y no se nota**: hay que ir a *Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar*. La URL no cambia.
- **Copia de seguridad**: todo está en la Hoja de Google. Basta con *Archivo → Hacer una copia*.
