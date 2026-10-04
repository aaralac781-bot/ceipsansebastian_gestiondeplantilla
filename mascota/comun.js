/* Alas de Igualdad · reglas comunes al navegador y al servidor (Google Apps Script).
   Este mismo archivo se copia al proyecto de Apps Script como «MascotaComun.gs»,
   para que el servidor compruebe cada voto con las mismas reglas que la app. */

var MASC_CAT = { dibujo: 'dibujo', nombre: 'nombre', lema: 'texto', historia: 'texto' };

function mascCycleCats(c) { return c && c.textoType ? ['dibujo', 'nombre', 'texto'] : ['dibujo', 'nombre']; }

function mascCatLabel(c, cat) {
  if (cat === 'dibujo') return 'Dibujo';
  if (cat === 'nombre') return 'Nombre';
  if (cat === 'finalista') return 'Finalista';
  return (c && c.textoLabel) || 'Lema';
}

function mascPropTitle(p) {
  if (!p) return '';
  if (p.type === 'dibujo') return 'Dibujo ' + p.code;
  if (p.type === 'historia') return p.title || (p.text ? p.text.slice(0, 50) + '…' : 'Historia o cómic ' + p.code);
  return p.text;
}

function mascFind(list, id) {
  for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
  return null;
}

var MASC_TIPO_PERSONA = { docente: 'docente', consejo: 'familia del Consejo Escolar', pas: 'PAS' };

/** Quién vota: una clase (classId) o una persona (voterId: docente, familia del Consejo Escolar o PAS). */
function mascActor(st, req) {
  if (req.voterId) {
    var p = mascFind(st.voters || [], req.voterId);
    return p ? { persona: true, id: p.id, name: p.name, kind: p.kind, cycleId: p.cycleId, code: p.code, emails: p.email ? [p.email] : [] } : null;
  }
  var k = mascFind(st.classes, req.classId);
  return k ? { persona: false, id: k.id, name: k.name, cycleId: k.cycleId, code: k.code, emails: k.tutors || [] } : null;
}

/** Devuelve un texto de error si el voto no es válido, o null si se puede registrar.
 *  req = {phase:'ciclo'|'centro', classId | voterId, code, choices:{cat: idPropuesta|idCiclo}}
 *  auth = {admin: bool, email: string} */
function mascValidarVoto(st, req, auth) {
  var a = mascActor(st, req);
  if (!a) return req.voterId ? 'No se encuentra a la persona que vota.' : 'No se encuentra la clase.';
  var email = String((auth && auth.email) || '').toLowerCase();
  var cuenta = !!email && a.emails.some(function (t) { return String(t).trim().toLowerCase() === email; });
  if (!(auth && auth.admin) && !cuenta && String(req.code || '').trim() !== String(a.code))
    return a.persona ? 'El código personal no es correcto.' : 'El código de la clase no es correcto.';
  var choices = req.choices || {}, cats = Object.keys(choices);
  if (!cats.length) return 'No se ha elegido nada.';
  var yaVotado = function (phase, cat, cid) {
    return st.votes.some(function (v) { return !v.annulled && v.phase === phase && v.cat === cat && (!cid || v.cycleId === cid) && (a.persona ? v.voterId === a.id : v.classId === a.id); });
  };
  if (req.phase === 'ciclo') {
    if (a.persona && a.kind !== 'docente') return 'En la votación de ciclo votan las clases y el profesorado. Las familias del Consejo Escolar y el PAS votáis en la votación de centro.';
    // El profesorado vota en su ciclo; el del Aula de las Estrellas (finalista directa) vota en todos los ciclos.
    var cid = req.cycleId || a.cycleId, c = mascFind(st.cycles, cid), propio = mascFind(st.cycles, a.cycleId);
    if (!c || c.direct) return a.persona ? 'Elige en qué ciclo vas a votar.' : 'Esta clase no participa en la votación de ciclo.';
    if (a.persona ? !(a.cycleId === cid || (propio && propio.direct)) : cid !== a.cycleId) return a.persona ? 'Solo puedes votar en la votación de tu ciclo.' : 'Una clase solo vota en su ciclo.';
    if (st.phase.ciclo !== 'open' || c.closed) return 'La votación de ' + c.name + ' está cerrada.';
    var validas = mascCycleCats(c);
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      if (validas.indexOf(cat) < 0) return 'Categoría no válida.';
      if (yaVotado('ciclo', cat, c.id)) return a.name + ' ya ha votado en «' + mascCatLabel(c, cat) + '».';
      var p = mascFind(st.proposals, choices[cat]);
      if (!p) return 'No se encuentra la propuesta elegida.';
      var pk = mascFind(st.classes, p.classId);
      if (!pk || pk.cycleId !== c.id || MASC_CAT[p.type] !== cat) return 'Esa propuesta no se puede votar en este ciclo.';
      if (!a.persona && st.config && st.config.allowOwnVotes === false && p.classId === a.id) return 'No se pueden votar las propuestas de la propia clase.';
    }
  } else if (req.phase === 'centro') {
    if (st.phase.centro !== 'open') return 'La votación de centro está cerrada.';
    if (cats.length !== 1 || cats[0] !== 'finalista') return 'Voto no válido.';
    if (yaVotado('centro', 'finalista')) return a.name + ' ya ha votado en la votación de centro.';
    if ((st.centroCandidates || []).indexOf(choices.finalista) < 0) return 'Esa finalista no existe.';
  } else return 'Fase no válida.';
  return null;
}

/** Añade los votos y sus entradas de historial. meta = {ts, by, uid: función} */
function mascAplicarVoto(st, req, meta) {
  var a = mascActor(st, req), c = mascFind(st.cycles, req.phase === 'ciclo' ? (req.cycleId || a.cycleId) : a.cycleId);
  var quien = a.persona ? a.name + ' (' + (MASC_TIPO_PERSONA[a.kind] || a.kind) + ')' : a.name;
  Object.keys(req.choices).forEach(function (cat) {
    var target = req.choices[cat];
    var v = { id: meta.uid(), phase: req.phase, cycleId: req.phase === 'ciclo' ? c.id : 'CENTRO', cat: cat, target: target, ts: meta.ts, by: meta.by || '', annulled: false };
    if (a.persona) v.voterId = a.id; else v.classId = a.id;
    st.votes.push(v);
    var what = req.phase === 'ciclo'
      ? (function (p) { return p.code + ' (' + mascPropTitle(p) + ')'; })(mascFind(st.proposals, target))
      : 'finalista de ' + mascFind(st.cycles, target).name;
    st.log.push({ id: meta.uid(), ts: meta.ts, by: meta.by || '', type: 'voto',
      text: quien + ' vota ' + (req.phase === 'ciclo' ? mascCatLabel(c, cat).toLowerCase() : 'en la fase de centro') + ': ' + what });
  });
  return meta.ts;
}
