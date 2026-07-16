# TRASPASO — Ecosistema digital CEIP San Sebastián (SSNet + App de Gestión)

> Lee este documento COMPLETO antes de tocar nada. Es el contexto de semanas de trabajo.
> Usuario: Ángel Arana, director del CEIP San Sebastián (La Puebla del Río, Sevilla).
> Perfil: sin conocimientos de programación. Explicar siempre paso a paso, sin jerga,
> en español. Los cambios en Apps Script los pega él a mano en el navegador.

## 1. LAS DOS APLICACIONES

### A) SSNet (San Sebastián Net) — portal del claustro
- Google Apps Script vinculado al Sheet **BD_SanSebastianNet**
  (ID: `1X6-rmOOO23HcG60Dm6yw27at3XNJc-L36UXhXooXYBM`).
- Archivos del proyecto Apps Script: `Código.gs`, `Index.html`, `Styles.html`,
  `Membretes.html` (imágenes oficiales en base64 troceado), `Scripts.html`.
  Se dividió así porque el editor rechaza archivos grandes y líneas kilométricas.
- Secciones: Al Día (horario del día del maestro, su grupo, refuerzo, sustituciones),
  Agenda (calendario), Cuadernos (tarjetas), Proyectos, Utilidades.
- **DOS implementaciones del mismo proyecto ("dos puertas"):**
  - Puerta PERSONAS: "Ejecutar como: usuario que accede" + "Cualquier usuario".
    URL actual: `.../macros/s/AKfycbxp8mr3nb6xx6KVMn0i2aAQziFeyU7CF-MlWCB-Y4uwvwuY4nZEfO7EaaB5d9Rg01lv/exec`
    Va dentro de `ssnet.html` en GitHub Pages. Es la que abren los maestros.
  - Puerta DATOS: "Ejecutar como: Yo" + "Cualquier usuario".
    URL actual: `.../macros/s/AKfycbyHo-kYRu3i-_h6dxc5839ozwKEZ4kGYmyBiJWb7vMEKrFJnH2M-Q3k0xrBEkXOUoMk/exec`
    Va en el campo Config de la app de gestión. Recibe los POST/JSONP de datos.
  - Tras cambiar código: "Administrar implementaciones → lápiz → Nueva versión"
    actualiza AMBAS puertas (mismo proyecto). Las URLs no cambian.
- Pestañas clave del Sheet BD: Control_Acceso (email, estado, nombre, grupo,
  contraseña "APP", cursos), Alumnos, Horarios_Maestros, Horarios_Grupos,
  Horarios_Refuerzo/PT, Calendario_Eventos (aquí van SUSTITUCIONES y RECREO como
  filas con JSON en col. G), Gestion_Backup (despensa de sincronización, JSON
  troceado en celdas de 45.000 caracteres, firma en B1), Sustituciones (ANTIGUA,
  ya no se usa).
- Acciones del router `_acc` en Código.gs: ping, guardar (_guardarGestion),
  leer (_leerGestion), sincronizarMaestros, publicarHorarios, publicarSust, etc.
- `getAgendaEvents` reconstruye `tablaFilas` desde el JSON de la col. G para que
  el front pinte las tablas de sustituciones y recreo (bug histórico ya resuelto).

### B) App de Gestión de Plantilla — PWA del equipo directivo (3 personas)
- GitHub Pages: repo `aaralac781-bot/ceipsansebastian_gestiondeplantilla`.
  Archivo principal: `index.html` (~350KB, todo en uno). También `ssnet.html`
  (lanzador PWA de SSNet: en modo instalado abre SSNet en iframe a pantalla
  completa; en navegador redirige vía AccountChooser filtrado a g.educaand.es).
- Datos en localStorage por dispositivo (clave KDAT). Sheet de gestión propio:
  "Plantilla CEIP San Sebastián 2026-27" (ID `1MLQIP-29q3nh2MZrf2zD8Db16AsoLZow5W5xStfqSEso`)
  — contiene la pestaña Alumnos que lee SSNet (getListadoAlumnos, con columna
  opcional `religion` SI/NO para filtrar listas). Sus pestañas Maestros/Carga/etc.
  son restos del sistema de sync ANTIGUO: no fiarse de ellas.
- Modelo de datos (DB): maestros [{id, n, email, tel, e (especialidad), cargo,
  rC,rE,rJ (reducciones), coord, hC, t (es tutor), g (grupo tutoría), ref, rT,
  plan, gRef, asig:[{gid,mid,h}]}], grupos (OBJETO de recuentos: _1o.._6o,
  _3anos,_4anos,_5anos,_estrellas), hGrupos [{id,n}], hMat, hCarga, hHor
  [gid][dia][franja]={mId,pId,...}, tramos, bojaHoras, coordinaciones,
  sust_<Día> en localStorage.
- Sincronización entre dispositivos ("despensa" = Gestion_Backup del Sheet BD):
  - ENVIAR = botón de sincronización del ENCABEZADO (doSync → _doEnviar, POST
    no-cors accion=guardar). Firma _sync {fecha, autor, nMaestros}. Candado:
    antes de subir hace accion=leer y avisa si otro AUTOR subió algo no recibido.
  - RECIBIR = botón "Recibir de Sheets" en Config (JSONP accion=leer →
    _aplicarDatos, acepta formato nuevo de objetos y el antiguo de tablas).
    Candado: avisa si lo local tiene más maestros que la nube. Auto-recibe al
    arrancar SOLO si la nube no trae menos datos.
  - PUNTO CIEGO: si dos dispositivos firman con el mismo nombre de autor, el
    candado de Enviar no avisa entre ellos (localStorage `sync_autor`).
  - REGLA DE ORO del equipo: al abrir → Recibir; al terminar → Enviar; UNA sola
    pestaña de la app abierta; nunca Enviar sin haber Recibido antes.
- El botón VERDE "Sincronizar Maestros → SSNet" es OTRA tubería: manda el
  claustro a Control_Acceso (upsert por email; los maestros SIN email se
  descartan; contraseña por defecto "APP"). NO toca la despensa.
- Botón azul "Exportar Horarios a SSNet": reescrito para leer el modelo real
  (hHor/hGrupos/hMat/tramos) y enviar por POST accion=publicarHorarios
  → pestañas Horarios_Maestros ([Maestro,Tramo,L,M,X,J,V]) y Horarios_Grupos
  ([Grupo,Dia,Tramo,Maestro,Materia]).
- Importador de claustro: botón "Importar claustro de Séneca (.xls)" en
  Claustro. Lee el .xls real de Séneca (RelPerCen.xls: 4 filas de título,
  cabecera "Empleado/a | Teléfono | Usuario IdEA"), convierte "Apellidos, Nombre"
  → "Nombre Apellidos" y usuario → usuario@g.educaand.es. Merge por email/nombre.
  Usa SheetJS por CDN (carga perezosa; requiere internet).
- Claustro: grupos por nivel incluye INFANTIL (3/4/5 años) y "A. ESTRELLAS"
  (Aula de las Estrellas, grupo de tutoría normal sin etiqueta especial).
  Botones ▲▼ para reordenar tarjetas de maestros (orden deseado: equipo
  directivo → 3 años … 6º → especialistas).

## 2. CUADERNOS (tarjetas de SSNet → otros Apps Script independientes)
Cada cuaderno es un Apps Script propio. Para verse DENTRO de SSNet necesita en su
doGet: `.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` y su
implementación como "Ejecutar como: Yo" + "Cualquier usuario". Si "a mí me
funciona y a los demás no" → revisar "Quién tiene acceso" de ESA implementación.
- Centro de Comunicaciones SSNet: AKfycbySIz64... /exec (embebido OK)
- Cuaderno Programaciones Semanales: AKfycbyMjhPe... /exec (embebido OK)
- Cuaderno Criterios de Evaluación: AKfycbzqz9Pv... /exec — MISTERIO ABIERTO:
  rechaza el iframe pese a tener ALLOWALL y acceso correcto; de momento abre en
  pestaña nueva (condición `url.indexOf('AKfycbzqz9')` en openEmbedEnc).
  Pista pendiente: buscar en SU Index.html `top.location` o CSP frame-ancestors.
- Cuaderno de Horarios: tarjeta creada con url:'PROXIMAMENTE'. PENDIENTE de
  construir la sección: tablas semanales de horario del maestro, del grupo,
  refuerzo, recreo maestros y recreo grupo. REGLA: especialistas sin grupo solo
  ven su horario y recreo de maestros.
- Lista para Imprimir: unificada con membretes oficiales (CAB_SUPERIOR/INFERIOR
  de Membretes.html) y modos Todo/Religión/ATEDU/Ambas (filtra con la columna
  `religion` de Alumnos; sin datos muestra todos).

## 3. LECCIONES APRENDIDAS (no repetir estos errores)
- Editor de Apps Script rechaza pegados enormes y líneas de >~100K caracteres:
  trocear base64 en líneas de ~400.
- URL formato `script.google.com/a/macros/g.educaand.es/...` sirve caché vieja:
  usar SIEMPRE `/macros/s/ID/exec`.
- JSONP por GET revienta con payloads grandes → POST con mode:'no-cors'
  (respuesta opaca: informar optimista y verificar en el Sheet).
- Respuestas del router: algunas versiones envolvían en {result:...} — los
  callbacks del front leen tolerante: `(r&&r.result)?r.result:r`.
- Las implementaciones de Apps Script pueden quedar "huérfanas": si los cambios
  no llegan, crear Nueva implementación (URL nueva) y actualizar la tarjeta.
- localStorage: varias pestañas de la app abiertas se pisan entre sí.
- reglas de generación de horarios que pide Ángel: respetar fijados a mano;
  cargas horarias por materia/nivel; solo maestros asignados al curso; no
  exceder carga del maestro; sin bilocación; horario de grupo conectado al tutor.

## 4. PENDIENTES (por prioridad) — actualizado 16/07/2026

### APP DE GESTIÓN (index.html en GitHub)
1. **Probar el generador de horarios con datos reales.** Ya acepta parámetros por
   materia: `blq` (módulos seguidos por sesión) y `maxD` (máx. módulos/día), que se
   configuran en Horarios > Materias. genHorario() coloca BLOQUES en huecos
   consecutivos, reparte por los días con menos carga de esa materia, evita
   bilocación del maestro (maestroOcupado) y avisa de los módulos que no caben.
   Falta validarlo con el claustro real y afinar heurísticas.
2. **Horario personal del maestro**: SLOT_TIPOS = clase, direccion, jefatura,
   secretaria, coord, luciernaga, reduccion, libre. Se asignan en la columna del
   MAESTRO del Horario Visual y NO ocupan el horario del grupo (getMaestroHor
   combina grupos + slots propios). Verificar que exportarHorariosSSNet los envía
   a Horarios_Maestros (pendiente de comprobar).
3. **Recreo**: el flag `r` vive en DB.tramos (config) y se replica en cada celda.
   renderCelda ahora solo mira `t.r`; sincHorConTramos() realinea celdas con los
   tramos actuales al arrancar y al cambiar de preset. Si aparecen recreos
   fantasma, revisar ahí.
4. Grupos de infantil: se gestionan a mano en Claustro (DB.grupos._3anos etc.) y
   como hGrupos en Horarios > Grupos (botón "Crear los grupos que faltan").
   sincGrupos() SOLO recuenta niveles presentes en hGrupos (no borra los manuales).

### PORTAL DE ACTAS (Apps Script propio, tarjeta en Cuadernos de SSNet)
5. **Volcado campo-a-campo web → Excel** para que el PDF salga RELLENO.
   recibirDatosDesdeWeb apenas está implementado: hay que mapear cada campo del
   formulario a su celda de la plantilla del motor.
6. **Actas 1ª, 2ª y Ordinaria**: solo existe la plantilla de E. Inicial
   (crearPlantillaEvaluacionInicial). Ángel debe especificar las diferencias.
7. Modal "Propuestas generales": tiene chips estáticos en el HTML; debe usar
   bancoPropuestas (Anexo E-2 completo, ya integrado en el archivo).
8. Verificar que guardarActaLocalmente persiste baseAlumnos (la comparativa entre
   evaluaciones lo necesita).

### SSNet
9. Sección **Cuaderno de Horarios** (tarjeta creada con url PROXIMAMENTE): 5 tablas
   semanales — horario del maestro, de su grupo, refuerzo, recreo maestros y recreo
   grupo. REGLA: especialistas sin grupo solo ven su horario y el recreo de maestros.
10. Cuaderno de Programaciones Semanales: da "script.google.com ha rechazado la
   conexión" al abrirlo dentro de la app → falta ALLOWALL en su doGet + Nueva versión,
   o mandarlo a pestaña nueva como Criterios.
11. sincronizarMaestros en modo espejo (hoy solo hace upsert; no borra los que ya
   no están en el claustro).
12. Galería: navegación por carpetas de Drive + subida eligiendo carpeta destino.
13. Misterio del iframe de Criterios (abre en pestaña nueva como solución).


### 🔴 MÓDULO LUCIÉRNAGA / REFUERZO — especificación de Ángel (16/07/2026)
**Es el desarrollo grande que queda. Dos conceptos DISTINTOS:**
- **REFUERZO**: siempre en el aula de referencia del grupo.
- **LUCIÉRNAGA**: el grupo que recibe el refuerzo PUEDE moverse a otro espacio
  (aunque por necesidades no siempre sea así).

**Requisitos:**
1. Las horas marcadas como `luciernaga` en el Horario Visual (SLOT_TIPOS) deben
   VIAJAR a la sección Luciérnaga: ese horario se construye con todas las horas de
   refuerzo del profesorado.
2. Generador visual propio dentro de Luciérnaga, con las mismas prestaciones que el
   Horario Visual: editable, fijar celdas, parámetros de módulos seguidos/día.
3. Debe producir DOS tipos de tabla:
   a) **Por grupo**: tabla semanal con las horas/días de REFUERZO y, en la misma
      tabla, las de LUCIÉRNAGA que le corresponden.
   b) **Por maestro de refuerzo**: infantil, primaria y ZTS.
4. Listado de maestros disponibles (como la pantalla Asignación) pero con los
   **restos horarios**: horas de refuerzo/luciérnaga de cada maestro + maestros de
   refuerzo + ZTS, con el número de horas disponibles de cada uno.

### SUSTITUCIONES — reglas (implementadas 16/07/2026 en genTabla)
Orden de preferencia para cubrir: 1) hora de Luciérnaga · 2) maestro de refuerzo ·
3) hora libre · 4) coordinación · 5) ZTS · 6) Jefatura/Secretaría · 7) Director
(SIEMPRE el último). Nunca se toca una hora de `reduccion`.
- Caso Religión: si falta el maestro de Religión, el paralelo de ATEDU (normalmente
  el tutor) se queda con TODO el grupo → _sustParaleloRelig().
- Solo se genera sustitución en los tramos donde el ausente TENÍA clase.
- Reparto equitativo: entre iguales, el que menos sustituciones lleve ese día.
- PENDIENTE: leer las horas disponibles reales del futuro módulo Luciérnaga.

### RELIGIÓN / ATENCIÓN EDUCATIVA (implementado)
Son una sola franja: Religión genera los módulos y ATEDU se engancha en paralelo
(`paralelo:true`, `pIdAten`, `mIdAten`). ATEDU NO genera módulos propios (si no,
duplicaría las horas). El maestro de ATEDU cuenta como ocupado en esa franja.

### LECCIÓN NUEVA (16/07/2026)
- **Cada implementación de Apps Script queda anclada a SU versión.** Tras cambiar
  código hay que hacer "Administrar implementaciones → lápiz → Nueva versión" EN
  CADA UNA de las dos puertas (personas y datos). No se actualizan solas.

## 5. CÓMO TRABAJAR CON ÁNGEL
- Español, cercano y claro. Cero jerga. Instrucciones numeradas y cortas.
- Los archivos del repo los editas tú (Claude Code) y haces commit/push.
- Código.gs de SSNet y los cuadernos NO están en el repo: prepara el bloque de
  código y dale instrucciones de pegado exactas (buscar función X, sustituir
  entera, guardar, "Administrar implementaciones → lápiz → Nueva versión").
- Antes de cambiar nada, lee el archivo real del repo (no asumas su contenido).
- Tras cada cambio: recordarle GitHub tarda ~2 min y hace falta Ctrl+F5.
