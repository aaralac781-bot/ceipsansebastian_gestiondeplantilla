// ══════════════════════════════════════════════════════════════════════════
// SERVIDOR DEL PORTAL · BASE NEUTRA
// ─────────────────────────────────────────────────────────────────────────
// Lee TODO de CONFIG (Config.gs). No contiene datos de ningún centro.
// Defensivo: si falta la hoja o una pestaña, devuelve vacío en lugar de fallar.
// La marca visual y los enlaces del cliente están en Config.html / Scripts.html.
// ══════════════════════════════════════════════════════════════════════════

/* ═══════════════════ WEB APP ═══════════════════ */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.TITULO_WEB || 'Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

/* ═══════════════════ HELPERS DE HOJA ═══════════════════ */
function _ss() {
  if (!CONFIG.SPREADSHEET_ID) throw new Error('Falta CONFIG.SPREADSHEET_ID');
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/** Devuelve las filas de datos (sin cabecera) de una pestaña, o [] si no existe. */
function _rows(nombrePestana) {
  try {
    var sh = _ss().getSheetByName(nombrePestana);
    if (!sh) return [];
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    if (lr < 2 || lc < 1) return [];
    return sh.getRange(2, 1, lr - 1, lc).getValues();
  } catch (e) {
    return [];
  }
}

/** Cabecera (fila 1) de una pestaña, en minúsculas y sin espacios extra. */
function _headers(nombrePestana) {
  try {
    var sh = _ss().getSheetByName(nombrePestana);
    if (!sh || sh.getLastColumn() < 1) return [];
    return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(function (h) { return String(h || '').trim().toLowerCase(); });
  } catch (e) { return []; }
}

/** Convierte filas + cabecera en objetos {clave:valor}. */
function _objects(nombrePestana) {
  var head = _headers(nombrePestana);
  if (!head.length) return [];
  return _rows(nombrePestana).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { if (h) o[h] = r[i]; });
    return o;
  });
}

function _norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/* ═══════════════════ LOGIN ═══════════════════
   Pestaña Control_Acceso: columnas (cabecera libre, se detecta por nombre):
     email | password | nombre | grupo
   Si no hay contraseña definida, autoLoginGoogle basta con el correo. */
function _buscarUsuario(email) {
  var e = _norm(email);
  var us = _objects('Control_Acceso');
  for (var i = 0; i < us.length; i++) {
    if (_norm(us[i].email || us[i].correo) === e) return us[i];
  }
  return null;
}

function _fraseDelDia() {
  var fr = _rows('Frases').map(function (r) { return String(r[0] || '').trim(); }).filter(Boolean);
  if (!fr.length) return '';
  var dia = Math.floor(Date.now() / 86400000);
  return fr[dia % fr.length];
}

function _resultadoLogin(u) {
  return {
    ok: true,
    name: String(u.nombre || u.name || 'Docente'),
    email: _norm(u.email || u.correo),
    group: String(u.grupo || u.group || ''),
    frase: _fraseDelDia()
  };
}

function autoLoginGoogle() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return { ok: false };
    var u = _buscarUsuario(email);
    return u ? _resultadoLogin(u) : { ok: false };
  } catch (e) { return { ok: false }; }
}

function loginWithCredentials(email, pass) {
  var u = _buscarUsuario(email);
  if (!u) return { ok: false, error: 'Ese correo no está en la lista del centro.' };
  var esperada = String(u.password || u.contrasena || u['contraseña'] || '');
  if (esperada && String(pass) !== esperada) {
    return { ok: false, error: 'Contraseña incorrecta.' };
  }
  return _resultadoLogin(u);
}

/* ═══════════════════ AL DÍA ═══════════════════ */

/** Tablón de anuncios. Pestaña Tablon: titulo | texto | (opcional fecha) */
function getTablonItems() {
  return _objects('Tablon').map(function (o) {
    return { titulo: String(o.titulo || o.título || ''), texto: String(o.texto || o.mensaje || '') };
  }).filter(function (x) { return x.titulo; });
}

/** Lista de maestros/as con horario publicado. Pestaña Horarios: 1ª col = nombre */
function getListaMaestros() {
  var nombres = _rows('Horarios').map(function (r) { return String(r[0] || '').trim(); });
  var vistos = {}, out = [];
  nombres.forEach(function (n) { if (n && !vistos[n]) { vistos[n] = 1; out.push(n); } });
  return out;
}

/** Horario del día para un maestro/a, devuelto como HTML.
    Pestaña Horarios: nombre | dia | tramo | contenido  */
function getDailySchedule(name) {
  var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var hoy = dias[new Date().getDay()];
  var head = _headers('Horarios');
  var iN = head.indexOf('nombre'), iD = head.indexOf('dia') >= 0 ? head.indexOf('dia') : head.indexOf('día');
  var iT = head.indexOf('tramo'), iC = head.indexOf('contenido');
  if (iN < 0 || iD < 0) return '';
  var filas = _rows('Horarios').filter(function (r) {
    return _norm(r[iN]) === _norm(name) && _norm(r[iD]) === _norm(hoy);
  });
  if (!filas.length) return '';
  var celdas = filas.map(function (r) {
    var tramo = iT >= 0 ? r[iT] : '';
    var cont = iC >= 0 ? r[iC] : '';
    return '<div style="display:flex;gap:10px;padding:6px 0;border-top:1px solid var(--line)">' +
      '<b style="min-width:92px;color:var(--ink-soft)">' + _e(tramo) + '</b><span>' + _e(cont) + '</span></div>';
  }).join('');
  return '<div class="card">' + celdas + '</div>';
}

/** Sustituciones del día. Pestaña Sustituciones: fecha | titulo | detalle */
function getSustituciones() {
  var hoy = _hoyStr();
  return _objects('Sustituciones').filter(function (o) {
    return _fechaStr(o.fecha) === hoy;
  }).map(function (o) {
    return { titulo: String(o.titulo || o.título || 'Sustitución'), detalle: String(o.detalle || o.nota || '') };
  });
}

/** Cuadrante de recreo de hoy, como HTML. Pestaña Recreo: dia | zona | responsable */
function getRecreoHoy() {
  var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var hoy = dias[new Date().getDay()];
  var head = _headers('Recreo');
  if (!head.length) return '';
  var iDia = head.indexOf('dia') >= 0 ? head.indexOf('dia') : head.indexOf('día');
  var iZona = head.indexOf('zona'), iResp = head.indexOf('responsable');
  var filas = _rows('Recreo').filter(function (r) { return iDia < 0 || _norm(r[iDia]) === _norm(hoy); });
  if (!filas.length) return '';
  return '<div class="card">' + filas.map(function (r) {
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)">' +
      '<span>' + _e(iZona >= 0 ? r[iZona] : '') + '</span>' +
      '<b>' + _e(iResp >= 0 ? r[iResp] : '') + '</b></div>';
  }).join('') + '</div>';
}

/* ═══════════════════ AGENDA ═══════════════════
   Pestaña Calendario_Eventos: fecha | titulo | horaInicio | horaFin | proyecto */
function getAgendaEvents() {
  return _objects('Calendario_Eventos').map(function (o) {
    return {
      fecha: _fechaStr(o.fecha),
      titulo: String(o.titulo || o.título || o.evento || ''),
      horaInicio: String(o.horainicio || o.hora || ''),
      horaFin: String(o.horafin || ''),
      proyecto: String(o.proyecto || '')
    };
  }).filter(function (e) { return e.fecha && e.titulo; });
}

/* ═══════════════════ PROYECTOS ═══════════════════
   Pestaña Proyectos: nombre | coordinador | carpeta */
function getProyectos() {
  return _objects('Proyectos').map(function (o) {
    return {
      nombre: String(o.nombre || o.proyecto || ''),
      coordinador: String(o.coordinador || o.coordinadora || ''),
      carpeta: String(o.carpeta || o.drive || o.url || '')
    };
  }).filter(function (p) { return p.nombre; });
}

/* ═══════════════════ CUMPLEAÑOS ═══════════════════
   Pestaña Cumpleanos: nombre | fecha (día/mes) */
function getCumplesHoy() {
  var hoy = new Date();
  var dd = ('0' + hoy.getDate()).slice(-2), mm = ('0' + (hoy.getMonth() + 1)).slice(-2);
  var out = _objects('Cumpleanos').filter(function (o) {
    var f = o.fecha; if (!f) return false;
    var d = (f instanceof Date) ? f : new Date(f);
    if (isNaN(d)) return false;
    return ('0' + d.getDate()).slice(-2) === dd && ('0' + (d.getMonth() + 1)).slice(-2) === mm;
  }).map(function (o) { return { nombre: String(o.nombre || '') }; }).filter(function (x) { return x.nombre; });
  return { ok: true, cumples: out };
}

/* ═══════════════════ CONTROL DE LIBROS ═══════════════════
   Pestaña Alumnos: nombre | grupo   (para agrupar por clase)
   La hoja de estados se autocrea la primera vez (LIBROS_SS_ID en Properties). */
function getLibrosGrupos() {
  var head = _headers('Alumnos');
  var iG = head.indexOf('grupo');
  if (iG < 0) return { ok: true, grupos: [] };
  var cuenta = {};
  _rows('Alumnos').forEach(function (r) {
    var g = String(r[iG] || '').trim(); if (!g) return;
    cuenta[g] = (cuenta[g] || 0) + 1;
  });
  var grupos = Object.keys(cuenta).sort().map(function (g) {
    return { grupo: g, nombre: g, n: cuenta[g] };
  });
  return { ok: true, grupos: grupos };
}

/* ═══════════════════ HELPERS DE FECHA / TEXTO ═══════════════════ */
function _hoyStr() { return _fechaStr(new Date()); }
function _fechaStr(v) {
  if (!v) return '';
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d)) return '';
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function _e(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
