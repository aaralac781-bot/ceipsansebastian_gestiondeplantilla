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
  if (p.type === 'historia') return p.title || (p.text ? p.text.slice(0, 50) + '…' : 'Cómic ' + p.code);
  return p.text;
}

function mascFind(list, id) {
  for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
  return null;
}

/** Devuelve un texto de error si el voto no es válido, o null si se puede registrar.
 *  req = {phase:'ciclo'|'centro', classId, code, choices:{cat: idPropuesta|idCiclo}}
 *  auth = {admin: bool, email: string} */
function mascValidarVoto(st, req, auth) {
  var k = mascFind(st.classes, req.classId);
  if (!k) return 'No se encuentra la clase.';
  var email = String((auth && auth.email) || '').toLowerCase();
  var tutor = !!email && (k.tutors || []).some(function (t) { return String(t).trim().toLowerCase() === email; });
  if (!(auth && auth.admin) && !tutor && String(req.code || '').trim() !== String(k.code)) return 'El código de la clase no es correcto.';
  var choices = req.choices || {}, cats = Object.keys(choices);
  if (!cats.length) return 'No se ha elegido nada.';
  var yaVotado = function (phase, cat) {
    return st.votes.some(function (v) { return !v.annulled && v.phase === phase && v.classId === k.id && v.cat === cat; });
  };
  if (req.phase === 'ciclo') {
    var c = mascFind(st.cycles, k.cycleId);
    if (!c || c.direct) return 'Esta clase no participa en la votación de ciclo.';
    if (st.phase.ciclo !== 'open' || c.closed) return 'La votación de ' + c.name + ' está cerrada.';
    var validas = mascCycleCats(c);
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      if (validas.indexOf(cat) < 0) return 'Categoría no válida.';
      if (yaVotado('ciclo', cat)) return k.name + ' ya ha votado en «' + mascCatLabel(c, cat) + '».';
      var p = mascFind(st.proposals, choices[cat]);
      if (!p) return 'No se encuentra la propuesta elegida.';
      var pk = mascFind(st.classes, p.classId);
      if (!pk || pk.cycleId !== c.id || MASC_CAT[p.type] !== cat) return 'Esa propuesta no se puede votar en este ciclo.';
      if (st.config && st.config.allowOwnVotes === false && p.classId === k.id) return 'No se pueden votar las propuestas de la propia clase.';
    }
  } else if (req.phase === 'centro') {
    if (st.phase.centro !== 'open') return 'La votación de centro está cerrada.';
    if (cats.length !== 1 || cats[0] !== 'finalista') return 'Voto no válido.';
    if (yaVotado('centro', 'finalista')) return k.name + ' ya ha votado en la votación de centro.';
    if ((st.centroCandidates || []).indexOf(choices.finalista) < 0) return 'Esa finalista no existe.';
  } else return 'Fase no válida.';
  return null;
}

/** Añade los votos y sus entradas de historial. meta = {ts, by, uid: función} */
function mascAplicarVoto(st, req, meta) {
  var k = mascFind(st.classes, req.classId), c = mascFind(st.cycles, k.cycleId);
  Object.keys(req.choices).forEach(function (cat) {
    var target = req.choices[cat];
    st.votes.push({ id: meta.uid(), phase: req.phase, cycleId: req.phase === 'ciclo' ? c.id : 'CENTRO', classId: k.id, cat: cat, target: target, ts: meta.ts, by: meta.by || '', annulled: false });
    var what = req.phase === 'ciclo'
      ? (function (p) { return p.code + ' (' + mascPropTitle(p) + ')'; })(mascFind(st.proposals, target))
      : 'finalista de ' + mascFind(st.cycles, target).name;
    st.log.push({ id: meta.uid(), ts: meta.ts, by: meta.by || '', type: 'voto',
      text: k.name + ' vota ' + (req.phase === 'ciclo' ? mascCatLabel(c, cat).toLowerCase() : 'en la fase de centro') + ': ' + what });
  });
  return meta.ts;
}
