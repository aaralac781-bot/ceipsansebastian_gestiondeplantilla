// ══════════════════════════════════════════════════════════════════════════
// CLARITANET — Codigo.gs  (base SSNet personalizada · CEIP Clara Campoamor)
// ══════════════════════════════════════════════════════════════════════════

// ═══ CONFIG DEL CENTRO — cambia SOLO este bloque ═══════════════════════════
const CONFIG = {
  // ID de la hoja de cálculo de Claritanet.
  // ▸ Si usas la COPIA que hiciste del Sheet de SSNet, pon AQUÍ el id de esa copia.
  SPREADSHEET_ID:  '1rYYBau4Jtn2Y3VwzZXHBGwXtcLuP2fylvR0g4A0dRNs',
  FOTOS_FOLDER_ID: '',        // carpeta de fotos de Claritanet (vacío = sin galería/subida)
  LIBROS_FOLDER_ID:'',        // carpeta donde crear las listas de libros (vacío = quedan en tu Drive)
  TITULO_WEB:  'Claritanet',
  CENTRO:      'CEIP Clara Campoamor',
  MAIL_PREFIX: '[Claritanet]',
  YT_USER:     '',            // usuario o @canal de YouTube (sin @). Vacío = cartelera vacía
  P27: {
    firma:  '\n\nCon cariño,\nEl Equipo Directivo',
    inicio: '2026-09-11',
    fin:    '2027-06-23',
    festivos: [ /* ▸ REVISA los festivos de TU provincia (AAAA-MM-DD) */
      '2026-10-12','2026-11-02','2026-12-07','2026-12-08',
      '2026-12-23','2026-12-24','2026-12-25','2026-12-28','2026-12-29','2026-12-30','2026-12-31',
      '2027-01-01','2027-01-04','2027-01-05','2027-01-06','2027-01-07','2027-01-08',
      '2027-02-26','2027-03-01','2027-03-22','2027-03-23','2027-03-24','2027-03-25','2027-03-26',
      '2027-05-01'
    ]
  }
};
// ═══════════════════════════════════════════════════════════════════════════

const SPREADSHEET_ID  = CONFIG.SPREADSHEET_ID;
const FOTOS_FOLDER_ID = CONFIG.FOTOS_FOLDER_ID;

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var accion = params.accion || "";
  if (accion) return _acc(params);
  _initPestanas();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.TITULO_WEB)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
}

function doPost(e) {
  return _acc((e && e.parameter) ? e.parameter : {});
}

function _acc(params) {
  var accion   = params.accion   || "";
  var callback = params.callback || "cb";
  var datos = {};
  try { datos = JSON.parse(params.datos || "{}"); } catch(x) {}
  try {
    var result;
    if      (accion === "ping")                result = {ok:true, ts:Date.now()};
    else if (accion === "guardar")             result = _guardarGestion(datos);
    else if (accion === "leer")                result = _leerGestion();
    else if (accion === "publicarSust")        result = _sust(datos);
    else if (accion === "publicarCalendario")  result = _cal(datos);
    else if (accion === "getProyectos") result = getProyectos();
    else if (accion === "publicarRecreo")      result = _rec(datos);
    else if (accion === "publicarRecreoCuad") result = _recCuad(datos);
    else if (accion === "publicarTablon")      result = _publTablon(datos);
    else if (accion === "publicarHorarios")    result = publicarHorarios(datos);
    else if (accion === "guardarReservasConfig") result = guardarReservasConfig(datos);
    else if (accion === "sincronizarMaestros") result = sincronizarMaestros(datos);
    else if (accion === "getListadoAlumnos")   result = getListadoAlumnos();
    else if (accion === "getFolderContents")   result = getFolderContents(datos.folderId||"");
    else if (accion === "getGaleriaFotos")     result = getGaleriaFotos();
    else if (accion === "getTablonItems")      result = getTablonItems();
    else if (accion === "getCartelera")        result = getCartelera();
    else if (accion === "getCourseFolders")    result = getCourseFolders();
    else if (accion === "getDestinatarios")    result = getDestinatariosNotificacion();
    else if (accion === "crearListaLibros")    result = crearListaControlLibros(datos.grupo||"");
    else                                       result = {ok:false, error:"accion desconocida: "+accion};
    return ContentService
      .createTextOutput(callback+"("+JSON.stringify(result)+")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch(err) {
    return ContentService
      .createTextOutput(callback+'({"ok":false,"error":'+JSON.stringify(err.toString())+'})')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// ── AUTO-LOGIN CON CUENTA EDUCAAND ────────────────────────────────────────
function autoLoginGoogle() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email || email.indexOf('@') < 0) return {success: false, bgImage: ''};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('Control_Acceso');
    if (!sh) return {success: false, bgImage: ''};
    var data = sh.getDataRange().getValues();
    var ur = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().toLowerCase().trim() === email.toLowerCase().trim()
          && data[i][1].toString().toUpperCase().trim() === 'ACTIVO') {
        ur = data[i]; break;
      }
    }
    if (!ur) return {success: false, bgImage: ''};
    return _buildLoginResult(ur, data, email);
  } catch(e) {
    return {success: false, bgImage: '', error: e.toString()};
  }
}

function loginWithCredentials(email, password) {
  try {
    email = (email || "").toLowerCase().trim();
    if (!email) return {success: false, message: "Introduce tu email."};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("Control_Acceso");
    if (!sh) return {success: false, message: "Error interno."};
    var data = sh.getDataRange().getValues();
    var ur = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().toLowerCase().trim() === email
          && data[i][1].toString().toUpperCase().trim() === "ACTIVO") {
        ur = data[i]; break;
      }
    }
    if (!ur) return {success: false, message: "Email no encontrado o cuenta inactiva."};
    var sp = ur[4] ? ur[4].toString().trim() : "";
    if (sp && sp !== password.trim()) return {success: false, message: "Contraseña incorrecta."};
    return _buildLoginResult(ur, data, email);
  } catch(e) {
    return {success: false, message: "Error: " + e.toString()};
  }
}

function verifyGoogleUser() {
  try {
    return {success: true, bgImage: ""};
  } catch(e) { return {success: true, bgImage: ""}; }
}

function _buildLoginResult(ur, data, email) {
  var quote = "Que tengas un gran dia!";
  try {
    var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sf = ss2.getSheetByName("Frases");
    if (sf && sf.getLastRow() >= 2) {
      var fr = sf.getRange("A2:A"+sf.getLastRow()).getValues().flat().filter(String);
      if (fr.length) quote = fr[Math.floor(Math.random()*fr.length)];
    }
  } catch(e) {}
  var maestros = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1].toString().toUpperCase().trim() === "ACTIVO" && data[i][2])
      maestros.push(data[i][2].toString().trim());
  }
  var cursos = [];
  if (ur[3]) cursos.push(normalizeStr(ur[3]));
  if (ur[5]) {
    ur[5].toString().split(",").forEach(function(c){
      c = c.trim(); if (c && cursos.indexOf(c) < 0) cursos.push(c);
    });
  }
  return {success:true, email:email, name:normalizeStr(ur[2])||"Docente",
          group:normalizeStr(ur[3])||"", cursos:cursos, quote:quote,
          bgImage:"", maestros:maestros};
}

// ── SINCRONIZAR MAESTROS ──────────────────────────────────────────────────
function sincronizarMaestros(datos) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('Control_Acceso');
    if (!sh) return {success:false, error:'No existe Control_Acceso'};
    var maestros = datos.maestros || [];
    if (!maestros.length) return {success:false, error:'Sin maestros'};
    var existing = {};
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) existing[rows[i][0].toString().toLowerCase().trim()] = i+1;
    maestros.forEach(function(m){
      var email = (m.email||'').toLowerCase().trim(); if (!email) return;
      var rowNum = existing[email];
      if (rowNum) {
        sh.getRange(rowNum,2).setValue(m.activo||'ACTIVO');
        sh.getRange(rowNum,3).setValue(m.nombre||'');
        sh.getRange(rowNum,4).setValue(m.grupo||'');
        sh.getRange(rowNum,6).setValue(m.cursos||'');
      } else {
        sh.appendRow([email, m.activo||'ACTIVO', m.nombre||'', m.grupo||'', 'APP', m.cursos||'']);
        existing[email] = sh.getLastRow();
      }
    });
    return {success:true, msg:'Sincronizados '+maestros.length+' maestros'};
  } catch(e) { return {success:false, error:e.toString()}; }
}

// ── LEER ALUMNOS DESDE APP DE GESTIÓN ─────────────────────────────────────
// BUSCA getListadoAlumnos() en Codigo.gs y REEMPLAZA TODO el bloque por esto:

function getListadoAlumnos() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = null;
    ['Alumnos','alumnos','ALUMNOS','Alumnado'].forEach(function(n){
      if(!sh) sh = ss.getSheetByName(n);
    });
    if (!sh) {
      sh = ss.insertSheet('Alumnos');
      sh.appendRow(['apellidos','nombre','grupo']);
      sh.getRange('A1:C1').setFontWeight('bold').setBackground('#0B132B').setFontColor('white');
      return {alumnos:{}, msg:'Pestaña Alumnos creada. Pega los datos.'};
    }
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return {alumnos:{}};
    var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
    var iA = headers.indexOf('apellidos'); if(iA<0) iA=0;
    var iN = headers.indexOf('nombre');    if(iN<0) iN=1;
    var iG = headers.indexOf('grupo');     if(iG<0) iG=2;
    var alumnos = {};
    for(var i=1; i<data.length; i++){
      var ap = (data[i][iA]||'').toString().trim();
      var nm = (data[i][iN]||'').toString().trim();
      var gr = (data[i][iG]||'').toString().trim();
      if(!ap && !nm) continue;
      if(!gr) continue;
      var nc = ap ? ap+', '+nm : nm;
      if(!alumnos[gr]) alumnos[gr]=[];
      alumnos[gr].push(nc);
    }
    Object.keys(alumnos).forEach(function(g){ alumnos[g].sort(); });
    return {alumnos:alumnos, grupos:Object.keys(alumnos).sort()};
  } catch(e){
    return {alumnos:{}, error:e.toString()};
  }
}

// ── LEER CARPETA DE DRIVE ─────────────────────────────────────────────────
function getFolderContents(folderId) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var files = [];
    var TIPOS = {
      'application/vnd.google-apps.document':'document',
      'application/vnd.google-apps.spreadsheet':'spreadsheet',
      'application/vnd.google-apps.presentation':'presentation',
      'application/vnd.google-apps.folder':'folder',
      'application/pdf':'pdf'
    };
    var folders = folder.getFolders();
    while(folders.hasNext()){var f=folders.next(); files.push({nombre:f.getName(),url:f.getUrl(),id:f.getId(),tipo:'folder',fecha:''});}
    var fileIt=folder.getFiles(); var fileArr=[];
    while(fileIt.hasNext()){
      var f2=fileIt.next();
      var tipo=TIPOS[f2.getMimeType()]||'file';
      var fechaStr=Utilities.formatDate(f2.getLastUpdated(),Session.getScriptTimeZone(),'dd/MM/yyyy');
      fileArr.push({nombre:f2.getName(),url:f2.getUrl(),tipo:tipo,fecha:fechaStr,ts:f2.getLastUpdated().getTime()});
    }
    fileArr.sort(function(a,b){return b.ts-a.ts;});
    fileArr.forEach(function(f){delete f.ts;});
    return {files:files.concat(fileArr)};
  } catch(e){ return {files:[],error:e.toString()}; }
}

// ── CREAR LISTA CONTROL DE LIBROS ─────────────────────────────────────────
function crearListaControlLibros(grupo) {
  try {
    var CARPETA=CONFIG.LIBROS_FOLDER_ID;
    var ESTADOS=["Nuevo","Buen estado","Deteriorado","Inutilizable"];
    var MATERIAS={
      "3":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica"],
      "4":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica"],
      "5":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica","Francés"],
      "6":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica","Francés","Valores 6º"]
    };
    var nivel=grupo.replace(/[^0-9]/g,'').charAt(0)||"3";
    var materias=MATERIAS[nivel]||MATERIAS["3"];
    var listaData=getListadoAlumnos();
    var alumnos=(listaData.alumnos||{})[grupo]||[];
    var titulo="Lista Control Libros - "+grupo+" - "+new Date().getFullYear();
    var ss=SpreadsheetApp.create(titulo);
    var sh=ss.getActiveSheet();
    sh.setName("Control Libros");

    // Cabecera titulo
    var nCols=2+(materias.length*2);
    sh.getRange(1,1,1,nCols).merge()
      .setValue(CONFIG.CENTRO + " · Control de Libros · "+grupo+" · "+new Date().getFullYear())
      .setFontWeight("bold").setBackground("#0B132B").setFontColor("white").setHorizontalAlignment("center");

    // Cabecera materias — Sep y Jun en misma fila
    sh.getRange(2,1).setValue("#");
    sh.getRange(2,2).setValue("NOMBRE Y APELLIDOS");
    for(var j=0;j<materias.length;j++){
      var col=3+(j*2);
      sh.getRange(2,col,1,2).merge().setValue(materias[j]).setHorizontalAlignment("center").setFontWeight("bold");
    }
    // Subcabecera Sep/Jun
    sh.getRange(3,1).setValue("#");
    sh.getRange(3,2).setValue("NOMBRE");
    for(var j=0;j<materias.length;j++){
      var col=3+(j*2);
      sh.getRange(3,col).setValue("Sep").setHorizontalAlignment("center");
      sh.getRange(3,col+1).setValue("Jun").setHorizontalAlignment("center");
    }
    sh.getRange(2,1,2,nCols).setFontWeight("bold").setBackground("#e2e8f0");

    var rule=SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS,true).build();
    var numFilas=Math.max(alumnos.length,30);
    for(var i=0;i<numFilas;i++){
      var row=4+i;
      sh.getRange(row,1).setValue(i+1);
      sh.getRange(row,2).setValue(alumnos[i]||"");
      for(var j=0;j<materias.length;j++){
        var col=3+(j*2);
        sh.getRange(row,col).setDataValidation(rule);
        sh.getRange(row,col+1).setDataValidation(rule);
      }
      if(i%2===1) sh.getRange(row,1,1,nCols).setBackground("#f8fafc");
    }
    sh.setColumnWidth(1,40); sh.setColumnWidth(2,200);
    for(var j=0;j<materias.length;j++){
      var col=3+(j*2);
      sh.setColumnWidth(col,90); sh.setColumnWidth(col+1,90);
    }
    sh.setFrozenRows(3);

    if(CARPETA){
      var file=DriveApp.getFileById(ss.getId());
      DriveApp.getFolderById(CARPETA).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }
    return {success:true, url:ss.getUrl(), titulo:titulo};
  } catch(e){ return {success:false, error:e.toString()}; }
}

// ── EXPORTAR HORARIOS ─────────────────────────────────────────────────────
function publicarHorarios(datos) {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var pestanas=[
      {nombre:'Horarios_Maestros',cab:['Maestro','Tramo','Lunes','Martes','Miércoles','Jueves','Viernes'],key:'maestros'},
      {nombre:'Horarios_Grupos',cab:['Grupo','Dia','Tramo','Maestro','Materia'],key:'grupos'},
      {nombre:'Horarios_Refuerzo/PT',cab:['Maestro_Apoyo','Dia','Tramo','Maestro_Apoyado','Grupo','Tipo'],key:'refuerzo'}
    ];
    pestanas.forEach(function(p){
      var sh=ss.getSheetByName(p.nombre)||ss.insertSheet(p.nombre);
      sh.clearContents();
      sh.appendRow(p.cab);
      sh.getRange(1,1,1,p.cab.length).setFontWeight('bold').setBackground('#0B132B').setFontColor('white');
      (datos[p.key]||[]).forEach(function(row){sh.appendRow(row);});
    });
    return {success:true,msg:'Horarios exportados'};
  } catch(e){ return {success:false,error:e.toString()}; }
}

// ── TABLÓN ────────────────────────────────────────────────────────────────
function getTablonItems() {
  try {
    _initPestanas();
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd");
    var items=[];
    var shTab=ss.getSheetByName("Tablon");
    if(shTab&&shTab.getLastRow()>1){
      shTab.getRange(2,1,shTab.getLastRow()-1,6).getValues().forEach(function(row){
        var titulo=(row[1]||"").toString().trim();
        var activo=(row[5]||"").toString().toUpperCase().trim();
        var caducidad=_nf(row[4]);
        if(!titulo||activo!=="SI") return;
        if(caducidad&&caducidad<today) return;
        items.push({tipo:(row[0]||"aviso").toString().trim().toLowerCase(),
          titulo:titulo,mensaje:(row[2]||"").toString().trim(),
          link:(row[3]||"").toString().trim(),fecha:today});
      });
    }
    return {items:items};
  } catch(e){ return {items:[],error:e.toString()}; }
}

function _publTablon(d){
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh=ss.getSheetByName("Tablon");
  if(!sh){ sh=ss.insertSheet("Tablon"); sh.appendRow(["Tipo","Titulo","Mensaje","Link","Fecha_Caducidad","Activo"]); }
  var items=d.items||[];
  // Reemplaza el contenido (borra filas de datos y reescribe)
  var lastRow=sh.getLastRow();
  if(lastRow>1) sh.getRange(2,1,lastRow-1,sh.getLastColumn()).clearContent();
  items.forEach(function(it){
    sh.appendRow([
      it.tipo||"AVISO",
      it.titulo||"",
      it.mensaje||"",
      it.enlace||"",
           it.caducidad||"",
      (it.activo===false)?"NO":"SI"
    ]);
  });
  return { ok:true, n:items.length };
}

// ── GALERÍA ───────────────────────────────────────────────────────────────
function getGaleriaFotos() {
  try {
    var root=DriveApp.getFolderById(FOTOS_FOLDER_ID);
    var items=[];
    var folders=root.getFolders();
    while(folders.hasNext()){
      var folder=folders.next(); var files=folder.getFiles(); var thumbs=[];
      while(files.hasNext()&&thumbs.length<1){
        var f=files.next();
        if(f.getMimeType().indexOf("image")>=0) thumbs.push("https://drive.google.com/thumbnail?id="+f.getId()+"&sz=w200");
      }
      items.push({tipo:"album",nombre:folder.getName(),id:folder.getId(),thumb:thumbs[0]||""});
    }
    return {albums:items,fotos:[]};
  } catch(e){ return {albums:[],fotos:[],error:e.toString()}; }
}

function getCourseFolders() {
  try {
    var root=DriveApp.getFolderById(FOTOS_FOLDER_ID);
    var folders=[]; var nivel1=root.getFolders();
    while(nivel1.hasNext()){
      var c1=nivel1.next(); var nombre1=c1.getName(); var subs=[];
      var nivel2=c1.getFolders();
      while(nivel2.hasNext()){var c2=nivel2.next(); subs.push(nombre1+' / '+c2.getName());}
      folders.push(nombre1);
      subs.forEach(function(s){folders.push('  '+s);});
    }
    return {success:true,folders:folders};
  } catch(e){ return {success:false,folders:[]}; }
}

function uploadPhotoToDrive(b64,fn,cf,mt) {
  try {
    var root=DriveApp.getFolderById(FOTOS_FOLDER_ID); var folder=root;
    if(cf){
      cf=cf.replace(/^\s+/,'').trim();
      if(cf.indexOf(' / ')>=0){
        var partes=cf.split(' / ');
        var it1=root.getFoldersByName(partes[0].trim());
        var c1=it1.hasNext()?it1.next():root.createFolder(partes[0].trim());
        var it2=c1.getFoldersByName(partes[1].trim());
        folder=it2.hasNext()?it2.next():c1.createFolder(partes[1].trim());
      } else {
        var it=root.getFoldersByName(cf);
        folder=it.hasNext()?it.next():root.createFolder(cf);
      }
    }
    var blob=Utilities.newBlob(Utilities.base64Decode(b64),mt||"image/jpeg",fn||"foto.jpg");
    var file=folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    return {success:true,url:file.getUrl()};
  } catch(e){ return {success:false,error:e.toString()}; }
}

// ── CARTELERA ─────────────────────────────────────────────────────────────
function getCartelera() {
  try {
    if(!CONFIG.YT_USER) return {videos:[]};
    var videos = null;
    // Intento 1: puerta directa por nombre de usuario clásico
    var r1 = UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?user=' + CONFIG.YT_USER, {muteHttpExceptions:true});
    if (r1.getResponseCode() === 200) videos = _parseVideosRSS(r1.getContentText());
    // Intento 2: localizar el ID del canal en su página
    if (!videos || !videos.length) {
      var props = PropertiesService.getScriptProperties();
      var channelId = props.getProperty('YT_CHANNEL_ID');
      if (!channelId) {
        var html = UrlFetchApp.fetch('https://www.youtube.com/@' + CONFIG.YT_USER, {
          muteHttpExceptions: true,
          headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'es-ES'}
        }).getContentText();
        var m = html.match(/"channelId":"(UC[^"]+)"/) ||
                html.match(/"externalId":"(UC[^"]+)"/) ||
                html.match(/channel_id=(UC[A-Za-z0-9_-]+)/) ||
                html.match(/"browseId":"(UC[^"]+)"/);
        if (m) { channelId = m[1]; props.setProperty('YT_CHANNEL_ID', channelId); }
      }
      if (channelId) {
        var r2 = UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId, {muteHttpExceptions:true});
        if (r2.getResponseCode() === 200) videos = _parseVideosRSS(r2.getContentText());
      }
    }
    if (!videos || !videos.length) return {videos:[], error:'YouTube no devolvió vídeos. Avísame con este mensaje.'};
    return {videos: videos};
  } catch(e) { return {videos:[], error: e.toString()}; }
}

function _parseVideosRSS(xml) {
  try {
    var doc = XmlService.parse(xml);
    var ns = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    var nsYt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');
    return doc.getRootElement().getChildren('entry', ns).map(function(e){
      return {
        id: e.getChild('videoId', nsYt).getText(),
        titulo: e.getChild('title', ns).getText(),
        fecha: e.getChild('published', ns).getText().substr(0, 10)
      };
    });
  } catch(x) { return []; }
}

// ── HORARIO ───────────────────────────────────────────────────────────────
function getDailySchedule(teacherName,groupName) {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var di=new Date().getDay(); if(di===0||di===6) return {isWeekend:true};
    var days=["","Lunes","Martes","Miercoles","Jueves","Viernes"]; var today=days[di];
    var tN=normalizeStr(teacherName),gN=normalizeStr(groupName); var rows=[];
    var shM=ss.getSheetByName("Horarios_Maestros");
    if(shM){
      var valsM=shM.getDataRange().getValues().slice(1);
      var tMatch=_resolveNombre(teacherName, valsM.map(function(r){return r[0];}));
      if(tMatch){ var tK=_nom(tMatch);
        valsM.forEach(function(r){
          if(_nom(r[0])!==tK)return;
          var t=normalizeStr(r[1]); var det=r[di+1]?normalizeStr(r[di+1]):"";
          if(t&&det)rows.push({tramo:t,tipo:"Mi Horario",detalle:det,refuerzo:""});
        });
      }
    }
    if(gN){var shG=ss.getSheetByName("Horarios_Grupos");if(shG){shG.getDataRange().getValues().slice(1).forEach(function(r){
      if(normalizeStr(r[0]).replace(/\s/g,"")!==gN.replace(/\s/g,""))return;
      if(normalizeStr(r[1]).toLowerCase()!==today.toLowerCase())return;
      var t=normalizeStr(r[2]); var m=normalizeStr(r[3]);
      if(t&&m)rows.push({tramo:t,tipo:"Horario Grupo",detalle:m,refuerzo:""});
    });}}
    var shR=ss.getSheetByName("Horarios_Refuerzo/PT");
    if(shR){shR.getDataRange().getValues().slice(1).forEach(function(r){
      if(normalizeStr(r[1]).toLowerCase()!==today.toLowerCase())return;
      if(!_mismoNom(r[3], teacherName))return;
      var t=normalizeStr(r[2]);
      if(t)rows.push({tramo:t,tipo:"Refuerzo / PT",detalle:"",refuerzo:r[4]?normalizeStr(r[4]):"Apoyo"});
    });}
    rows.sort(function(a,b){
      var n=function(t){var m=t.match(/(\d+)/);return m?parseInt(m[1]):(t.toLowerCase().indexOf("recreo")>=0?50:99);};
      return n(a.tramo)-n(b.tramo);
    });
    return {isWeekend:false,data:rows};
  } catch(e){ return {isWeekend:false,data:[]}; }
}

// ── AGENDA ────────────────────────────────────────────────────────────────
function getAgendaEvents() {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh=ss.getSheetByName("Calendario_Eventos");
    if(!sh||sh.getLastRow()<2) return {events:[]};
    var MAP={"CRONOGRAMA":"cronograma","SUSTITUCIONES":"sustituciones","PROYECTOS":"proyectos","RECREO":"recreo"};
    function _hora(v){
      if(!v) return "";
      if(v instanceof Date) return Utilities.formatDate(v,Session.getScriptTimeZone(),"HH:mm");
      return v.toString().trim();
    }
    var events=[];
    sh.getRange(2,1,sh.getLastRow()-1,8).getValues().forEach(function(row){
      var fr=row[0],titulo=row[3]?row[3].toString().trim():"",cal=row[4]?row[4].toString().toUpperCase().trim():"";
      if(!fr||!titulo||!cal) return;
      var fs=_nf(fr); if(!fs) return;
      var desc=row[6]?row[6].toString().trim():"";
      var enlace=row[5]?row[5].toString().trim():"";
      var ev={calendarId:MAP[cal]||cal.toLowerCase(),titulo:titulo,fecha:fs,
        horaInicio:_hora(row[1]),horaFin:_hora(row[2]),descripcion:desc,
        proyecto:row[7]?row[7].toString().trim():""};
      if((ev.calendarId==="sustituciones"||ev.calendarId==="recreo")&&desc){
        try{
          var t=JSON.parse(desc);
          if(Array.isArray(t)) ev.tablaFilas=t;
          else if(t&&typeof t==="object"){
            var ks=Object.keys(t);
            ev.tablaFilas=[ks,ks.map(function(k){return t[k];})];
          }
          ev.descripcion="";
        }catch(x){}
      } else if(enlace){
        ev.enlace=enlace;
        ev.descripcion=(ev.descripcion?ev.descripcion+"\n":"")+'📎 <a href="'+enlace+'" target="_blank" style="color:#2563eb;font-weight:700;text-decoration:underline">Ver documento</a>';
      }
      events.push(ev);
    });
    return {events:events};
  } catch(e){ return {events:[]}; }
}
// ── SUSTITUCIONES ─────────────────────────────────────────────────────────
function _sust(d) {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh=ss.getSheetByName("Calendario_Eventos");
    if(!sh) return {ok:false,error:"Pestana no encontrada"};
    var fecha=(d.fecha||"").toString().trim();
    var sustDia=(d.sustDia||"").toString().trim();
    var filas=d.filas||[];
    if(!fecha||filas.length<2) return {ok:false,error:"Datos incompletos"};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return {ok:false,error:"Fecha incorrecta"};
    var all=sh.getDataRange().getValues();
    for(var i=all.length-1;i>=1;i--){
      if(_nf(all[i][0])===fecha&&(all[i][4]||"").toString().toUpperCase().trim()==="SUSTITUCIONES") sh.deleteRow(i+1);
    }
    sh.appendRow([fecha,"08:00","14:00","SUSTITUCIONES "+sustDia,"SUSTITUCIONES","",JSON.stringify(filas)]);
    return {ok:true,fecha:fecha,filas:filas.length};
  } catch(err){ return {ok:false,error:err.toString()}; }
}

function _cal(d){
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh=ss.getSheetByName("Calendario_Eventos");
  if(!sh){ sh=ss.insertSheet("Calendario_Eventos"); sh.appendRow(["Fecha","HoraIni","HoraFin","Titulo","Calendario","Enlace","Descripcion","Proyecto"]); }
  var calId=d.calId||"";
  var eventos=d.eventos||[];
  var lastRow=sh.getLastRow();
  if(lastRow>1){
    var vals=sh.getRange(2,1,lastRow-1,8).getValues();
    for(var i=vals.length-1;i>=0;i--){
      if(String(vals[i][4])===String(calId)) sh.deleteRow(i+2);
    }
  }
  eventos.forEach(function(ev){
    sh.appendRow([
      String(ev.fecha||"").trim(),
      ev.horaIni||"",
      ev.horaFin||"",
      ev.titulo||"",
      calId,
      ev.enlace||"",
      ev.descripcion||"",
      ev.proyecto||""
    ]);
  });
  return { ok:true, n:eventos.length };
}

function _rec(d) {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh=ss.getSheetByName("Calendario_Eventos");
    if(!sh) return {ok:false,error:"No encontrada"};
    var filas=d.filas||[]; var mes=(d.mes||"").toString().trim();
    if(!filas||filas.length<2) return {ok:false,error:"Sin datos"};
    var mesPrefix=mes.substring(0,7);
    if(mesPrefix){
      var all=sh.getDataRange().getValues();
      for(var i=all.length-1;i>=1;i--){
        var rf=_nf(all[i][0]);
        if((all[i][4]||"").toString().toUpperCase().trim()==="RECREO"&&rf&&rf.substring(0,7)===mesPrefix) sh.deleteRow(i+1);
      }
    }
    var cab=filas[0]; var insertados=0;
    for(var i=1;i<filas.length;i++){
      var fila=filas[i]; var fecha=(fila[0]||"").toString().trim();
      if(!fecha||!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
      var obj={}; for(var j=0;j<cab.length;j++) obj[cab[j]]=fila[j]||"";
      sh.appendRow([fecha,"11:00","11:30","RECREO "+fecha,"RECREO","",JSON.stringify(obj)]);
      insertados++;
    }
    return {ok:true,insertados:insertados,mes:mes};
  } catch(err){ return {ok:false,error:err.toString()}; }
}

// ── NOTIFICACIONES ────────────────────────────────────────────────────────
function processNotification(data) {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var shN=ss.getSheetByName("Notificaciones");
    if(!shN){shN=ss.insertSheet("Notificaciones");shN.appendRow(["Fecha","Dest","Asunto","Mensaje","Estado"]);}
    var dest=data.recipient||"todos"; var emails=[];
    if(dest==="todos"){
      var sh=ss.getSheetByName("Control_Acceso");
      if(sh)sh.getDataRange().getValues().slice(1).forEach(function(r){
        if(r[1].toString().toUpperCase().trim()==="ACTIVO"&&r[0].toString().indexOf("@")>=0)
          emails.push(r[0].toString().trim());
      });
    } else emails=[dest];
    var ok=0;
    emails.forEach(function(em){
      try{MailApp.sendEmail({to:em,subject:CONFIG.MAIL_PREFIX + " "+(data.title||"Aviso"),body:(data.message||"")+(data.link?"\n\nEnlace: "+data.link:"")});ok++;}catch(x){}
    });
    shN.appendRow([new Date(),dest,data.title||"",data.message||"",ok>0?"OK":"ERROR"]);
    return {success:true,message:"Enviada a "+ok+" destinatario(s)."};
  } catch(e){ return {success:false,message:e.toString()}; }
}

function getDestinatariosNotificacion() {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh=ss.getSheetByName("Control_Acceso"); if(!sh) return {destinatarios:[]};
    var dest=[{email:"todos",nombre:"Todo el Claustro"}];
    sh.getDataRange().getValues().slice(1).forEach(function(r){
      if(r[1].toString().toUpperCase().trim()==="ACTIVO"&&r[0].toString().indexOf("@")>=0&&r[2])
        dest.push({email:r[0].toString().trim(),nombre:r[2].toString().trim()});
    });
    return {destinatarios:dest};
  } catch(e){ return {destinatarios:[]}; }
}

// ── INIT Y UTILIDADES ─────────────────────────────────────────────────────
function _initPestanas() {
  try {
    var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    if(!ss.getSheetByName("Tablon")){
      var sh=ss.insertSheet("Tablon");
      sh.appendRow(["Tipo","Titulo","Mensaje","Link","Fecha_Caducidad","Activo"]);
      sh.appendRow(["AVISO","¡Bienvenidos!","El portal del claustro ya está en marcha.","","2026-09-15","SI"]);
      sh.getRange("A1:F1").setFontWeight("bold").setBackground("#0B132B").setFontColor("white");
    }
    if(!ss.getSheetByName("Cumpleanos")){
      var sh2=ss.insertSheet("Cumpleanos");
      sh2.appendRow(["Nombre","Fecha_Nacimiento","Mensaje_Personal","Link_Felicitacion"]);
      sh2.getRange("A1:D1").setFontWeight("bold").setBackground("#0B132B").setFontColor("white");
    }
  } catch(e) {}
}

function normalizeStr(s) {
  if(!s) return "";
  return s.toString().trim().replace(/\s+/g," ").normalize("NFC");
}

// ── Coincidencia tolerante de nombres de maestro/a ─────────────────────────
// La App de gestión y SSNet (Control_Acceso) a veces guardan el nombre distinto:
// nombre de pila abreviado ("Mariló" vs "María Dolores") o con uno o dos
// apellidos ("Paula Blanco" vs "Paula Blanco Rodríguez"). Emparejamos sin
// acentos ni mayúsculas y, si no hay coincidencia exacta, por el nº de palabras
// (nombre/apellidos) en común. SOLO aceptamos si hay UN único mejor candidato;
// ante cualquier empate/ambigüedad devolvemos null (deja "—") para no confundir
// jamás a dos personas (p.ej. "Antonio Jiménez" vs "Antonio Manuel Jiménez Galeano").
function _nom(s){
  return (s||"").toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9ñ ]/g," ").replace(/\s+/g," ").trim();
}
function _tok(s){                                   // palabras significativas (>=3 letras)
  return _nom(s).split(" ").filter(function(w){ return w.length>=3; });
}
function _compartidas(a,b){                          // nº de palabras (nombre/apellidos) en común
  var at=_tok(a), bt=_tok(b), n=0;
  at.forEach(function(w){ if(bt.indexOf(w)>=0) n++; });
  return n;
}
// Devuelve el nombre EXACTO tal cual está en la lista/hoja que corresponde a
// "query". Primero intenta coincidencia exacta; si no, por apellidos (solo si
// esos dos apellidos son de una única persona en la lista). null si no es fiable.
function _resolveNombre(query, listaHoja){
  var q=_nom(query), i;
  for(i=0;i<listaHoja.length;i++){ if(_nom(listaHoja[i])===q) return listaHoja[i]; }
  if(_tok(query).length<2) return null;
  var best=-1, bestName=null, empate=false, vistos={};
  for(i=0;i<listaHoja.length;i++){
    var nm=listaHoja[i], key=_nom(nm); if(!key||vistos[key]) continue; vistos[key]=1;
    var sh=_compartidas(query, nm);
    if(sh>best){ best=sh; bestName=nm; empate=false; }
    else if(sh===best){ empate=true; }
  }
  return (best>=2 && !empate) ? bestName : null;
}
// ¿son la misma persona? exacto normalizado o >=2 palabras (nombre/apellidos) en común.
function _mismoNom(a,b){
  if(_nom(a)===_nom(b)) return true;
  return _compartidas(a,b)>=2;
}

function _nf(raw) {
  if(!raw) return "";
  if(raw instanceof Date){
    if(isNaN(raw.getTime())||raw.getFullYear()<2000) return "";
    return Utilities.formatDate(raw,Session.getScriptTimeZone(),"yyyy-MM-dd");
  }
  var s=raw.toString().trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var p=s.split("/");
  if(p.length===3&&p[2].length===4) return p[2]+"-"+p[1].padStart(2,"0")+"-"+p[0].padStart(2,"0");
  return s;
}
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
function _guardarGestion(datos) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('Gestion_Backup') || ss.insertSheet('Gestion_Backup');
  var json = JSON.stringify(datos || {});
  sh.clearContents();
  var CHUNK = 45000;
  var filas = [];
  for (var i = 0; i < json.length; i += CHUNK) filas.push([json.substr(i, CHUNK)]);
  if (filas.length) sh.getRange(1, 1, filas.length, 1).setValues(filas);
  sh.getRange(1, 2).setValue(new Date());
  return {ok:true, bytes: json.length};
}

function _leerGestion() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('Gestion_Backup');
  if (!sh || sh.getLastRow() < 1) return {ok:false, error:'Sin datos guardados todavia. Pulsa Enviar primero.'};
  var vals = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  var json = vals.map(function(r){ return r[0] || ''; }).join('');
  if (!json) return {ok:false, error:'Backup vacio'};
  var data = {};
  try { data = JSON.parse(json); } catch(e) { return {ok:false, error:'Backup corrupto'}; }
  return {ok:true, data:data};
}function testCartelera() {
  var r = getCartelera();
  Logger.log('VIDEOS: ' + (r.videos ? r.videos.length : 'ninguno'));
  Logger.log('ERROR: ' + (r.error || 'ninguno'));
  if (r.videos && r.videos[0]) Logger.log('PRIMERO: ' + r.videos[0].titulo);
}// ── PROYECTOS DEL CENTRO ──────────────────────────────────────────────────
function getProyectos() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('Proyectos');
    if (!sh || sh.getLastRow() < 2) return {proyectos: []};
    var proyectos = [];
    sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function(f) {
      var nombre = (f[0] || '').toString().trim();
      if (!nombre) return;
      var activo = (f[4] || 'SI').toString().toUpperCase().trim();
      if (activo === 'NO') return;
      var carpeta = (f[3] || '').toString().trim();
      var m = carpeta.match(/[-\w]{25,}/);
      proyectos.push({
        nombre: nombre,
        icono: (f[1] || '').toString().trim(),
        color: (f[2] || '').toString().trim(),
        carpeta: m ? m[0] : carpeta
      });
    });
    return {proyectos: proyectos};
  } catch(e) { return {proyectos: [], error: e.toString()}; }
}// ═══════════════════════════════════════════════════════════════════════
// CUADERNO DE HORARIOS — funciones de servidor para SSNet
// Pega estas DOS funciones al final del Código.gs de SSNet.
// Luego: guardar → Administrar implementaciones → lápiz → Nueva versión
//        (EN LAS DOS implementaciones: personas y datos)
// ═══════════════════════════════════════════════════════════════════════

// Devuelve la lista de nombres de maestros para el desplegable
function getListaMaestros() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("Control_Acceso");
    if (!sh || sh.getLastRow() < 2) return [];
    var nombres = sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues()  // col C = Nombre
      .map(function(f) { return (f[0] || "").toString().trim(); })
      .filter(function(n) { return n; });
    // Sin duplicados y ordenados
    var vistos = {};
    return nombres.filter(function(n) { if (vistos[n]) return false; vistos[n] = true; return true; })
                  .sort(function(a, b) { return a.localeCompare(b, 'es'); });
  } catch (e) { return []; }
}

// Devuelve las 5 tablas semanales del maestro:
//   personal, grupo_horario, refuerzo, recreo_grupo, recreo_personal
function getHorarioSemanalCompleto(nombre) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
    var LET = { "Lunes": "L", "Martes": "M", "Miercoles": "X", "Jueves": "J", "Viernes": "V" };
    function nrm(x) { return (x || "").toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim(); }
    function hstr(v) { if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "HH:mm"); return (v || "").toString().trim(); }

    // Grupo/tutoría del maestro (Control_Acceso: C=nombre, D=grupo)
    var grupo = "";
    var shA = ss.getSheetByName("Control_Acceso");
    if (shA && shA.getLastRow() > 1) {
      shA.getRange(2, 1, shA.getLastRow() - 1, 4).getValues().some(function(f) {
        if (nrm(f[2]) === nrm(nombre)) { grupo = (f[3] || "").toString().trim(); return true; }
        return false;
      });
    }
    var esTutor = !!grupo;

    // Utilidad: construir tabla [{hora, L, M, X, J, V}] a partir de una funcion celda(dia, tramo)
    function construir(tramos, celda) {
      return tramos.map(function(t) {
        var fila = { hora: t };
        DIAS.forEach(function(d) { fila[LET[d]] = celda(d, t) || ""; });
        return fila;
      });
    }

    // 1) MI HORARIO — Horarios_Maestros [Maestro, Tramo, L, M, X, J, V]
    var personal = [];
    var shM = ss.getSheetByName("Horarios_Maestros");
    if (shM && shM.getLastRow() > 1) {
      var idx = { "Lunes": 2, "Martes": 3, "Miercoles": 4, "Jueves": 5, "Viernes": 6 };
      var todasM = shM.getRange(2, 1, shM.getLastRow() - 1, 7).getValues();
      var maeMatch = _resolveNombre(nombre, todasM.map(function(f){ return f[0]; }));
      var filasM = maeMatch ? todasM.filter(function(f){ return _nom(f[0]) === _nom(maeMatch); }) : [];
      personal = filasM.map(function(f) {
        var fila = { hora: hstr(f[1]) };
        DIAS.forEach(function(d) { fila[LET[d]] = (f[idx[d]] || "").toString().trim(); });
        return fila;
      });
    }

    // 2) HORARIO DEL GRUPO — Horarios_Grupos [Grupo, Dia, Tramo, Maestro, Materia]
    var grupo_horario = [];
    if (esTutor) {
      var shG = ss.getSheetByName("Horarios_Grupos");
      if (shG && shG.getLastRow() > 1) {
        var datosG = shG.getRange(2, 1, shG.getLastRow() - 1, 5).getValues()
          .filter(function(f) { return nrm(f[0]) === nrm(grupo); });
        var tramosG = [];
        datosG.forEach(function(f) { var t = hstr(f[2]); if (tramosG.indexOf(t) < 0) tramosG.push(t); });
        grupo_horario = construir(tramosG, function(dia, tr) {
          var hit = datosG.find(function(f) { return nrm(f[1]) === nrm(dia) && hstr(f[2]) === tr; });
          if (!hit) return "";
          var mat = (hit[4] || "").toString().trim();
          var mae = (hit[3] || "").toString().trim();
          return mat ? (mat + (mae ? " (" + mae + ")" : "")) : mae;
        });
      }
    }

    // 3) REFUERZO / LUCIERNAGA del grupo — Horarios_Refuerzo/PT [Grupo, Dia, Tramo, Detalle]
    var refuerzo = [];
    if (esTutor) {
      var shR = ss.getSheetByName("Horarios_Refuerzo/PT") || ss.getSheetByName("Horarios_Refuerzo");
      if (shR && shR.getLastRow() > 1) {
        var datosR = shR.getRange(2, 1, shR.getLastRow() - 1, 4).getValues()
          .filter(function(f) { return nrm(f[0]) === nrm(grupo); });
        var tramosR = [];
        datosR.forEach(function(f) { var t = hstr(f[2]); if (tramosR.indexOf(t) < 0) tramosR.push(t); });
        refuerzo = construir(tramosR, function(dia, tr) {
          var hit = datosR.find(function(f) { return (!f[1] || nrm(f[1]) === nrm(dia)) && hstr(f[2]) === tr; });
          return hit ? (hit[3] || "").toString().trim() : "";
        });
      }
    }

    // 4) y 5) RECREO — Horarios_Recreo (si existe). Estructura flexible.
    var recreo_grupo = [], recreo_personal = [];
    // (Se completará cuando se publique el cuadrante de recreo desde la gestión.)

    return {
      esTutor: esTutor,
      grupo: grupo,
      personal: personal,
      grupo_horario: grupo_horario,
      refuerzo: refuerzo,
      recreo_grupo: recreo_grupo,
      recreo_personal: recreo_personal
    };
  } catch (e) {
    return { error: e.toString() };
  }
}
// ── CUADERNO DE HORARIOS (semana completa + recreo) ──
function getCuadHorarios(teacherName, groupName){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var tN = normalizeStr(teacherName), gN = normalizeStr(groupName);
    var DIAS = ["Lunes","Martes","Miercoles","Jueves","Viernes"];

    function fmtTramo(v){                       // convierte la hora (a veces Date) en "9:00"
      var m = String(v==null?'':v).match(/(\d{1,2}):(\d{2})/);
      return m ? (parseInt(m[1],10)+':'+m[2]) : String(v==null?'':v).trim();
    }

    if(!gN){
      var shA = ss.getSheetByName("Control_Acceso");
      if(shA) shA.getDataRange().getValues().slice(1).forEach(function(r){
        if(normalizeStr(r[2]) === tN && r[3]) gN = normalizeStr(r[3]);
      });
    }

    var tramosSet = {};
    function addT(t){ if(t) tramosSet[t] = true; }

    var mae = {};
    var shM = ss.getSheetByName("Horarios_Maestros");
    if(shM){
      var valsM = shM.getDataRange().getValues().slice(1);
      var maeKey = _resolveNombre(teacherName, valsM.map(function(r){ return r[0]; }));
      if(maeKey) valsM.forEach(function(r){
        if(_nom(r[0]) !== _nom(maeKey)) return;
        var t = fmtTramo(r[1]); addT(t);
        mae[t] = [normalizeStr(r[2]),normalizeStr(r[3]),normalizeStr(r[4]),normalizeStr(r[5]),normalizeStr(r[6])];
      });
    }

    var gru = {};
    var shG = ss.getSheetByName("Horarios_Grupos");
    if(shG && gN) shG.getDataRange().getValues().slice(1).forEach(function(r){
      if(normalizeStr(r[0]).replace(/\s/g,"") !== gN.replace(/\s/g,"")) return;
      var dia = normalizeStr(r[1]), t = fmtTramo(r[2]); addT(t);
      var di = DIAS.indexOf(dia); if(di < 0) return;
      if(!gru[t]) gru[t] = ["","","","",""];
      var mat = normalizeStr(r[4]), m2 = normalizeStr(r[3]);
      gru[t][di] = mat + (m2 ? (" (" + m2.split(" ")[0] + ")") : "");
    });

    var ref = {};
    var shR = ss.getSheetByName("Horarios_Refuerzo/PT");
    if(shR) shR.getDataRange().getValues().slice(1).forEach(function(r){
      if(!_mismoNom(r[3], teacherName)) return;
      var dia = normalizeStr(r[1]), t = fmtTramo(r[2]); addT(t);
      var di = DIAS.indexOf(dia); if(di < 0) return;
      if(!ref[t]) ref[t] = ["","","","",""];
      ref[t][di] = normalizeStr(r[4]) || "Refuerzo";
    });

    var recMae = [], recGru = [];
    var shC = ss.getSheetByName("Calendario_Eventos");
    if(shC) shC.getDataRange().getValues().slice(1).forEach(function(r){
      if((r[4]||"").toString().toUpperCase().trim() !== "RECREO") return;
      var fecha = (r[0]||"").toString().trim();
      var blob = {}; try{ blob = JSON.parse(r[6]||"{}"); }catch(e){ return; }
      Object.keys(blob).forEach(function(k){
        var val = normalizeStr(blob[k]); if(!val) return;
        if(k.toLowerCase().indexOf("alumnos") === 0){
          if(gN && val.replace(/\s/g,"").split(",").indexOf(gN.replace(/\s/g,"")) >= 0)
            recGru.push({fecha:fecha, zona:k.replace(/alumnos:?/i,"").trim()});
        } else if(k !== "Fecha" && k !== "Dia"){
          if(val.split(",").some(function(x){ return _mismoNom(x, teacherName); }))
            recMae.push({fecha:fecha, zona:(k==="Infantil"?"Infantil":k)});
        }
      });
    });
    function ordF(a,b){ return a.fecha < b.fecha ? -1 : 1; }
    recMae.sort(ordF); recGru.sort(ordF);

    var tramos = Object.keys(tramosSet).sort(function(a,b){
      function n(x){ var m=(x||"").match(/(\d+):(\d+)/); return m ? (parseInt(m[1],10)*60+parseInt(m[2],10)) : 9999; }
      return n(a) - n(b);
    });

    return {ok:true, teacher:normalizeStr(teacherName), group:gN, dias:DIAS,
            tramos:tramos, maestro:mae, grupo:gru, refuerzo:ref,
            recreoGrupo:recGru, recreoCuad:_getRecreoCuad()};
    } catch(e){ return {ok:false, error:e.toString()}; }
}
  /* ── RESERVAS DE ESPACIOS (backend) ── La hoja se crea sola la 1ª vez. */
function _reservasSS(){
  var props=PropertiesService.getScriptProperties();
  var id=props.getProperty('RESERVAS_SS_ID'), ss=null;
  if(id){ try{ ss=SpreadsheetApp.openById(id); }catch(e){ ss=null; } }
  if(!ss){ ss=SpreadsheetApp.create(CONFIG.TITULO_WEB + ' · Reservas de espacios'); props.setProperty('RESERVAS_SS_ID', ss.getId()); }
  return ss;
}
function _reservasSheet(ss){
  var sh=ss.getSheetByName('Reservas');
  if(!sh){ sh=ss.insertSheet('Reservas'); sh.appendRow(['SemanaLunes','EspacioId','Dia','Tramo','Curso','Maestro','Email','Fecha']); sh.setFrozenRows(1); }
  return sh;
}
function guardarReservasConfig(datos){
  var ss=_reservasSS(), sh=ss.getSheetByName('Config'); if(!sh) sh=ss.insertSheet('Config');
  sh.getRange(1,1).setValue(JSON.stringify(datos||{})); return {ok:true};
}
function getReservasConfig(){
  var esp=[], tramos=[];
  try{
    var g=_leerGestion(), data=(g&&g.ok&&g.data)?g.data:{};
    esp=data.reservasEspacios||[];
    (data.tramos||[]).forEach(function(t){ if(!t.r){ var m=parseInt(t.ini)||0, hh=Math.floor(m/60), mm=m%60; tramos.push((hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm); } });
  }catch(e){}
  return {ok:true, espacios:esp, tramos:tramos, dias:['Lunes','Martes','Miercoles','Jueves','Viernes']};
}
function getReservas(espacioId, semanaLunes){
  var cfg=getReservasConfig(), esp=null;
  (cfg.espacios||[]).forEach(function(e){ if(e.id===espacioId) esp=e; });
  var ss=_reservasSS(), sh=_reservasSheet(ss), vals=sh.getDataRange().getValues(), reservas={};
  for(var i=1;i<vals.length;i++){ var r=vals[i];
    if(String(r[0])===String(semanaLunes) && String(r[1])===String(espacioId)) reservas[r[2]+'_'+r[3]]={curso:r[4], maestro:r[5], email:r[6]};
  }
  return {ok:true, espacio:esp?esp.nombre:'', luc:(esp&&esp.luc)||{}, tramos:cfg.tramos||[], dias:cfg.dias||[], reservas:reservas};
}
function guardarReserva(datos){
  var d=datos||{}, cfg=getReservasConfig(), esp=null;
  (cfg.espacios||[]).forEach(function(e){ if(e.id===d.espacioId) esp=e; });
  if(esp && esp.luc && esp.luc[d.di+'_'+d.ti]) return {ok:false, error:'Ese tramo esta fijado para Luciernaga.'};
  var ss=_reservasSS(), sh=_reservasSheet(ss), vals=sh.getDataRange().getValues();
  for(var i=1;i<vals.length;i++){ var r=vals[i];
    if(String(r[0])===String(d.semanaLunes) && String(r[1])===String(d.espacioId) && String(r[2])===String(d.di) && String(r[3])===String(d.ti))
      return {ok:false, error:'Ese hueco ya esta reservado ('+(r[4]||'')+').'};
  }
  var email=''; try{ email=Session.getActiveUser().getEmail()||''; }catch(e){}
  sh.appendRow([d.semanaLunes, d.espacioId, d.di, d.ti, d.curso||'', d.maestro||'', email, new Date()]);
  return {ok:true};
}
function liberarReserva(datos){
  var d=datos||{}, ss=_reservasSS(), sh=_reservasSheet(ss), vals=sh.getDataRange().getValues();
  var email=''; try{ email=Session.getActiveUser().getEmail()||''; }catch(e){}
  for(var i=vals.length-1;i>=1;i--){ var r=vals[i];
    if(String(r[0])===String(d.semanaLunes) && String(r[1])===String(d.espacioId) && String(r[2])===String(d.di) && String(r[3])===String(d.ti)){
      if(!r[6] || !email || String(r[6])===String(email)){ sh.deleteRow(i+1); return {ok:true}; }
      return {ok:false, error:'Solo quien reservo puede liberar este hueco.'};
    }
  }
  return {ok:true};
}
function TEST_reservas(){
  var g=_leerGestion();
  Logger.log('leer ok: ' + (g && g.ok));
  Logger.log('espacios: ' + JSON.stringify((g && g.data && g.data.reservasEspacios) || 'NO HAY'));
}
/* (Versión antigua de guardarSalidaExtraescolar eliminada: usaba una hoja fija.
   La versión válida, más abajo, crea sola la hoja "Salidas y excursiones".) */
/* ═══════════════ RESERVAS DE ESPACIOS · BACKEND (versión corregida) ═══════════════ */

// Normaliza una fecha (sea texto o objeto Fecha) a "AAAA-MM-DD" para comparar bien
function _semKey(v){
  if(v instanceof Date){ return v.getFullYear()+'-'+('0'+(v.getMonth()+1)).slice(-2)+'-'+('0'+v.getDate()).slice(-2); }
  return String(v).slice(0,10);
}

// Hoja de cálculo donde se guardan las reservas (se crea sola la 1ª vez)
function _reservasSS(){
  var props=PropertiesService.getScriptProperties();
  var id=props.getProperty('RESERVAS_SS_ID'), ss=null;
  if(id){ try{ ss=SpreadsheetApp.openById(id); }catch(e){ ss=null; } }
  if(!ss){ ss=SpreadsheetApp.create(CONFIG.TITULO_WEB + ' · Reservas de espacios'); props.setProperty('RESERVAS_SS_ID', ss.getId()); }
  return ss;
}
function _reservasSheet(ss){
  var sh=ss.getSheetByName('Reservas');
  if(!sh){ sh=ss.insertSheet('Reservas'); sh.appendRow(['SemanaLunes','EspacioId','Dia','Tramo','Curso','Maestro','Email','Fecha']); sh.setFrozenRows(1); }
  return sh;
}

function _tramoLbl(mn){ mn=Number(mn)||0; return ('0'+Math.floor(mn/60)).slice(-2)+':'+('0'+(mn%60)).slice(-2); }

// La configuración (espacios + tramos) viaja dentro de la sincronización de la App de gestión
function getReservasConfig(){
  var esp=[], tramos=[];
  try{
    var g=_leerGestion();
    var data=(g&&g.ok&&g.data)?g.data:{};
    esp=data.reservasEspacios||[];
    (data.tramos||[]).forEach(function(t){ if(!t.r) tramos.push(_tramoLbl(t.ini)); });
  }catch(e){}
  if(!tramos.length) tramos=['09:00','10:00','10:30','11:00','12:30','13:00'];
  return {ok:true, espacios:esp, tramos:tramos, dias:['Lunes','Martes','Miercoles','Jueves','Viernes']};
}

function getReservas(espacioId, semanaLunes){
  var cfg=getReservasConfig(), esp=null;
  (cfg.espacios||[]).forEach(function(e){ if(e.id===espacioId) esp=e; });
  var ss=_reservasSS(), sh=_reservasSheet(ss), vals=sh.getDataRange().getValues(), reservas={};
  for(var i=1;i<vals.length;i++){ var r=vals[i];
    if(_semKey(r[0])===String(semanaLunes) && String(r[1])===String(espacioId))
      reservas[r[2]+'_'+r[3]]={curso:r[4], maestro:r[5], email:r[6]};
  }
  return {ok:true, espacio:esp?esp.nombre:'', luc:(esp&&esp.luc)||{}, tramos:cfg.tramos||[], dias:cfg.dias||[], reservas:reservas};
}

function guardarReserva(datos){
  var d=datos||{}, cfg=getReservasConfig(), esp=null;
  (cfg.espacios||[]).forEach(function(e){ if(e.id===d.espacioId) esp=e; });
  if(esp && esp.luc && esp.luc[d.di+'_'+d.ti]) return {ok:false, error:'Ese tramo esta fijado para Luciernaga.'};
  var ss=_reservasSS(), sh=_reservasSheet(ss), vals=sh.getDataRange().getValues();
  for(var i=1;i<vals.length;i++){ var r=vals[i];
    if(_semKey(r[0])===String(d.semanaLunes) && String(r[1])===String(d.espacioId) && String(r[2])===String(d.di) && String(r[3])===String(d.ti))
      return {ok:false, error:'Ese hueco ya esta reservado ('+(r[4]||'')+').'};
  }
  var email=''; try{ email=Session.getActiveUser().getEmail()||''; }catch(e){}
  sh.appendRow([d.semanaLunes, d.espacioId, d.di, d.ti, d.curso||'', d.maestro||'', email, new Date()]);
  return {ok:true};
}

function liberarReserva(datos){
  var d=datos||{}, ss=_reservasSS(), sh=_reservasSheet(ss), vals=sh.getDataRange().getValues();
  var email=''; try{ email=Session.getActiveUser().getEmail()||''; }catch(e){}
  for(var i=vals.length-1;i>=1;i--){ var r=vals[i];
    if(_semKey(r[0])===String(d.semanaLunes) && String(r[1])===String(d.espacioId) && String(r[2])===String(d.di) && String(r[3])===String(d.ti)){
      if(!r[6] || !email || String(r[6])===String(email)){ sh.deleteRow(i+1); return {ok:true}; }
      return {ok:false, error:'Solo quien reservo puede liberar este hueco.'};
    }
  }
  return {ok:true};
}

function guardarReservasConfig(datos){ return {ok:true}; } // la config ya viaja por la sincronización
function TEST_reservas5(){
  var out = [];
  // 1) ¿Existe la config con espacios?
  var cfg = getReservasConfig();
  out.push('ESPACIOS = ' + JSON.stringify((cfg.espacios||[]).map(function(e){return e.id+':'+e.nombre;})));
  out.push('TRAMOS = ' + JSON.stringify(cfg.tramos));
  if(!cfg.espacios || !cfg.espacios.length){ Logger.log(out.join('\n') + '\n>>> NO HAY ESPACIOS: la App de gestión no ha exportado. Ahí está el fallo.'); return; }

  var espId = cfg.espacios[0].id;
  var semana = '2026-09-07'; // un lunes cualquiera de prueba

  // 2) Guardar una reserva de prueba
  var g = guardarReserva({espacioId:espId, semanaLunes:semana, di:0, ti:0, curso:'PRUEBA'});
  out.push('GUARDAR = ' + JSON.stringify(g));

  // 3) Volver a leerla
  var r = getReservas(espId, semana);
  out.push('LEER.reservas = ' + JSON.stringify(r.reservas));

  Logger.log(out.join('\n'));
}
/* ── Guardar Formulario de Salida (crea su propia hoja, sin problemas de permisos) ── */
function guardarSalidaExtraescolar(datos){
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SALIDAS_SS_ID');
  var ss = null;
  if(id){ try{ ss = SpreadsheetApp.openById(id); }catch(e){ ss = null; } }
  if(!ss){
    ss = SpreadsheetApp.create(CONFIG.TITULO_WEB + ' · Salidas y excursiones');
    props.setProperty('SALIDAS_SS_ID', ss.getId());
  }
  var sh = ss.getSheetByName('Salidas');
  if(!sh){ sh = ss.insertSheet('Salidas'); }
  var CAB = ['Fecha de registro','Destino','Hora de salida','Hora de llegada','Cursos que van',
             'Alumnado que se queda','Alumnado que no ha venido','Profesorado que acompaña',
             'Descripción · Lugar · Desplazamiento · Teléfonos','Coste actividad (€)',
             'Coste transporte total (€)','Nº alumnos que van','Transporte por alumno (€)',
             'Valoración (1-10)','Propuesta de mejora','Registrado por'];
  if(sh.getLastRow() === 0){
    sh.getRange(1,1,1,CAB.length).setValues([CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  var d = datos || {};
  var email = '';
  try{ email = Session.getActiveUser().getEmail() || ''; }catch(e){}
  sh.appendRow([ new Date(), d.destino||'', d.horaSalida||'', d.horaLlegada||'', d.cursos||'',
    d.alumnadoQueda||'', d.alumnadoNoVino||'', d.profesorado||'', d.descripcion||'',
    d.costeActividad||'', d.costeTransporte||'', d.numAlumnos||'', d.transportePorAlumno||'',
    d.valoracion||'', d.propuestaMejora||'', email ]);
  return { ok:true };
}
/* ═══════════════ CONTROL DE LIBROS · BACKEND (v2) ═══════════════ */
var _LIBROS_ESTADOS = ["Nuevo","Buen estado","Deteriorado","Inutilizable"];
var _LIBROS_MATERIAS = {
  "3o":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica"],
  "4o":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica"],
  "5o":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica","Francés"],
  "6o":["Lengua","Matemáticas","Inglés","C.Medio","Música","Plástica","Francés","Valores 6º"]
};
function _libNivel(grupo){ var m=String(grupo||'').match(/^([3-6])o/); return m?(m[1]+'o'):null; }
function _libNombre(grupo){ var g=String(grupo||''); var m=g.match(/^([3-6])o(.*)$/); return m?(m[1]+'º'+(m[2]||'')):g; }
function _libSlug(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9ñáéíóúü]+/g,'-').replace(/(^-|-$)/g,''); }
function cursoAcademicoActual(){ var d=new Date(), y=d.getFullYear(), m=d.getMonth(); var ini=(m>=8)?y:(y-1); return ini+'-'+(ini+1); }
function _libAnioAnterior(year){ var m=String(year||'').match(/^(\d{4})-(\d{4})$/); if(!m) return ''; return (parseInt(m[1],10)-1)+'-'+(parseInt(m[2],10)-1); }
function _librosSS(){
  var props=PropertiesService.getScriptProperties();
  var id=props.getProperty('LIBROS_SS_ID'), ss=null;
  if(id){ try{ ss=SpreadsheetApp.openById(id); }catch(e){ ss=null; } }
  if(!ss){ ss=SpreadsheetApp.create(CONFIG.TITULO_WEB + ' · Control de libros'); props.setProperty('LIBROS_SS_ID', ss.getId()); }
  return ss;
}
function _librosSheet(){
  var ss=_librosSS(), sh=ss.getSheetByName('Libros');
  if(!sh){ sh=ss.insertSheet('Libros'); sh.appendRow(['CursoAcademico','Grupo','AlumnoId','Alumno','Materia','Septiembre','Junio','Actualizado','Por']); sh.setFrozenRows(1); }
  return sh;
}
function _libAlumnosPorGrupo(){ try{ var la=getListadoAlumnos(); return (la&&la.alumnos)?la.alumnos:{}; }catch(e){ return {}; } }
function getLibrosAnios(){
  var sh=_librosSheet(), vals=sh.getDataRange().getValues(), set={};
  set[cursoAcademicoActual()]=1;
  for(var i=1;i<vals.length;i++){ if(vals[i][0]) set[String(vals[i][0])]=1; }
  var arr=Object.keys(set); arr.sort(); arr.reverse(); return arr;
}
function getLibrosGrupos(){
  var A=_libAlumnosPorGrupo(), arr=[];
  for(var g in A){ var n=_libNivel(g); if(!n || !_LIBROS_MATERIAS[n]) continue; arr.push({grupo:g, nombre:_libNombre(g), n:(A[g]||[]).length}); }
  arr.sort(function(a,b){ return a.grupo.localeCompare(b.grupo); });
  return {ok:true, grupos:arr, estados:_LIBROS_ESTADOS, year:cursoAcademicoActual(), anios:getLibrosAnios()};
}
function getLibros(grupo, year){
  year = year || cursoAcademicoActual();
  var A=_libAlumnosPorGrupo(); var lista=(A[grupo]||[]).slice();
  lista.sort(function(a,b){ return String(a).localeCompare(String(b)); });
  var nivel=_libNivel(grupo), materias=_LIBROS_MATERIAS[nivel]||[];
  var alumnos=lista.map(function(nom){ return {id:_libSlug(nom), nombre:nom}; });
  var prev=_libAnioAnterior(year);
  var sh=_librosSheet(), vals=sh.getDataRange().getValues(), cur={}, pj={};
  for(var i=1;i<vals.length;i++){ var r=vals[i];
    if(String(r[1])!==String(grupo)) continue;
    var k=r[2]+'|'+r[4];
    if(String(r[0])===String(year)) cur[k]={sep:r[5]||'', jun:r[6]||''};
    else if(prev && String(r[0])===String(prev)) pj[k]={jun:r[6]||''};
  }
  var datos={};
  alumnos.forEach(function(a){ materias.forEach(function(m){
    var k=a.id+'|'+m, d=cur[k]||{sep:'',jun:''}, her=false, sep=d.sep||'';
    if(!sep && pj[k] && pj[k].jun){ sep=pj[k].jun; her=true; }
    datos[k]={sep:sep, jun:d.jun||'', heredado:her};
  }); });
  return {ok:true, grupo:grupo, nombre:_libNombre(grupo), year:year, alumnos:alumnos, materias:materias, estados:_LIBROS_ESTADOS, datos:datos};
}
function guardarLibro(d){
  d=d||{}; var year=d.year||cursoAcademicoActual();
  var sh=_librosSheet(), vals=sh.getDataRange().getValues(), email='';
  try{ email=Session.getActiveUser().getEmail()||''; }catch(e){}
  var fila=-1;
  for(var i=1;i<vals.length;i++){ var r=vals[i];
    if(String(r[0])===String(year) && String(r[1])===String(d.grupo) && String(r[2])===String(d.alumnoId) && String(r[4])===String(d.materia)){ fila=i+1; break; }
  }
  if(fila<0){
    sh.appendRow([year, d.grupo, d.alumnoId, d.alumno||'', d.materia,
      (d.periodo==='sep')?(d.estado||''):'', (d.periodo==='jun')?(d.estado||''):'', new Date(), email]);
  } else {
    sh.getRange(fila,(d.periodo==='sep')?6:7).setValue(d.estado||'');
    if(d.alumno) sh.getRange(fila,4).setValue(d.alumno);
    sh.getRange(fila,8).setValue(new Date());
    sh.getRange(fila,9).setValue(email);
  }
  return {ok:true};
}
/* ═══════════════ P27 · PERMISOS ASUNTOS PARTICULARES (2 días lectivos) ═══════════════
   Instrucción 10/2025. Pegar al FINAL del Codigo.gs de SSNet.
   El portal llama estas funciones con google.script.run (no hace falta tocar el enrutador _acc).
*/
var P27_PROP = 'P27_CONFIG_V1';

function _p27festivosDefault(){
  return (CONFIG.P27.festivos && CONFIG.P27.festivos.length) ? CONFIG.P27.festivos : [];
}
function _p27Cfg(){
  var raw = PropertiesService.getScriptProperties().getProperty(P27_PROP);
  var c = {}; try { c = JSON.parse(raw || '{}'); } catch(e){}
  return {
    letra:      (c.letra || 'A').toString().toUpperCase().charAt(0),
    plazas:     c.plazas || 2,
    modo:       c.modo || 'hibrido',                 // hibrido | manual | auto
    antelacion: (c.antelacion != null ? c.antelacion : 18),  // días HÁBILES (Séneca pide 15; +margen)
    diasPorMaestro: c.diasPorMaestro || 2,
    inicio:     c.inicio || CONFIG.P27.inicio,
    fin:        c.fin || CONFIG.P27.fin,
    festivos:   (c.festivos && c.festivos.length) ? c.festivos : _p27festivosDefault(),
    directivo:  c.directivo || '',
    pass:       c.pass || ''
  };
}
var P27_FIRMA = CONFIG.P27.firma;
function _p27DirectivoEmails(cfg){
  cfg = cfg || _p27Cfg();
  var list = [];
  if(cfg.directivo){ String(cfg.directivo).split(/[,;\s]+/).forEach(function(e){ e=e.trim(); if(e.indexOf('@')>=0) list.push(e); }); }
  if(!list.length){
    try{
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = ss.getSheetByName('Control_Acceso');
      if(sh) sh.getDataRange().getValues().slice(1).forEach(function(r){
        var cargo = ((r[3]||'') + ' ' + (r[2]||'')).toString().toLowerCase();
        if((cargo.indexOf('direc')>=0 || cargo.indexOf('jefatura')>=0 || cargo.indexOf('secretar')>=0) && (r[0]||'').toString().indexOf('@')>=0) list.push(r[0].toString().trim());
      });
    }catch(e){}
  }
  var seen = {}, out = [];
  list.forEach(function(e){ var k=e.toLowerCase(); if(!seen[k]){ seen[k]=1; out.push(e); } });
  return out;
}
function _p27Save(c){ PropertiesService.getScriptProperties().setProperty(P27_PROP, JSON.stringify(c)); }

function _p27Sheet(){
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('P27_Solicitudes');
  if(!sh){
    sh = ss.insertSheet('P27_Solicitudes');
    sh.appendRow(['Timestamp','Email','Nombre','Fecha','Estado','DiasUsadosAlPedir','Motivo','Resolucion','ResueltoPor','AvisoSeneca','AvisoDireccion']);
    sh.getRange('A1:K1').setFontWeight('bold').setBackground('#0B132B').setFontColor('white');
    sh.setFrozenRows(1);
  }
  return sh;
}
function _p27Email(){ try { return Session.getActiveUser().getEmail() || ''; } catch(e){ return ''; } }
function _p27NombrePorEmail(email){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = ss.getSheetByName('Control_Acceso');
    if(!sh) return '';
    var v = sh.getDataRange().getValues();
    for(var i=1;i<v.length;i++){ if((v[i][0]||'').toString().toLowerCase().trim() === email) return (v[i][2]||'').toString().trim(); }
  }catch(e){}
  return '';
}
function _p27EsLectivo(cfg, fs){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fs)) return false;
  if(fs < cfg.inicio || fs > cfg.fin) return false;
  var d = new Date(fs + 'T12:00:00'); var wd = d.getDay();
  if(wd === 0 || wd === 6) return false;
  if(cfg.festivos.indexOf(fs) >= 0) return false;
  return true;
}
function _p27HabilesHasta(cfg, fs){
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var target = new Date(fs + 'T00:00:00'); target.setHours(0,0,0,0);
  var n = 0, d = new Date(hoy); d.setDate(d.getDate()+1);
  while(d < target){
    var wd = d.getDay();
    var ds = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if(wd !== 0 && wd !== 6 && cfg.festivos.indexOf(ds) < 0) n++;
    d.setDate(d.getDate()+1);
  }
  return n;
}
// clave de ordenación = PRIMER APELLIDO (Instrucción 10/2025). Si Control_Acceso tiene
// columna 'Apellidos', se usa esa; si no, se toma el nombre quitando el primer nombre.
function _p27keyize(s){
  s = (s||'').toString().toUpperCase();
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g,''); } catch(e){}
  return s.replace(/[^A-ZÑ ]/g,' ').replace(/\s+/g,' ').trim();
}
function _p27SoloApellidos(nombre){
  var p = (nombre||'').toString().trim().split(/\s+/);
  return p.length > 1 ? p.slice(1).join(' ') : (p[0] || '');
}
function _p27ApellidosMap(){
  var map = {};
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = ss.getSheetByName('Control_Acceso');
    if(!sh) return map;
    var vals = sh.getDataRange().getValues();
    var head = (vals[0]||[]).map(function(x){ return (x||'').toString().toLowerCase(); });
    var iAp = -1; head.forEach(function(hh, ix){ if(hh.indexOf('apellid') >= 0) iAp = ix; });
    for(var i=1;i<vals.length;i++){
      var em = (vals[i][0]||'').toString().toLowerCase().trim(); if(!em) continue;
      var ap = (iAp >= 0) ? (vals[i][iAp]||'').toString().trim() : '';
      if(!ap) ap = _p27SoloApellidos((vals[i][2]||'').toString());
      map[em] = _p27keyize(ap);
    }
  }catch(e){}
  return map;
}
function _p27letraOrden(cfg, key){
  var AB = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  var k = _p27keyize(key).replace(/ /g,'');
  var ch = k.charAt(0) || 'Z';
  var start = AB.indexOf((cfg.letra||'A').toUpperCase()); if(start < 0) start = 0;
  var pos = AB.indexOf(ch); if(pos < 0) pos = AB.length;
  return (pos - start + AB.length) % AB.length;
}
function _p27cmp(cfg, a, b){
  if(a.usados !== b.usados) return a.usados - b.usados;              // 1) prioridad: no haber gastado días
  var ka = a.apellido || _p27keyize(_p27SoloApellidos(a.nombre));
  var kb = b.apellido || _p27keyize(_p27SoloApellidos(b.nombre));
  var la = _p27letraOrden(cfg, ka), lb = _p27letraOrden(cfg, kb);     // 2) letra del sorteo sobre el primer apellido
  if(la !== lb) return la - lb;
  if(ka !== kb) return ka < kb ? -1 : 1;                             // 3) alfabético completo del apellido
  return a.ts - b.ts;                                                // 4) último recurso: hora de solicitud
}

/* ── LISTA DE MAESTROS (para el desplegable) ── */
function _p27Maestros(){
  var out = [];
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = ss.getSheetByName('Control_Acceso');
    if(sh) sh.getDataRange().getValues().slice(1).forEach(function(r){
      if((r[1]||'').toString().toUpperCase().trim() === 'ACTIVO' && (r[0]||'').toString().indexOf('@') >= 0 && r[2])
        out.push({nombre:(r[2]||'').toString().trim(), email:(r[0]||'').toString().trim().toLowerCase()});
    });
  }catch(e){}
  out.sort(function(a,b){ return a.nombre.localeCompare(b.nombre, 'es'); });
  return out;
}

/* ── DATOS PARA EL MAESTRO (porDia incluye NOMBRES: transparencia) ── */
function p27Data(email){
  var cfg = _p27Cfg();
  email = (email || _p27Email() || '').toString().toLowerCase().trim();
  var sh = _p27Sheet(), vals = sh.getDataRange().getValues();
  var apMap = _p27ApellidosMap();
  var raw = {}, mias = [], activas = 0, totalAcept = {};
  for(var i=1;i<vals.length;i++){
    var r = vals[i], fe = _nf(r[3]), es = (r[4]||'').toString().toUpperCase().trim();
    if(!fe) continue;
    var em = (r[1]||'').toString().toLowerCase().trim();
    if(es === 'ACEPTADA') totalAcept[em] = (totalAcept[em]||0) + 1;
    if(['ACEPTADA','PENDIENTE','ESPERA'].indexOf(es) >= 0){
      if(!raw[fe]) raw[fe] = [];
      raw[fe].push({nombre:(r[2]||'').toString().trim(), email:em, estado:es, ts:new Date(r[0]).getTime(),
        apellido: apMap[em] || _p27keyize(_p27SoloApellidos((r[2]||'').toString()))});
    }
    if(em === email){
      mias.push({fecha:fe, estado:es});
      if(['ACEPTADA','PENDIENTE','ESPERA'].indexOf(es) >= 0) activas++;
    }
  }
  // ordenar cada día por prioridad y marcar posición / dentro del cupo
  var porDia = {};
  Object.keys(raw).forEach(function(fe){
    raw[fe].forEach(function(x){ x.usados = (totalAcept[x.email]||0) - (x.estado==='ACEPTADA'?1:0); });
    raw[fe].sort(function(a,b){ return _p27cmp(cfg, a, b); });
    porDia[fe] = raw[fe].map(function(x, idx){
      return {nombre:x.nombre, estado:x.estado, pos:idx+1, dentro:(x.estado==='ACEPTADA')};
    });
  });
  mias.sort(function(a,b){ return a.fecha < b.fecha ? -1 : 1; });
  return {ok:true, email:email, letra:cfg.letra, plazas:cfg.plazas, antelacion:cfg.antelacion,
    modo:cfg.modo, inicio:cfg.inicio, fin:cfg.fin, festivos:cfg.festivos,
    diasPorMaestro:cfg.diasPorMaestro, porDia:porDia, mias:mias, usados:(totalAcept[email]||0),
    activas:activas, restantes:Math.max(0, cfg.diasPorMaestro - activas),
    maestros:_p27Maestros()};
}

/* ── SOLICITAR UN DÍA ── */
function p27Solicitar(d){
  var cfg = _p27Cfg();
  var email = (d.email || _p27Email() || '').toString().toLowerCase().trim();
  var nombre = d.nombre || _p27NombrePorEmail(email) || email;
  var fs = (d.fecha || '').toString().trim();
  if(!email) return {ok:false, error:'No se pudo identificar tu usuario.'};
  if(!_p27EsLectivo(cfg, fs)) return {ok:false, error:'Ese día no es lectivo o está fuera del curso.'};
  var hab = _p27HabilesHasta(cfg, fs);
  if(hab < cfg.antelacion) return {ok:false, error:'Debes pedirlo con al menos ' + cfg.antelacion + ' días hábiles de antelación (ahora hay ' + hab + ').'};

  var sh = _p27Sheet(), vals = sh.getDataRange().getValues();
  var acepDia = 0, mismos = 0, activas = 0;
  for(var i=1;i<vals.length;i++){
    var r = vals[i], em = (r[1]||'').toString().toLowerCase().trim();
    var fe = _nf(r[3]), es = (r[4]||'').toString().toUpperCase().trim();
    if(fe === fs && es === 'ACEPTADA') acepDia++;
    if(em === email && ['ACEPTADA','PENDIENTE','ESPERA'].indexOf(es) >= 0){
      activas++;
      if(fe === fs) mismos++;
    }
  }
  if(mismos > 0) return {ok:false, error:'Ya tienes una solicitud para ese día.'};
  if(activas >= cfg.diasPorMaestro) return {ok:false, error:'Ya has usado o solicitado tus ' + cfg.diasPorMaestro + ' días lectivos de este curso.'};

  var usados = 0;
  for(var j=1;j<vals.length;j++){
    var rr = vals[j];
    if((rr[1]||'').toString().toLowerCase().trim() === email && (rr[4]||'').toString().toUpperCase().trim() === 'ACEPTADA') usados++;
  }

  // registrar como candidato; el orden lo decide la PRIORIDAD (no el orden de llegada)
  var estadoInicial = (cfg.modo === 'manual') ? 'PENDIENTE' : 'ESPERA';
  sh.appendRow([new Date(), email, nombre, fs, estadoInicial, usados, (d.motivo||''), '', '', '', '']);
  var nuevaRow = sh.getLastRow();
  if(cfg.modo !== 'manual') _p27Reordenar(cfg, fs, nuevaRow);  // recoloca a todos por prioridad
  var estadoFinal = (sh.getRange(nuevaRow, 5).getValue() || '').toString().toUpperCase();

  // 1) email cariñoso al maestro (procesada / reservada / en espera)
  if(estadoFinal === 'ACEPTADA') _p27MailAceptada(email, nombre, fs, cfg);
  else if(estadoFinal === 'ESPERA') _p27MailEspera(email, nombre, fs, cfg);
  else _p27MailPendiente(email, nombre, fs, cfg);
  // 2) aviso al equipo directivo
  _p27MailDirectivoNueva(nombre, fs, estadoFinal, cfg);
  _p27Log('SOLICITA', email, nombre, fs, 'estado=' + estadoFinal + (d.motivo ? ' · motivo: ' + d.motivo : ''));
  return {ok:true, estado:estadoFinal};
}

/* ── BORRAR LA PROPIA SOLICITUD (el maestro se equivocó) ── */
function p27Cancelar(d){
  var cfg = _p27Cfg();
  var email = (d.email || _p27Email() || '').toString().toLowerCase().trim();
  var fs = (d.fecha || '').toString().trim();
  var sh = _p27Sheet(), vals = sh.getDataRange().getValues();
  var borrado = null;
  for(var i=vals.length-1;i>=1;i--){
    var r = vals[i];
    if((r[1]||'').toString().toLowerCase().trim() === email && _nf(r[3]) === fs
        && ['ACEPTADA','PENDIENTE','ESPERA'].indexOf((r[4]||'').toString().toUpperCase().trim()) >= 0){
      borrado = (r[2]||'').toString();
      sh.deleteRow(i+1);   // se borra de verdad
      break;
    }
  }
  if(borrado === null) return {ok:false, error:'No se encontró una solicitud tuya para ese día.'};
  _p27Reordenar(cfg, fs);  // recoloca a los demás por prioridad (y avisa)
  _p27Log('BORRA', email, borrado, fs, 'borrada por el maestro');
  return {ok:true};
}

/* ── RECOLOCAR UN DÍA POR PRIORIDAD ──
   Candidatos = solicitudes activas del día. Orden = norma (no ha gastado días → letra → hora).
   Los primeros según plazas = ACEPTADA; el resto = ESPERA. Respeta lo fijado por dirección. */
function _p27Reordenar(cfg, fs, skipRow){
  if(cfg.modo === 'manual') return;   // en manual decide la dirección
  var sh = _p27Sheet(), vals = sh.getDataRange().getValues();
  var apMap = _p27ApellidosMap();
  var totalAcept = {};
  for(var i=1;i<vals.length;i++){
    var r = vals[i];
    if(_nf(r[3]) === fs) continue;
    if((r[4]||'').toString().toUpperCase().trim() === 'ACEPTADA'){
      var em = (r[1]||'').toString().toLowerCase().trim(); totalAcept[em] = (totalAcept[em]||0) + 1;
    }
  }
  var locked = 0, cand = [];
  for(var j=1;j<vals.length;j++){
    var r2 = vals[j]; if(_nf(r2[3]) !== fs) continue;
    var es = (r2[4]||'').toString().toUpperCase().trim();
    if(['ACEPTADA','ESPERA','PENDIENTE'].indexOf(es) < 0) continue;
    var res = (r2[7]||'').toString().toLowerCase();
    if(es === 'ACEPTADA' && res.indexOf('direcc') >= 0){ locked++; continue; }  // fijada a mano por dirección
    var em2 = (r2[1]||'').toString().toLowerCase().trim();
    cand.push({row:j+1, email:em2, nombre:(r2[2]||'').toString(), estadoPrev:es, usados:(totalAcept[em2]||0),
      ts:new Date(r2[0]).getTime(), apellido:(apMap[em2] || _p27keyize(_p27SoloApellidos((r2[2]||'').toString())))});
  }
  cand.sort(function(a,b){ return _p27cmp(cfg, a, b); });
  var libres = Math.max(0, cfg.plazas - locked);
  cand.forEach(function(c, idx){
    var nuevo = (idx < libres) ? 'ACEPTADA' : 'ESPERA';
    if(nuevo !== c.estadoPrev){
      sh.getRange(c.row, 5).setValue(nuevo);
      sh.getRange(c.row, 8).setValue('reordenado por prioridad');
      if(c.row === skipRow) return;   // al solicitante lo avisa p27Solicitar
      if(nuevo === 'ACEPTADA') _p27MailAceptada(c.email, c.nombre, fs, cfg);
      else _p27MailDesplazado(c.email, c.nombre, fs, cfg);
    }
  });
}

/* ── DIRECCIÓN ── */
function p27CheckPass(pass){
  var cfg = _p27Cfg();
  if(!cfg.pass) return {ok:true, first:true};
  return {ok: String(pass) === String(cfg.pass)};
}
function p27SetConfig(d){
  var cfg = _p27Cfg();
  if(cfg.pass && String(d.pass) !== String(cfg.pass)) return {ok:false, error:'Contraseña incorrecta.'};
  if(d.letra) cfg.letra = String(d.letra).toUpperCase().charAt(0);
  if(d.plazas != null) cfg.plazas = Math.max(1, parseInt(d.plazas,10) || cfg.plazas);
  if(d.modo) cfg.modo = d.modo;
  if(d.antelacion != null) cfg.antelacion = Math.max(0, parseInt(d.antelacion,10));
  if(d.directivo != null) cfg.directivo = String(d.directivo);
  if(d.nuevaPass) cfg.pass = String(d.nuevaPass);
  _p27Save(cfg);
  return {ok:true, cfg:{letra:cfg.letra, plazas:cfg.plazas, modo:cfg.modo, antelacion:cfg.antelacion, directivo:cfg.directivo}};
}
function p27Admin(pass){
  var cfg = _p27Cfg();
  if(cfg.pass && String(pass) !== String(cfg.pass)) return {ok:false, error:'Contraseña incorrecta.'};
  var sh = _p27Sheet(), vals = sh.getDataRange().getValues(), out = [];
  for(var i=1;i<vals.length;i++){
    var r = vals[i]; if(!r[1]) continue;
    out.push({row:i+1, ts:new Date(r[0]).getTime(), email:(r[1]||'').toString(), nombre:(r[2]||'').toString(),
      fecha:_nf(r[3]), estado:(r[4]||'').toString().toUpperCase(), usados:Number(r[5])||0, motivo:(r[6]||'').toString()});
  }
  out.sort(function(a,b){ return (a.fecha === b.fecha) ? (a.ts - b.ts) : (a.fecha < b.fecha ? -1 : 1); });
  return {ok:true, primeraVez:!cfg.pass,
    cfg:{letra:cfg.letra, plazas:cfg.plazas, modo:cfg.modo, antelacion:cfg.antelacion, directivo:cfg.directivo}, solicitudes:out};
}
function p27Resolver(d){
  var cfg = _p27Cfg();
  if(cfg.pass && String(d.pass) !== String(cfg.pass)) return {ok:false, error:'Contraseña incorrecta.'};
  var sh = _p27Sheet();
  var row = parseInt(d.row,10);
  if(!row || row < 2) return {ok:false, error:'Fila no válida.'};
  var fs = _nf(sh.getRange(row,4).getValue());
  var email = sh.getRange(row,2).getValue(), nombre = sh.getRange(row,3).getValue();
  if(d.accion === 'aceptar'){
    sh.getRange(row,5).setValue('ACEPTADA');
    sh.getRange(row,8).setValue('aceptada por dirección');
    _p27MailAceptada(email, nombre, fs, cfg);
    _p27Log('ACEPTA_DIRECCION', email, nombre, fs, '');
  } else if(d.accion === 'rechazar'){
    sh.getRange(row,5).setValue('RECHAZADA');
    sh.getRange(row,7).setValue(d.motivo || '');
    sh.getRange(row,8).setValue('rechazada por dirección');
    _p27MailRechazada(email, nombre, fs, d.motivo);
    _p27Reordenar(cfg, fs);
    _p27Log('DENIEGA_DIRECCION', email, nombre, fs, d.motivo || '');
  }
  return {ok:true};
}

/* ── REGISTRO / AUDITORÍA (pestaña oculta P27_Registro) ── */
function _p27LogSheet(){
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('P27_Registro');
  if(!sh){
    sh = ss.insertSheet('P27_Registro');
    sh.appendRow(['Fecha','Accion','Email','Nombre','FechaSolicitada','Detalle']);
    sh.getRange('A1:F1').setFontWeight('bold').setBackground('#0B132B').setFontColor('white');
    sh.setFrozenRows(1);
    try{ sh.hideSheet(); }catch(e){}
  }
  return sh;
}
function _p27Log(accion, email, nombre, fs, detalle){
  try{ _p27LogSheet().appendRow([new Date(), accion||'', email||'', nombre||'', fs||'', detalle||'']); }catch(e){}
}
function p27Registro(pass){
  var cfg = _p27Cfg();
  if(cfg.pass && String(pass) !== String(cfg.pass)) return {ok:false, error:'Contraseña incorrecta.'};
  var sh = _p27LogSheet(), vals = sh.getDataRange().getValues(), out = [];
  for(var i=Math.max(1, vals.length-200); i<vals.length; i++){
    var r = vals[i];
    out.push({ts:new Date(r[0]).getTime(), accion:(r[1]||'').toString(), nombre:(r[3]||'').toString(),
      fecha:_nf(r[4]), detalle:(r[5]||'').toString()});
  }
  out.reverse();
  return {ok:true, registro:out};
}

/* ── EMAILS (cariñosos) ── */
function _p27MailAceptada(email, nombre, fs, cfg){
  try{
    MailApp.sendEmail({to:email, subject:'💙 Tu día de libre disposición está reservado (' + fs + ')',
      body:'Hola ' + nombre + ',\n\n¡Buenas noticias! Tu día de libre disposición del ' + fs + ' queda RESERVADO en el reparto del centro. ' +
           'Te lo has ganado, disfrútalo. 😊\n\n' +
           'Ya solo te queda un paso: formaliza la solicitud oficial en SÉNECA con al menos ' + cfg.antelacion +
           ' días hábiles de antelación. Este registro de la app solo organiza el cupo del centro; no sustituye a Séneca.\n\n' +
           'Cualquier duda, aquí nos tienes.' + P27_FIRMA});
  }catch(e){}
}
function _p27MailPendiente(email, nombre, fs, cfg){
  try{
    MailApp.sendEmail({to:email, subject:'💙 Hemos recibido tu solicitud (' + fs + ')',
      body:'Hola ' + nombre + ',\n\nTu solicitud del día ' + fs + ' ha sido PROCESADA correctamente. ' +
           'La revisaremos con cariño y te confirmaremos en cuanto esté resuelta. Gracias por tu trabajo cada día.' + P27_FIRMA});
  }catch(e){}
}
function _p27MailEspera(email, nombre, fs, cfg){
  try{
    MailApp.sendEmail({to:email, subject:'💙 Tu solicitud está en lista de espera (' + fs + ')',
      body:'Hola ' + nombre + ',\n\nGracias por tu solicitud del ' + fs + '. Ese día ya tiene el cupo del centro completo, ' +
           'así que quedas en LISTA DE ESPERA por orden de prioridad (primero quien no haya gastado sus días; en empate, ' +
           'orden alfabético desde la letra sorteada). Si se libera un hueco, te avisaremos al momento.' + P27_FIRMA});
  }catch(e){}
}
function _p27MailDesplazado(email, nombre, fs, cfg){
  try{
    MailApp.sendEmail({to:email, subject:'Cambio en tu solicitud del ' + fs,
      body:'Hola ' + nombre + ',\n\nOtro compañero con mayor prioridad ha solicitado el ' + fs +
           ', así que tu solicitud pasa a LISTA DE ESPERA. Según la Instrucción 10/2025, tiene preferencia ' +
           'quien no haya gastado sus días y, en empate, el orden alfabético desde la letra sorteada. ' +
           'Si se libera un hueco, volverás a entrar automáticamente. Gracias por tu comprensión.' + P27_FIRMA});
  }catch(e){}
}
function _p27MailRechazada(email, nombre, fs, motivo){
  try{
    MailApp.sendEmail({to:email, subject:'Sobre tu solicitud del ' + fs,
      body:'Hola ' + nombre + ',\n\nSentimos decirte que tu solicitud del día ' + fs + ' no ha podido concederse.\nMotivo: ' +
           (motivo || 'causas organizativas del centro') + '.\n\nPuedes elegir otro día en la app; te ayudaremos a encajarlo.' + P27_FIRMA});
  }catch(e){}
}
function _p27MailDirectivoNueva(nombre, fs, estado, cfg){
  try{
    var dir = _p27DirectivoEmails(cfg);
    if(!dir.length) return;
    var est = {ACEPTADA:'reservada automáticamente', ESPERA:'en lista de espera', PENDIENTE:'pendiente de validar'}[estado] || estado;
    MailApp.sendEmail({to:dir.join(','), subject:CONFIG.MAIL_PREFIX + ' · P27 ' + nombre + ' solicita el ' + fs,
      body:nombre + ' ha solicitado el día lectivo ' + fs + '.\nEstado: ' + est + '.\n\nPuedes revisarlo en el portal → Utilidades → P27 · Dirección.'});
  }catch(e){}
}
function _p27MailDirectivoValidar(nombre, fs, hab, cfg){
  try{
    var dir = _p27DirectivoEmails(cfg);
    if(!dir.length) return;
    MailApp.sendEmail({to:dir.join(','), subject:CONFIG.MAIL_PREFIX + ' · P27 Pendiente de validar: ' + fs,
      body:'Se acerca la fecha. La solicitud de ' + nombre + ' para el ' + fs + ' sigue PENDIENTE (quedan ' + hab +
           ' días hábiles).\n\nEntra en el portal → Utilidades → P27 · Dirección para aceptarla o denegarla, ' +
           'y así el maestro pueda formalizarla en Séneca en plazo.'});
  }catch(e){}
}
function _p27MailSeneca(email, nombre, fs, hab, cfg){
  try{
    MailApp.sendEmail({to:email, subject:'⏰ Recuerda formalizar en Séneca tu día ' + fs,
      body:'Hola ' + nombre + ',\n\nTu día de libre disposición del ' + fs + ' está reservado en el centro. ' +
           'Se acerca la fecha (quedan ' + hab + ' días hábiles), así que, si aún no lo has hecho, ' +
           'recuerda presentar la solicitud oficial en SÉNECA para que llegue en plazo.\n\n¡Gracias!' + P27_FIRMA});
  }catch(e){}
}

/* ── AVISOS AL ACERCARSE LA FECHA (poner un activador diario: ver p27InstalarRecordatorios) ── */
function p27Recordatorios(){
  var cfg = _p27Cfg();
  var sh = _p27Sheet(), vals = sh.getDataRange().getValues();
  var UMBRAL = 16; // días hábiles: avisar cuando se acerca el plazo de Séneca (15)
  for(var i=1;i<vals.length;i++){
    var r = vals[i], fs = _nf(r[3]), es = (r[4]||'').toString().toUpperCase().trim();
    if(!fs) continue;
    if(es !== 'ACEPTADA' && es !== 'PENDIENTE') continue;
    var hab = _p27HabilesHasta(cfg, fs);
    if(hab <= 0 || hab > UMBRAL) continue;
    var email = (r[1]||'').toString(), nombre = (r[2]||'').toString();
    if(es === 'ACEPTADA' && !r[9]){ _p27MailSeneca(email, nombre, fs, hab, cfg); sh.getRange(i+1,10).setValue(new Date()); }
    if(es === 'PENDIENTE' && !r[10]){ _p27MailDirectivoValidar(nombre, fs, hab, cfg); sh.getRange(i+1,11).setValue(new Date()); }
  }
  return {ok:true};
}
function p27InstalarRecordatorios(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'p27Recordatorios') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('p27Recordatorios').timeBased().everyDays(1).atHour(7).create();
  return 'Activador diario creado (07:00). Los avisos de fecha próxima ya funcionan.';
}
function getCumplesHoy(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("Cumpleanos");
    if(!sh || sh.getLastRow() < 2) return {cumples:[]};
    var tz = Session.getScriptTimeZone();
    var hoy = new Date();
    var dd = parseInt(Utilities.formatDate(hoy, tz, "dd"), 10);
    var mm = parseInt(Utilities.formatDate(hoy, tz, "MM"), 10);
    var rows = sh.getRange(2, 1, sh.getLastRow()-1, 4).getValues();
    var out = [];
    rows.forEach(function(row){
      var nombre = (row[0]||"").toString().trim();
      if(!nombre) return;
      var f = row[1], d = 0, m = 0;
      if(f instanceof Date){ d = f.getDate(); m = f.getMonth()+1; }
      else {
        var partes = (f||"").toString().trim().split(/[\/\-.]/);
        if(partes.length >= 2){ d = parseInt(partes[0],10); m = parseInt(partes[1],10); }
      }
      if(d === dd && m === mm){
        out.push({ nombre: nombre, mensaje: (row[2]||"").toString().trim(), link: (row[3]||"").toString().trim() });
      }
    });
    return {cumples: out};
  } catch(e){ return {cumples:[], error:e.toString()}; }
}
function _recCuad(d){
  try{
    PropertiesService.getScriptProperties().setProperty('RECREO_CUAD', JSON.stringify(d||{}));
    return {ok:true};
  }catch(e){ return {ok:false, error:e.toString()}; }
}
function _getRecreoCuad(){
  try{
    var p = PropertiesService.getScriptProperties().getProperty('RECREO_CUAD');
    return p ? JSON.parse(p) : null;
  }catch(e){ return null; }
}