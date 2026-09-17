// ==========================================================================
//  CUADERNO DE INCIDENCIAS - CEIP SAN SEBASTIÁN
//  Backend (Google Apps Script)
// ==========================================================================

// --- CONFIGURACIÓN DE IDs ---
const ID_LISTADO_ALUMNOS = '1uqHKVQww9BUsiSBZLagN8akLgxe-ZDST';
const ID_CUADERNO_INCIDENCIAS = '1kQzLqULO7gBcj_EWnyP81LftTziZe2nD8aiAtWxl3wQ';

const ID_MEMBRETE_SUPERIOR = '1Qm5R0JMVySjRqv4lJKjN7HhSU2YyY0Ac';
const ID_MEMBRETE_INFERIOR = '1bjYtquBiEAF44DqqtIbi9m6n01m9D6_I';

// --- CONFIGURACIÓN DE AVISOS Y ACCESO PRIVADO ---
const EMAIL_AVISOS = '41003522@g.educaand.es';   // Recibe un correo por cada incidencia nueva
const CLAVE_DIRECCION = 'Ssnet2026';             // Contraseña de la zona privada de Dirección

// ==========================================================================
// --- FUNCIÓN PARA GENERAR EL ENLACE WEB (APP) ---
// ==========================================================================
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gestión de Incidencias')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
// ==========================================================================

function autorizarPermisos() {
  DriveApp.getFiles().hasNext();
  DocumentApp.create("Test").setTrashed(true);
  SpreadsheetApp.openById(ID_CUADERNO_INCIDENCIAS);
  MailApp.getRemainingDailyQuota(); // Fuerza la autorización del permiso de envío de correo
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚨 Cuaderno Incidencias')
    .addItem('Abrir Panel de Registro', 'abrirPanel')
    .addToUi();
}

function abrirPanel() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gestión de Incidencias')
    .setWidth(750)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'Cuaderno de Incidencias');
}

function obtenerCursos() {
  const ss = SpreadsheetApp.openById(ID_LISTADO_ALUMNOS);
  let hojas = ss.getSheets().map(h => h.getName());

  if (!hojas.includes("Aula de las Estrellas")) {
    const nuevaHoja = ss.insertSheet("Aula de las Estrellas");
    nuevaHoja.appendRow(['Nº', 'ALUMNOS']);
    nuevaHoja.getRange("A1:B1").setFontWeight("bold").setBackground("#4c1130").setFontColor("white");
    hojas.push("Aula de las Estrellas");
  }

  hojas = hojas.filter(curso => curso !== "Aula de las Estrellas");
  hojas.unshift("Aula de las Estrellas");

  return hojas;
}

function obtenerAlumnos(curso) {
  const hoja = SpreadsheetApp.openById(ID_LISTADO_ALUMNOS).getSheetByName(curso);
  if (!hoja) return [];
  const datos = hoja.getDataRange().getValues();
  datos.shift();
  return datos.map(fila => fila[1] ? fila[1].toString().trim() : "").filter(n => n !== "");
}

function agregarAlumnoNuevo(curso, nombreAlumno) {
  try {
    const ss = SpreadsheetApp.openById(ID_LISTADO_ALUMNOS);
    let hoja = ss.getSheetByName(curso);
    if (!hoja) {
      hoja = ss.insertSheet(curso);
      hoja.appendRow(['Nº', 'ALUMNOS']);
    }

    hoja.appendRow([999, nombreAlumno.toUpperCase()]);

    const ultimaFila = hoja.getLastRow();
    if (ultimaFila > 1) {
      const rangoDatos = hoja.getRange(2, 1, ultimaFila - 1, 2);
      rangoDatos.sort({column: 2, ascending: true});

      const numFilas = rangoDatos.getNumRows();
      let nuevosNumeros = [];
      for (let i = 1; i <= numFilas; i++) {
        nuevosNumeros.push([i]);
      }
      hoja.getRange(2, 1, numFilas, 1).setValues(nuevosNumeros);
    }

    return "OK";
  } catch (error) {
    throw new Error("Error al añadir al listado de alumnos: " + error.message);
  }
}

function borrarAlumno(curso, nombreAlumno) {
  try {
    const hoja = SpreadsheetApp.openById(ID_LISTADO_ALUMNOS).getSheetByName(curso);
    if (!hoja) throw new Error("No se encuentra la pestaña del curso.");

    const datos = hoja.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][1] && datos[i][1].toString().trim().toUpperCase() === nombreAlumno.trim().toUpperCase()) {
        hoja.deleteRow(i + 1);

        const ultimaFila = hoja.getLastRow();
        if (ultimaFila > 1) {
          const numFilas = ultimaFila - 1;
          let nuevosNumeros = [];
          for (let x = 1; x <= numFilas; x++) { nuevosNumeros.push([x]); }
          hoja.getRange(2, 1, numFilas, 1).setValues(nuevosNumeros);
        }

        return "OK";
      }
    }
    throw new Error("Alumno no encontrado en la base de datos.");
  } catch (error) {
    throw new Error("Error al dar de baja: " + error.message);
  }
}

function guardarIncidencia(datos) {
  try {
    const ss = SpreadsheetApp.openById(ID_CUADERNO_INCIDENCIAS);
    let hoja = ss.getSheetByName(datos.curso);

    if (!hoja) {
      hoja = ss.insertSheet(datos.curso);
      hoja.appendRow(['FECHA', 'ALUMNO', 'MAESTRO/A', 'TIPO', 'DESCRIPCIÓN', 'MEDIDAS TOMADAS']);
      hoja.getRange("A1:F1").setFontWeight("bold").setBackground("#4c1130").setFontColor("white");
      hoja.setColumnWidth(2, 200);
      hoja.setColumnWidth(5, 350);
      hoja.setColumnWidth(6, 350);
    }

    hoja.appendRow([datos.fecha, datos.alumno.toUpperCase(), datos.maestro, datos.tipo, datos.descripcion, datos.medidas]);

    // Aviso por correo (no interrumpe el guardado si falla el envío)
    enviarAvisoEmail(datos);

    return "OK";
  } catch (error) {
    throw new Error("Error al guardar en el cuaderno central: " + error.message);
  }
}

// ==========================================================================
// --- AVISO POR EMAIL AL REGISTRAR UNA INCIDENCIA ---
// ==========================================================================
function enviarAvisoEmail(datos) {
  try {
    const color = colorGravedad(datos.tipo);
    const asunto = '🚨 Nueva incidencia [' + datos.tipo + '] · ' + datos.alumno.toUpperCase() + ' (' + datos.curso + ')';
    const marca = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");

    const cuerpo =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">' +
        '<div style="background:#4c1130;color:#fff;padding:16px 20px;">' +
          '<h2 style="margin:0;font-size:18px;">📋 Cuaderno de Incidencias</h2>' +
          '<p style="margin:4px 0 0;font-size:13px;opacity:.85;">Se ha registrado una nueva incidencia</p>' +
        '</div>' +
        '<div style="padding:20px;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
            filaEmail('Alumno/a', datos.alumno.toUpperCase()) +
            filaEmail('Curso', datos.curso) +
            filaEmail('Fecha del hecho', datos.fecha) +
            filaEmail('Gravedad', '<b style="color:' + color + ';">' + datos.tipo + '</b>') +
            filaEmail('Docente que interviene', datos.maestro) +
          '</table>' +
          bloqueEmail('Descripción de los hechos', datos.descripcion) +
          bloqueEmail('Medidas adoptadas', datos.medidas) +
          '<p style="margin-top:22px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;">' +
            'Registrado el ' + marca + ' · Aviso automático generado por la aplicación del centro.' +
          '</p>' +
        '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: EMAIL_AVISOS,
      subject: asunto,
      htmlBody: cuerpo
    });
  } catch (e) {
    // No relanzamos el error: si el correo falla, la incidencia ya se guardó igualmente.
    console.error('No se pudo enviar el aviso por email: ' + e.message);
  }
}

function filaEmail(etiqueta, valor) {
  return '<tr>' +
    '<td style="padding:6px 8px;color:#666;white-space:nowrap;vertical-align:top;"><b>' + etiqueta + ':</b></td>' +
    '<td style="padding:6px 8px;color:#222;">' + valor + '</td>' +
  '</tr>';
}

function bloqueEmail(titulo, texto) {
  return '<div style="margin-top:16px;">' +
    '<div style="font-size:12px;font-weight:bold;color:#4c1130;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">' + titulo + '</div>' +
    '<div style="background:#f6f6f8;border-left:4px solid #4c1130;padding:10px 12px;border-radius:4px;font-size:14px;color:#222;white-space:pre-wrap;">' + escaparHtml(texto) + '</div>' +
  '</div>';
}

// ==========================================================================
// --- HISTORIAL Y BORRADO ---
// ==========================================================================
function obtenerHistorial(curso, alumno) {
  const hoja = SpreadsheetApp.openById(ID_CUADERNO_INCIDENCIAS).getSheetByName(curso);
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const historial = [];

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][1] === alumno.toUpperCase() || datos[i][1] === alumno) {
      historial.push({
        fila: i + 1,
        fecha: datos[i][0] instanceof Date ? Utilities.formatDate(datos[i][0], Session.getScriptTimeZone(), "dd/MM/yyyy") : datos[i][0],
        maestro: datos[i][2],
        tipo: datos[i][3],
        descripcion: datos[i][4],
        medidas: datos[i][5]
      });
    }
  }
  return historial;
}

function eliminarIncidencia(curso, fila) {
  try {
    const hoja = SpreadsheetApp.openById(ID_CUADERNO_INCIDENCIAS).getSheetByName(curso);
    if (hoja) {
      hoja.deleteRow(fila);
      return "OK";
    }
    throw new Error("No se encontró la pestaña del curso.");
  } catch (error) {
    throw new Error("Error al borrar: " + error.message);
  }
}

// ==========================================================================
// --- ZONA PRIVADA DE DIRECCIÓN: RESUMEN POR CURSOS ---
// ==========================================================================
function obtenerResumenDireccion(clave) {
  if (String(clave) !== CLAVE_DIRECCION) {
    return { ok: false };
  }

  const ss = SpreadsheetApp.openById(ID_CUADERNO_INCIDENCIAS);
  const hojas = ss.getSheets();
  const cursos = [];
  let totalIncidencias = 0;
  let totalAlumnos = 0;

  hojas.forEach(hoja => {
    const datos = hoja.getDataRange().getValues();
    if (datos.length < 2) return; // solo cabecera o vacía

    const mapa = {}; // nombre -> {total, leves, graves, muyGraves, ultima}
    for (let i = 1; i < datos.length; i++) {
      const nombre = datos[i][1] ? datos[i][1].toString().trim() : "";
      if (!nombre) continue;

      const tipo = (datos[i][3] || "").toString().trim();
      const fecha = datos[i][0] instanceof Date
        ? Utilities.formatDate(datos[i][0], Session.getScriptTimeZone(), "dd/MM/yyyy")
        : (datos[i][0] || "").toString();

      if (!mapa[nombre]) {
        mapa[nombre] = { nombre: nombre, total: 0, leves: 0, graves: 0, muyGraves: 0, ultima: fecha };
      }
      mapa[nombre].total++;
      if (tipo === "Leve") mapa[nombre].leves++;
      else if (tipo === "Grave") mapa[nombre].graves++;
      else if (tipo === "Muy Grave") mapa[nombre].muyGraves++;
      mapa[nombre].ultima = fecha; // la última leída (las filas se añaden en orden)

      totalIncidencias++;
    }

    const alumnos = Object.keys(mapa).map(k => mapa[k]);
    if (alumnos.length === 0) return;

    // Orden: primero quien más incidencias tiene, luego alfabético
    alumnos.sort((a, b) => (b.total - a.total) || a.nombre.localeCompare(b.nombre));
    totalAlumnos += alumnos.length;

    cursos.push({
      curso: hoja.getName(),
      totalCurso: alumnos.reduce((s, a) => s + a.total, 0),
      alumnos: alumnos
    });
  });

  // Cursos ordenados alfabéticamente
  cursos.sort((a, b) => a.curso.localeCompare(b.curso));

  return {
    ok: true,
    cursos: cursos,
    totalIncidencias: totalIncidencias,
    totalAlumnos: totalAlumnos
  };
}

// ==========================================================================
// --- INFORME EN HTML (PARA IMPRIMIR CON MEMBRETES) ---
// ==========================================================================
function generarInformeHTML(curso, alumno) {
  const historial = obtenerHistorial(curso, alumno);
  const memSup = getMembreteBase64(ID_MEMBRETE_SUPERIOR);
  const memInf = getMembreteBase64(ID_MEMBRETE_INFERIOR);
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  let bloques = "";
  if (historial.length === 0) {
    bloques = '<p class="sin">No constan incidencias registradas en el cuaderno central para este alumno/a.</p>';
  } else {
    historial.forEach((inc, i) => {
      const clase = claseGravedad(inc.tipo);
      bloques +=
        '<div class="incidencia">' +
          '<div class="num">Incidencia ' + (i + 1) + ' de ' + historial.length + '</div>' +
          '<div class="cab">' +
            '<div class="campo"><span class="et">FECHA</span><span class="val">' + escaparHtml(inc.fecha) + '</span></div>' +
            '<div class="campo"><span class="et">GRAVEDAD</span><span class="badge ' + clase + '">' + escaparHtml(inc.tipo) + '</span></div>' +
            '<div class="campo campo-ancho"><span class="et">DOCENTE QUE INTERVIENE</span><span class="val">' + escaparHtml(inc.maestro) + '</span></div>' +
          '</div>' +
          '<div class="bloque">' +
            '<div class="tit">DESCRIPCIÓN DE LOS HECHOS</div>' +
            '<div class="texto">' + escaparHtml(inc.descripcion) + '</div>' +
          '</div>' +
          '<div class="bloque">' +
            '<div class="tit">MEDIDAS ADOPTADAS</div>' +
            '<div class="texto">' + escaparHtml(inc.medidas) + '</div>' +
          '</div>' +
        '</div>';
    });
  }

  const html =
'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
'<title>Informe de Incidencias - ' + escaparHtml(alumno) + '</title>' +
'<style>' +
'  * { box-sizing: border-box; }' +
'  body { font-family: Arial, Helvetica, sans-serif; color: #1f1f1f; margin: 0; padding: 25px 30px; font-size: 13px; }' +
'  .membrete { width: 100%; display: block; margin: 0 auto; }' +
'  .membrete-sup { margin-bottom: 10px; }' +
'  .membrete-inf { margin-top: 20px; }' +
'  h1 { text-align: center; font-size: 17px; color: #4c1130; margin: 18px 0 4px; text-transform: uppercase; letter-spacing: .5px; }' +
'  .subtitulo { text-align: center; font-size: 12px; color: #777; margin: 0 0 18px; }' +
'  .datos-alumno { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; background: #faf7f9; }' +
'  .datos-alumno span { display: inline-block; margin-right: 25px; font-size: 13px; }' +
'  .datos-alumno b { color: #4c1130; }' +
'  .incidencia { border: 1px solid #e2e2e2; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; page-break-inside: avoid; }' +
'  .num { font-size: 11px; color: #999; text-align: right; margin-bottom: 6px; }' +
'  .cab { display: flex; flex-wrap: wrap; gap: 10px 20px; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 12px; }' +
'  .campo { display: flex; flex-direction: column; gap: 3px; }' +
'  .campo-ancho { flex: 1; min-width: 180px; }' +
'  .et { font-size: 10px; font-weight: bold; color: #999; letter-spacing: .5px; }' +
'  .val { font-size: 14px; font-weight: bold; color: #222; }' +
'  .badge { display: inline-block; align-self: flex-start; padding: 3px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; color: #fff; }' +
'  .badge.leve { background: #34a853; }' +
'  .badge.grave { background: #f39c12; }' +
'  .badge.muygrave { background: #ea4335; }' +
'  .badge.otro { background: #777; }' +
'  .bloque { margin-top: 10px; }' +
'  .tit { font-size: 11px; font-weight: bold; color: #4c1130; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }' +
'  .texto { background: #f7f7f9; border-left: 4px solid #4c1130; border-radius: 4px; padding: 10px 12px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; text-align: justify; }' +
'  .sin { font-style: italic; color: #777; text-align: center; padding: 30px; }' +
'  @media print { body { padding: 0; } .incidencia { border: 1px solid #ccc; } }' +
'</style></head><body>' +
  (memSup ? '<img class="membrete membrete-sup" src="' + memSup + '">' : '') +
  '<h1>Informe Disciplinario y de Incidencias</h1>' +
  '<p class="subtitulo">Documento generado desde el Cuaderno de Incidencias del centro</p>' +
  '<div class="datos-alumno">' +
    '<span><b>Alumno/a:</b> ' + escaparHtml(alumno) + '</span>' +
    '<span><b>Curso:</b> ' + escaparHtml(curso) + '</span>' +
    '<span><b>Fecha de emisión:</b> ' + hoy + '</span>' +
    '<span><b>Nº de incidencias:</b> ' + historial.length + '</span>' +
  '</div>' +
  bloques +
  (memInf ? '<img class="membrete membrete-inf" src="' + memInf + '">' : '') +
'</body></html>';

  return html;
}

function getMembreteBase64(id) {
  try {
    const blob = DriveApp.getFileById(id).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
}

// ==========================================================================
// --- INFORME EN PDF (GOOGLE DOC) CON DISEÑO EN FICHAS ---
// ==========================================================================
function generarPDF(curso, alumno) {
  try {
    const historial = obtenerHistorial(curso, alumno);
    const doc = DocumentApp.create('Informe_Incidencias_' + alumno);
    const body = doc.getBody();

    const margen = 56.69;
    body.setMarginTop(margen).setMarginBottom(margen).setMarginLeft(margen).setMarginRight(margen);
    const anchoDisponible = body.getPageWidth() - (margen * 2);

    const estiloGeneral = {};
    estiloGeneral[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
    estiloGeneral[DocumentApp.Attribute.FONT_SIZE] = 11;

    // Membrete superior
    try {
      const imgSuperior = DriveApp.getFileById(ID_MEMBRETE_SUPERIOR).getBlob();
      const header = doc.addHeader();
      const pSuperior = header.appendParagraph("");
      pSuperior.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      const imgS = pSuperior.appendInlineImage(imgSuperior);
      const altoMaxS = imgS.getHeight() * (anchoDisponible / imgS.getWidth());
      imgS.setWidth(anchoDisponible).setHeight(altoMaxS);
    } catch (e) {}

    // Membrete inferior
    try {
      const imgInferior = DriveApp.getFileById(ID_MEMBRETE_INFERIOR).getBlob();
      const footer = doc.addFooter();
      const pInferior = footer.appendParagraph("");
      pInferior.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      const imgI = pInferior.appendInlineImage(imgInferior);
      const altoMaxI = imgI.getHeight() * (anchoDisponible / imgI.getWidth());
      imgI.setWidth(anchoDisponible).setHeight(altoMaxI);
    } catch (e) {}

    // Título
    body.appendParagraph("INFORME DISCIPLINARIO Y DE INCIDENCIAS")
      .setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .setForegroundColor("#4c1130");

    // Datos del alumno
    const pInfo = body.appendParagraph("");
    pInfo.appendText("Alumno/a: ").setBold(true);
    pInfo.appendText(alumno + "\n").setBold(false);
    pInfo.appendText("Curso: ").setBold(true);
    pInfo.appendText(curso + "\n").setBold(false);
    pInfo.appendText("Fecha de emisión: ").setBold(true);
    pInfo.appendText(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy") + "\n").setBold(false);
    pInfo.appendText("Nº de incidencias: ").setBold(true);
    pInfo.appendText(String(historial.length)).setBold(false);
    pInfo.setAttributes(estiloGeneral);

    body.appendParagraph("");

    if (historial.length === 0) {
      body.appendParagraph("No constan incidencias registradas en el cuaderno central para este alumno/a.")
        .setItalic(true).setAttributes(estiloGeneral);
    } else {
      historial.forEach((inc, idx) => {
        // Tabla compacta con los datos cortos (Fecha / Gravedad / Docente)
        const tabla = body.appendTable([
          ["FECHA", "GRAVEDAD", "DOCENTE"],
          [inc.fecha || "", inc.tipo || "", inc.maestro || ""]
        ]);
        tabla.setBorderColor("#dddddd");

        // Cabecera de la ficha
        for (let c = 0; c < 3; c++) {
          const celda = tabla.getCell(0, c);
          celda.setBackgroundColor("#4c1130");
          const t = celda.editAsText();
          t.setBold(true).setForegroundColor("#ffffff").setFontSize(9).setFontFamily("Arial");
        }
        // Valores de la ficha
        for (let c = 0; c < 3; c++) {
          const celda = tabla.getCell(1, c);
          const t = celda.editAsText();
          t.setBold(true).setFontSize(11).setFontFamily("Arial");
        }
        // Color de la gravedad
        tabla.getCell(1, 1).editAsText().setForegroundColor(colorGravedad(inc.tipo));

        // Descripción (ancho completo)
        body.appendParagraph("DESCRIPCIÓN DE LOS HECHOS")
          .setBold(true).setForegroundColor("#4c1130").setFontSize(10).setSpacingBefore(8).setSpacingAfter(2);
        body.appendParagraph(inc.descripcion || "-")
          .setBold(false).setForegroundColor("#000000").setFontSize(11).setFontFamily("Arial");

        // Medidas (ancho completo)
        body.appendParagraph("MEDIDAS ADOPTADAS")
          .setBold(true).setForegroundColor("#4c1130").setFontSize(10).setSpacingBefore(6).setSpacingAfter(2);
        body.appendParagraph(inc.medidas || "-")
          .setBold(false).setForegroundColor("#000000").setFontSize(11).setFontFamily("Arial");

        if (idx < historial.length - 1) {
          body.appendHorizontalRule();
        }
      });
    }

    doc.saveAndClose();
    return doc.getUrl().replace("/edit", "/export?format=pdf");
  } catch (error) {
    throw new Error("Error al generar el PDF: " + error.message);
  }
}

// ==========================================================================
// --- UTILIDADES ---
// ==========================================================================
function colorGravedad(tipo) {
  if (tipo === "Leve") return "#34a853";
  if (tipo === "Grave") return "#f39c12";
  if (tipo === "Muy Grave") return "#ea4335";
  return "#777777";
}

function claseGravedad(tipo) {
  if (tipo === "Leve") return "leve";
  if (tipo === "Grave") return "grave";
  if (tipo === "Muy Grave") return "muygrave";
  return "otro";
}

function escaparHtml(texto) {
  if (texto === null || texto === undefined) return "";
  return texto.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
