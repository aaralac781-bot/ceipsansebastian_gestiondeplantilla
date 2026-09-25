/*  ════════════════════════════════════════════════════════════════
    CONSEJO ESCOLAR · Votaciones anónimas + Sorteos + Avisos
    CEIP San Sebastián — App de Apps Script (archivo: Code.gs)
    ════════════════════════════════════════════════════════════════
    Despliegue correcto (IMPRESCINDIBLE para el voto anónimo):
      Implementar → Nueva implementación → Aplicación web
        · Ejecutar como:  Yo (tu cuenta)
        · Quién tiene acceso:  Cualquier usuario de g.educaand.es
    ──────────────────────────────────────────────────────────────── */

var PROP = PropertiesService.getScriptProperties();
var EMAILS_DEF = 'aaralac781@g.educaand.es,41003522@g.educaand.es';

/* ---------- Servir la página ---------- */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Consejo Escolar · CEIP San Sebastián')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
function include(f){ return HtmlService.createHtmlOutputFromFile(f).getContent(); }

/* ---------- Hoja de datos (se crea sola) ---------- */
function _ss(){
  var id = PROP.getProperty('SHEET_ID');
  if(id){ try{ return SpreadsheetApp.openById(id); }catch(e){} }
  var ss = SpreadsheetApp.create('Consejo Escolar — Datos (no borrar)');
  PROP.setProperty('SHEET_ID', ss.getId());
  return ss;
}
function _hoja(nombre, cabecera){
  var ss=_ss(), sh=ss.getSheetByName(nombre);
  if(!sh){ sh=ss.insertSheet(nombre); if(cabecera) sh.appendRow(cabecera); }
  return sh;
}
function _hojas(){
  _hoja('Votaciones',['id','titulo','opciones','estado','creada']);
  _hoja('Votos',['votacionId','opcion','ts']);
  _hoja('HanVotado',['clave','ts']);
  _hoja('Listados',['nombre','datos','ts']);
  _hoja('Sorteos',['id','titulo','semilla','config','resultado','fecha']);
}

/* ---------- Configuración inicial (ejecutar UNA vez a mano) ---------- */
function setupInicial(){
  _hojas();
  if(!PROP.getProperty('ADMIN_PASS')) PROP.setProperty('ADMIN_PASS','cambia1234');
  if(!PROP.getProperty('EMAILS'))     PROP.setProperty('EMAILS', EMAILS_DEF);
  crearTriggerDiario();
  return 'Listo. Hoja creada, contraseña provisional "cambia1234", aviso diario activado. Cámbialo desde la app.';
}

/* ---------- Aviso diario por email (disparador temporal) ---------- */
function crearTriggerDiario(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='avisoDiario') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('avisoDiario').timeBased().everyDays(1).atHour(7).create();
}
function avisoDiario(){
  var hoy=_hoy0();
  var pend=CALENDARIO().map(function(ev){
    var fin=_d(ev.hasta), dias=Math.round((fin-hoy)/86400000);
    return {ev:ev, fin:fin, dias:dias};
  }).filter(function(o){ return o.dias>=0 && o.dias<=7; })
    .sort(function(a,b){ return a.fin-b.fin; });
  if(!pend.length) return;
  var lineas = pend.map(function(o){
    var cuando = o.dias===0 ? 'HOY' : (o.dias===1?'mañana':'en '+o.dias+' días');
    return '• ('+cuando+') '+o.ev.ti + (o.ev.sen?'  [Séneca]':'');
  }).join('\n');
  var cuerpo = 'Consejo Escolar 2026/2027 — CEIP San Sebastián\n\n'
    + 'Tareas del proceso electoral en los próximos 7 días:\n\n'
    + lineas + '\n\n'
    + 'Abrir la app: ' + (ScriptApp.getService().getUrl()||'') + '\n';
  var emails = (PROP.getProperty('EMAILS')||EMAILS_DEF).split(',').map(function(s){return s.trim();}).filter(Boolean);
  emails.forEach(function(e){
    try{ MailApp.sendEmail(e, '📅 Consejo Escolar — tareas pendientes', cuerpo); }catch(err){}
  });
}

/* ---------- Identidad y admin ---------- */
function _emailActual(){
  try{ return (Session.getActiveUser().getEmail()||'').toLowerCase(); }catch(e){ return ''; }
}
function _esAdmin(pass){ return String(pass||'')===String(PROP.getProperty('ADMIN_PASS')||''); }
function adminEntrar(pass){ return _esAdmin(pass); }
function adminGuardarConfig(pass, nuevoPass, emails){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  if(nuevoPass && String(nuevoPass).length>=4) PROP.setProperty('ADMIN_PASS', String(nuevoPass));
  if(emails) PROP.setProperty('EMAILS', String(emails));
  return { emails: PROP.getProperty('EMAILS') };
}
function getConfig(pass){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  return { emails: PROP.getProperty('EMAILS')||EMAILS_DEF, url: ScriptApp.getService().getUrl()||'' };
}

/* ---------- Datos de arranque para la web ---------- */
function getBootstrap(){
  _hojas();
  var yo=_emailActual();
  var sh=_hoja('Votaciones');
  var v=sh.getDataRange().getValues(); // incluye cabecera
  var abiertas=[];
  for(var i=1;i<v.length;i++){
    if(String(v[i][3])!=='abierta') continue;
    var id=String(v[i][0]);
    abiertas.push({
      id:id, titulo:String(v[i][1]),
      opciones:JSON.parse(v[i][2]||'[]'),
      yaVoto:_yaVoto(id, yo)
    });
  }
  return { email:yo, identificado: !!yo, votaciones:abiertas, calendario:CALENDARIO() };
}

/* ---------- VOTACIONES (admin crea) ---------- */
function crearVotacion(pass, titulo, opciones){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  titulo=String(titulo||'').trim();
  opciones=(opciones||[]).map(function(o){return String(o).trim();}).filter(Boolean);
  if(!titulo || opciones.length<2) throw new Error('Pon un título y al menos 2 opciones.');
  var id='v'+Date.now();
  _hoja('Votaciones').appendRow([id, titulo, JSON.stringify(opciones), 'abierta', new Date()]);
  return id;
}
function listarVotaciones(pass){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  var v=_hoja('Votaciones').getDataRange().getValues(), out=[];
  for(var i=1;i<v.length;i++){
    var id=String(v[i][0]);
    out.push({ id:id, titulo:String(v[i][1]), opciones:JSON.parse(v[i][2]||'[]'),
      estado:String(v[i][3]), votos:_contarVotos(id) });
  }
  return out.reverse();
}
function cambiarEstadoVotacion(pass, id, estado){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  var sh=_hoja('Votaciones'), v=sh.getDataRange().getValues();
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===String(id)){ sh.getRange(i+1,4).setValue(estado); break; } }
  return true;
}

/* voto anónimo: el email va SOLO a HanVotado (para no repetir); la opción va SOLO a Votos. Nunca juntos. */
function emitirVoto(id, opcionIndex){
  var yo=_emailActual();
  if(!yo) throw new Error('No se ha podido identificar tu cuenta. Entra con tu cuenta @g.educaand.es.');
  var sh=_hoja('Votaciones'), v=sh.getDataRange().getValues(), row=null;
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===String(id)){ row=v[i]; break; } }
  if(!row) throw new Error('La votación no existe.');
  if(String(row[3])!=='abierta') throw new Error('La votación está cerrada.');
  var ops=JSON.parse(row[2]||'[]');
  opcionIndex=parseInt(opcionIndex,10);
  if(isNaN(opcionIndex)||opcionIndex<0||opcionIndex>=ops.length) throw new Error('Opción no válida.');
  if(_yaVoto(id, yo)) throw new Error('Ya has votado en esta votación.');
  var lock=LockService.getScriptLock();
  try{
    lock.waitLock(8000);
    if(_yaVoto(id, yo)) throw new Error('Ya has votado en esta votación.');
    _hoja('HanVotado').appendRow([_clave(id, yo), new Date()]);
    _hoja('Votos').appendRow([id, ops[opcionIndex], new Date()]);
  } finally { try{ lock.releaseLock(); }catch(e){} }
  return { ok:true, opcion:ops[opcionIndex] };
}
function _clave(id, email){
  var raw=id+'|'+email;
  var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return b.map(function(x){ return (x<0?x+256:x).toString(16); }).join('');
}
function _yaVoto(id, email){
  if(!email) return false;
  var clave=_clave(id, email);
  var v=_hoja('HanVotado').getDataRange().getValues();
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===clave) return true; }
  return false;
}
function _contarVotos(id){
  var v=_hoja('Votos').getDataRange().getValues(), n=0;
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===String(id)) n++; }
  return n;
}
function getResultados(pass, id){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  var sh=_hoja('Votaciones'), v=sh.getDataRange().getValues(), ops=[];
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===String(id)){ ops=JSON.parse(v[i][2]||'[]'); break; } }
  var cuenta={}; ops.forEach(function(o){ cuenta[o]=0; });
  var vv=_hoja('Votos').getDataRange().getValues(), total=0;
  for(var j=1;j<vv.length;j++){ if(String(vv[j][0])===String(id)){ var o=String(vv[j][1]); cuenta[o]=(cuenta[o]||0)+1; total++; } }
  return { opciones:ops.map(function(o){ return {opcion:o, votos:cuenta[o]||0}; }), total:total };
}

/* ---------- LISTADOS (familias / profesorado) ---------- */
function guardarListado(pass, nombre, texto){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  nombre=String(nombre||'').trim(); if(!nombre) throw new Error('Falta el nombre del listado.');
  var arr=String(texto||'').split('\n').map(function(x){return x.trim();}).filter(Boolean);
  var sh=_hoja('Listados'), v=sh.getDataRange().getValues(), fila=-1;
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===nombre){ fila=i+1; break; } }
  if(fila>0){ sh.getRange(fila,2).setValue(JSON.stringify(arr)); sh.getRange(fila,3).setValue(new Date()); }
  else sh.appendRow([nombre, JSON.stringify(arr), new Date()]);
  return arr.length;
}
function getListados(pass){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  var v=_hoja('Listados').getDataRange().getValues(), out=[];
  for(var i=1;i<v.length;i++){ out.push({ nombre:String(v[i][0]), datos:JSON.parse(v[i][1]||'[]') }); }
  return out;
}
function borrarListado(pass, nombre){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  var sh=_hoja('Listados'), v=sh.getDataRange().getValues();
  for(var i=1;i<v.length;i++){ if(String(v[i][0])===String(nombre)){ sh.deleteRow(i+1); break; } }
  return true;
}

/* ---------- SORTEO reproducible ---------- */
function realizarSorteo(pass, titulo, semilla, sectores){
  if(!_esAdmin(pass)) throw new Error('Contraseña incorrecta.');
  semilla=String(semilla||'').trim(); if(!semilla) throw new Error('Falta la semilla.');
  var res=[];
  (sectores||[]).forEach(function(s, idx){
    var pool=(s.censo||[]).map(function(x){return String(x).trim();}).filter(Boolean);
    if(!pool.length) return;
    var mezcla=_baraja(pool, _mulberry(_hash(semilla+'::'+idx+'::'+s.nombre)));
    res.push({ nombre:s.nombre,
      titulares:mezcla.slice(0, s.titulares||0),
      suplentes:mezcla.slice(s.titulares||0, (s.titulares||0)+(s.suplentes||0)) });
  });
  var id='s'+Date.now();
  _hoja('Sorteos').appendRow([id, String(titulo||'Sorteo'), semilla, JSON.stringify(sectores||[]), JSON.stringify(res), new Date()]);
  return { id:id, semilla:semilla, resultado:res, fecha:_fLarga(new Date()) };
}
function _hash(str){ var h=1779033703^str.length; for(var i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return (h>>>0)||1; }
function _mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function _baraja(arr, rng){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(rng()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ---------- Calendario oficial (Resolución 7/9/2026, BOJA 177) ---------- */
function CALENDARIO(){ return [
  {n:1, hasta:'2026-09-18', ti:'Configuración del proceso electoral en Séneca', sen:true},
  {n:2, hasta:'2026-09-18', ti:'Censo de Acceso Restringido para sortear la Junta Electoral', sen:true},
  {n:3, hasta:'2026-10-01', ti:'Validación del cupo según el tipo de centro', sen:true},
  {n:4, hasta:'2026-10-02', ti:'Constitución de la Junta Electoral (28 sept–2 oct)'},
  {n:5, hasta:'2026-10-07', ti:'Censo de Acceso Público — publicación provisional', sen:true},
  {n:6, hasta:'2026-10-14', ti:'Publicación definitiva del Censo de Acceso Público'},
  {n:7, hasta:'2026-10-15', ti:'Validación del censo en Séneca', sen:true},
  {n:8, hasta:'2026-10-27', ti:'Admisión de candidaturas (14–27 oct)'},
  {n:9, hasta:'2026-10-28', ti:'Grabación del representante del AMPA mayoritaria', sen:true},
  {n:10, hasta:'2026-10-28', ti:'Publicación de la lista provisional de candidaturas'},
  {n:11, hasta:'2026-10-30', ti:'Publicación de la lista definitiva de candidaturas'},
  {n:12, hasta:'2026-10-31', ti:'Validación de las candidaturas en Séneca', sen:true},
  {n:13, hasta:'2026-11-12', ti:'Campaña electoral (3–12 nov)'},
  {n:14, hasta:'2026-11-07', ti:'Confección de las papeletas de voto'},
  {n:15, hasta:'2026-11-12', ti:'Voto electrónico de las familias (3–12 nov)', sen:true},
  {n:16, hasta:'2026-11-10', ti:'Sorteo y grabación de las Mesas Electorales', sen:true},
  {n:17, hasta:'2026-11-16', ti:'Voto no presencial en doble sobre (10–16 nov)'},
  {n:18, hasta:'2026-11-16', ti:'Censo de Acceso Restringido para control del voto', sen:true},
  {n:19, hasta:'2026-11-17', ti:'Elecciones: familias 17 · alumnado 18 · profesorado/PAS 19 nov'},
  {n:20, hasta:'2026-11-17', ti:'Apertura de la Urna Electrónica', sen:true},
  {n:21, hasta:'2026-11-20', ti:'Grabación del resultado de las votaciones', sen:true},
  {n:22, hasta:'2026-12-02', ti:'Proclamación de representantes electos'},
  {n:23, hasta:'2026-12-18', ti:'Constitución del nuevo Consejo Escolar'},
  {n:24, hasta:'2026-12-18', ti:'Grabación de los componentes del Consejo Escolar', sen:true}
]; }
function _d(iso){ var p=iso.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function _hoy0(){ var t=new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function _fLarga(dt){ var M=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; return dt.getDate()+' de '+M[dt.getMonth()]+' de '+dt.getFullYear(); }
