/* Alas de Igualdad · Votación de la Mascota del CEIP San Sebastián
   Dos modos de funcionamiento:
   - EN LÍNEA (publicada con Google Apps Script e insertada en SSNet): los datos y las
     imágenes se guardan en el Drive de la dirección y todas las pizarras ven lo mismo.
   - LOCAL (abriendo index.html directamente): los datos se guardan en este navegador.
     Sirve para ensayar sin conexión. */
'use strict';

const APP_VERSION = '2.0';
const DEFAULT_PW = 'garza2026';
const STATE_VERSION = 1;

const TYPES = {
  dibujo: { label: 'Dibujo', letter: 'D', cat: 'dibujo' },
  nombre: { label: 'Nombre', letter: 'N', cat: 'nombre' },
  lema: { label: 'Lema', letter: 'L', cat: 'texto' },
  historia: { label: 'Historia o cómic', letter: 'H', cat: 'texto' }
};
const CAT_ICON = { dibujo: '🎨', nombre: '🏷️', texto: '💬', finalista: '⭐' };
const NOTA_DESEMPATE_CICLO = 'Desempate decidido por el equipo docente del ciclo';

/* ================= Utilidades ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowISO = () => new Date().toISOString();
const fmtFecha = iso => iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }) : '';
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const byCode = (a, b) => a.code.localeCompare(b.code, 'es', { numeric: true });
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

function toast(msg, kind = '') {
  const d = document.createElement('div');
  d.textContent = msg; if (kind) d.className = kind;
  $('#toast').appendChild(d);
  setTimeout(() => d.remove(), kind === 'error' ? 6000 : 3200);
}

function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function hashPw(pw) {
  const data = new TextEncoder().encode('alas-de-igualdad|' + pw);
  if (window.crypto?.subtle) {
    const b = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const c of data) h = ((h << 5) + h + c) | 0;
  return 'x' + (h >>> 0).toString(16);
}

/* ================= Almacenamiento ================= */
/* IndexedDB, con plan B: localStorage y, si tampoco está permitido (algunos iframes de
   terceros lo bloquean y la petición no responde nunca), memoria. Nada puede dejar la
   app esperando: cada operación tiene un tiempo máximo. */
const conLimite = (p, ms, siVence) => Promise.race([p, new Promise((res, rej) => setTimeout(() => siVence instanceof Error ? rej(siVence) : res(siVence), ms))]);
const Store = {
  db: null, mem: new Map(), ls: null,
  async open() {
    try { localStorage.setItem('adi-prueba', '1'); localStorage.removeItem('adi-prueba'); this.ls = localStorage; } catch (e) { this.ls = null; }
    if (!('indexedDB' in window)) return;
    try {
      this.db = await conLimite(new Promise((res, rej) => {
        const r = indexedDB.open('alas-de-igualdad', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(new Error('IndexedDB bloqueado'));
      }), 2500, null);
    } catch (e) { this.db = null; }
  },
  async get(k) {
    if (this.db) {
      try {
        return await conLimite(new Promise((res, rej) => {
          const q = this.db.transaction('kv').objectStore('kv').get(k);
          q.onsuccess = () => res(q.result ?? null); q.onerror = () => rej(q.error);
        }), 3000, null);
      } catch (e) { return null; }
    }
    if (this.mem.has(k)) return this.mem.get(k);
    if (this.ls && !k.startsWith('img:')) { try { return JSON.parse(this.ls.getItem('adi-' + k)); } catch (e) { return null; } }
    return null;
  },
  async set(k, v) {
    if (this.db) {
      return conLimite(new Promise((res, rej) => {
        const t = this.db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(JSON.parse(JSON.stringify(v)), k);
        t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
      }), 5000, new Error('el navegador no responde al guardar'));
    }
    if (k.startsWith('img:')) { this.mem.set(k, v); return; }
    if (this.ls) { try { this.ls.setItem('adi-' + k, JSON.stringify(v)); return; } catch (e) { /* sin espacio: memoria */ } }
    this.mem.set(k, JSON.parse(JSON.stringify(v)));
    if (!REMOTE && !Store.avisado) { Store.avisado = true; toast('⚠️ Este navegador no deja guardar datos: lo que hagas se perderá al cerrar la página.', 'error'); }
  }
};

/* ================= Estado ================= */
let S = null;

function randomCode(used) {
  let c; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used.has(c));
  used.add(c); return c;
}

function defaultCycles() {
  return [
    { id: 'INF', name: 'Infantil', short: 'INF', color: '#C7862A', textoType: null, textoLabel: 'Frase de la clase', textoLabelPl: 'Frases de la clase', direct: false, closed: false },
    { id: '1C', name: 'Primer ciclo', short: '1C', color: '#3F7A5B', textoType: 'lema', textoLabel: 'Lema', textoLabelPl: 'Lemas', direct: false, closed: false },
    { id: '2C', name: 'Segundo ciclo', short: '2C', color: '#2F6C8F', textoType: 'lema', textoLabel: 'Lema', textoLabelPl: 'Lemas', direct: false, closed: false },
    { id: '3C', name: 'Tercer ciclo', short: '3C', color: '#7A4E8E', textoType: 'historia', textoLabel: 'Historia o cómic', textoLabelPl: 'Historias o cómics', direct: false, closed: false },
    { id: 'AE', name: 'Aula de las Estrellas', short: 'AE', color: '#B8546F', textoType: 'lema', textoLabel: 'Lema', textoLabelPl: 'Lemas', direct: true, closed: false }
  ];
}

function defaultClasses() {
  const used = new Set();
  const q = (d, n, t) => ({ dibujo: d, nombre: n, texto: t });
  const list = [
    ['3 años', 'INF', q(2, 2, 0)], ['4 años A', 'INF', q(2, 2, 0)], ['4 años B', 'INF', q(2, 2, 0)], ['5 años', 'INF', q(2, 2, 0)],
    ['1.º', '1C', q(2, 2, 1)], ['2.º', '1C', q(2, 2, 2)],
    ['3.º A', '2C', q(2, 2, 2)], ['3.º B', '2C', q(2, 2, 2)], ['4.º A', '2C', q(2, 2, 2)], ['4.º B', '2C', q(2, 2, 2)],
    ['5.º A', '3C', q(2, 2, 2)], ['5.º B', '3C', q(2, 2, 2)], ['6.º A', '3C', q(2, 2, 2)], ['6.º B', '3C', q(2, 2, 2)],
    ['Aula de las Estrellas', 'AE', q(1, 1, 1)]
  ];
  return list.map(([name, cycleId, quota], i) => ({ id: 'k' + (i + 1), name, cycleId, quota, code: randomCode(used) }));
}

function emptyState() {
  return {
    version: STATE_VERSION,
    meta: { sample: false, created: nowISO() },
    config: { allowOwnVotes: true, liveResults: false, initials: false, centroTieBody: 'el claustro del centro', adminHash: null },
    phase: { ciclo: 'prep', centro: 'prep' },
    centroClosedTs: null,
    cycles: defaultCycles(),
    classes: defaultClasses(),
    proposals: [], votes: [], tiebreaks: [], log: []
  };
}

function migrate(st) {
  const base = emptyState();
  st.version = STATE_VERSION;
  st.meta = Object.assign({}, base.meta, st.meta);
  st.config = Object.assign({}, base.config, st.config);
  st.phase = Object.assign({}, base.phase, st.phase);
  ['cycles', 'classes'].forEach(k => { if (!Array.isArray(st[k]) || !st[k].length) st[k] = base[k]; });
  ['proposals', 'votes', 'tiebreaks', 'log'].forEach(k => { if (!Array.isArray(st[k])) st[k] = []; });
  st.classes.forEach(k => { k.quota = Object.assign({ dibujo: 0, nombre: 0, texto: 0 }, k.quota); });
  st.proposals.forEach(p => { p.images = p.images || []; p.authors = p.authors || []; });
  return st;
}

async function persist() {
  try { await Store.set('state', S); }
  catch (e) { toast('⚠️ No se han podido guardar los datos: ' + (e?.message || e), 'error'); throw e; }
}
function addLog(type, text) { S.log.push({ id: uid(), ts: nowISO(), type, text }); }

/* ================= Conexión con el servidor (Google Apps Script) ================= */
const REMOTE = !!(window.google && google.script && google.script.run);
let USER = { email: '', admin: false };
let REV = 0, BUSY = 0;
function gsCall(fn, arg) {
  return new Promise((res, rej) => {
    google.script.run
      .withSuccessHandler(r => { try { const o = typeof r === 'string' ? JSON.parse(r) : r; setOnline(true); res(o); } catch (e) { rej(e); } })
      .withFailureHandler(e => { setOnline(false); rej(new Error(e?.message || String(e))); })[fn](arg === undefined ? '' : JSON.stringify(arg));
  });
}
function applyServer(r) {
  if (r.state) S = migrate(r.state);
  if (typeof r.rev === 'number') REV = r.rev;
  if (r.user) USER = r.user;
}
function setOnline(ok) {
  const el = $('#estado'); if (!el || !REMOTE) return;
  el.innerHTML = ok ? `<span class="dot-ok" aria-hidden="true"></span> En línea${USER.email ? ' · ' + esc(USER.email) : ''}${USER.admin ? ' · <b>Dirección</b>' : ''}`
    : '<span class="dot-err" aria-hidden="true"></span> Sin conexión: reintentando…';
  el.className = 'estado ' + (ok ? 'ok' : 'err');
}
function setBusy(msg) {
  const el = $('#busy'); if (!el) return;
  el.textContent = msg || ''; el.hidden = !msg;
}

/** Aplica un cambio de la dirección y lo guarda.
 *  En línea: si otra persona ha guardado antes, se descargan los datos nuevos y el cambio se repite
 *  sobre ellos (por eso fn debe buscar dentro de S todo lo que modifica). */
async function commit(fn) {
  if (!REMOTE) { fn(); await persist(); rerender(); return; }
  BUSY++; setBusy('Guardando…');
  try {
    for (let intento = 0; intento < 5; intento++) {
      const copia = JSON.stringify(S);
      fn();
      let r;
      try { r = await gsCall('mascApiGuardar', { baseRev: REV, state: S }); }
      catch (e) { S = JSON.parse(copia); throw new Error('No se ha podido guardar (' + e.message + '). Comprueba la conexión y repítelo.'); }
      if (r.ok) { applyServer(r); rerender(); return; }
      if (r.conflict) { applyServer(r); continue; }
      S = JSON.parse(copia);
      throw new Error(r.error || 'No se ha podido guardar.');
    }
    throw new Error('Hay muchos cambios a la vez. Vuelve a intentarlo.');
  } finally { BUSY--; if (!BUSY) setBusy(''); }
}

/* --- Imágenes: en línea se guardan en Drive y se piden al servidor cuando hacen falta --- */
const IMG = new Map(), IMGQ = new Map();
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const isRef = s => typeof s === 'string' && s.startsWith('drive:');
const isNewImg = s => typeof s === 'string' && /^data:image\/(jpeg|png);base64,/.test(s);
function imgTag(ref, alt = '', attrs = '') {
  if (!isRef(ref)) return `<img src="${esc(ref)}" alt="${esc(alt)}" ${attrs}>`;
  const src = IMG.get(ref);
  return `<img src="${esc(src || BLANK)}" data-ref="${esc(ref)}" ${src ? 'data-ok="1"' : ''} alt="${esc(alt)}" ${attrs}>`;
}
let imgActivas = 0; const imgEspera = [];
function turnoImg(fn) {
  return new Promise((res, rej) => {
    const go = () => { imgActivas++; fn().then(res, rej).finally(() => { imgActivas--; imgEspera.shift()?.(); }); };
    imgActivas < 4 ? go() : imgEspera.push(go);
  });
}
function loadRef(ref) {
  if (IMG.has(ref)) return Promise.resolve(IMG.get(ref));
  if (!IMGQ.has(ref)) IMGQ.set(ref, (async () => {
    let src = null;
    try { src = await Store.get('img:' + ref); } catch (e) { /* sin caché */ }
    if (!src) {
      const r = await turnoImg(() => gsCall('mascApiImagen', { id: ref.slice(6) }));
      if (!r.src) throw new Error(r.error || 'Imagen no disponible');
      src = r.src;
      Store.set('img:' + ref, src).catch(() => {});
    }
    IMG.set(ref, src); return src;
  })().catch(e => { IMGQ.delete(ref); throw e; }));
  return IMGQ.get(ref);
}
function hydrateImgs() {
  $$('img[data-ref]:not([data-ok])').forEach(img => {
    img.dataset.ok = '0';
    const ref = img.dataset.ref;
    loadRef(ref).then(src => $$('img[data-ref]').filter(x => x.dataset.ref === ref).forEach(x => { x.src = src; x.dataset.ok = '1'; }))
      .catch(() => { img.alt = 'No se ha podido cargar la imagen'; delete img.dataset.ok; });
  });
}
new MutationObserver(() => { cancelAnimationFrame(hydrateImgs.raf); hydrateImgs.raf = requestAnimationFrame(hydrateImgs); })
  .observe(document.body, { childList: true, subtree: true });
/** Sube a Drive las imágenes nuevas de una lista y devuelve la lista con sus referencias. */
async function uploadPending(list, nombre = 'imagen') {
  if (!REMOTE) return list;
  const total = list.filter(isNewImg).length; let n = 0;
  const out = [];
  for (const src of list) {
    if (!isNewImg(src)) { out.push(src); continue; }
    n++; setBusy(`Subiendo imagen ${n} de ${total}…`);
    const r = await gsCall('mascApiSubirImagen', { dataUrl: src, nombre });
    if (!r.ref) throw new Error(r.error || 'No se ha podido subir la imagen.');
    IMG.set(r.ref, src); Store.set('img:' + r.ref, src).catch(() => {});
    out.push(r.ref);
  }
  return out;
}

/* --- Refresco automático: las pizarras ven los cambios sin recargar --- */
async function poll() {
  if (!REMOTE || document.hidden || BUSY) return;
  try {
    const r = await gsCall('mascApiRev');
    if (r.rev === REV || BUSY) return;
    applyServer(await gsCall('mascApiEstado'));
    if (canAutoRender()) rerender();
  } catch (e) { /* setOnline ya avisa */ }
}
function canAutoRender() {
  if (!$('#lightbox').hidden || dlg.open) return false;
  const { name } = currentRoute();
  if (name === 'panel' || name === 'final') return false;
  if ((name === 'votar' || name === 'centro') && V && !['clase', 'hecho'].includes(V.step)) return false;
  return true;
}

/* ================= Sesión docente ================= */
const isAdmin = () => { if (REMOTE) return !!USER.admin; try { return sessionStorage.getItem('adi-admin') === '1'; } catch (e) { return window.__adm === true; } };
function setAdmin(v) { try { v ? sessionStorage.setItem('adi-admin', '1') : sessionStorage.removeItem('adi-admin'); } catch (e) { window.__adm = v; } }
async function checkPw(pw) {
  if (!S.config.adminHash) return pw === DEFAULT_PW;
  return (await hashPw(pw)) === S.config.adminHash;
}

/* ================= Dominio ================= */
const cyc = id => S.cycles.find(c => c.id === id);
const cls = id => S.classes.find(c => c.id === id);
const prop = id => S.proposals.find(p => p.id === id);
const classesOf = cid => S.classes.filter(c => c.cycleId === cid);
const propCycleId = p => cls(p.classId)?.cycleId;
const catOf = p => TYPES[p.type].cat;
const votingCycles = () => S.cycles.filter(c => !c.direct);
const cycleCats = c => c.textoType ? ['dibujo', 'nombre', 'texto'] : ['dibujo', 'nombre'];
const proposalsOf = (cycleId, cat) => S.proposals.filter(p => propCycleId(p) === cycleId && catOf(p) === cat).sort(byCode);

function catLabel(c, cat, pl = false) {
  if (cat === 'dibujo') return pl ? 'Dibujos' : 'Dibujo';
  if (cat === 'nombre') return pl ? 'Nombres' : 'Nombre';
  if (cat === 'finalista') return pl ? 'Finalistas' : 'Finalista';
  return pl ? (c?.textoLabelPl || 'Lemas') : (c?.textoLabel || 'Lema');
}

function nextCode(type, cycleId) {
  const pre = `${TYPES[type].letter}-${cyc(cycleId).short}-`;
  let max = 0;
  S.proposals.forEach(p => { if (p.code?.startsWith(pre)) max = Math.max(max, parseInt(p.code.slice(pre.length), 10) || 0); });
  return pre + String(max + 1).padStart(2, '0');
}

function fmtName(n) {
  n = String(n || '').trim();
  if (!S.config.initials) return n;
  const parts = n.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : n;
}
function authorsText(p) {
  if (!p) return '';
  if (p.wholeClass) return `Toda la clase de ${cls(p.classId)?.name || ''}`;
  if (!p.authors.length) return cls(p.classId)?.name || '';
  return p.authors.map(a => `${fmtName(a.name)}${a.course ? ` (${a.course})` : ''}`).join(', ');
}
function propTitle(p) {
  if (!p) return '';
  if (p.type === 'dibujo') return `Dibujo ${p.code}`;
  if (p.type === 'historia') return p.title || (p.text ? p.text.slice(0, 50) + '…' : `Cómic ${p.code}`);
  return p.text;
}
function altOf(p, i = 0) {
  const base = p.alt || (p.type === 'historia' ? 'Página de cómic' : 'Dibujo de una garza');
  return `${base} · ${p.code}${p.images.length > 1 ? `, página ${i + 1}` : ''} · ${cls(p.classId)?.name || ''}`;
}

/* --- Votos --- */
const liveVotes = () => S.votes.filter(v => !v.annulled);
const voteOf = (phase, classId, cat) => S.votes.find(v => !v.annulled && v.phase === phase && v.classId === classId && v.cat === cat);
const cycleOpen = c => S.phase.ciclo === 'open' && !c.closed && !c.direct;
const centroOpen = () => S.phase.centro === 'open';

function eligible(classId, cat) {
  const k = cls(classId);
  return proposalsOf(k.cycleId, cat).filter(p => S.config.allowOwnVotes || p.classId !== classId);
}
function pendingCats(classId) {
  const k = cls(classId), c = cyc(k.cycleId);
  if (!c || c.direct) return [];
  return cycleCats(c).filter(cat => !voteOf('ciclo', classId, cat) && eligible(classId, cat).length);
}

/* --- Recuento --- */
function tally(phase, scope, cat) {
  const cands = phase === 'ciclo' ? proposalsOf(scope, cat).map(p => p.id) : centroCandidates().map(f => f.cycleId);
  const rows = cands.map(id => ({ id, n: 0, classIds: [] }));
  liveVotes().filter(v => v.phase === phase && v.cat === cat && (phase === 'centro' || v.cycleId === scope)).forEach(v => {
    const r = rows.find(r => r.id === v.target);
    if (r) { r.n++; r.classIds.push(v.classId); }
  });
  return rows.sort((a, b) => b.n - a.n);
}

function result(phase, scope, cat) {
  const rows = tally(phase, scope, cat);
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (!rows.length) return { status: 'sin-candidatas', rows, total };
  if (!total) return { status: 'sin-votos', rows, total };
  const top = rows[0].n;
  const tied = rows.filter(r => r.n === top).map(r => r.id);
  if (tied.length === 1) return { status: 'ganadora', id: tied[0], rows, tied, total };
  const tb = S.tiebreaks.find(t => !t.revoked && t.phase === phase && t.scope === scope && t.cat === cat && sameSet(t.tied, tied) && tied.includes(t.target));
  if (tb) return { status: 'desempate', id: tb.target, tb, rows, tied, total };
  return { status: 'empate', rows, tied, total };
}

function finalist(cycleId) {
  const c = cyc(cycleId);
  const f = { cycleId, parts: {}, pending: [], complete: false, direct: !!c.direct };
  if (c.direct) {
    ['dibujo', 'nombre', 'texto'].forEach(cat => { const p = proposalsOf(c.id, cat)[0]; if (p) f.parts[cat] = p.id; });
    f.pending = ['dibujo', 'nombre'].filter(k => !f.parts[k]).map(cat => ({ cat, status: 'sin-candidatas' }));
  } else if (!c.closed) {
    f.open = true;
    return f;
  } else {
    cycleCats(c).forEach(cat => {
      const r = result('ciclo', c.id, cat);
      if (r.id) f.parts[cat] = r.id;
      else if (!(r.status === 'sin-candidatas' && cat === 'texto')) f.pending.push({ cat, status: r.status });
    });
  }
  f.complete = !!(f.parts.dibujo && f.parts.nombre) && !f.pending.length;
  return f;
}
const allFinalists = () => S.cycles.map(c => finalist(c.id));
const centroCandidates = () => (S.phase.centro !== 'prep' && Array.isArray(S.centroCandidates))
  ? S.centroCandidates.map(id => finalist(id)) : allFinalists().filter(f => f.complete);
const cycleVisible = c => c.direct || c.closed || S.config.liveResults;
const centroVisible = () => S.phase.centro === 'closed' || S.config.liveResults;
function mascotaResult() {
  if (S.phase.centro !== 'closed') return null;
  const r = result('centro', 'CENTRO', 'finalista');
  return r.id ? r : null;
}
function tieNote(phase) { return phase === 'centro' ? `Desempate decidido por ${S.config.centroTieBody}` : NOTA_DESEMPATE_CICLO; }

function faseActiva() {
  if (S.phase.centro === 'closed') return { key: 'final', txt: 'Proclamación de la Mascota Oficial y la Pandilla', fecha: '15 de octubre', go: '#/final', btn: '🏆 Ir a la gran final' };
  if (S.phase.centro === 'open') return { key: 'centro', txt: 'Votación de centro', fecha: '13 y 14 de octubre', go: '#/centro', btn: '🗳️ Votar a una finalista' };
  if (S.phase.ciclo === 'open' && votingCycles().some(c => !c.closed)) return { key: 'ciclo', txt: 'Votación de ciclo', fecha: 'Del 5 al 9 de octubre', go: '#/votar', btn: '🗳️ Ir a votar' };
  if (votingCycles().every(c => c.closed)) return { key: 'entre', txt: 'Ciclos cerrados · preparando la votación de centro', fecha: '13 y 14 de octubre', go: '#/finalistas', btn: '⭐ Ver las finalistas' };
  return { key: 'prep', txt: 'Preparación: exposición de propuestas', fecha: 'Votación de ciclo: del 5 al 9 de octubre', go: '#/galeria', btn: '🖼️ Ver la galería' };
}

/* ================= Plantillas reutilizables ================= */
function cycChip(c) { return `<span class="chip cyc" style="background:${esc(c.color)}">${esc(c.name)}</span>`; }

function propBody(p, opts = {}) {
  const c = cyc(propCycleId(p));
  let html = '';
  if (p.type === 'dibujo' || (p.type === 'historia' && p.images.length)) {
    const src = p.images[0];
    html += src ? `<div class="img-wrap" ${opts.selectable ? '' : `data-act="lb" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver ${esc(p.code)} a pantalla completa"`}>${imgTag(src, altOf(p), 'loading="lazy"')}</div>`
      : `<div class="img-wrap muted">Sin imagen</div>`;
  }
  if (p.type === 'nombre') html += `<div class="nombre">${esc(p.text)}</div>`;
  if (p.type === 'lema') html += `<div class="lema">«${esc(p.text)}»</div>`;
  if (p.type === 'historia') {
    if (p.title) html += `<div class="hist-title">${esc(p.title)}</div>`;
    if (p.text) html += `<div class="excerpt">${esc(p.text.slice(0, 170))}${p.text.length > 170 ? '…' : ''}</div>`;
  }
  html += `<div class="meta"><span class="chip code">${esc(p.code)}</span>${opts.noCycle ? '' : cycChip(c)}<span class="chip">${esc(cls(p.classId)?.name)}</span></div>`;
  if (!opts.hideAuthors) html += `<div class="autoria">✏️ ${esc(authorsText(p))}</div>`;
  if (p.type === 'historia' || (p.type === 'dibujo' && opts.selectable)) {
    const lbl = p.type === 'dibujo' ? '🔍 Ver grande' : (p.images.length ? `📖 Ver cómic${p.images.length > 1 ? ` (${p.images.length} páginas)` : ''}` : '📖 Leer historia');
    html += `<span class="btn btn-sm" data-act="lb" data-id="${p.id}" role="button" tabindex="0">${lbl}</span>`;
  }
  return html;
}
function propCard(p, opts = {}) {
  if (opts.selectable) return `<button type="button" class="prop sel card" data-act="pick" data-id="${p.id}" aria-pressed="${opts.selected ? 'true' : 'false'}">${propBody(p, opts)}</button>`;
  return `<article class="prop card">${propBody(p, opts)}</article>`;
}

function finalistCard(f, opts = {}) {
  const c = cyc(f.cycleId);
  if (!f.complete) {
    let why = f.open ? 'Se conocerá al cerrar la votación de ciclo.' :
      f.pending.some(x => x.status === 'empate') ? 'Hay un empate pendiente de desempate.' :
        f.pending.some(x => x.status === 'sin-votos') ? 'Faltan votos en alguna categoría.' : 'Faltan propuestas.';
    if (c.direct) why = 'Falta dar de alta la propuesta del aula.';
    return `<article class="card finalista pendiente" style="--c:${esc(c.color)}"><div class="fin-ciclo">${esc(c.name)}</div>
      <div class="img-wrap center" style="display:flex;align-items:center;justify-content:center;font-size:4rem">❔</div>
      <p class="center muted">${esc(why)}</p></article>`;
  }
  const d = prop(f.parts.dibujo), n = prop(f.parts.nombre), t = f.parts.texto ? prop(f.parts.texto) : null;
  const textoHtml = t ? (t.type === 'lema' ? `<div class="fin-lema">«${esc(t.text)}»</div>` :
    `<div class="center"><div class="hist-title">${esc(t.title || 'Historia')}</div><span class="btn btn-sm" data-act="lb" data-id="${t.id}" role="button" tabindex="0">📖 ${t.images.length ? 'Ver cómic' : 'Leer historia'}</span></div>`) : '';
  const aut = [[catLabel(c, 'dibujo'), d], [catLabel(c, 'nombre'), n], t ? [catLabel(c, 'texto'), t] : null].filter(Boolean)
    .map(([l, p]) => `<div><b>${esc(l)}</b> (${esc(p.code)}): ${esc(authorsText(p))}</div>`).join('');
  return `<article class="card finalista ${opts.winner ? 'ganadora' : ''} ${opts.cls || ''}" style="--c:${esc(c.color)}">
    <div class="row between"><span class="fin-ciclo">${esc(c.name)}${c.direct ? ' · finalista directa' : ''}</span>${opts.badge || ''}</div>
    <div class="img-wrap" ${opts.noLb ? '' : `data-act="lb" data-id="${d.id}" role="button" tabindex="0" aria-label="Ver dibujo a pantalla completa"`}>${imgTag(d.images[0], altOf(d))}</div>
    <h3 class="fin-nombre">${esc(n.text)}</h3>${textoHtml}
    ${opts.noAuthors ? '' : `<div class="autorias">${aut}</div>`}</article>`;
}

/* ================= Router ================= */
const NAV = [
  ['inicio', '🏠', 'Inicio'], ['galeria', '🖼️', 'Galería'], ['votar', '🗳️', 'Votar'], ['seguimiento', '✅', 'Seguimiento'],
  ['resultados', '📊', 'Resultados'], ['finalistas', '⭐', 'Finalistas'], ['centro', '🏫', 'Votación de centro'],
  ['final', '🏆', 'Gran final'], ['ayuda', '❓', 'Ayuda'], ['panel', '🔐', 'Panel docente']
];
const VIEWS = {};
function currentRoute() { const parts = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/').map(decodeURIComponent); return { name: VIEWS[parts[0]] ? parts[0] : 'inicio', args: parts.slice(1) }; }

function render() {
  const { name, args } = currentRoute();
  $('#nav').innerHTML = NAV.map(([k, ico, t]) => `<a href="#/${k}" ${k === name ? 'aria-current="page"' : ''}><span aria-hidden="true">${ico}</span>${t}${k === 'panel' && isAdmin() ? ' ✓' : ''}</a>`).join('');
  $('#banner').innerHTML = S.meta.sample ? `<div class="banner">🧪 Hay <b>datos de prueba</b> cargados. Antes de la votación real, la dirección los borrará desde Panel → Datos.</div>` : '';
  document.title = `${NAV.find(n => n[0] === name)[2]} · Alas de Igualdad`;
  $('#main').innerHTML = VIEWS[name](args) || '';
  VIEWS[name].after?.(args);
}
function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }
window.addEventListener('hashchange', () => {
  $('#nav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false');
  render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true });
});

/* Acciones por delegación: data-act (clic) y data-chg (cambio en formularios) */
const ACT = {}, CHG = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('[disabled]')) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); e.stopPropagation(); Promise.resolve(fn(el, e)).catch(err => { console.error(err); toast('Error: ' + (err?.message || err), 'error'); }); }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act][role=button]')) { e.preventDefault(); e.target.click(); }
  if (!$('#lightbox').hidden) {
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowRight') stepLB(1);
    if (e.key === 'ArrowLeft') stepLB(-1);
  }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]');
  if (el && CHG[el.dataset.chg]) Promise.resolve(CHG[el.dataset.chg](el, e)).catch(err => toast('Error: ' + (err?.message || err), 'error'));
});
$('#navToggle').addEventListener('click', () => {
  const o = $('#nav').classList.toggle('open');
  $('#navToggle').setAttribute('aria-expanded', String(o));
});

/* ================= Visor a pantalla completa ================= */
let LB = { items: [], i: 0, back: null };
function openLB(items, i = 0) {
  LB = { items, i, back: document.activeElement };
  drawLB(); $('#lightbox').hidden = false; $('#lightbox .lb-close')?.focus();
}
function drawLB() {
  const it = LB.items[LB.i];
  $('#lightbox').innerHTML = `<button class="lb-close" data-act="lb-close" aria-label="Cerrar">✕ Cerrar</button>
    <div class="lb-body">${it.src ? imgTag(it.src, it.alt || '') : `<div class="lb-text"><h2>${esc(it.title || '')}</h2>${esc(it.text || '')}</div>`}</div>
    <div class="lb-cap">${it.caption || ''}</div>
    ${LB.items.length > 1 ? `<div class="lb-nav"><button data-act="lb-step" data-d="-1" aria-label="Anterior">◀ Anterior</button><span style="align-self:center">${LB.i + 1} / ${LB.items.length}</span><button data-act="lb-step" data-d="1" aria-label="Siguiente">Siguiente ▶</button></div>` : ''}`;
}
function stepLB(d) { LB.i = (LB.i + d + LB.items.length) % LB.items.length; drawLB(); }
function closeLB() { $('#lightbox').hidden = true; $('#lightbox').innerHTML = ''; LB.back?.focus?.(); }
function lbItemsFor(p) {
  const cap = q => `<b>${esc(propTitle(q))}</b><br><span class="chip code">${esc(q.code)}</span> ${esc(cls(q.classId)?.name)} · ✏️ ${esc(authorsText(q))}`;
  const items = [];
  if (p.type === 'historia' && p.text) items.push({ title: p.title, text: p.text, caption: cap(p) });
  p.images.forEach((src, i) => items.push({ src, alt: altOf(p, i), caption: cap(p) }));
  if (!items.length) items.push({ title: TYPES[p.type].label, text: p.text, caption: cap(p) });
  return items;
}
ACT.lb = el => {
  const p = prop(el.dataset.id); if (!p) return;
  if (p.type === 'dibujo') {
    const set = proposalsOf(propCycleId(p), 'dibujo').filter(q => q.images.length);
    openLB(set.map(q => lbItemsFor(q)[0]), Math.max(0, set.indexOf(p)));
  } else openLB(lbItemsFor(p));
};
ACT['lb-close'] = closeLB;
ACT['lb-step'] = el => stepLB(+el.dataset.d);
$('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox' || e.target.classList.contains('lb-body')) closeLB(); });

/* Pantalla completa / proyección */
ACT.proyectar = async () => {
  document.body.classList.toggle('proyectando');
  try {
    if (document.body.classList.contains('proyectando')) await document.documentElement.requestFullscreen?.();
    else if (document.fullscreenElement) await document.exitFullscreen();
  } catch (e) { /* algunos navegadores no permiten pantalla completa */ }
  rerender();
};
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('proyectando')) { document.body.classList.remove('proyectando'); rerender(); } });
const btnProyectar = () => `<button data-act="proyectar">📽️ ${document.body.classList.contains('proyectando') ? 'Salir de proyección' : 'Proyectar'}</button>`;

/* ================= INICIO ================= */
VIEWS.inicio = () => {
  const fa = faseActiva();
  const nCiclo = votingCycles().reduce((s, c) => s + classesOf(c.id).length, 0);
  const votadasCiclo = votingCycles().reduce((s, c) => s + classesOf(c.id).filter(k => cycleCats(c).some(cat => voteOf('ciclo', k.id, cat))).length, 0);
  const votadasCentro = S.classes.filter(k => voteOf('centro', k.id, 'finalista')).length;
  const est = (ok, abierta) => ok ? '<span class="chip ok">✔ Cerrada</span>' : abierta ? '<span class="chip pend">● Abierta</span>' : '<span class="chip">Pendiente</span>';
  const cicloCerrado = votingCycles().every(c => c.closed);
  return `
  <section class="hero">
    <div>
      <div class="kicker">CEIP San Sebastián · La Puebla del Río</div>
      <h1>Alas de Igualdad</h1>
      <p style="font-size:1.35rem;font-family:var(--f-titulo)">Diseñando la Mascota de Nuestro Cole</p>
      <p>Nuestra mascota es una <b>garza</b> de nuestro entorno, la Dehesa de Abajo y Doñana: un símbolo de igualdad, corresponsabilidad, convivencia y amor por la naturaleza.</p>
      <p class="note">Las garzas construyen el nido juntas, se turnan para incubar y cuidan a sus crías entre las dos.</p>
    </div>
    <img class="hero-art" src="${ADI_SAMPLE.garza({ acc: 'corazon', bg: '#DCEBDF', body: '#FFFFFF', wing: '#C9B6D6', label: '' })}" alt="Ilustración de una garza blanca junto al agua, con un corazón">
  </section>

  <section class="card fase-activa tape" style="margin-top:1.4rem">
    <div class="row between">
      <div><div class="muted small" style="font-weight:800;text-transform:uppercase;letter-spacing:.06em">Fase activa</div>
        <h2 style="margin:.1em 0">${esc(fa.txt)}</h2><div class="mano">${esc(fa.fecha)}</div></div>
      <a class="btn btn-primary btn-grande" href="${fa.go}">${fa.btn}</a>
    </div>
  </section>

  <h2 class="section-title">Nuestros valores <span class="bar"></span></h2>
  <div class="valores">
    ${[['⚖️', 'Igualdad', 'Las mismas oportunidades para todas y todos.'], ['🤝', 'Corresponsabilidad', 'Cuidar y repartir las tareas entre todos.'], ['💛', 'Respeto', 'Escuchar y valorar a cada persona.'], ['🌿', 'Naturaleza', 'Amar y proteger nuestro entorno.'], ['🏡', 'Convivencia', 'Vivir juntos en un cole donde caben todos.']]
      .map(([i, t, d]) => `<div class="card valor"><span class="ico" aria-hidden="true">${i}</span><b>${t}</b><div class="small muted">${d}</div></div>`).join('')}
  </div>

  <h2 class="section-title">Calendario <span class="bar"></span></h2>
  <div class="cal">
    <div class="card"><div class="fecha">5 – 9 oct</div><h3>Votación de ciclo</h3><p class="small">Cada clase vota un dibujo, un nombre y un lema o historia de su ciclo.</p>${est(cicloCerrado, S.phase.ciclo === 'open')} <span class="small muted">${votadasCiclo}/${nCiclo} clases han empezado a votar</span></div>
    <div class="card"><div class="fecha">13 – 14 oct</div><h3>Votación de centro</h3><p class="small">Las 15 clases votan a una de las 5 finalistas.</p>${est(S.phase.centro === 'closed', S.phase.centro === 'open')} <span class="small muted">${votadasCentro}/${S.classes.length} clases han votado</span></div>
    <div class="card"><div class="fecha">15 oct</div><h3>Gran final</h3><p class="small">Proclamación de la <b>Mascota Oficial</b> y presentación de <b>la Pandilla de Garzas del Cole</b>.</p>${S.phase.centro === 'closed' ? '<span class="chip ok">¡Ya se puede celebrar!</span>' : '<span class="chip">Pendiente</span>'}</div>
  </div>

  <h2 class="section-title">¿Cómo se elige? <span class="bar"></span></h2>
  <div class="grid g3">
    <div class="card"><h3>🎨 🏷️ 💬 Tres votaciones</h3><p>Dibujo, nombre y lema (o historia en el tercer ciclo) se votan <b>por separado</b>. La finalista de cada ciclo junta el dibujo, el nombre y el lema más votados.</p></div>
    <div class="card"><h3>🗳️ Un voto por clase</h3><p>Cada clase decide en asamblea y su maestra o maestro registra el voto con el código de la clase.</p></div>
    <div class="card"><h3>⭐ Cinco finalistas</h3><p>Infantil, Primer ciclo, Segundo ciclo, Tercer ciclo y el Aula de las Estrellas. La más votada será la <b>Mascota Oficial</b>; las otras cuatro, <b>la Pandilla</b>.</p></div>
  </div>
  <p class="center muted small" style="margin-top:1.4rem">${plural(S.proposals.length, 'propuesta', 'propuestas')} · ${plural(S.classes.length, 'clase', 'clases')}</p>`;
};

/* ================= GALERÍA ================= */
VIEWS.galeria = args => {
  const c = cyc(args[0]) || S.cycles[0];
  const cats = c.direct ? ['dibujo', 'nombre', 'texto'] : cycleCats(c);
  return `<h1>Galería de propuestas</h1>
  <div class="tabs" role="tablist">${S.cycles.map(x => `<a href="#/galeria/${x.id}" ${x.id === c.id ? 'aria-current="page"' : ''}>${esc(x.name)}</a>`).join('')}</div>
  <p class="muted">${esc(c.name)}: ${classesOf(c.id).map(k => esc(k.name)).join(', ')}.${c.direct ? ' Su propuesta es <b>finalista directa</b>.' : ''} Toca un dibujo para verlo a pantalla completa.</p>
  ${cats.map(cat => {
    const ps = proposalsOf(c.id, cat);
    if (!ps.length && cat === 'texto' && !c.textoType) return '';
    return `<h2 class="section-title">${CAT_ICON[cat]} ${esc(catLabel(c, cat, true))} <span class="chip">${ps.length}</span><span class="bar"></span></h2>
      ${ps.length ? `<div class="grid ${cat === 'dibujo' ? 'g4' : 'g3'}">${ps.map(p => propCard(p, { noCycle: true })).join('')}</div>` : '<p class="muted">Todavía no hay propuestas en esta categoría.</p>'}`;
  }).join('')}`;
};

/* ================= VOTAR (ciclo y centro) ================= */
let V = null;
function resetV(phase) { V = { phase, step: 'clase', classId: null, cats: [], idx: 0, choices: {}, err: '' }; }

function voteView(phase) {
  if (!V || V.phase !== phase) resetV(phase);
  const titulo = phase === 'ciclo' ? 'Votación de ciclo' : 'Votación de centro';
  const sub = phase === 'ciclo' ? 'Del 5 al 9 de octubre · un voto por clase en cada categoría' : '13 y 14 de octubre · cada clase vota a una sola finalista';
  const head = `<h1>${titulo}</h1><p class="mano">${sub}</p>`;

  if (phase === 'ciclo' && S.phase.ciclo !== 'open') return head + `<div class="oculto"><div class="ico">⏳</div><h2>La votación de ciclo aún no está abierta</h2><p>Se abrirá desde el Panel docente. Mientras tanto, podéis ver las propuestas en la <a href="#/galeria">galería</a>.</p></div>`;
  if (phase === 'ciclo' && votingCycles().every(c => c.closed)) return head + `<div class="oculto"><div class="ico">✔️</div><h2>La votación de ciclo ha terminado</h2><p><a href="#/resultados">Ver resultados</a> · <a href="#/finalistas">Ver las finalistas</a></p></div>`;
  if (phase === 'centro' && S.phase.centro === 'prep') return head + `<div class="oculto"><div class="ico">⏳</div><h2>La votación de centro aún no está abierta</h2><p>Se abrirá el 13 de octubre, cuando estén las cinco finalistas. <a href="#/finalistas">Ver finalistas</a></p></div>`;
  if (phase === 'centro' && S.phase.centro === 'closed') return head + `<div class="oculto"><div class="ico">🏆</div><h2>La votación de centro ha terminado</h2><p><a class="btn btn-dorado" href="#/final">Ir a la gran final</a></p></div>`;

  const k = V.classId ? cls(V.classId) : null;
  const cancel = `<button data-act="v-cancel">✕ Cancelar</button>`;

  if (V.step === 'clase') {
    const groups = (phase === 'ciclo' ? votingCycles() : S.cycles).map(c => {
      const ks = classesOf(c.id);
      if (!ks.length) return '';
      return `<h2 class="section-title">${cycChip(c)} <span class="bar"></span></h2><div class="grid g4">${ks.map(x => {
        let done, note;
        if (phase === 'ciclo') {
          done = !pendingCats(x.id).length; note = c.closed ? 'Votación cerrada' : done ? '✔ Ya ha votado' : cycleCats(c).some(cat => voteOf('ciclo', x.id, cat)) ? 'Voto a medias' : 'Pendiente';
          done = done || c.closed;
        } else { done = !!voteOf('centro', x.id, 'finalista'); note = done ? '✔ Ya ha votado' : 'Pendiente'; }
        return `<button class="clase-btn ${done ? '' : 'btn-azul'}" data-act="v-clase" data-id="${x.id}" ${done ? 'disabled' : ''}>${esc(x.name)}<small>${note}</small></button>`;
      }).join('')}</div>`;
    }).join('');
    return head + `<div class="card"><h2>¿Qué clase va a votar?</h2><p>La clase decide en asamblea y la maestra o el maestro registra el voto.</p></div>${groups}`;
  }

  if (V.step === 'codigo') {
    return head + `<div class="card center stack" style="max-width:560px;margin:auto">
      <h2>Clase: ${esc(k.name)}</h2>
      <form data-form="v-code" class="stack"><label for="vcode">Escribe el código de la clase</label>
      <input id="vcode" class="code-input" inputmode="numeric" autocomplete="off" maxlength="8" required autofocus>
      ${V.err ? `<p class="chip err">${esc(V.err)}</p>` : ''}
      <div class="row centro"><button type="button" data-act="v-back">← Cambiar de clase</button><button class="btn-primary btn-grande" type="submit">Entrar</button></div></form>
      <p class="small muted">El código lo tiene el profesorado. Así ninguna clase puede votar por otra.</p></div>`;
  }

  const stepsBar = () => `<div class="steps">${V.cats.map((cat, i) => `<span class="${i === V.idx && V.step === 'cat' ? 'on' : V.choices[cat] ? 'done' : ''}">${i + 1}. ${CAT_ICON[cat]} ${esc(catLabel(cyc(k.cycleId), cat))}</span>`).join('')}<span class="${V.step === 'confirmar' ? 'on' : ''}">✔ Confirmar</span></div>`;

  if (V.step === 'cat') {
    const cat = V.cats[V.idx];
    const c = cyc(k.cycleId);
    let cards;
    if (phase === 'ciclo') {
      const ps = eligible(k.id, cat);
      cards = `<div class="grid ${cat === 'dibujo' ? 'g4' : 'g3'}">${ps.map(p => propCard(p, { selectable: true, selected: V.choices[cat] === p.id, noCycle: true })).join('')}</div>`;
    } else {
      cards = `<div class="grid g5">${centroCandidates().map(f => `<button type="button" class="prop sel card" data-act="pick" data-id="${f.cycleId}" aria-pressed="${V.choices.finalista === f.cycleId}" style="padding:0;border-width:3px">${finalistCard(f, { noAuthors: true, noLb: true })}</button>`).join('')}</div>`;
    }
    const pregunta = phase === 'centro' ? '¿Qué finalista os gusta más para ser la Mascota Oficial?' : `Elegid ${cat === 'dibujo' ? 'un dibujo' : cat === 'nombre' ? 'un nombre' : (c.textoType === 'historia' ? 'una historia o cómic' : 'un lema')}`;
    return head + `<div class="row between"><h2 style="margin:0">${esc(k.name)}</h2>${cancel}</div>${stepsBar()}
      <h2>${CAT_ICON[cat]} ${esc(pregunta)}</h2>
      ${phase === 'ciclo' && !S.config.allowOwnVotes ? '<p class="muted small">Las propuestas de vuestra propia clase no aparecen.</p>' : ''}
      ${cards}
      <div class="vote-bar row between"><button data-act="v-prev">← Atrás</button>
      <button class="btn-primary btn-grande" data-act="v-next" ${V.choices[cat] ? '' : 'disabled'}>${V.idx === V.cats.length - 1 ? 'Revisar el voto →' : 'Siguiente →'}</button></div>`;
  }

  if (V.step === 'confirmar') {
    const c = cyc(k.cycleId);
    const resumen = V.cats.map(cat => {
      if (phase === 'centro') return `<div>${finalistCard(finalist(V.choices.finalista), { noAuthors: true })}</div>`;
      return `<div><h3>${CAT_ICON[cat]} ${esc(catLabel(c, cat))}</h3>${propCard(prop(V.choices[cat]), { noCycle: true, hideAuthors: true })}</div>`;
    }).join('');
    return head + `<div class="row between"><h2 style="margin:0">${esc(k.name)}</h2>${cancel}</div>${stepsBar()}
      <div class="card"><h2>¿Es este vuestro voto?</h2><p>Revisad bien lo que habéis elegido. Una vez registrado, solo un docente puede anularlo.</p></div>
      <div class="grid g3" style="margin-top:1rem">${resumen}</div>
      <div class="vote-bar row between"><button data-act="v-prev">← Cambiar algo</button>
      <button class="btn-primary btn-grande" data-act="v-confirm">✔ Confirmar y registrar el voto</button></div>`;
  }

  if (V.step === 'hecho') {
    return head + `<div class="card center stack" style="max-width:700px;margin:2rem auto">
      <div class="big-ok" aria-hidden="true">🎉</div><h2>¡Voto registrado, ${esc(k.name)}!</h2>
      <p class="note">¡Gracias por participar con vuestras alas de igualdad!</p>
      <p class="small muted">${fmtFecha(V.ts)}</p>
      <div class="row centro"><button class="btn-azul btn-grande" data-act="v-cancel">Siguiente clase →</button></div></div>`;
  }
  return '';
}
VIEWS.votar = () => voteView('ciclo');
VIEWS.votar.after = () => $('#vcode')?.focus();
VIEWS.centro = () => voteView('centro');
VIEWS.centro.after = VIEWS.votar.after;

ACT['v-cancel'] = () => { resetV(V.phase); rerender(); window.scrollTo(0, 0); };
ACT['v-back'] = () => { V.step = 'clase'; V.err = ''; rerender(); };
ACT['v-clase'] = el => {
  V.classId = el.dataset.id; V.err = ''; V.choices = {}; V.idx = 0;
  V.cats = V.phase === 'ciclo' ? pendingCats(V.classId) : ['finalista'];
  if (!V.cats.length) { toast('Esta clase no tiene nada pendiente de votar.'); return; }
  V.code = '';
  const sinCodigo = isAdmin() || esTutor(cls(V.classId));
  V.step = sinCodigo ? 'cat' : 'codigo';
  if (sinCodigo) toast(isAdmin() ? 'Cuenta de dirección: no hace falta el código de clase.' : 'Eres tutor o tutora de esta clase: no hace falta el código.');
  render(); window.scrollTo(0, 0);
};
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form];
  if (fn) Promise.resolve(fn(f, e)).catch(err => { console.error(err); toast('Error: ' + (err?.message || err), 'error'); });
});
const FORMS = {};
function esTutor(k) { return !!(USER.email && k && (k.tutors || []).some(t => String(t).toLowerCase() === USER.email.toLowerCase())); }
FORMS['v-code'] = async f => {
  const val = $('#vcode', f).value.trim();
  let ok;
  if (REMOTE) { setBusy('Comprobando…'); try { ok = (await gsCall('mascApiCodigo', { classId: V.classId, code: val })).ok; } finally { setBusy(''); } }
  else ok = val === cls(V.classId).code;
  if (!ok) { V.err = 'Código incorrecto. Prueba otra vez.'; render(); return; }
  V.code = val; V.step = 'cat'; V.err = ''; render(); window.scrollTo(0, 0);
};
ACT.pick = el => {
  if (!V || V.step !== 'cat') return;
  V.choices[V.cats[V.idx]] = el.dataset.id; rerender();
};
ACT['v-prev'] = () => {
  if (V.step === 'confirmar') { V.step = 'cat'; V.idx = V.cats.length - 1; }
  else if (V.idx > 0) V.idx--;
  else { V.step = 'clase'; V.classId = null; }
  render(); window.scrollTo(0, 0);
};
ACT['v-next'] = () => {
  if (!V.choices[V.cats[V.idx]]) return;
  if (V.idx < V.cats.length - 1) V.idx++; else V.step = 'confirmar';
  render(); window.scrollTo(0, 0);
};
/* El voto se valida con las mismas reglas (comun.js) en el navegador y, en línea, en el servidor. */
async function localVote(req) {
  const err = mascValidarVoto(S, req, { admin: isAdmin(), email: '' });
  if (err) return { error: err };
  const ts = nowISO();
  mascAplicarVoto(S, req, { ts, by: '', uid });
  await persist();
  return { ok: true, ts };
}
ACT['v-confirm'] = async el => {
  const req = { phase: V.phase, classId: V.classId, code: V.code || '', choices: Object.fromEntries(V.cats.map(c => [c, V.choices[c]])) };
  el.disabled = true; BUSY++; setBusy('Registrando el voto…');
  let r;
  try { r = REMOTE ? await gsCall('mascApiVotar', req) : await localVote(req); }
  catch (e) { el.disabled = false; toast('No se ha podido registrar el voto: ' + e.message + '. Vuelve a pulsar «Confirmar».', 'error'); return; }
  finally { BUSY--; setBusy(''); }
  if (REMOTE) applyServer(r);
  if (r.error) { toast(r.error, 'error'); resetV(V.phase); render(); return; }
  V.step = 'hecho'; V.ts = r.ts; render(); window.scrollTo(0, 0);
};
/* Al tocar «Ver grande» dentro de una tarjeta seleccionable, abrir el visor sin seleccionar */
document.addEventListener('click', e => {
  const lb = e.target.closest('.sel [data-act=lb]');
  if (lb) { e.preventDefault(); e.stopPropagation(); ACT.lb(lb); }
}, true);

/* ================= SEGUIMIENTO ================= */
VIEWS.seguimiento = () => {
  const ok = '<span class="tick" title="Votado">✅</span>', no = '<span class="tick muted" title="Pendiente">⬜</span>';
  const ciclos = votingCycles().map(c => {
    const ks = classesOf(c.id), cats = cycleCats(c);
    const hechas = ks.filter(k => !pendingCats(k.id).length && cats.some(cat => voteOf('ciclo', k.id, cat))).length;
    return `<div class="card"><div class="row between"><h3 style="margin:0">${cycChip(c)}</h3>${c.closed ? '<span class="chip ok">Cerrada</span>' : S.phase.ciclo === 'open' ? '<span class="chip pend">Abierta</span>' : '<span class="chip">Sin abrir</span>'}</div>
      <div class="progress" style="margin:.6rem 0" aria-label="${hechas} de ${ks.length} clases"><i style="width:${ks.length ? hechas / ks.length * 100 : 0}%"></i></div>
      <p class="small"><b>${hechas} de ${ks.length}</b> clases han terminado de votar.</p>
      <div class="table-wrap"><table><thead><tr><th>Clase</th>${cats.map(cat => `<th>${CAT_ICON[cat]} ${esc(catLabel(c, cat))}</th>`).join('')}</tr></thead>
      <tbody>${ks.map(k => `<tr><td><b>${esc(k.name)}</b></td>${cats.map(cat => `<td>${voteOf('ciclo', k.id, cat) ? ok : no}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }).join('');
  const hechasC = S.classes.filter(k => voteOf('centro', k.id, 'finalista')).length;
  return `<h1>Seguimiento de la votación</h1>
  <p>Aquí se ve <b>qué clases han votado y cuáles faltan</b>. Lo que ha votado cada clase ${S.config.liveResults ? 'puede verse en Resultados' : 'se mantiene en secreto hasta que se cierre la votación'}.</p>
  <h2 class="section-title">🗳️ Votación de ciclo <span class="bar"></span></h2>
  <div class="grid g2">${ciclos}</div>
  <p class="small muted">El Aula de las Estrellas no participa en la votación de ciclo: su propuesta es finalista directa.</p>
  <h2 class="section-title">🏫 Votación de centro <span class="bar"></span></h2>
  <div class="card"><div class="progress" style="margin-bottom:.6rem"><i style="width:${hechasC / S.classes.length * 100}%"></i></div>
    <p><b>${hechasC} de ${S.classes.length}</b> clases han votado ${S.phase.centro === 'prep' ? '(todavía no está abierta)' : S.phase.centro === 'closed' ? '(cerrada)' : ''}.</p>
    <div class="row">${S.classes.map(k => `<span class="chip ${voteOf('centro', k.id, 'finalista') ? 'ok' : ''}">${voteOf('centro', k.id, 'finalista') ? '✔' : '…'} ${esc(k.name)}</span>`).join('')}</div></div>`;
};

/* ================= RESULTADOS ================= */
function barsHtml(phase, scope, cat, r) {
  const max = Math.max(1, ...r.rows.map(x => x.n));
  return r.rows.map(row => {
    let label, thumb = '';
    if (phase === 'ciclo') {
      const p = prop(row.id);
      if (p.images[0]) thumb = imgTag(p.images[0], '');
      label = p.type === 'dibujo' ? `<span class="chip code">${esc(p.code)}</span>` : `<span class="chip code">${esc(p.code)}</span> <span class="t">${esc(propTitle(p))}</span>`;
    } else {
      const f = finalist(row.id), d = prop(f.parts.dibujo), n = prop(f.parts.nombre);
      thumb = d?.images[0] ? imgTag(d.images[0], '') : '';
      label = `<span class="t">${esc(n?.text)} · ${esc(cyc(row.id).name)}</span>`;
    }
    const win = r.id === row.id;
    return `<div class="bar-row ${win ? 'win' : ''}"><div class="bar-label">${thumb}${label}</div>
      <div class="bar-track" role="img" aria-label="${row.n} votos"><div class="bar-fill" style="width:${row.n / max * 100}%"></div></div>
      <div class="bar-n">${row.n}${win ? ' 🏅' : ''}</div>
      <div class="bar-who">${row.classIds.length ? 'Votado por: ' + row.classIds.map(id => esc(cls(id)?.name)).join(', ') : '—'}</div></div>`;
  }).join('');
}

function statusHtml(phase, scope, cat, r, closed) {
  if (r.status === 'sin-candidatas') return '<p class="muted">No hay propuestas en esta categoría.</p>';
  if (r.status === 'sin-votos') return '<p class="chip pend">Todavía no hay votos.</p>';
  const name = id => phase === 'ciclo' ? (prop(id).type === 'dibujo' ? `${prop(id).code} (${cls(prop(id).classId)?.name})` : `${prop(id).code} · ${propTitle(prop(id))}`) : `${prop(finalist(id).parts.nombre)?.text} (${cyc(id).name})`;
  if (r.status === 'ganadora') return `<p class="chip ok">🏅 Ganadora: ${esc(name(r.id))}</p>`;
  if (r.status === 'desempate') return `<div class="desempate"><b>🏅 Ganadora por desempate: ${esc(name(r.id))}</b><br><span class="mano">${esc(r.tb.note)}</span> <span class="small muted">· ${fmtFecha(r.tb.ts)}</span>
    ${isAdmin() ? `<br><button class="btn-sm btn-peligro" data-act="tb-revoke" data-id="${r.tb.id}">Deshacer desempate</button>` : ''}</div>`;
  // empate
  let html = `<div class="desempate"><b>⚖️ Empate</b> entre: ${r.tied.map(id => esc(name(id))).join(' · ')}.`;
  if (!closed) return html + ' <span class="small muted">(Provisional: la votación sigue abierta.)</span></div>';
  html += `<br>${phase === 'ciclo' ? 'Lo decide el <b>equipo docente del ciclo</b>.' : `Lo decide <b>${esc(S.config.centroTieBody)}</b>.`}`;
  if (isAdmin()) {
    html += `<div class="row" style="margin-top:.5rem"><select data-tb-select="${phase}|${scope}|${cat}" aria-label="Elegir la ganadora del desempate">${r.tied.map(id => `<option value="${esc(id)}">${esc(name(id))}</option>`).join('')}</select>
      <button class="btn-dorado" data-act="tb-save" data-key="${phase}|${scope}|${cat}">Guardar desempate</button></div>`;
  } else html += '<br><span class="small">Para registrar el desempate, entra en el <a href="#/panel">Panel docente</a> y vuelve a esta pantalla.</span>';
  return html + '</div>';
}

ACT['tb-save'] = async el => {
  const [phase, scope, cat] = el.dataset.key.split('|');
  const target = $(`[data-tb-select="${el.dataset.key}"]`).value;
  const r = result(phase, scope, cat);
  if (r.status !== 'empate' || !r.tied.includes(target)) return toast('El empate ya no está vigente.', 'error');
  if (!confirm('¿Registrar este desempate? Quedará anotado en el historial.')) return;
  await commit(() => {
    const note = tieNote(phase), r2 = result(phase, scope, cat);
    if (r2.status !== 'empate' || !r2.tied.includes(target)) return;
    S.tiebreaks.push({ id: uid(), phase, scope, cat, tied: r2.tied, target, note, ts: nowISO() });
    const what = phase === 'ciclo' ? `${prop(target).code}` : `finalista de ${cyc(target).name}`;
    addLog('desempate', `${phase === 'ciclo' ? cyc(scope).name + ' · ' + catLabel(cyc(scope), cat) : 'Votación de centro'}: gana ${what}. ${note}.`);
  });
  toast('Desempate guardado.');
};
ACT['tb-revoke'] = async el => {
  if (!isAdmin()) return;
  if ((phaseLockedForTb(el.dataset.id))) return toast('No se puede deshacer: la votación de centro ya ha empezado.', 'error');
  if (!confirm('¿Deshacer este desempate?')) return;
  await commit(() => {
    const t = S.tiebreaks.find(x => x.id === el.dataset.id); t.revoked = true; t.revokedTs = nowISO();
    addLog('desempate', `Se deshace un desempate (${t.phase === 'ciclo' ? cyc(t.scope).name : 'centro'}).`);
  });
};
function phaseLockedForTb(id) { const t = S.tiebreaks.find(x => x.id === id); return t?.phase === 'ciclo' && S.phase.centro !== 'prep'; }

VIEWS.resultados = args => {
  const tabs = [...votingCycles().map(c => [c.id, c.name]), ['centro', 'Votación de centro']];
  const sel = tabs.some(t => t[0] === args[0]) ? args[0] : tabs[0][0];
  const tabsHtml = `<div class="tabs">${tabs.map(([id, n]) => `<a href="#/resultados/${id}" ${id === sel ? 'aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</div>`;
  let body = '';
  if (sel === 'centro') {
    const ks = S.classes, votadas = ks.filter(k => voteOf('centro', k.id, 'finalista')).length;
    if (S.phase.centro === 'prep') body = `<div class="oculto"><div class="ico">⏳</div><h2>La votación de centro todavía no ha empezado</h2></div>`;
    else if (!centroVisible()) body = hiddenBox(votadas, ks.length, 'centro');
    else {
      const r = result('centro', 'CENTRO', 'finalista');
      body = `<div class="card">${S.phase.centro !== 'closed' ? '<p class="chip pend">Recuento en directo · provisional</p>' : '<p class="chip ok">Votación cerrada</p>'}
        <h2>⭐ Finalistas</h2>${barsHtml('centro', 'CENTRO', 'finalista', r)}${statusHtml('centro', 'CENTRO', 'finalista', r, S.phase.centro === 'closed')}</div>
        ${whoVotedTable('centro', ks, ['finalista'])}`;
    }
  } else {
    const c = cyc(sel), ks = classesOf(c.id);
    const votadas = ks.filter(k => !pendingCats(k.id).length && cycleCats(c).some(cat => voteOf('ciclo', k.id, cat))).length;
    if (!cycleVisible(c)) body = hiddenBox(votadas, ks.length, 'ciclo');
    else {
      const f = finalist(c.id);
      body = `${!c.closed ? '<p class="chip pend">Recuento en directo · provisional (la votación sigue abierta)</p>' : `<p class="chip ok">Votación cerrada ${c.closedTs ? '· ' + fmtFecha(c.closedTs) : ''}</p>`}
        <div class="grid g2" style="margin-top:.8rem">${cycleCats(c).map(cat => {
          const r = result('ciclo', c.id, cat);
          return `<div class="card"><h2>${CAT_ICON[cat]} ${esc(catLabel(c, cat, true))}</h2>${barsHtml('ciclo', c.id, cat, r)}${statusHtml('ciclo', c.id, cat, r, c.closed)}</div>`;
        }).join('')}</div>
        ${c.closed ? `<h2 class="section-title">⭐ Finalista de ${esc(c.name)} <span class="bar"></span></h2><div style="max-width:480px">${finalistCard(f)}</div>` : ''}
        ${whoVotedTable('ciclo', ks, cycleCats(c), c)}`;
    }
  }
  return `<h1>Resultados</h1>${tabsHtml}${body}`;
};
function hiddenBox(votadas, total, phase) {
  return `<div class="oculto"><div class="ico">🤫</div><h2>Recuento oculto hasta el cierre</h2>
    <p>Así no influimos en las clases que todavía no han votado.<br><b>${votadas} de ${total}</b> clases han votado. <a href="#/seguimiento">Ver seguimiento</a></p>
    <p class="small muted">El recuento aparecerá cuando un docente pulse «Cerrar votación» en el Panel docente.</p></div>`;
}
function whoVotedTable(phase, ks, cats, c) {
  return `<h2 class="section-title">📋 Qué votó cada clase <span class="bar"></span></h2><div class="card table-wrap"><table>
    <thead><tr><th>Clase</th>${cats.map(cat => `<th>${esc(catLabel(c, cat))}</th>`).join('')}<th>Fecha</th></tr></thead><tbody>
    ${ks.map(k => {
      const vs = cats.map(cat => voteOf(phase, k.id, cat));
      return `<tr><td><b>${esc(k.name)}</b></td>${vs.map(v => `<td>${v ? (phase === 'ciclo' ? `<span class="chip code">${esc(prop(v.target)?.code)}</span> ${esc(propTitle(prop(v.target)))}` : `${esc(prop(finalist(v.target).parts.nombre)?.text)} (${esc(cyc(v.target).name)})`) : '<span class="muted">—</span>'}</td>`).join('')}
        <td class="small">${esc(vs.filter(Boolean).map(v => fmtFecha(v.ts)).slice(-1)[0] || '')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

/* ================= FINALISTAS ================= */
VIEWS.finalistas = () => {
  const fs = allFinalists();
  const res = mascotaResult();
  return `<div class="row between"><h1 style="margin:0">Las 5 finalistas</h1>${btnProyectar()}</div>
  <p class="mano no-proy">Una por ciclo y la del Aula de las Estrellas. La más votada en la votación de centro será la Mascota Oficial.</p>
  <div class="proyectar"><div class="grid finalistas-grid g5" style="margin-top:1rem">${fs.map(f => finalistCard(f, { winner: res?.id === f.cycleId, badge: res ? (res.id === f.cycleId ? '<span class="chip ok">👑 Mascota Oficial</span>' : f.complete ? '<span class="chip">Pandilla</span>' : '') : '' })).join('')}</div></div>`;
};

/* ================= GRAN FINAL ================= */
let FINAL = { step: 0 };
VIEWS.final = () => {
  const res = mascotaResult();
  if (!res) {
    const r = S.phase.centro === 'closed' ? result('centro', 'CENTRO', 'finalista') : null;
    return `<h1>Gran final · 15 de octubre</h1><div class="oculto"><div class="ico">🔒</div>
      <h2>${r?.status === 'empate' ? 'Hay un empate pendiente de desempate' : 'La gran final se desbloquea al cerrar la votación de centro'}</h2>
      <p>${r?.status === 'empate' ? `Regístralo en <a href="#/resultados/centro">Resultados → Votación de centro</a>.` : 'La votación de centro se celebra el 13 y 14 de octubre.'}</p></div>`;
  }
  const win = finalist(res.id);
  const pandilla = centroCandidates().filter(f => f.cycleId !== res.id);
  const ctrl = `<div class="row centro" style="margin-top:1rem">${btnProyectar()}<button data-act="final-reset">↺ Volver a empezar</button></div>`;
  if (FINAL.step === 0) return `<div class="stage"><div class="mano" style="font-size:2.2rem">15 de octubre · CEIP San Sebastián</div>
      <h1 class="titulo-final">¿Quién será nuestra<br>Mascota Oficial?</h1>
      <p style="font-size:1.3rem">Cinco garzas finalistas. Una será la <b>Mascota Oficial del Colegio</b> y las otras cuatro formarán <b>la Pandilla de Garzas del Cole</b>.</p>
      <button class="btn-morado btn-grande" data-act="final-go" style="font-size:1.8rem">🥁 ¡Descubrirla!</button>${ctrl}</div>`;
  if (FINAL.step === 1) return `<div class="stage"><div class="cuenta" id="cuenta" aria-live="assertive">3</div></div>`;
  const nombre = prop(win.parts.nombre)?.text;
  if (FINAL.step === 2) return `<div class="stage"><div class="corona-txt revela">👑 ¡La Mascota Oficial del CEIP San Sebastián es…!</div>
      <div class="mascota-oficial revela">${finalistCard(win, { winner: true })}</div>
      ${res.status === 'desempate' ? `<p class="small muted">${esc(res.tb.note)}</p>` : ''}
      <button class="btn-azul btn-grande" data-act="final-pandilla">Conocer a la Pandilla →</button>${ctrl}</div>`;
  return `<div class="stage"><h1 class="titulo-final revela">¡${esc(nombre)} y la Pandilla de Garzas del Cole!</h1>
      <div style="max-width:420px;width:100%">${finalistCard(win, { winner: true, badge: '<span class="chip ok">👑 Mascota Oficial</span>' })}</div>
      <h2>La Pandilla</h2>
      <div class="pandilla">${pandilla.map((f, i) => `<div style="animation-delay:${0.3 + i * 0.5}s">${finalistCard(f, { badge: '<span class="chip">Pandilla</span>' })}</div>`).join('')}</div>
      <p class="note">Igualdad, corresponsabilidad, respeto, naturaleza y convivencia: ¡todas volamos juntas!</p>${ctrl}</div>`;
};
VIEWS.final.after = () => {
  if (FINAL.step === 1) {
    let n = 3; const el = $('#cuenta');
    const tick = () => {
      n--;
      if (!document.body.contains(el)) return;
      if (n > 0) { el.textContent = n; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; setTimeout(tick, 1000); }
      else { FINAL.step = 2; render(); confetti(); }
    };
    setTimeout(tick, 1000);
  }
  if (FINAL.step === 3) confetti(60);
};
ACT['final-go'] = () => { FINAL.step = 1; render(); };
ACT['final-pandilla'] = () => { FINAL.step = 3; render(); window.scrollTo(0, 0); };
ACT['final-reset'] = () => { FINAL.step = 0; render(); };
function confetti(n = 140) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confeti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#3F7A5B', '#2F6C8F', '#7A4E8E', '#D89A3C', '#B8546F', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw'; p.style.background = cols[i % cols.length];
    p.style.animationDuration = 2.5 + Math.random() * 3 + 's'; p.style.animationDelay = Math.random() * 1.5 + 's';
    if (i % 4 === 0) { p.style.width = '8px'; p.style.height = '26px'; p.style.borderRadius = '50% 50% 50% 50% / 80% 80% 20% 20%'; }
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 7500);
}

/* ================= AYUDA ================= */
VIEWS.ayuda = () => `<h1>Ayuda para el profesorado</h1>
  <div class="grid g2">
  <div class="card stack"><h2>1. Antes de empezar</h2>
    ${REMOTE ? `<ol>
      <li>Cada tutor o tutora entra desde el <b>canal del curso en SSNet</b>, con su cuenta del cole, en la pizarra digital de su clase.</li>
      <li>La dirección entra en el <a href="#/panel">Panel de dirección</a> con su cuenta (no hay contraseña).</li>
      <li>En Panel → <b>Carga rápida</b> se suben las fotos, los nombres, los lemas y las autorías de cada clase.</li>
      <li>En Panel → Clases, escribe la <b>cuenta de cada tutor o tutora</b>: así vota sin código. Si no, la clase usa su código (imprime las tarjetas).</li>
      <li>Todo se guarda en línea, en el Drive de la dirección. Cada voto queda anotado con la cuenta que lo registró.</li>
    </ol>` : `<ol>
      <li>Entra en <a href="#/panel">Panel docente</a>. La contraseña inicial es <b>${DEFAULT_PW}</b>: <b>cámbiala</b> en Panel → Ajustes.</li>
      <li>La app viene con <b>datos de prueba</b>. Ensaya con ellos (Panel → Datos → «Simular votos de prueba») y, cuando terminéis, pulsa <b>«Empezar con datos reales»</b>.</li>
      <li>Revisa las clases y sus <b>códigos de voto</b> en Panel → Clases, e imprime las tarjetas para cada tutoría.</li>
      <li>Los datos se guardan <b>en este navegador y en este ordenador</b>. Usa siempre el mismo dispositivo y haz copias en Panel → Datos.</li>
    </ol>`}</div>
  <div class="card stack"><h2>2. Dar de alta propuestas</h2>
    <ol>
      <li>La forma más rápida: Panel → <b>📸 Carga rápida</b>, elige la clase, pulsa «Elegir varias fotos de dibujos a la vez» y escribe nombres, lemas y autorías. Pulsa «Guardar y pasar a…» para ir clase por clase.</li>
      <li>Para una propuesta suelta: Panel → <b>Propuestas</b> → «Añadir propuesta».</li>
      <li>Elige la clase y el tipo: dibujo, nombre, lema o historia/cómic.</li>
      <li>Para dibujos y cómics, sube una foto o escaneo (JPG o PNG). La app la reduce para que ocupe poco.</li>
      <li>Escribe la autoría: <b>solo nombre y curso</b>. Si es de toda la clase, marca «Toda la clase».</li>
      <li>El código (por ejemplo <span class="chip code">D-INF-03</span>) se pone solo.</li>
    </ol></div>
  <div class="card stack"><h2>3. Cómo vota una clase</h2>
    <ol>
      <li>La clase mira las propuestas en la <a href="#/galeria">Galería</a> y decide en asamblea.</li>
      <li>La maestra o el maestro abre <a href="#/votar">Votar</a> en la pizarra y elige su clase (con el código, si su cuenta no está asignada a la clase).</li>
      <li>Se elige en tres pasos: <b>dibujo → nombre → lema o historia</b>.</li>
      <li>En la pantalla final se revisa todo y se pulsa «Confirmar y registrar el voto».</li>
      <li>Si hay un error, un docente puede <b>anular</b> el voto en Panel → Votos, indicando el motivo. La clase podrá votar de nuevo esa categoría.</li>
    </ol></div>
  <div class="card stack"><h2>4. Cerrar una fase</h2>
    <ol>
      <li>Consulta en <a href="#/seguimiento">Seguimiento</a> qué clases faltan.</li>
      <li>Panel docente → <b>Fases</b> → «Cerrar votación» en cada ciclo. El recuento se hace visible en <a href="#/resultados">Resultados</a>.</li>
      <li>Si hay <b>empate</b>, el equipo docente del ciclo decide y lo registra en Resultados (con la sesión docente iniciada).</li>
      <li>Con los cuatro ciclos cerrados y sin empates, aparecen las <a href="#/finalistas">5 finalistas</a> y se puede abrir la votación de centro.</li>
      <li>Al cerrar la votación de centro se desbloquea la <a href="#/final">Gran final</a> del 15 de octubre.</li>
      <li>Para el acta: Panel → Datos → «Imprimir acta» o «Descargar CSV».</li>
    </ol></div>
  <div class="card stack"><h2>Proyectar en la pizarra digital</h2>
    <p>En Finalistas y en la Gran final hay un botón <b>📽️ Proyectar</b> que pone la pantalla completa. Toca cualquier dibujo para verlo en grande; usa las flechas del teclado para pasar.</p></div>
  <div class="card stack"><h2>Protección de datos</h2>
    <p>Solo se guarda el <b>nombre y curso</b> de la autoría. Mostrad nombres y dibujos solo con la autorización de las familias, según el protocolo del centro. En Ajustes puedes mostrar solo el nombre y la inicial del apellido. Al terminar el concurso, borra los datos en Panel → Datos.</p></div>
  </div>
  <p class="muted small center" style="margin-top:1.5rem">Alas de Igualdad · versión ${APP_VERSION}</p>`;

/* ================= PANEL DOCENTE ================= */
const PANEL_TABS = [['carga', '📸 Carga rápida'], ['fases', '🚦 Fases'], ['propuestas', '🖼️ Propuestas'], ['clases', '🏫 Clases'], ['votos', '🗳️ Votos e historial'], ['ajustes', '⚙️ Ajustes'], ['datos', '💾 Datos']];
VIEWS.panel = args => {
  if (REMOTE && !isAdmin()) return `<div class="card" style="max-width:620px;margin:2rem auto"><h1>Panel de dirección</h1>
    <p>Has entrado con la cuenta <b>${esc(USER.email || 'desconocida')}</b>, que no tiene acceso al panel.</p>
    <p class="small muted">El panel es solo para la dirección. Si debes tener acceso, pide que añadan tu cuenta en Panel → Ajustes.</p></div>`;
  if (!isAdmin()) return `<div class="card" style="max-width:520px;margin:2rem auto"><h1>Panel docente</h1>
    <form data-form="login" class="stack"><label for="pw">Contraseña del profesorado</label><input id="pw" type="password" autocomplete="current-password" required autofocus>
    <button class="btn-primary btn-grande" type="submit">Entrar</button></form>
    ${S.config.adminHash ? '' : `<p class="small muted">Contraseña inicial: <b>${DEFAULT_PW}</b>. Cámbiala nada más entrar.</p>`}</div>`;
  const tab = PANEL_TABS.some(t => t[0] === args[0]) ? args[0] : (REMOTE ? 'carga' : 'fases');
  return `<div class="row between"><h1 style="margin:0">Panel de dirección</h1>${REMOTE ? `<span class="small muted">${esc(USER.email)}</span>` : '<button data-act="logout">🔒 Cerrar sesión docente</button>'}</div>
    ${REMOTE || S.config.adminHash ? '' : '<p class="chip err" style="white-space:normal">⚠️ Sigues usando la contraseña inicial. Cámbiala en Ajustes.</p>'}
    <div class="tabs">${PANEL_TABS.map(([id, n]) => `<a href="#/panel/${id}" ${id === tab ? 'aria-current="page"' : ''}>${n}</a>`).join('')}</div>
    ${PANEL[tab]()}`;
};
VIEWS.panel.after = () => $('#pw')?.focus();
FORMS.login = async f => {
  if (await checkPw($('#pw', f).value)) { setAdmin(true); toast('Sesión docente iniciada.'); render(); }
  else { toast('Contraseña incorrecta.', 'error'); $('#pw', f).value = ''; $('#pw', f).focus(); }
};
ACT.logout = () => { setAdmin(false); location.hash = '#/inicio'; render(); };
const needAdmin = () => { if (!isAdmin()) { toast(REMOTE ? 'Solo la dirección puede hacer esto.' : 'Hace falta iniciar sesión docente.', 'error'); return false; } return true; };

const PANEL = {};

/* --- Carga rápida: todas las propuestas de una clase en una sola pantalla --- */
let CQ = null;
function authorsToText(p) {
  if (!p) return '';
  const k = cls(p.classId)?.name;
  return p.authors.map(a => a.course && a.course !== k ? `${a.name} (${a.course})` : a.name).join(', ');
}
function textToAuthors(t, className) {
  return String(t || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { name: m[1].trim(), course: m[2].trim() } : { name: x, course: className };
  });
}
function buildCQ(classId) {
  const k = cls(classId), c = cyc(k.cycleId), slots = [];
  const tipos = [['dibujo', 'dibujo'], ['nombre', 'nombre']];
  if (c.textoType) tipos.push(['texto', c.textoType]);
  tipos.forEach(([cat, type]) => {
    const ex = S.proposals.filter(p => p.classId === k.id && catOf(p) === cat).sort(byCode);
    const n = Math.max(k.quota[cat] || 0, ex.length, cat === 'texto' ? 0 : 1);
    for (let i = 0; i < n; i++) {
      const p = ex[i];
      slots.push({ cat, type: p ? p.type : type, propId: p?.id || null, code: p?.code || '', text: p?.text || '', title: p?.title || '',
        images: p ? [...p.images] : [], authors: authorsToText(p), whole: !!p?.wholeClass });
    }
  });
  return { classId, slots, dirty: false };
}
const slotHasContent = s => s.type === 'dibujo' ? s.images.length > 0 : s.type === 'historia' ? !!(s.text || s.title || s.images.length) : !!s.text;
function claseCompleta(k) {
  const tot = ['dibujo', 'nombre', 'texto'].reduce((a, cat) => a + (cat === 'texto' && !cyc(k.cycleId)?.textoType ? 0 : (k.quota[cat] || 0)), 0);
  const n = S.proposals.filter(p => p.classId === k.id).length;
  return { n, tot };
}
PANEL.carga = () => {
  const picker = `<div class="card"><h2 style="margin-top:0">📸 Carga rápida de propuestas</h2>
    <p class="small">Elige una clase. Verás una casilla para cada propuesta que entrega: <b>haz la foto</b> (o elige una o varias de la galería) y escribe los nombres, lemas y autorías. Se guarda la clase entera de una vez.</p>
    ${S.cycles.map(c => `<div class="row" style="margin:.4rem 0"><span style="min-width:150px">${cycChip(c)}</span>${classesOf(c.id).map(k => {
      const { n, tot } = claseCompleta(k);
      return `<button class="btn-sm ${CQ?.classId === k.id ? 'btn-azul' : ''}" data-act="cq-class" data-id="${k.id}" aria-pressed="${CQ?.classId === k.id}">${esc(k.name)} <span class="chip ${n >= tot && tot ? 'ok' : 'pend'}" style="font-size:.7rem">${n}/${tot}</span></button>`;
    }).join('')}</div>`).join('')}</div>`;
  if (!CQ || !cls(CQ.classId)) return picker;
  const k = cls(CQ.classId), c = cyc(k.cycleId);
  const idx = S.classes.indexOf(k), next = S.classes[idx + 1];
  const slotHtml = (sl, i, n) => {
    const head = `<div class="row between"><b>${CAT_ICON[sl.cat]} ${esc(sl.type === 'historia' ? 'Historia o cómic' : catLabel(c, sl.cat))} ${n}</b>${sl.code ? `<span class="chip code">${esc(sl.code)}</span>` : '<span class="chip">nueva</span>'}</div>`;
    let body = '';
    if (sl.type === 'dibujo' || sl.type === 'historia') {
      body += `<div class="thumbs">${sl.images.map((src, j) => `<figure>${imgTag(src, 'Imagen ' + (j + 1))}<button type="button" class="btn-peligro" data-act="cq-img-del" data-i="${i}" data-j="${j}" aria-label="Quitar imagen">✕</button>
        <button type="button" class="btn-sm" data-act="cq-rot" data-i="${i}" data-j="${j}" style="position:static;width:auto;height:auto;border-radius:10px;margin-top:4px;padding:.2rem .5rem">↻ Girar</button></figure>`).join('')}</div>`;
      if (sl.type === 'historia' || !sl.images.length) body += `<label class="btn foto-btn">📷 ${sl.type === 'dibujo' ? 'Hacer foto o elegir imagen' : 'Añadir páginas del cómic'}<input type="file" accept="image/*" ${sl.type === 'historia' ? 'multiple' : ''} data-chg="cq-file" data-i="${i}" hidden></label>`;
    }
    if (sl.type === 'historia') body += `<label>Título</label><input data-cq="${i}" data-f="title" value="${esc(sl.title)}" maxlength="120">
      <label>Texto de la historia <span class="small muted">(si es un cómic, basta con las fotos)</span></label><textarea data-cq="${i}" data-f="text" maxlength="20000">${esc(sl.text)}</textarea>`;
    if (sl.type === 'nombre' || sl.type === 'lema') body += `<label>${sl.type === 'nombre' ? 'Nombre propuesto' : esc(c.textoLabel || 'Lema')}</label><input class="cq-texto" data-cq="${i}" data-f="text" value="${esc(sl.text)}" maxlength="${sl.type === 'nombre' ? 60 : 200}">`;
    body += `<label>Autoría <span class="small muted">(nombres separados por comas)</span></label><input data-cq="${i}" data-f="authors" value="${esc(sl.authors)}" placeholder="Ej.: Nombre Apellido, Nombre Apellido" ${sl.whole ? 'disabled' : ''}>
      <label class="check"><input type="checkbox" data-cq="${i}" data-f="whole" data-chg="cq-whole" ${sl.whole ? 'checked' : ''}> Toda la clase</label>`;
    return `<div class="card slot ${slotHasContent(sl) ? 'lleno' : ''}">${head}${body}</div>`;
  };
  const grupos = ['dibujo', 'nombre', 'texto'].map(cat => {
    const items = CQ.slots.map((sl, i) => [sl, i]).filter(([sl]) => sl.cat === cat);
    if (!items.length) return '';
    return `<h3 class="section-title">${CAT_ICON[cat]} ${esc(catLabel(c, cat, true))}<span class="bar"></span>
        <button type="button" class="btn-sm" data-act="cq-add" data-cat="${cat}">＋ Otra</button></h3>
      ${cat === 'dibujo' ? `<label class="btn btn-sm" style="margin-bottom:.6rem">📥 Elegir varias fotos de dibujos a la vez<input type="file" accept="image/*" multiple data-chg="cq-bulk" hidden></label>` : ''}
      <div class="grid g3">${items.map(([sl, i], n) => slotHtml(sl, i, n + 1)).join('')}</div>`;
  }).join('');
  return picker + `<form data-form="cq-save" class="stack" style="margin-top:1rem" autocomplete="off">
    <div class="row between"><h2 style="margin:0">${esc(k.name)} ${cycChip(c)}</h2><span class="small muted">Para borrar una propuesta ya guardada, usa la pestaña Propuestas.</span></div>
    ${grupos}
    <div class="vote-bar row end"><button type="submit" class="btn-primary">💾 Guardar ${esc(k.name)}</button>
    ${next ? `<button type="submit" class="btn-azul" data-next="${next.id}">💾 Guardar y pasar a ${esc(next.name)} →</button>` : ''}</div></form>`;
};
function readCQ() {
  if (!CQ) return;
  $$('[data-cq]').forEach(el => {
    const sl = CQ.slots[+el.dataset.cq]; if (!sl) return;
    sl[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
  });
}
document.addEventListener('input', e => { if (CQ && e.target.closest('[data-cq]')) CQ.dirty = true; });
function redrawCQ() { readCQ(); rerender(); }
ACT['cq-class'] = el => {
  readCQ();
  if (CQ?.dirty && CQ.classId !== el.dataset.id && !confirm('Hay cambios sin guardar en esta clase. ¿Cambiar de clase y perderlos?')) return;
  CQ = buildCQ(el.dataset.id); rerender();
};
ACT['cq-add'] = el => {
  readCQ();
  const k = cls(CQ.classId), c = cyc(k.cycleId), cat = el.dataset.cat;
  CQ.slots.push({ cat, type: cat === 'texto' ? c.textoType : cat, propId: null, code: '', text: '', title: '', images: [], authors: '', whole: false });
  CQ.slots.sort((a, b) => ['dibujo', 'nombre', 'texto'].indexOf(a.cat) - ['dibujo', 'nombre', 'texto'].indexOf(b.cat));
  CQ.dirty = true; rerender();
};
CHG['cq-whole'] = () => { CQ.dirty = true; redrawCQ(); };
async function leerFotos(files) {
  const out = [];
  for (const [i, f] of [...files].entries()) {
    setBusy(`Preparando foto ${i + 1} de ${files.length}…`);
    try { out.push(await fileToDataURL(f)); } catch (e) { toast(`No se ha podido leer «${f.name}». Usa JPG o PNG.`, 'error'); }
  }
  setBusy('');
  return out;
}
CHG['cq-file'] = async el => {
  readCQ();
  const sl = CQ.slots[+el.dataset.i], fotos = await leerFotos(el.files);
  if (sl.type === 'dibujo') sl.images = fotos.slice(0, 1); else sl.images.push(...fotos);
  CQ.dirty = true; rerender();
};
CHG['cq-bulk'] = async el => {
  readCQ();
  const fotos = await leerFotos(el.files);
  const k = cls(CQ.classId);
  for (const f of fotos) {
    let sl = CQ.slots.find(x => x.type === 'dibujo' && !x.images.length);
    if (!sl) { sl = { cat: 'dibujo', type: 'dibujo', propId: null, code: '', text: '', title: '', images: [], authors: '', whole: false }; CQ.slots.splice(CQ.slots.filter(x => x.cat === 'dibujo').length, 0, sl); }
    sl.images = [f];
  }
  CQ.dirty = true; rerender();
  if (fotos.length) toast(`${plural(fotos.length, 'foto colocada', 'fotos colocadas')} en ${k.name}. Revisa el orden y escribe la autoría.`);
};
ACT['cq-img-del'] = el => { readCQ(); CQ.slots[+el.dataset.i].images.splice(+el.dataset.j, 1); CQ.dirty = true; rerender(); };
ACT['cq-rot'] = async el => {
  readCQ();
  const sl = CQ.slots[+el.dataset.i], j = +el.dataset.j, src = sl.images[j];
  const data = isRef(src) ? await loadRef(src) : src;
  sl.images[j] = await rotateDataURL(data);
  CQ.dirty = true; rerender();
};
FORMS['cq-save'] = async (f, e) => {
  readCQ();
  const k = cls(CQ.classId), nextId = e.submitter?.dataset.next;
  const llenas = CQ.slots.filter(slotHasContent);
  for (const sl of llenas) {
    setBusy('Subiendo imágenes…');
    try { sl.images = await uploadPending(sl.images, `${k.name}-${sl.type}`); } finally { setBusy(''); }
  }
  await commit(() => {
    const kk = cls(CQ.classId), cycleId = kk.cycleId; let altas = 0, cambios = 0;
    llenas.forEach(sl => {
      const datos = { type: sl.type, classId: kk.id, text: (sl.text || '').trim(), title: (sl.title || '').trim(), images: [...sl.images],
        authors: sl.whole ? [] : textToAuthors(sl.authors, kk.name), wholeClass: !!sl.whole };
      const old = sl.propId && prop(sl.propId);
      if (old) {
        const antes = JSON.stringify([old.text, old.title, old.images, old.authors, old.wholeClass]);
        Object.assign(old, datos);
        if (antes !== JSON.stringify([old.text, old.title, old.images, old.authors, old.wholeClass])) cambios++;
      } else {
        const np = Object.assign({ id: sl.propId || uid(), code: nextCode(sl.type, cycleId), alt: '', created: nowISO() }, datos);
        sl.propId = np.id; S.proposals.push(np); altas++;
      }
    });
    if (altas || cambios) addLog('propuesta', `Carga rápida de ${kk.name}: ${altas} propuesta(s) nueva(s) y ${cambios} modificada(s).`);
  });
  toast(`${k.name}: guardado.`);
  CQ = buildCQ(nextId || k.id); rerender();
  if (nextId) window.scrollTo(0, 0);
};
function rotateDataURL(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = img.height; cv.height = img.width;
      const ctx = cv.getContext('2d'); ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      res(cv.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => rej(new Error('No se ha podido girar la imagen'));
    img.src = src;
  });
}

/* --- Fases --- */
PANEL.fases = () => {
  const cic = votingCycles().map(c => {
    const ks = classesOf(c.id);
    const faltan = ks.filter(k => pendingCats(k.id).length);
    const f = c.closed ? finalist(c.id) : null;
    return `<tr><td>${cycChip(c)}</td>
      <td>${c.closed ? `<span class="chip ok">Cerrada</span>` : S.phase.ciclo === 'open' ? '<span class="chip pend">Abierta</span>' : '<span class="chip">Sin abrir</span>'}</td>
      <td class="small">${faltan.length ? 'Faltan: ' + faltan.map(k => esc(k.name)).join(', ') : 'Todas han votado'}</td>
      <td class="small">${f ? (f.complete ? '✔ Finalista lista' : `⚠️ ${f.pending.map(p => esc(catLabel(c, p.cat)) + ': ' + (p.status === 'empate' ? 'empate' : 'sin votos')).join(', ')}`) : ''}</td>
      <td>${c.closed ? `<button class="btn-sm" data-act="cycle-reopen" data-id="${c.id}" ${S.phase.centro !== 'prep' ? 'disabled title="La votación de centro ya ha empezado"' : ''}>Reabrir</button>`
        : `<button class="btn-sm btn-primary" data-act="cycle-close" data-id="${c.id}" ${S.phase.ciclo !== 'open' ? 'disabled' : ''}>Cerrar votación</button>`}</td></tr>`;
  }).join('');
  const fs = allFinalists(), listas = fs.filter(f => f.complete).length;
  const ae = finalist('AE');
  return `<div class="card"><h2>1 · Votación de ciclo <span class="mano">5 – 9 oct</span></h2>
    ${S.phase.ciclo === 'prep' ? `<p>La votación está <b>sin abrir</b>. Al abrirla, las clases ya podrán votar.</p><button class="btn-primary btn-grande" data-act="ciclo-open">▶ Abrir la votación de ciclo</button>` : ''}
    <div class="table-wrap"><table><thead><tr><th>Ciclo</th><th>Estado</th><th>Clases</th><th>Finalista</th><th></th></tr></thead><tbody>${cic}</tbody></table></div>
    <p class="small muted">Al cerrar un ciclo se muestra su recuento. Los empates se resuelven en <a href="#/resultados">Resultados</a>.</p>
    <p class="small">Aula de las Estrellas: ${ae.complete ? '✔ finalista directa lista' : '⚠️ falta dar de alta su dibujo y su nombre en Propuestas'}.</p></div>
  <div class="card" style="margin-top:1rem"><h2>2 · Votación de centro <span class="mano">13 – 14 oct</span></h2>
    <p>Finalistas listas: <b>${listas} de ${fs.length}</b>.</p>
    ${S.phase.centro === 'prep' ? `<button class="btn-primary btn-grande" data-act="centro-open" ${listas === fs.length ? '' : 'disabled'}>▶ Abrir la votación de centro</button>
      ${listas === fs.length ? '' : '<p class="small muted">Se podrá abrir cuando las cinco finalistas estén completas (ciclos cerrados y empates resueltos).</p>'}` : ''}
    ${S.phase.centro === 'open' ? `<p><span class="chip pend">Abierta</span> Han votado ${S.classes.filter(k => voteOf('centro', k.id, 'finalista')).length} de ${S.classes.length} clases.</p><button class="btn-primary btn-grande" data-act="centro-close">■ Cerrar la votación de centro</button>` : ''}
    ${S.phase.centro === 'closed' ? `<p><span class="chip ok">Cerrada</span> ${fmtFecha(S.centroClosedTs)}</p><button class="btn-sm" data-act="centro-reopen">Reabrir votación de centro</button> <a class="btn btn-dorado" href="#/final">🏆 Gran final</a>` : ''}</div>`;
};
ACT['ciclo-open'] = async () => {
  if (!needAdmin()) return;
  if (!confirm('¿Abrir la votación de ciclo? Las clases podrán empezar a votar.')) return;
  await commit(() => { S.phase.ciclo = 'open'; addLog('fase', 'Se abre la votación de ciclo.'); });
};
ACT['cycle-close'] = async el => {
  if (!needAdmin()) return;
  const c = cyc(el.dataset.id), faltan = classesOf(c.id).filter(k => pendingCats(k.id).length);
  if (!confirm(`¿Cerrar la votación de ${c.name}?${faltan.length ? `\n\nATENCIÓN: faltan por votar: ${faltan.map(k => k.name).join(', ')}.` : ''}\n\nSe mostrará el recuento.`)) return;
  await commit(() => { const c = cyc(el.dataset.id); c.closed = true; c.closedTs = nowISO(); addLog('fase', `Se cierra la votación de ${c.name}.${faltan.length ? ' Clases sin votar del todo: ' + faltan.map(k => k.name).join(', ') + '.' : ''}`); });
  location.hash = '#/resultados/' + c.id;
};
ACT['cycle-reopen'] = async el => {
  if (!needAdmin()) return;
  const c = cyc(el.dataset.id);
  if (S.phase.centro !== 'prep') return toast('No se puede reabrir: la votación de centro ya ha empezado.', 'error');
  if (!confirm(`¿Reabrir la votación de ${c.name}? Quedará registrado.`)) return;
  await commit(() => { const c = cyc(el.dataset.id); c.closed = false; c.closedTs = null; addLog('fase', `Se reabre la votación de ${c.name}.`); });
};
ACT['centro-open'] = async () => {
  if (!needAdmin()) return;
  if (!allFinalists().every(f => f.complete)) return toast('Faltan finalistas por completar.', 'error');
  if (!confirm('¿Abrir la votación de centro con las cinco finalistas?')) return;
  await commit(() => {
    S.centroCandidates = allFinalists().filter(f => f.complete).map(f => f.cycleId);
    S.phase.centro = 'open'; addLog('fase', 'Se abre la votación de centro.');
  });
};
ACT['centro-close'] = async () => {
  if (!needAdmin()) return;
  const faltan = S.classes.filter(k => !voteOf('centro', k.id, 'finalista'));
  if (!confirm(`¿Cerrar la votación de centro?${faltan.length ? `\n\nATENCIÓN: faltan por votar: ${faltan.map(k => k.name).join(', ')}.` : ''}`)) return;
  await commit(() => { S.phase.centro = 'closed'; S.centroClosedTs = nowISO(); addLog('fase', 'Se cierra la votación de centro.'); });
  location.hash = '#/resultados/centro';
};
ACT['centro-reopen'] = async () => {
  if (!needAdmin()) return;
  if (!confirm('¿Reabrir la votación de centro? Quedará registrado.')) return;
  await commit(() => { S.phase.centro = 'open'; S.centroClosedTs = null; addLog('fase', 'Se reabre la votación de centro.'); });
};

/* --- Propuestas --- */
let PF = 'all';
PANEL.propuestas = () => {
  const ks = S.classes.filter(k => PF === 'all' || k.cycleId === PF);
  const rows = ks.map(k => {
    const ps = S.proposals.filter(p => p.classId === k.id).sort(byCode);
    const c = cyc(k.cycleId);
    const cuota = ['dibujo', 'nombre', 'texto'].filter(cat => k.quota[cat] || ps.some(p => catOf(p) === cat)).map(cat => {
      const n = ps.filter(p => catOf(p) === cat).length, q = k.quota[cat] || 0;
      return `<span class="chip ${n === q ? 'ok' : 'pend'}">${CAT_ICON[cat]} ${esc(catLabel(c, cat, true))}: ${n}/${q}</span>`;
    }).join(' ');
    return `<div class="card" style="margin-bottom:1rem"><div class="row between"><h3 style="margin:0">${esc(k.name)} ${cycChip(c)}</h3>
      <button class="btn-sm btn-primary" data-act="ed-new" data-class="${k.id}">＋ Añadir propuesta</button></div>
      <div class="row" style="margin:.5rem 0">${cuota}</div>
      ${ps.length ? `<div class="table-wrap"><table><tbody>${ps.map(p => `<tr>
        <td style="width:70px">${p.images[0] ? imgTag(p.images[0], '', 'class="mini"') : `<span style="font-size:1.6rem">${CAT_ICON[catOf(p)]}</span>`}</td>
        <td><span class="chip code">${esc(p.code)}</span><br><span class="small muted">${esc(TYPES[p.type].label)}</span></td>
        <td><b>${esc(propTitle(p))}</b><div class="autoria">✏️ ${esc(authorsText(p))}</div></td>
        <td style="white-space:nowrap"><button class="btn-sm" data-act="ed-open" data-id="${p.id}">✎ Editar</button> <button class="btn-sm btn-peligro" data-act="prop-del" data-id="${p.id}" aria-label="Borrar ${esc(p.code)}">🗑</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin propuestas todavía.</p>'}</div>`;
  }).join('');
  return `<div class="row between"><div class="tabs" style="margin:0">${[['all', 'Todas'], ...S.cycles.map(c => [c.id, c.name])].map(([id, n]) => `<button aria-pressed="${PF === id}" data-act="pf" data-id="${id}">${esc(n)}</button>`).join('')}</div>
    <button class="btn-primary" data-act="ed-new">＋ Añadir propuesta</button></div>
    <p class="small muted">Total: ${plural(S.proposals.length, 'propuesta', 'propuestas')}. El número esperado de cada clase se cambia en la pestaña Clases.</p>${rows}`;
};
ACT.pf = el => { PF = el.dataset.id; rerender(); };
ACT['prop-del'] = async el => {
  if (!needAdmin()) return;
  const p = prop(el.dataset.id);
  if (liveVotes().some(v => v.target === p.id)) return toast('Esta propuesta tiene votos. Anula antes esos votos en «Votos e historial».', 'error');
  if (Object.values(finalist(propCycleId(p)).parts).includes(p.id) && S.phase.centro !== 'prep') return toast('Es parte de una finalista: no se puede borrar.', 'error');
  if (!confirm(`¿Borrar la propuesta ${p.code} («${propTitle(p)}»)?`)) return;
  await commit(() => { S.proposals = S.proposals.filter(x => x.id !== p.id); addLog('propuesta', `Se borra la propuesta ${p.code}.`); });
};

/* Editor de propuestas (diálogo) */
let ED = null;
const dlg = $('#dlg');
ACT['ed-new'] = el => openEditor(null, el.dataset.class);
ACT['ed-open'] = el => openEditor(el.dataset.id);
function openEditor(id, classId) {
  if (!needAdmin()) return;
  const base = { id: null, type: 'dibujo', classId: classId || S.classes[0].id, text: '', title: '', alt: '', images: [], authors: [], wholeClass: false };
  ED = id ? JSON.parse(JSON.stringify(prop(id))) : base;
  if (!ED.authors.length && !ED.wholeClass) ED.authors.push({ name: '', course: cls(ED.classId)?.name || '' });
  drawEditor(); dlg.showModal();
}
function allowedTypes(classId) {
  const c = cyc(cls(classId).cycleId);
  const t = ['dibujo', 'nombre']; if (c.textoType) t.push(c.textoType);
  if (ED?.id && !t.includes(ED.type)) t.push(ED.type);
  return t;
}
function drawEditor() {
  const p = ED;
  if (!allowedTypes(p.classId).includes(p.type)) p.type = 'dibujo';
  const needImg = p.type === 'dibujo' || p.type === 'historia';
  const needText = p.type !== 'dibujo';
  dlg.innerHTML = `<form data-form="ed-save" method="dialog">
    <div class="row between"><h2 style="margin:0">${p.id ? 'Editar propuesta ' + esc(p.code) : 'Nueva propuesta'}</h2><button type="button" data-act="ed-close" aria-label="Cerrar">✕</button></div>
    <div class="grid g2"><div><label for="ed-class">Clase</label><select id="ed-class" data-chg="ed-sync" data-redraw="1">${S.cycles.map(c => `<optgroup label="${esc(c.name)}">${classesOf(c.id).map(k => `<option value="${k.id}" ${k.id === p.classId ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</optgroup>`).join('')}</select></div>
    <div><label for="ed-type">Tipo</label><select id="ed-type" data-chg="ed-sync" data-redraw="1">${allowedTypes(p.classId).map(t => `<option value="${t}" ${t === p.type ? 'selected' : ''}>${TYPES[t].label}</option>`).join('')}</select></div></div>
    ${p.type === 'historia' ? `<label for="ed-title">Título de la historia o cómic</label><input id="ed-title" value="${esc(p.title)}" maxlength="120">` : ''}
    ${needText ? `<label for="ed-text">${p.type === 'nombre' ? 'Nombre propuesto' : p.type === 'lema' ? 'Lema' : 'Texto de la historia (opcional si subes el cómic en imágenes)'}</label>
      ${p.type === 'historia' ? `<textarea id="ed-text" maxlength="20000">${esc(p.text)}</textarea>` : `<input id="ed-text" value="${esc(p.text)}" maxlength="${p.type === 'nombre' ? 60 : 200}">`}` : ''}
    ${needImg ? `<label>${p.type === 'dibujo' ? 'Imagen del dibujo' : 'Páginas del cómic (imágenes)'}</label>
      <div class="thumbs">${p.images.map((src, i) => `<figure>${imgTag(src, `Imagen ${i + 1}`)}<button type="button" class="btn-peligro" data-act="ed-img-del" data-i="${i}" aria-label="Quitar imagen ${i + 1}">✕</button></figure>`).join('')}</div>
      ${p.type === 'dibujo' && p.images.length ? '' : `<input type="file" accept="image/*" ${p.type === 'historia' ? 'multiple' : ''} data-chg="ed-files" aria-label="Subir imagen">`}
      <p class="small muted">Foto o escaneo en JPG o PNG. Se reduce automáticamente.</p>
      <label for="ed-alt">Descripción de la imagen (texto alternativo)</label><input id="ed-alt" value="${esc(p.alt)}" placeholder="Por ejemplo: garza blanca con bufanda morada junto al río" maxlength="200">` : ''}
    <h3 style="margin-top:1rem">Autoría <span class="small muted">(solo nombre y curso)</span></h3>
    <label class="check"><input type="checkbox" id="ed-whole" data-chg="ed-sync" data-redraw="1" ${p.wholeClass ? 'checked' : ''}> Es de toda la clase</label>
    ${p.wholeClass ? '' : `<div class="stack">${p.authors.map((a, i) => `<div class="row" style="flex-wrap:nowrap"><input aria-label="Nombre ${i + 1}" placeholder="Nombre y apellidos" value="${esc(a.name)}" data-author="${i}" data-f="name" style="flex:2">
        <input aria-label="Curso ${i + 1}" placeholder="Curso" value="${esc(a.course)}" data-author="${i}" data-f="course" style="flex:1">
        <button type="button" class="btn-sm btn-peligro" data-act="ed-author-del" data-i="${i}" aria-label="Quitar autor o autora ${i + 1}">✕</button></div>`).join('')}</div>
      <button type="button" class="btn-sm" data-act="ed-author-add" style="margin-top:.5rem">＋ Añadir autor o autora</button>`}
    <div class="row end" style="margin-top:1.2rem"><button type="button" data-act="ed-close">Cancelar</button><button type="submit" class="btn-primary">💾 Guardar</button></div>
  </form>`;
}
function readEditor() {
  const p = ED, g = id => dlg.querySelector('#' + id);
  if (g('ed-class')) p.classId = g('ed-class').value;
  if (g('ed-type')) p.type = g('ed-type').value;
  if (g('ed-title')) p.title = g('ed-title').value.trim();
  if (g('ed-text')) p.text = g('ed-text').value.trim();
  if (g('ed-alt')) p.alt = g('ed-alt').value.trim();
  if (g('ed-whole')) p.wholeClass = g('ed-whole').checked;
  $$('[data-author]', dlg).forEach(inp => { const a = p.authors[+inp.dataset.author]; if (a) a[inp.dataset.f] = inp.value.trim(); });
}
CHG['ed-sync'] = el => {
  const prevClass = ED.classId; readEditor();
  if (ED.classId !== prevClass) ED.authors.forEach(a => { if (!a.course || a.course === cls(prevClass)?.name) a.course = cls(ED.classId).name; });
  if (!ED.wholeClass && !ED.authors.length) ED.authors.push({ name: '', course: cls(ED.classId).name });
  if (el.dataset.redraw) drawEditor();
};
CHG['ed-files'] = async el => {
  readEditor();
  const files = [...el.files];
  for (const f of files) {
    try { ED.images.push(await fileToDataURL(f)); }
    catch (e) { toast(`No se pudo leer «${f.name}». Usa JPG o PNG.`, 'error'); }
    if (ED.type === 'dibujo') break;
  }
  drawEditor();
};
ACT['ed-img-del'] = el => { readEditor(); ED.images.splice(+el.dataset.i, 1); drawEditor(); };
ACT['ed-author-add'] = () => { readEditor(); ED.authors.push({ name: '', course: cls(ED.classId).name }); drawEditor(); dlg.querySelector('[data-author]:last-of-type')?.focus(); };
ACT['ed-author-del'] = el => { readEditor(); ED.authors.splice(+el.dataset.i, 1); drawEditor(); };
ACT['ed-close'] = () => { dlg.close(); ED = null; };
FORMS['ed-save'] = async () => {
  readEditor();
  const p = ED;
  p.authors = p.authors.filter(a => a.name);
  if (p.type === 'dibujo' && !p.images.length) return toast('Falta subir la imagen del dibujo.', 'error');
  if ((p.type === 'nombre' || p.type === 'lema') && !p.text) return toast('Falta escribir el texto.', 'error');
  if (p.type === 'historia' && !p.text && !p.images.length) return toast('Escribe la historia o sube las imágenes del cómic.', 'error');
  if (!p.wholeClass && !p.authors.length) { p.authors.push({ name: '', course: cls(p.classId).name }); drawEditor(); return toast('Indica al menos un autor o autora, o marca «Toda la clase».', 'error'); }
  if (p.wholeClass) p.authors = [];
  const cycleId = cls(p.classId).cycleId;
  const pre = `${TYPES[p.type].letter}-${cyc(cycleId).short}-`;
  p.images = await uploadPending(p.images, p.code || cls(p.classId).name);
  await commit(() => {
    if (!p.id || !prop(p.id)) {
      if (!p.id) p.created = nowISO();
      p.id = p.id || uid(); p.code = nextCode(p.type, cycleId);
      S.proposals.push(JSON.parse(JSON.stringify(p))); addLog('propuesta', `Alta de la propuesta ${p.code} (${cls(p.classId).name}).`);
    } else {
      const old = prop(p.id);
      if (!p.code.startsWith(pre)) p.code = nextCode(p.type, cycleId);
      Object.assign(old, JSON.parse(JSON.stringify(p))); addLog('propuesta', `Se edita la propuesta ${p.code}.`);
    }
  });
  dlg.close(); ED = null; toast('Propuesta guardada.');
};
dlg.addEventListener('close', () => { ED = null; });

function fileToDataURL(file, max = 1400) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => rej(new Error('Imagen no válida'));
      img.src = fr.result;
    };
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
}

/* --- Clases --- */
PANEL.clases = () => `<div class="card"><div class="row between"><h2 style="margin:0">Clases y códigos de voto</h2>
    <div class="row"><button class="btn-sm" data-act="print-codes">🖨️ Imprimir tarjetas de código</button><button class="btn-sm btn-primary" data-act="class-add">＋ Añadir clase</button></div></div>
  <p class="small muted">Los cambios se guardan al salir de cada casilla. Las columnas de dibujos, nombres y lemas indican cuántas propuestas entrega cada clase.${REMOTE ? ' Si escribes la <b>cuenta del tutor o tutora</b>, esa persona vota desde su pizarra sin necesidad de código.' : ''}</p>
  <div class="table-wrap"><table><thead><tr><th>Clase</th><th>Ciclo</th><th>Código</th>${REMOTE ? '<th>Cuenta del tutor/a</th>' : ''}<th>🎨 Dibujos</th><th>🏷️ Nombres</th><th>💬 Lemas / historias</th><th></th></tr></thead><tbody>
  ${S.classes.map(k => `<tr>
    <td><input value="${esc(k.name)}" data-chg="class-f" data-id="${k.id}" data-f="name" aria-label="Nombre de la clase" style="min-width:150px"></td>
    <td><select data-chg="class-f" data-id="${k.id}" data-f="cycleId" aria-label="Ciclo de ${esc(k.name)}">${S.cycles.map(c => `<option value="${c.id}" ${c.id === k.cycleId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></td>
    <td><input value="${esc(k.code)}" data-chg="class-f" data-id="${k.id}" data-f="code" inputmode="numeric" aria-label="Código de ${esc(k.name)}" style="width:90px;font-family:monospace"></td>
    ${REMOTE ? `<td><input value="${esc((k.tutors || []).join(', '))}" data-chg="class-f" data-id="${k.id}" data-f="tutors" placeholder="tutor@g.educaand.es" aria-label="Cuenta del tutor o tutora de ${esc(k.name)}" style="min-width:210px"></td>` : ''}
    ${['dibujo', 'nombre', 'texto'].map(cat => `<td><input type="number" min="0" max="20" value="${k.quota[cat] || 0}" data-chg="class-q" data-id="${k.id}" data-f="${cat}" aria-label="${cat} esperados" style="width:70px"></td>`).join('')}
    <td><button class="btn-sm btn-peligro" data-act="class-del" data-id="${k.id}" aria-label="Borrar ${esc(k.name)}">🗑</button></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:1rem"><h2>Ciclos</h2><p class="small muted">Qué se vota en la tercera categoría de cada ciclo.</p>
  <div class="table-wrap"><table><thead><tr><th>Ciclo</th><th>Tercera categoría</th><th>Etiqueta</th><th>Etiqueta en plural</th></tr></thead><tbody>
  ${S.cycles.map(c => `<tr><td>${cycChip(c)}${c.direct ? '<br><span class="small muted">finalista directa</span>' : ''}</td>
    <td><select data-chg="cyc-f" data-id="${c.id}" data-f="textoType" ${c.closed || S.phase.ciclo === 'open' && !c.direct ? 'disabled' : ''}>${[['', 'Sin lema'], ['lema', 'Lema / frase'], ['historia', 'Historia o cómic']].map(([v, l]) => `<option value="${v}" ${(c.textoType || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
    <td><input value="${esc(c.textoLabel)}" data-chg="cyc-f" data-id="${c.id}" data-f="textoLabel"></td>
    <td><input value="${esc(c.textoLabelPl)}" data-chg="cyc-f" data-id="${c.id}" data-f="textoLabelPl"></td></tr>`).join('')}</tbody></table></div>
  <p class="small muted">Infantil viene <b>sin lema</b>. Si preferís una frase dictada por la clase, elige «Lema / frase» antes de abrir la votación y da de alta las frases en Propuestas.</p></div>`;
CHG['class-f'] = async el => {
  if (!needAdmin()) return;
  const k = cls(el.dataset.id), f = el.dataset.f, v = el.value.trim();
  if (f === 'tutors') {
    const list = v.split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    if (list.some(x => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))) { toast('Revisa la cuenta de correo.', 'error'); return; }
    await commit(() => { const kk = cls(el.dataset.id); kk.tutors = list; addLog('clase', `Clase ${kk.name}: tutoría ${list.join(', ') || '(sin cuenta)'}.`); });
    return toast('Cuenta guardada.');
  }
  if (!v) { toast('No puede quedar vacío.', 'error'); return rerender(); }
  if (f === 'code' && S.classes.some(x => x.id !== k.id && x.code === v)) { toast('Ese código ya lo usa otra clase.', 'error'); return rerender(); }
  if (f === 'cycleId' && S.votes.some(x => x.classId === k.id && !x.annulled)) { toast('Esta clase ya tiene votos: no se puede cambiar de ciclo.', 'error'); return rerender(); }
  await commit(() => { const k = cls(el.dataset.id), old = k[f]; k[f] = v; addLog('clase', `Clase ${k.name}: se cambia ${({ name: 'el nombre', cycleId: 'el ciclo', code: 'el código' })[f]}${f === 'code' ? '' : ` («${old}» → «${v}»)`}.`); });
};
CHG['class-q'] = async el => {
  if (!needAdmin()) return;
  await commit(() => { cls(el.dataset.id).quota[el.dataset.f] = Math.max(0, parseInt(el.value, 10) || 0); });
};
CHG['cyc-f'] = async el => {
  if (!needAdmin()) return;
  await commit(() => { const c = cyc(el.dataset.id); c[el.dataset.f] = el.value.trim() || null; addLog('ajuste', `Ciclo ${c.name}: se cambia la configuración de la tercera categoría.`); });
};
ACT['class-add'] = async () => {
  if (!needAdmin()) return;
  const name = prompt('Nombre de la nueva clase (por ejemplo, 5.º C):'); if (!name?.trim()) return;
  await commit(() => {
    const used = new Set(S.classes.map(k => k.code));
    S.classes.push({ id: 'k' + uid(), name: name.trim(), cycleId: S.cycles[0].id, quota: { dibujo: 2, nombre: 2, texto: 2 }, code: randomCode(used) });
    addLog('clase', `Alta de la clase ${name.trim()}.`);
  });
};
ACT['class-del'] = async el => {
  if (!needAdmin()) return;
  const k = cls(el.dataset.id);
  if (S.proposals.some(p => p.classId === k.id)) return toast('Esta clase tiene propuestas. Bórralas o muévelas antes.', 'error');
  if (S.votes.some(v => v.classId === k.id)) return toast('Esta clase ya ha votado: no se puede borrar.', 'error');
  if (!confirm(`¿Borrar la clase ${k.name}?`)) return;
  await commit(() => { S.classes = S.classes.filter(x => x.id !== k.id); addLog('clase', `Se borra la clase ${k.name}.`); });
};
ACT['print-codes'] = () => printHtml(`<h1>Códigos de voto · Alas de Igualdad</h1><p>Entregad cada tarjeta a la tutoría correspondiente. El código sirve para que solo esa clase registre su voto.</p>
  <div class="tarjetas">${S.classes.map(k => `<div class="tarjeta"><div>${esc(cyc(k.cycleId)?.name)}</div><h2>${esc(k.name)}</h2><b>${esc(k.code)}</b><div>Votación de la mascota · CEIP San Sebastián</div></div>`).join('')}</div>`);

/* --- Votos e historial --- */
PANEL.votos = () => {
  const vs = [...S.votes].sort((a, b) => b.ts.localeCompare(a.ts));
  const desc = v => v.phase === 'ciclo' ? `${catLabel(cyc(v.cycleId), v.cat)}: <span class="chip code">${esc(prop(v.target)?.code || '¿?')}</span> ${esc(propTitle(prop(v.target)))}` : `Finalista de ${esc(cyc(v.target)?.name)}`;
  return `<div class="card"><h2>Votos registrados</h2>
    <p class="small muted">Para corregir un error, anula el voto indicando el motivo. La clase podrá volver a votar esa categoría. Las anulaciones quedan registradas.</p>
    <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Fase</th><th>Clase</th><th>Voto</th><th>Estado</th></tr></thead><tbody>
    ${vs.map(v => {
      const closed = v.phase === 'ciclo' ? (cyc(v.cycleId)?.closed || S.phase.centro !== 'prep') : S.phase.centro === 'closed';
      return `<tr><td class="small">${fmtFecha(v.ts)}</td><td>${v.phase === 'ciclo' ? 'Ciclo' : 'Centro'}</td><td><b>${esc(cls(v.classId)?.name)}</b></td><td>${desc(v)}${v.simulated ? ' <span class="chip">prueba</span>' : ''}</td>
      <td>${v.annulled ? `<span class="chip err">Anulado</span><div class="small">${fmtFecha(v.annulTs)} · ${esc(v.annulReason)}</div>` : closed ? '<span class="chip ok">Válido</span> <span class="small muted">(fase cerrada)</span>' : `<button class="btn-sm btn-peligro" data-act="vote-annul" data-id="${v.id}">Anular</button>`}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="muted">Todavía no hay votos.</td></tr>'}</tbody></table></div></div>
  <div class="card" style="margin-top:1rem"><h2>Historial completo</h2><p class="small muted">Votos, anulaciones, desempates, aperturas y cierres, con fecha y hora.</p>
    <div class="table-wrap" style="max-height:480px;overflow:auto"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>
    ${[...S.log].reverse().map(l => `<tr><td class="small" style="white-space:nowrap">${fmtFecha(l.ts)}</td><td><span class="chip">${esc(l.type)}</span></td><td>${esc(l.text)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin registros.</td></tr>'}
    </tbody></table></div></div>`;
};
ACT['vote-annul'] = async el => {
  if (!needAdmin()) return;
  const v = S.votes.find(x => x.id === el.dataset.id);
  const reason = prompt(`Anular el voto de ${cls(v.classId)?.name}.\nEscribe el motivo (obligatorio):`);
  if (!reason?.trim()) return toast('Anulación cancelada: hace falta un motivo.');
  await commit(() => {
    const v = S.votes.find(x => x.id === el.dataset.id);
    if (!v || v.annulled) return;
    v.annulled = true; v.annulTs = nowISO(); v.annulReason = reason.trim();
    addLog('anulación', `Se anula el voto de ${cls(v.classId)?.name} (${v.phase === 'ciclo' ? catLabel(cyc(v.cycleId), v.cat) : 'centro'}). Motivo: ${reason.trim()}`);
  });
  toast('Voto anulado. La clase puede volver a votar esa categoría.');
};

/* --- Ajustes --- */
PANEL.ajustes = () => `<div class="grid g2">
  <div class="card"><h2>Reglas de la votación</h2>
    <label class="check"><input type="checkbox" data-chg="cfg" data-f="allowOwnVotes" ${S.config.allowOwnVotes ? 'checked' : ''}> <span>Una clase <b>puede votar sus propias propuestas</b> en la votación de ciclo</span></label>
    <label class="check"><input type="checkbox" data-chg="cfg" data-f="liveResults" ${S.config.liveResults ? 'checked' : ''}> <span>Mostrar el <b>recuento en directo</b> (si está desmarcado, el recuento se oculta hasta cerrar la votación)</span></label>
    <label for="tiebody">En la votación de centro, el empate lo decide…</label>
    <select id="tiebody" data-chg="cfg" data-f="centroTieBody">${['el claustro del centro', 'la dirección del centro', 'la comisión de coeducación'].concat(['el claustro del centro', 'la dirección del centro', 'la comisión de coeducación'].includes(S.config.centroTieBody) ? [] : [S.config.centroTieBody]).map(o => `<option ${o === S.config.centroTieBody ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
    <p class="small muted">En la votación de ciclo, el empate lo decide siempre el equipo docente del ciclo.</p></div>
  <div class="card"><h2>Protección de datos</h2>
    <label class="check"><input type="checkbox" data-chg="cfg" data-f="initials" ${S.config.initials ? 'checked' : ''}> <span>Mostrar solo el <b>nombre y la inicial del primer apellido</b> (por ejemplo, «Lucía M.»)</span></label>
    <p class="small muted">Solo se guarda el nombre y el curso de cada autor o autora. Mostrad nombres y dibujos únicamente con la autorización de las familias.</p></div>
  ${REMOTE ? `<div class="card"><h2>Cuentas de la dirección</h2>
    <p class="small">Estas cuentas pueden entrar en el panel. La cuenta de quien publicó la app siempre tiene acceso.</p>
    <form data-form="admins" class="stack"><label for="admins">Una cuenta por línea</label><textarea id="admins" style="min-height:100px" placeholder="nombre@g.educaand.es">${esc((S.config.admins || []).join('\n'))}</textarea>
    <button class="btn-primary" type="submit">Guardar cuentas</button></form></div>` : `<div class="card"><h2>Contraseña del profesorado</h2>
    <form data-form="pw-change" class="stack"><label for="pw1">Nueva contraseña</label><input id="pw1" type="password" minlength="6" autocomplete="new-password" required>
    <label for="pw2">Repite la contraseña</label><input id="pw2" type="password" minlength="6" autocomplete="new-password" required>
    <button class="btn-primary" type="submit">Cambiar contraseña</button></form></div>`}</div>`;
FORMS.admins = async f => {
  const list = $('#admins', f).value.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  if (list.some(x => !x.includes('@'))) return toast('Revisa las cuentas de correo.', 'error');
  await commit(() => { S.config.admins = list; addLog('ajuste', `Cuentas de dirección: ${list.join(', ') || '(solo la cuenta fija)'}.`); });
  toast('Cuentas guardadas.');
};
CHG.cfg = async el => {
  if (!needAdmin()) return;
  const f = el.dataset.f, v = el.type === 'checkbox' ? el.checked : el.value;
  const nombres = { allowOwnVotes: 'votar propuestas propias', liveResults: 'recuento en directo', initials: 'mostrar solo iniciales', centroTieBody: 'quién desempata en la fase de centro' };
  await commit(() => { S.config[f] = v; addLog('ajuste', `Ajuste «${nombres[f]}»: ${v === true ? 'sí' : v === false ? 'no' : v}.`); });
  toast('Ajuste guardado.');
};
FORMS['pw-change'] = async f => {
  const a = $('#pw1', f).value, b = $('#pw2', f).value;
  if (a !== b) return toast('Las contraseñas no coinciden.', 'error');
  if (a.length < 6) return toast('Usa al menos 6 caracteres.', 'error');
  const h = await hashPw(a);
  await commit(() => { S.config.adminHash = h; addLog('ajuste', 'Se cambia la contraseña del profesorado.'); });
  toast('Contraseña cambiada.');
};

/* --- Datos --- */
PANEL.datos = () => `<div class="grid g2">
  <div class="card stack"><h2>📄 Acta y resultados</h2>
    <button class="btn-primary" data-act="print-acta">🖨️ Imprimir acta (o guardar como PDF)</button>
    <button data-act="csv">📊 Descargar resultados en CSV (hoja de cálculo)</button></div>
  <div class="card stack"><h2>💾 Copia de seguridad</h2>
    ${REMOTE ? `<p class="small">Los datos están <b>en línea</b>, en el Drive de la dirección. Aun así, conviene descargar una copia al final de cada día de votación (las imágenes se quedan en Drive).</p>
    <div class="row">${USER.carpetaUrl ? `<a class="btn btn-sm" href="${esc(USER.carpetaUrl)}" target="_blank" rel="noopener">📁 Carpeta en Drive</a>` : ''}${USER.hojaUrl ? `<a class="btn btn-sm" href="${esc(USER.hojaUrl)}" target="_blank" rel="noopener">📊 Registro en Hojas</a>` : ''}</div>`
    : '<p class="small">Los datos se guardan <b>solo en este navegador</b>. Descarga una copia al final de cada día de votación. Con ella también puedes pasar los datos a otro ordenador.</p>'}
    <button class="btn-azul" data-act="export">⬇️ Descargar copia de seguridad</button>
    <label class="btn" style="margin:0">⬆️ Restaurar una copia<input type="file" accept="application/json,.json" data-chg="import" hidden></label></div>
  <div class="card stack"><h2>🧪 Pruebas</h2>
    <p class="small">Para ensayar antes de la votación real.</p>
    <button data-act="simulate" ${(S.phase.ciclo === 'open' && votingCycles().some(c => !c.closed)) || centroOpen() ? '' : 'disabled'}>🎲 Simular votos de prueba en la fase abierta</button>
    <button data-act="load-sample">Cargar de nuevo los datos de prueba</button>
    ${S.meta.sample ? '<button class="btn-dorado" data-act="start-real">✅ Empezar con datos reales (borra los datos de prueba)</button>' : ''}</div>
  <div class="card stack"><h2>🗑️ Al terminar el concurso</h2>
    <p class="small">Borra todas las propuestas, imágenes, autorías, votos y el historial. Se conservan las clases. Descarga antes el acta y una copia si la necesitáis.</p>
    <button class="btn-peligro" data-act="wipe">Borrar todos los datos</button></div></div>`;
ACT.export = () => {
  download(`alas-de-igualdad-copia-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, JSON.stringify(S), 'application/json');
  toast('Copia descargada.');
};
CHG.import = async el => {
  if (!needAdmin()) return;
  const file = el.files[0]; if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { return toast('El archivo no es una copia válida.', 'error'); }
  if (!data || !Array.isArray(data.classes) || !Array.isArray(data.votes) || !Array.isArray(data.proposals)) return toast('El archivo no es una copia de Alas de Igualdad.', 'error');
  if (!confirm(`¿Restaurar esta copia? Sustituirá TODOS los datos actuales de este navegador.\n\n${data.proposals.length} propuestas · ${data.votes.length} votos`)) return;
  await commit(() => { S = migrate(JSON.parse(JSON.stringify(data))); addLog('datos', `Se restaura una copia de seguridad (${file.name}).`); });
  toast('Copia restaurada.');
};
ACT.simulate = async () => {
  if (!needAdmin()) return;
  if (!confirm('Se registrarán votos aleatorios (marcados como «prueba») para las clases que aún no han votado en la fase abierta. ¿Seguir?')) return;
  await commit(() => {
    const ts = nowISO(); let n = 0;
    if (centroOpen()) {
      const cands = centroCandidates();
      S.classes.filter(k => !voteOf('centro', k.id, 'finalista')).forEach(k => {
        const t = cands[Math.floor(Math.random() * cands.length)].cycleId;
        S.votes.push({ id: uid(), phase: 'centro', cycleId: 'CENTRO', classId: k.id, cat: 'finalista', target: t, ts, annulled: false, simulated: true }); n++;
      });
    } else {
      votingCycles().filter(cycleOpen).forEach(c => classesOf(c.id).forEach(k => pendingCats(k.id).forEach(cat => {
        const el = eligible(k.id, cat); const t = el[Math.floor(Math.random() * el.length)].id;
        S.votes.push({ id: uid(), phase: 'ciclo', cycleId: c.id, classId: k.id, cat, target: t, ts, annulled: false, simulated: true }); n++;
      })));
    }
    addLog('prueba', `Se simulan ${n} votos de prueba.`);
  });
  toast('Votos de prueba registrados.');
};
async function resetTo(sample, msg) {
  await commit(() => {
    const st = emptyState();
    st.config = S.config;
    st.classes = S.classes; st.cycles = S.cycles.map(c => Object.assign(c, { closed: false, closedTs: null }));
    S = sample ? ADI_SAMPLE.build(st, uid) : st;
    addLog('datos', msg);
  });
  resetV('ciclo'); FINAL.step = 0; CQ = null;
  if (REMOTE) gsCall('mascApiLimpiarImagenes').catch(() => {});
  rerender();
}
ACT['load-sample'] = async () => {
  if (!needAdmin()) return;
  if (!confirm('¿Cargar los datos de prueba? Se BORRARÁN las propuestas, votos e historial actuales (se conservan clases y ajustes).')) return;
  await resetTo(true, 'Se cargan los datos de prueba.'); toast('Datos de prueba cargados.');
};
ACT['start-real'] = async () => {
  if (!needAdmin()) return;
  if (!confirm('¿Borrar los datos de prueba (propuestas, votos e historial) y empezar con datos reales?\nSe conservan las clases, los códigos y los ajustes.')) return;
  await resetTo(false, 'Se borran los datos de prueba y se empieza con datos reales.'); toast('Listo para dar de alta las propuestas reales.');
};
ACT.wipe = async () => {
  if (!needAdmin()) return;
  const t = prompt('Esto borra TODAS las propuestas, imágenes, autorías, votos e historial del concurso.\nNo se puede deshacer.\n\nEscribe BORRAR para confirmar:');
  if (t !== 'BORRAR') return toast('No se ha borrado nada.');
  await resetTo(false, 'Se borran todos los datos del concurso.'); toast('Datos borrados.');
};

/* --- Exportación: CSV y acta --- */
function csvCell(v) { v = String(v ?? ''); return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
ACT.csv = () => {
  const rows = [['Sección', 'Fase', 'Ciclo', 'Categoría', 'Código', 'Propuesta / finalista', 'Clase de origen', 'Autoría', 'Votos', 'Resultado', 'Clase que vota', 'Fecha', 'Estado']];
  votingCycles().forEach(c => cycleCats(c).forEach(cat => {
    const r = result('ciclo', c.id, cat);
    r.rows.forEach(x => { const p = prop(x.id); rows.push(['Recuento', 'Ciclo', c.name, catLabel(c, cat), p.code, propTitle(p), cls(p.classId)?.name, authorsText(p), x.n, r.id === x.id ? (r.status === 'desempate' ? 'Ganadora (desempate)' : 'Ganadora') : r.status === 'empate' && r.tied.includes(x.id) ? 'Empate' : '', '', '', c.closed ? 'Cerrada' : 'Abierta']); });
  }));
  if (S.phase.centro !== 'prep') {
    const r = result('centro', 'CENTRO', 'finalista');
    r.rows.forEach(x => rows.push(['Recuento', 'Centro', cyc(x.id).name, 'Finalista', '', prop(finalist(x.id).parts.nombre)?.text, '', '', x.n, r.id === x.id ? 'Mascota Oficial' : 'Pandilla', '', '', S.phase.centro === 'closed' ? 'Cerrada' : 'Abierta']));
  }
  S.votes.forEach(v => {
    const p = v.phase === 'ciclo' ? prop(v.target) : null;
    rows.push(['Voto', v.phase === 'ciclo' ? 'Ciclo' : 'Centro', v.phase === 'ciclo' ? cyc(v.cycleId)?.name : '', v.phase === 'ciclo' ? catLabel(cyc(v.cycleId), v.cat) : 'Finalista', p?.code || '', p ? propTitle(p) : prop(finalist(v.target).parts.nombre)?.text + ' (' + cyc(v.target)?.name + ')', '', '', '', '', cls(v.classId)?.name, fmtFecha(v.ts), v.annulled ? `Anulado ${fmtFecha(v.annulTs)}: ${v.annulReason}` : v.simulated ? 'Válido (prueba)' : 'Válido']);
  });
  S.tiebreaks.forEach(t => rows.push(['Desempate', t.phase === 'ciclo' ? 'Ciclo' : 'Centro', t.phase === 'ciclo' ? cyc(t.scope)?.name : '', t.cat, t.phase === 'ciclo' ? prop(t.target)?.code : '', t.phase === 'ciclo' ? propTitle(prop(t.target)) : cyc(t.target)?.name, '', '', '', t.note, '', fmtFecha(t.ts), t.revoked ? 'Deshecho' : 'Vigente']));
  download('alas-de-igualdad-resultados.csv', '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
};
function printHtml(html) {
  $('#print-area').innerHTML = html;
  document.body.classList.add('imprimiendo');
  const done = () => { document.body.classList.remove('imprimiendo'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
}
ACT['print-acta'] = () => {
  const tbl = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  let h = `<h1>Acta de la votación · Alas de Igualdad</h1><p><b>Diseñando la Mascota de Nuestro Cole</b> · CEIP San Sebastián (La Puebla del Río, Sevilla)<br>Documento generado el ${fmtFecha(nowISO())}</p>`;
  h += '<h2>1. Votación de ciclo (5 al 9 de octubre)</h2>';
  votingCycles().forEach(c => {
    h += `<h3>${esc(c.name)} — ${c.closed ? 'cerrada el ' + fmtFecha(c.closedTs) : 'ABIERTA'}</h3>`;
    cycleCats(c).forEach(cat => {
      const r = result('ciclo', c.id, cat);
      h += `<p><b>${esc(catLabel(c, cat, true))}</b>: ${r.status === 'ganadora' ? 'ganadora ' + esc(prop(r.id).code) : r.status === 'desempate' ? 'ganadora ' + esc(prop(r.id).code) + ' — ' + esc(r.tb.note) : r.status === 'empate' ? 'empate sin resolver' : 'sin votos'}</p>`;
      h += tbl(['Código', 'Propuesta', 'Clase', 'Autoría', 'Votos', 'Votada por'], r.rows.map(x => { const p = prop(x.id); return [esc(p.code), esc(propTitle(p)), esc(cls(p.classId)?.name), esc(authorsText(p)), x.n, esc(x.classIds.map(id => cls(id)?.name).join(', '))]; }));
    });
  });
  h += '<h2>2. Finalistas</h2>' + tbl(['Ciclo', 'Dibujo', 'Nombre', 'Lema / historia', 'Autorías'], allFinalists().map(f => {
    const c = cyc(f.cycleId); if (!f.complete) return [esc(c.name), '—', '—', '—', 'Pendiente'];
    const ps = ['dibujo', 'nombre', 'texto'].map(k => f.parts[k] && prop(f.parts[k]));
    return [esc(c.name) + (c.direct ? ' (directa)' : ''), esc(ps[0].code), esc(ps[1].text), ps[2] ? esc(propTitle(ps[2])) : '—', ps.filter(Boolean).map(p => `${esc(p.code)}: ${esc(authorsText(p))}`).join('<br>')];
  }));
  h += `<h2>3. Votación de centro (13 y 14 de octubre)</h2>`;
  if (S.phase.centro === 'prep') h += '<p>No iniciada.</p>';
  else {
    const r = result('centro', 'CENTRO', 'finalista');
    h += tbl(['Finalista', 'Ciclo', 'Votos', 'Votada por', 'Resultado'], r.rows.map(x => [esc(prop(finalist(x.id).parts.nombre)?.text), esc(cyc(x.id).name), x.n, esc(x.classIds.map(id => cls(id)?.name).join(', ')), r.id === x.id ? '<b>MASCOTA OFICIAL</b>' : 'Pandilla']));
    if (r.status === 'desempate') h += `<p>${esc(r.tb.note)} (${fmtFecha(r.tb.ts)}).</p>`;
    if (r.status === 'empate') h += '<p><b>Empate sin resolver.</b></p>';
    h += `<p>Estado: ${S.phase.centro === 'closed' ? 'cerrada el ' + fmtFecha(S.centroClosedTs) : 'ABIERTA'}.</p>`;
  }
  const anul = S.votes.filter(v => v.annulled);
  h += '<h2>4. Anulaciones y desempates</h2>';
  h += anul.length ? tbl(['Fecha', 'Clase', 'Fase', 'Motivo'], anul.map(v => [fmtFecha(v.annulTs), esc(cls(v.classId)?.name), v.phase, esc(v.annulReason)])) : '<p>Ninguna anulación.</p>';
  const tbs = S.tiebreaks.filter(t => !t.revoked);
  h += tbs.length ? tbl(['Fecha', 'Fase', 'Ganadora', 'Nota'], tbs.map(t => [fmtFecha(t.ts), t.phase === 'ciclo' ? esc(cyc(t.scope)?.name + ' · ' + catLabel(cyc(t.scope), t.cat)) : 'Centro', t.phase === 'ciclo' ? esc(prop(t.target)?.code) : esc(cyc(t.target)?.name), esc(t.note)])) : '<p>Ningún desempate.</p>';
  if (S.votes.some(v => v.simulated)) h += '<p><b>Atención:</b> hay votos de prueba (simulados) en estos datos.</p>';
  h += '<div><span class="firma">La dirección</span><span class="firma">La comisión de coeducación</span></div>';
  printHtml(h);
};

/* ================= Arranque ================= */
async function boot() {
  // En línea los datos vienen del servidor: el almacenamiento local solo guarda imágenes, no se espera por él.
  if (REMOTE) { Store.open().catch(() => {}); return bootRemote(); }
  try { await Store.open(); } catch (e) { console.warn('Almacenamiento no disponible', e); Store.db = null; }
  let st = null;
  try { st = await Store.get('state'); } catch (e) { console.warn(e); }
  if (!st) {
    st = ADI_SAMPLE.build(emptyState(), uid);
    st.log.push({ id: uid(), ts: nowISO(), type: 'datos', text: 'Primera puesta en marcha con datos de prueba.' });
  }
  S = migrate(st);
  try { await persist(); } catch (e) { /* aviso ya mostrado */ }
  try { navigator.storage?.persist?.(); } catch (e) { /* opcional */ }
  render();
}
async function bootRemote() {
  setBusy('Conectando…');
  let r;
  try { r = await gsCall('mascApiEstado'); }
  catch (e) {
    $('#main').innerHTML = `<div class="oculto"><div class="ico">📡</div><h2>No se ha podido conectar</h2><p>${esc(e.message)}</p><button data-act="reload">Reintentar</button></div>`;
    return;
  } finally { setBusy(''); }
  applyServer(r);
  if (!r.state) {
    if (!USER.admin) {
      $('#main').innerHTML = `<div class="oculto"><div class="ico">🪺</div><h2>La votación todavía no está preparada</h2><p>La dirección está dando de alta las propuestas. Vuelve a entrar más tarde.</p></div>`;
      setTimeout(() => location.reload(), 60000);
      return;
    }
    S = emptyState();
    addLog('datos', 'Puesta en marcha de la app en línea.');
    const ini = await gsCall('mascApiGuardar', { baseRev: 0, state: S });
    if (!ini.ok) { $('#main').innerHTML = `<div class="oculto"><h2>${esc(ini.error || 'No se ha podido iniciar')}</h2></div>`; return; }
    applyServer(ini);
    toast('App preparada. Empieza por Panel → Carga rápida.');
  }
  setOnline(true);
  render();
  setInterval(poll, 12000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
}
ACT.reload = () => location.reload();
boot().catch(e => window.__falloArranque?.(e?.message || String(e)));
