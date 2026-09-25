// ══════════════════════════════════════════════════════════════════════
// CLARITANET · Crear/rellenar la pestaña "Alumnos"
// ──────────────────────────────────────────────────────────────────────
// Script de UN SOLO USO. Ejecútalo una vez desde el editor de Apps Script
// (selecciona crearPestanaAlumnos y pulsa ▶ Ejecutar). Crea la pestaña
// "Alumnos" con la cabecera correcta y vuelca el alumnado del centro.
//
// NO lleva ningún alumno de otro centro: el array `datos` está VACÍO.
// Rellénalo con el alumnado de CEIP Clara Campoamor.
//
// ── DE DÓNDE SACAR LOS DATOS ──
//   1) En SÉNECA: Alumnado → Relación de alumnado del grupo (o del centro)
//      → exporta a Excel/CSV.
//   2) Deja 3 columnas en este orden:  apellidos | nombre | grupo
//   3) El valor de "grupo" DEBE COINCIDIR con las claves que uses en
//      Scripts.html (TODOS_CURSOS / CURSOS_LABELS), p.ej. '3anosA','1oA','6oB'.
//      Si en Scripts.html decides usar otras claves (p.ej. 'INF3A'), usa
//      esas mismas aquí.
//
// ── DOS FORMAS DE CARGARLOS ──
//   A) LA MÁS FÁCIL (sin este script): crea a mano la pestaña "Alumnos",
//      escribe la cabecera  apellidos | nombre | grupo  y pega debajo las
//      filas del Excel de Séneca. Ya está.
//   B) CON ESTE SCRIPT: rellena el array `datos` (una fila por alumno/a) y
//      ejecuta crearPestanaAlumnos(). Útil si prefieres tenerlo en código.
// ══════════════════════════════════════════════════════════════════════

function crearPestanaAlumnos() {
  // Usa la hoja configurada del centro (el mismo id que en Codigo.gs).
  var ID = (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) ? CONFIG.SPREADSHEET_ID : '';
  if (!ID) { SpreadsheetApp.getUi().alert('Falta CONFIG.SPREADSHEET_ID en Codigo.gs'); return; }
  var ss = SpreadsheetApp.openById(ID);

  // Borra la pestaña si ya existe, para recrearla limpia.
  var shExist = ss.getSheetByName("Alumnos");
  if (shExist) ss.deleteSheet(shExist);

  var sh = ss.insertSheet("Alumnos");

  // Cabecera
  sh.appendRow(["apellidos", "nombre", "grupo"]);
  sh.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#7A1B39").setFontColor("white");

  // ── ALUMNADO DEL CENTRO ──
  // Rellena aquí, una fila por alumno/a: ["apellidos", "nombre", "grupo"].
  // Los ejemplos están comentados: bórralos y pon el alumnado real.
  var datos = [
    // ["Apellido1 Apellido2", "Nombre",  "3anosA"],
    // ["Apellido1 Apellido2", "Nombre",  "1oA"],
    // ["Apellido1 Apellido2", "Nombre",  "6oB"],
  ];

  if (datos.length) {
    sh.getRange(2, 1, datos.length, 3).setValues(datos);
  }

  // Formato
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 150);
  sh.setColumnWidth(3, 80);

  Logger.log("Alumnos insertados: " + datos.length);
  SpreadsheetApp.getUi().alert(
    "✅ Pestaña 'Alumnos' creada con " + datos.length + " alumnos.\n\n" +
    (datos.length ? "" : "Aún está vacía: rellena el array 'datos' con el alumnado del centro, " +
     "o pega las filas del Excel de Séneca directamente en la pestaña (apellidos | nombre | grupo).")
  );
}
