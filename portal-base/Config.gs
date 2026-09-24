// ══════════════════════════════════════════════════════════════════════════
// CONFIG DEL CENTRO  ·  BASE NEUTRA DEL PORTAL
// ─────────────────────────────────────────────────────────────────────────
// Este es el ÚNICO archivo de servidor que se edita al crear un portal para
// un cole nuevo. El resto del código (Codigo.gs) lee siempre de aquí.
//
// Cómo instanciar un cole:
//   1) Rellena SPREADSHEET_ID con la hoja de cálculo del cole.
//   2) Ajusta CENTRO, TITULO_WEB, MAIL_PREFIX.
//   3) (Opcional) FOTOS_FOLDER_ID, LIBROS_FOLDER_ID, YT_USER, P27.
//   4) La marca visual (colores, Meets, grupos…) va en Config.html (cliente).
// ══════════════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── Identidad ────────────────────────────────────────────────────────────
  TITULO_WEB:  'PortalNet',                 // título de la pestaña del navegador
  CENTRO:      'CEIP ___',                  // nombre que aparece en documentos y correos
  MAIL_PREFIX: '[Portal]',                  // prefijo del asunto de los correos

  // ── Hoja de cálculo y carpetas de Drive ─────────────────────────────────
  SPREADSHEET_ID:   '',   // OBLIGATORIO · hoja principal (Control_Acceso, Frases, Calendario_Eventos, Horarios_*)
  FOTOS_FOLDER_ID:  '',   // carpeta raíz de fotos (galería y subidas). Vacío = galería desactivada.
  LIBROS_FOLDER_ID: '',   // carpeta donde se crean las listas de control de libros. Vacío = usa una que se crea sola.

  // ── Cartelera de YouTube ─────────────────────────────────────────────────
  YT_USER: '',            // usuario clásico o @canal (sin la @). Vacío = cartelera desactivada.

  // ── Materias del control de libros, por nivel ────────────────────────────
  LIBROS_MATERIAS: {
    '3': ['Lengua','Matemáticas','Inglés','C.Medio','Música','Plástica'],
    '4': ['Lengua','Matemáticas','Inglés','C.Medio','Música','Plástica'],
    '5': ['Lengua','Matemáticas','Inglés','C.Medio','Música','Plástica','Francés'],
    '6': ['Lengua','Matemáticas','Inglés','C.Medio','Música','Plástica','Francés','Valores 6º']
  },

  // ── P27 · Días de libre disposición (Instrucción 10/2025) ────────────────
  P27: {
    activo:  true,
    firma:   '\n\nCon cariño,\nEl Equipo Directivo',   // firma de los correos P27
    inicio:  '2026-09-11',                              // primer día lectivo del curso
    fin:     '2027-06-23',                              // último día lectivo del curso
    festivos: [                                         // festivos del calendario que corresponda (AAAA-MM-DD)
      // '2026-10-12', '2026-12-08', ...
    ]
  }
};

// Helper: prefijo de correo con espacio ("[Portal] ")
function MAIL_(){ return (CONFIG.MAIL_PREFIX || '').trim() + ' '; }
