/* ============================================================
   PORRA CEIP SAN SEBASTIÁN · Servidor (Google Apps Script)
   Guarda los datos en la Hoja de cálculo a la que está vinculado.
   Este proyecto de Apps Script debe tener DOS archivos:
     - porra_core.gs        → contenido de porra_core.js
     - porra_apps_script.gs → este archivo
   Ver PORRA_INSTRUCCIONES.md
   ============================================================ */

var TABLAS = ['participantes', 'jornadas', 'pronosticos'];

function doGet() {
  return json_({ ok: true, msg: 'Porra CEIP San Sebastián funcionando. ¡Mucho Betis! 💚' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var db = cargar_();
    var out = PorraCore.handle(db, req, new Date());
    if (out.changed) guardar_(db);
    return json_(out.res);
  } catch (err) {
    return json_({ ok: false, error: 'Error del servidor: ' + err });
  } finally {
    lock.releaseLock();
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function hoja_(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, 2).setValues([['id', 'datos']]).setFontWeight('bold');
    sh.setColumnWidth(2, 600);
  }
  return sh;
}

function leer_(nombre) {
  var sh = hoja_(nombre);
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 2).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) { return { id: String(r[0]), datos: JSON.parse(r[1]) }; });
}

function escribir_(nombre, filas) {
  var sh = hoja_(nombre);
  var n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, 2).clearContent();
  if (filas.length) sh.getRange(2, 1, filas.length, 2).setValues(filas);
}

function cargar_() {
  var db = { config: {}, escudos: {} };
  TABLAS.forEach(function (t) { db[t] = leer_(t).map(function (r) { return r.datos; }); });
  leer_('config').forEach(function (r) { db.config[r.id] = r.datos; });
  leer_('escudos').forEach(function (r) { db.escudos[r.id] = r.datos; });
  return PorraCore.asegurar(db);
}

function guardar_(db) {
  TABLAS.forEach(function (t) {
    escribir_(t, db[t].map(function (o) { return [o.id, JSON.stringify(o)]; }));
  });
  escribir_('config', Object.keys(db.config).map(function (k) { return [k, JSON.stringify(db.config[k])]; }));
  escribir_('escudos', Object.keys(db.escudos).map(function (k) { return [k, JSON.stringify(db.escudos[k])]; }));
}

/** Ejecuta esta función UNA vez desde el editor para crear las hojas y dar permisos. */
function configurarPorra() {
  var db = cargar_();
  guardar_(db);
  Logger.log('Listo. Contraseña porra: ' + db.config.claveParticipantes + ' · Contraseña Antonio: ' + db.config.claveAdmin);
}
