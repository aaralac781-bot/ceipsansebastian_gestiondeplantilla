/**
 * Alas de Igualdad · servidor de la votación de la mascota (Google Apps Script).
 *
 * App EXTERNA a SSNet: es un proyecto de Apps Script independiente que se publica
 * como aplicación web y se inserta en SSNet (enlace o iframe) desde el canal del curso.
 *
 * Dónde se guardan los datos (en el Drive de quien publica la app, la dirección):
 *   Carpeta «Alas de Igualdad · Votación de la mascota»
 *     ├─ estado.json            → clases, propuestas, votos, desempates e historial
 *     ├─ Imágenes/              → fotos de dibujos y cómics
 *     └─ «Registro de la votación» (Hoja de cálculo) → cada voto, anulación, cierre…
 */

// Cuentas con acceso al panel de dirección (además de las que se añadan en Panel → Ajustes).
var MASC_ADMINS_FIJOS = ['aaralac781@g.educaand.es'];
var MASC_NOMBRE_CARPETA = 'Alas de Igualdad · Votación de la mascota';

function doGet(e) {
  // ?familias=1 → galería pública de solo lectura (para el enlace de las familias).
  var familias = !!(e && e.parameter && e.parameter.familias);
  var salida = HtmlService.createHtmlOutputFromFile('MascotaIndex');
  if (familias) salida = HtmlService.createHtmlOutput(salida.getContent().replace('<body>', '<body data-familias="1">'));
  return salida
    .setTitle(familias ? 'Alas de Igualdad · Galería para las familias' : 'Alas de Igualdad · Votación de la mascota')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // Permite insertar la app dentro de SSNet (iframe).
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- Utilidades internas ---------- */
function mascProps_() { return PropertiesService.getScriptProperties(); }
function mascRev_() { return Number(mascProps_().getProperty('MASC_REV')) || 0; }
function mascEmail_() {
  try { return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { return ''; }
}
/* Clave de dirección: permite entrar al panel aunque Google no informe del correo
   (pasa en algunos dominios educativos con «Ejecutar como: yo»). Se guarda solo su huella. */
var MASC_CLAVE_PETICION = '';
function mascReq_(json) { var req = JSON.parse(json || '{}'); MASC_CLAVE_PETICION = String(req.clave || ''); return req; }
function mascHash_(t) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'alas-de-igualdad|' + t, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function mascClaveOk_() {
  var h = mascProps_().getProperty('MASC_CLAVE');
  return !!(h && MASC_CLAVE_PETICION && mascHash_(MASC_CLAVE_PETICION) === h);
}
function mascEsAdmin_(st, email) {
  if (mascClaveOk_()) return true;
  if (!email) return false;
  var lista = MASC_ADMINS_FIJOS.concat((st && st.config && st.config.admins) || [])
    .map(function (x) { return String(x).trim().toLowerCase(); });
  return lista.indexOf(email) >= 0;
}

function mascCarpeta_() {
  var p = mascProps_(), id = p.getProperty('MASC_CARPETA');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se volverá a crear */ } }
  var f = DriveApp.createFolder(MASC_NOMBRE_CARPETA);
  p.setProperty('MASC_CARPETA', f.getId());
  return f;
}
function mascCarpetaImagenes_() {
  var p = mascProps_(), id = p.getProperty('MASC_IMAGENES');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se volverá a crear */ } }
  var f = mascCarpeta_().createFolder('Imágenes');
  p.setProperty('MASC_IMAGENES', f.getId());
  return f;
}
function mascArchivoEstado_(crear) {
  var p = mascProps_(), id = p.getProperty('MASC_ESTADO');
  if (id) { try { return DriveApp.getFileById(id); } catch (e) { /* se volverá a crear */ } }
  if (!crear) return null;
  var f = mascCarpeta_().createFile('estado.json', 'null', 'application/json');
  p.setProperty('MASC_ESTADO', f.getId());
  return f;
}

/* El estado se lee de Drive y se guarda troceado en la caché para responder rápido. */
function mascCachear_(txt, rev) {
  try {
    var cache = CacheService.getScriptCache(), T = 40000, trozos = {}, n = Math.ceil(txt.length / T);
    for (var i = 0; i < n; i++) trozos['masc_' + rev + '_' + i] = txt.substr(i * T, T);
    trozos.masc_meta = JSON.stringify({ rev: rev, n: n });
    cache.putAll(trozos, 21600);
  } catch (e) { console.warn('Caché no disponible: ' + e); }
}
function mascLeer_() {
  var rev = mascRev_();
  try {
    var cache = CacheService.getScriptCache(), meta = cache.get('masc_meta');
    if (meta) {
      meta = JSON.parse(meta);
      if (meta.rev === rev) {
        var keys = [];
        for (var i = 0; i < meta.n; i++) keys.push('masc_' + rev + '_' + i);
        var got = cache.getAll(keys);
        if (keys.every(function (k) { return got[k] != null; })) return JSON.parse(keys.map(function (k) { return got[k]; }).join(''));
      }
    }
  } catch (e) { /* se lee de Drive */ }
  var f = mascArchivoEstado_(false);
  if (!f) return null;
  var txt = f.getBlob().getDataAsString('UTF-8');
  var st = txt ? JSON.parse(txt) : null;
  if (st) mascCachear_(txt, rev);
  return st;
}
function mascGuardar_(st) {
  st.rev = mascRev_() + 1;
  var txt = JSON.stringify(st);
  mascArchivoEstado_(true).setContent(txt);
  mascProps_().setProperty('MASC_REV', String(st.rev));
  mascCachear_(txt, st.rev);
  return st;
}

/* Registro legible en una Hoja de cálculo (transparencia y acta). */
function mascHoja_() {
  var p = mascProps_(), id = p.getProperty('MASC_HOJA');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* se volverá a crear */ } }
  var ss = SpreadsheetApp.create('Alas de Igualdad · Registro de la votación');
  DriveApp.getFileById(ss.getId()).moveTo(mascCarpeta_());
  p.setProperty('MASC_HOJA', ss.getId());
  return ss;
}
function mascRegistrar_(entradas) {
  if (!entradas || !entradas.length) return;
  try {
    var ss = mascHoja_(), sh = ss.getSheetByName('Registro');
    if (!sh) { sh = ss.getSheets()[0]; sh.setName('Registro'); }
    if (sh.getLastRow() === 0) sh.appendRow(['Fecha y hora', 'Cuenta', 'Tipo', 'Detalle']);
    var filas = entradas.map(function (l) { return [new Date(l.ts), l.by || '', l.type, l.text]; });
    sh.getRange(sh.getLastRow() + 1, 1, filas.length, 4).setValues(filas);
  } catch (e) { console.warn('No se pudo escribir el registro: ' + e); }
}

/* Lo que ve cada cuenta: el profesorado no recibe los códigos de voto de las clases. */
function mascRespuesta_(st, email, extra) {
  var admin = mascEsAdmin_(st, email), pub = st;
  if (st && !admin) {
    pub = JSON.parse(JSON.stringify(st));
    (pub.classes || []).forEach(function (k) { delete k.code; });
    if (pub.config) delete pub.config.adminHash;
  }
  var r = { state: pub, rev: mascRev_(), user: { email: email, admin: admin, claveCreada: !!mascProps_().getProperty('MASC_CLAVE') } };
  if (admin) {
    var p = mascProps_();
    if (p.getProperty('MASC_CARPETA')) r.user.carpetaUrl = 'https://drive.google.com/drive/folders/' + p.getProperty('MASC_CARPETA');
    if (p.getProperty('MASC_HOJA')) r.user.hojaUrl = 'https://docs.google.com/spreadsheets/d/' + p.getProperty('MASC_HOJA');
  }
  for (var k in (extra || {})) r[k] = extra[k];
  return JSON.stringify(r);
}
function mascError_(msg) { return JSON.stringify({ error: msg }); }

/* ---------- API para la app (google.script.run) ---------- */

/** Estado completo y cuenta que lo pide. */
function mascApiEstado(json) { mascReq_(json); return mascRespuesta_(mascLeer_(), mascEmail_()); }

/** Crea la clave de dirección (la primera vez) o la cambia (solo la dirección). */
function mascApiClave(json) {
  var req = mascReq_(json), email = mascEmail_(), lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var st = mascLeer_(), p = mascProps_(), existe = !!p.getProperty('MASC_CLAVE');
    if (existe && !mascEsAdmin_(st, email)) return mascError_('Ya existe una clave de dirección. Para cambiarla, entra antes con la clave actual.');
    var nueva = String(req.nueva || '');
    if (nueva.length < 6) return mascError_('La clave debe tener al menos 6 caracteres.');
    p.setProperty('MASC_CLAVE', mascHash_(nueva));
    mascRegistrar_([{ ts: new Date().toISOString(), by: email || 'dirección (clave)', type: 'ajuste', text: existe ? 'Se cambia la clave de dirección.' : 'Se crea la clave de dirección.' }]);
    MASC_CLAVE_PETICION = nueva;
    return mascRespuesta_(st, email, { ok: true });
  } finally { lock.releaseLock(); }
}

/** Solo el número de versión: sirve para refrescar las pizarras sin descargar todo. */
function mascApiRev() { return JSON.stringify({ rev: mascRev_() }); }

/* Freno contra probar códigos al azar: 10 fallos seguidos bloquean esa clase 10 minutos. */
function mascIntentos_(classId, fallo) {
  var c = CacheService.getScriptCache(), k = 'masc_int_' + classId, n = Number(c.get(k)) || 0;
  if (fallo) { n++; c.put(k, String(n), 600); }
  return n;
}

/** Comprueba el código de una clase antes de empezar a votar. */
function mascApiCodigo(json) {
  var req = mascReq_(json), st = mascLeer_();
  if (mascIntentos_(req.classId) >= 10) return JSON.stringify({ ok: false, bloqueado: true });
  var k = st && mascFind(st.classes, req.classId);
  var ok = !!k && String(k.code) === String(req.code || '').trim();
  if (!ok) mascIntentos_(req.classId, true);
  return JSON.stringify({ ok: ok });
}

/** Datos para la galería de las familias: sin códigos, sin cuentas, nombres con inicial
 *  y votos solo de las votaciones ya cerradas. */
function mascApiFamilias(json) {
  mascReq_(json);
  var st = mascLeer_();
  if (!st || !st.config || !st.config.publicFamilias) return JSON.stringify({ cerrado: true, rev: mascRev_() });
  var c = JSON.parse(JSON.stringify(st)), cerrado = {};
  (c.cycles || []).forEach(function (y) { cerrado[y.id] = !!(y.closed || y.direct); });
  c.votes = (c.votes || []).filter(function (v) {
    return !v.annulled && (v.phase === 'ciclo' ? cerrado[v.cycleId] : c.phase.centro === 'closed');
  }).map(function (v) { return { id: v.id, phase: v.phase, cycleId: v.cycleId, classId: v.classId, cat: v.cat, target: v.target, ts: v.ts, annulled: false }; });
  c.log = [];
  (c.classes || []).forEach(function (k) { delete k.code; delete k.tutors; });
  c.config = { initials: true, allowOwnVotes: st.config.allowOwnVotes, liveResults: false, centroTieBody: st.config.centroTieBody, publicFamilias: true };
  c.meta = { sample: false };
  (c.proposals || []).forEach(function (p) {
    p.authors = (p.authors || []).map(function (a) {
      var n = String(a.name || '').trim().split(/\s+/);
      return { name: n[0] + (n[1] ? ' ' + n[1].charAt(0).toUpperCase() + '.' : ''), course: a.course };
    });
  });
  return JSON.stringify({ state: c, rev: mascRev_(), user: { email: '', admin: false } });
}

/** Registra el voto de una clase. Las reglas se comprueban aquí, con bloqueo, aunque voten varias clases a la vez. */
function mascApiVotar(json) {
  var req = mascReq_(json), email = mascEmail_(), lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var st = mascLeer_();
    if (!st) return mascError_('La votación todavía no está preparada.');
    var admin = mascEsAdmin_(st, email);
    if (!admin && mascIntentos_(req.classId) >= 10) return mascRespuesta_(st, email, { error: 'Demasiados intentos con un código incorrecto. Espera 10 minutos.' });
    var err = mascValidarVoto(st, req, { admin: admin, email: email });
    if (err === 'El código de la clase no es correcto.') mascIntentos_(req.classId, true);
    if (err) return mascRespuesta_(st, email, { error: err });
    var antes = st.log.length;
    var ts = mascAplicarVoto(st, req, { ts: new Date().toISOString(), by: email || (mascClaveOk_() ? 'dirección (clave)' : ''), uid: function () { return Utilities.getUuid(); } });
    mascGuardar_(st);
    mascRegistrar_(st.log.slice(antes));
    return mascRespuesta_(st, email, { ok: true, ts: ts });
  } finally { lock.releaseLock(); }
}

/** Guarda los cambios de la dirección (propuestas, fases, desempates, anulaciones…).
 *  Si otra persona ha guardado antes, devuelve conflict y la app lo reintenta sobre los datos nuevos. */
function mascApiGuardar(json) {
  var req = mascReq_(json), email = mascEmail_(), lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var cur = mascLeer_();
    if (!mascEsAdmin_(cur, email)) return mascError_('Solo la dirección puede hacer cambios.');
    if (Number(req.baseRev) !== mascRev_()) return mascRespuesta_(cur, email, { conflict: true });
    var st = req.state;
    if (!st || !Array.isArray(st.classes) || !Array.isArray(st.votes)) return mascError_('Datos no válidos.');
    var vistos = {};
    ((cur && cur.log) || []).forEach(function (l) { vistos[l.id] = 1; });
    var nuevas = (st.log || []).filter(function (l) { return !vistos[l.id]; });
    nuevas.forEach(function (l) { if (!l.by) l.by = email || 'dirección (clave)'; });
    mascGuardar_(st);
    mascRegistrar_(nuevas);
    return mascRespuesta_(st, email, { ok: true });
  } finally { lock.releaseLock(); }
}

/** Sube una imagen (ya reducida en el navegador) a la carpeta de imágenes. */
function mascApiSubirImagen(json) {
  var req = mascReq_(json), email = mascEmail_();
  if (!mascEsAdmin_(mascLeer_(), email)) return mascError_('Solo la dirección puede subir imágenes.');
  var m = /^data:(image\/[a-z+.-]+);base64,(.+)$/.exec(req.dataUrl || '');
  if (!m) return mascError_('Imagen no válida.');
  var nombre = String(req.nombre || 'imagen').replace(/[^\w.-]+/g, '_') + (m[1] === 'image/png' ? '.png' : '.jpg');
  var f = mascCarpetaImagenes_().createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre));
  return JSON.stringify({ ref: 'drive:' + f.getId() });
}

/** Devuelve una imagen de la carpeta del concurso (y solo de esa carpeta). */
function mascApiImagen(json) {
  var req = mascReq_(json);
  try {
    var f = DriveApp.getFileById(String(req.id)), idCarpeta = mascCarpetaImagenes_().getId(), ok = false, it = f.getParents();
    while (it.hasNext()) if (it.next().getId() === idCarpeta) ok = true;
    if (!ok) return mascError_('Imagen no permitida.');
    var b = f.getBlob();
    return JSON.stringify({ src: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) });
  } catch (e) { return mascError_('No se encuentra la imagen.'); }
}

/** Manda a la papelera las imágenes que ya no usa ninguna propuesta (al borrar datos). */
function mascApiLimpiarImagenes(json) {
  mascReq_(json);
  var email = mascEmail_(), st = mascLeer_();
  if (!mascEsAdmin_(st, email)) return mascError_('Solo la dirección puede borrar imágenes.');
  var usadas = {};
  JSON.stringify(st || {}).replace(/drive:([\w-]+)/g, function (m, id) { usadas[id] = 1; return m; });
  var n = 0, it = mascCarpetaImagenes_().getFiles();
  while (it.hasNext()) { var f = it.next(); if (!usadas[f.getId()]) { f.setTrashed(true); n++; } }
  return JSON.stringify({ ok: true, n: n });
}
