# Portal · Base neutra

Base reutilizable del portal docente (app tipo "…Net"). Está pensada como
**código fuente único**: de aquí se sacan las instancias de cada colegio
(Claritanet, etc.) cambiando **solo la configuración**, nunca la lógica.

> **Sin datos.** Esta base no contiene NINGÚN dato de SSNet ni de la app de
> gestión: ni hojas, ni carpetas, ni personas, ni membretes. Todo lo
> específico de un centro se rellena en `Config.gs` y `Config.html`.

## Archivos

| Archivo | Qué es | ¿Se edita por cole? |
|---|---|---|
| `Config.gs` | Configuración del **servidor** (hoja, carpetas, correos, P27). | **Sí** |
| `Config.html` | Configuración del **cliente** (marca, Meets, grupos, Drive). | **Sí** |
| `Membretes.html` | Cabecera y pie de los documentos (base64). | **Sí** (o vacío) |
| `Styles.html` | Tema visual por tokens. Skin por defecto: **Clarita**. | Solo tokens |
| `Codigo.gs` | Lógica del servidor. Lee todo de `CONFIG`. | **No** |
| `Index.html` + `Scripts.html` | Interfaz del portal. Lee de `CFG`. | **No** |
| `appsscript.json` | Manifiesto de Apps Script. | **No** |

## Crear el portal de un cole nuevo

1. Copia esta carpeta a un proyecto de Apps Script (o `clasp`).
2. En **`Config.gs`** pon `SPREADSHEET_ID` y ajusta `CENTRO`, `TITULO_WEB`,
   `MAIL_PREFIX` y el bloque `P27` (fechas y festivos del curso).
3. En **`Config.html`** pon la identidad (`CENTRO`, `CODIGO`, `AUTOR`, iconos),
   los enlaces `MEET`, los `GRUPOS`/`GRUPOS_LABELS` y, si existen, `CUADERNOS`
   y `DRIVE`. Lo que dejes en `""` se oculta solo.
4. (Opcional) Pega los membretes del cole en **`Membretes.html`**.
5. (Opcional) Re-viste el tema cambiando las variables de marca al principio
   de **`Styles.html`** (`--vino`, `--rosa`, …). No toques las reglas.
6. Despliega como aplicación web (ejecutar como *usuario que implementa*,
   acceso *cualquiera*).

## La hoja de cálculo

`SPREADSHEET_ID` debe apuntar a una hoja con estas pestañas creadas a mano:
`Control_Acceso`, `Frases`, `Proyectos` y las de horarios (`Horarios_*`).
El resto se **auto-crean** la primera vez y se guardan en `PropertiesService`:
`RESERVAS_SS_ID`, `SALIDAS_SS_ID`, `LIBROS_SS_ID`, `YT_CHANNEL_ID`,
`P27_CONFIG_V1`, `RECREO_CUAD`, además de `Tablon`, `Cumpleanos`,
`Notificaciones`, `P27_*`, `Gestion_Backup` y `Alumnos`.

## El tema (skin Clarita)

Toda la marca visual está en las variables de `:root` de `Styles.html`:

```
--vino  --ciruela  --cobre  --ciencia  --lila / --lila-soft  --rosa / --rosa-soft
```

y los roles derivados (`--brand`, `--accent`, `--grad-a/b`…). Cambiando esas
variables se re-viste el portal entero sin tocar ni una regla. La skin por
defecto es **Clarita** (homenaje a Clara Campoamor: ciencia, igualdad y
respeto), con cabecera de motivo atómico y tarjetas de cuaderno con riel de
color e iconografía científica.
