/* ============================================================
   PORRA CEIP SAN SEBASTIÁN · Núcleo lógico
   Este mismo archivo se usa en dos sitios:
     1) En la web (porra.html) para el MODO PRUEBA sin servidor.
     2) En Google Apps Script (pegado como archivo "porra_core.gs").
   Todas las reglas del reglamento viven aquí.
   ============================================================ */
var PorraCore = (function () {

  // ---------- Equipos (escudo dibujado por defecto: colores + siglas) ----------
  // p = patrón: v (rayas verticales), h (dos mitades), d (banda diagonal), s (liso), x (cuartelado)
  var EQUIPOS = [
    { n: 'Real Betis', s: 'RBB', c: ['#00954C', '#FFFFFF'], p: 'v', a: ['betis', 'real betis balompie'] },
    { n: 'Sevilla FC', s: 'SFC', c: ['#FFFFFF', '#D71920'], p: 'h', a: ['sevilla', 'sevilla futbol club'] },
    { n: 'Real Madrid', s: 'RMA', c: ['#FFFFFF', '#FEBE10'], p: 's', a: ['madrid'] },
    { n: 'FC Barcelona', s: 'FCB', c: ['#A50044', '#004D98'], p: 'v', a: ['barcelona', 'barca', 'futbol club barcelona'] },
    { n: 'Atlético de Madrid', s: 'ATM', c: ['#CB3524', '#FFFFFF'], p: 'v', a: ['atletico', 'atletico madrid', 'atleti'] },
    { n: 'Athletic Club', s: 'ATH', c: ['#EE2523', '#FFFFFF'], p: 'v', a: ['athletic', 'athletic bilbao', 'bilbao'] },
    { n: 'Real Sociedad', s: 'RSO', c: ['#0067B1', '#FFFFFF'], p: 'v', a: ['la real', 'sociedad'] },
    { n: 'Villarreal CF', s: 'VIL', c: ['#FFE667', '#005187'], p: 's', a: ['villarreal'] },
    { n: 'Valencia CF', s: 'VAL', c: ['#FFFFFF', '#EE3524'], p: 'x', a: ['valencia'] },
    { n: 'RC Celta', s: 'CEL', c: ['#8AC3EE', '#FFFFFF'], p: 's', a: ['celta', 'celta de vigo'] },
    { n: 'CA Osasuna', s: 'OSA', c: ['#D91A21', '#0A346F'], p: 'h', a: ['osasuna'] },
    { n: 'Getafe CF', s: 'GET', c: ['#005999', '#FFFFFF'], p: 's', a: ['getafe'] },
    { n: 'Rayo Vallecano', s: 'RAY', c: ['#FFFFFF', '#E53027'], p: 'd', a: ['rayo'] },
    { n: 'RCD Mallorca', s: 'MLL', c: ['#E20613', '#1A1A1A'], p: 'h', a: ['mallorca'] },
    { n: 'Girona FC', s: 'GIR', c: ['#CD2534', '#FFFFFF'], p: 'v', a: ['girona'] },
    { n: 'Deportivo Alavés', s: 'ALA', c: ['#0761AF', '#FFFFFF'], p: 'v', a: ['alaves'] },
    { n: 'RCD Espanyol', s: 'ESP', c: ['#007FC8', '#FFFFFF'], p: 'v', a: ['espanyol'] },
    { n: 'Levante UD', s: 'LEV', c: ['#B4053F', '#004A9F'], p: 'v', a: ['levante'] },
    { n: 'Elche CF', s: 'ELC', c: ['#FFFFFF', '#05642C'], p: 'd', a: ['elche'] },
    { n: 'Real Oviedo', s: 'OVI', c: ['#0047AB', '#FFFFFF'], p: 's', a: ['oviedo'] },
    { n: 'Racing de Santander', s: 'RAC', c: ['#FFFFFF', '#1B8B3A'], p: 'h', a: ['racing', 'racing santander'] },
    { n: 'Deportivo de La Coruña', s: 'RCD', c: ['#FFFFFF', '#1E5BC6'], p: 'v', a: ['depor', 'deportivo', 'deportivo la coruna'] },
    { n: 'UD Las Palmas', s: 'LPA', c: ['#FFE400', '#1C59A8'], p: 's', a: ['las palmas'] },
    { n: 'Real Valladolid', s: 'VLL', c: ['#5B2B82', '#FFFFFF'], p: 'v', a: ['valladolid'] },
    { n: 'CD Leganés', s: 'LEG', c: ['#FFFFFF', '#1E4EA1'], p: 'v', a: ['leganes'] },
    { n: 'Málaga CF', s: 'MAL', c: ['#5FA8E3', '#FFFFFF'], p: 'v', a: ['malaga'] },
    { n: 'UD Almería', s: 'ALM', c: ['#E2001A', '#FFFFFF'], p: 'v', a: ['almeria'] },
    { n: 'Cádiz CF', s: 'CAD', c: ['#FFE500', '#1B4A9C'], p: 'h', a: ['cadiz'] },
    { n: 'Granada CF', s: 'GRA', c: ['#E30613', '#FFFFFF'], p: 'h', a: ['granada'] },
    { n: 'Córdoba CF', s: 'COR', c: ['#FFFFFF', '#00843D'], p: 'v', a: ['cordoba'] },
    { n: 'Real Zaragoza', s: 'ZAR', c: ['#FFFFFF', '#1F4E9C'], p: 'h', a: ['zaragoza'] },
    { n: 'Sporting de Gijón', s: 'SPO', c: ['#E30613', '#FFFFFF'], p: 'v', a: ['sporting', 'sporting gijon'] }
  ];

  var PORCENTAJES_FINAL = [50, 30, 20];

  // ---------- utilidades ----------
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function limpio(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function clave(s) {
    return limpio(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '');
  }
  function hashPin(pin) {
    // Hash sencillo (no criptográfico) para no guardar el PIN a la vista en la hoja.
    var s = 'porraSS|' + String(pin), h1 = 0x811c9dc5, h2 = 5381;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = ((h2 * 33) ^ c) >>> 0;
    }
    return h1.toString(16) + h2.toString(16);
  }
  function r2(n) { return Math.round(n * 100) / 100; }
  function golValido(g) { return g !== '' && g !== null && g !== undefined && /^\d{1,2}$/.test(String(g)); }
  function resValido(r) { return !!r && golValido(r[0]) && golValido(r[1]); }

  function equipo(nombre) {
    var k = clave(nombre);
    for (var i = 0; i < EQUIPOS.length; i++) {
      var e = EQUIPOS[i];
      if (clave(e.n) === k || e.a.indexOf(k) >= 0) return e;
    }
    return null;
  }

  function nuevaBD() {
    return {
      config: {
        claveParticipantes: 'betis',
        claveAdmin: 'antonio1907',
        aportacion: 1,
        boteInicial: 0
      },
      participantes: [],
      jornadas: [],
      pronosticos: [],
      escudos: {}
    };
  }

  function asegurar(db) {
    var base = nuevaBD();
    db.config = db.config || {};
    for (var k in base.config) if (db.config[k] === undefined || db.config[k] === '') db.config[k] = base.config[k];
    db.participantes = db.participantes || [];
    db.jornadas = db.jornadas || [];
    db.pronosticos = db.pronosticos || [];
    db.escudos = db.escudos || {};
    return db;
  }

  function buscar(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function participantePorNombre(db, nombre) {
    var k = clave(nombre);
    for (var i = 0; i < db.participantes.length; i++) if (clave(db.participantes[i].nombre) === k) return db.participantes[i];
    return null;
  }

  function finalizada(j) {
    var r = j.resultados || [];
    return r.length === 3 && resValido(r[0]) && resValido(r[1]) && resValido(r[2]);
  }
  function abierta(j, now) {
    return !finalizada(j) && !j.cerrada && now.getTime() < new Date(j.cierre).getTime();
  }
  function mismosGoles(a, b) {
    for (var i = 0; i < 3; i++) if (+a[i][0] !== +b[i][0] || +a[i][1] !== +b[i][1]) return false;
    return true;
  }
  function validarGoles(g) {
    if (!g || g.length !== 3) return null;
    var out = [];
    for (var i = 0; i < 3; i++) {
      if (!g[i] || !golValido(g[i][0]) || !golValido(g[i][1])) return null;
      out.push([+g[i][0], +g[i][1]]);
    }
    return out;
  }

  // ---------- cálculo de aciertos, bote, clasificación y reparto ----------
  function calcular(db, now) {
    var aport = +db.config.aportacion || 0;
    var bote = +db.config.boteInicial || 0;
    var nombres = {};
    db.participantes.forEach(function (p) { nombres[p.id] = p.nombre; });
    var stats = {};
    var js = db.jornadas.slice().sort(function (a, b) {
      return (+a.numero - +b.numero) || (new Date(a.cierre) - new Date(b.cierre));
    });
    var salida = js.map(function (j) {
      var fin = finalizada(j);
      var res = j.resultados || [null, null, null];
      var pros = db.pronosticos.filter(function (p) { return p.jornadaId === j.id; })
        .sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
      var pagados = 0, ganadores = [];
      var lista = pros.map(function (p) {
        var ac = 0;
        for (var i = 0; i < 3; i++) {
          if (resValido(res[i]) && +res[i][0] === +p.goles[i][0] && +res[i][1] === +p.goles[i][1]) ac++;
        }
        var pleno = fin && ac === 3;
        if (p.pagado) {
          pagados++;
          var s = stats[p.participanteId] || (stats[p.participanteId] = {
            participanteId: p.participanteId, aciertos: 0, plenos: 0, jugadas: 0, ganado: 0
          });
          s.aciertos += ac; s.jugadas++;
          if (pleno) { s.plenos++; ganadores.push(p); }
        }
        return {
          id: p.id, participanteId: p.participanteId, nombre: nombres[p.participanteId] || '¿?',
          goles: p.goles, pagado: !!p.pagado, fecha: p.fecha, aciertos: ac, pleno: pleno && !!p.pagado
        };
      });
      bote = r2(bote + pagados * aport);
      var info = {
        id: j.id, numero: j.numero, titulo: j.titulo || '', cierre: j.cierre, partidos: j.partidos,
        resultados: res, finalizada: fin, abierta: abierta(j, now), cerrada: !!j.cerrada,
        pagados: pagados, recaudado: r2(pagados * aport), bote: bote, ganadores: [], premio: 0, pronosticos: lista
      };
      if (fin && ganadores.length) {
        var porCabeza = r2(bote / ganadores.length);
        info.premio = bote;
        info.ganadores = ganadores.map(function (g) {
          stats[g.participanteId].ganado = r2(stats[g.participanteId].ganado + porCabeza);
          return { nombre: nombres[g.participanteId], importe: porCabeza };
        });
        bote = 0;
      }
      info.boteTras = bote;
      return info;
    });

    var ranking = Object.keys(stats).map(function (k) {
      var s = stats[k]; s.nombre = nombres[k] || '¿?'; return s;
    }).sort(function (a, b) {
      return (b.aciertos - a.aciertos) || (b.plenos - a.plenos) || a.nombre.localeCompare(b.nombre);
    });
    var pos = 0;
    ranking.forEach(function (r, i) {
      if (i === 0 || r.aciertos !== ranking[i - 1].aciertos) pos = i + 1;
      r.posicion = pos;
    });

    return { jornadas: salida, bote: bote, ranking: ranking, reparto: repartoFinal(ranking, bote) };
  }

  // Reparto final (punto 6 del reglamento): 50/30/20. Los empatados que ocupan
  // varias posiciones suman los porcentajes de esas posiciones y los reparten a partes iguales.
  function repartoFinal(ranking, bote) {
    var conAciertos = ranking.filter(function (r) { return r.aciertos > 0; });
    var out = [], pos = 1, i = 0;
    while (i < conAciertos.length && pos <= 3) {
      var ac = conAciertos[i].aciertos;
      var grupo = conAciertos.filter(function (r) { return r.aciertos === ac; });
      var pct = 0;
      for (var k = pos; k < pos + grupo.length && k <= 3; k++) pct += PORCENTAJES_FINAL[k - 1];
      grupo.forEach(function (r) {
        out.push({
          nombre: r.nombre, posicion: pos, aciertos: ac, empate: grupo.length > 1,
          porcentaje: r2(pct / grupo.length), importe: r2(bote * pct / grupo.length / 100)
        });
      });
      pos += grupo.length; i += grupo.length;
    }
    return out;
  }

  // ---------- vista que se envía a la web ----------
  function vista(db, now, yo, admin) {
    var R = calcular(db, now);
    R.jornadas.forEach(function (j) {
      j.pronosticos = j.pronosticos.map(function (p) {
        var mio = !!yo && p.participanteId === yo.id;
        var ver = admin || mio || !j.abierta;
        return {
          id: p.id, nombre: p.nombre, pagado: p.pagado, mio: mio,
          goles: ver ? p.goles : null, aciertos: ver ? p.aciertos : null, pleno: p.pleno,
          fecha: admin || mio ? p.fecha : undefined
        };
      });
    });
    var v = {
      ok: true, ahora: now.toISOString(), jornadas: R.jornadas, bote: R.bote, ranking: R.ranking,
      reparto: R.reparto, aportacion: +db.config.aportacion || 0, escudos: db.escudos,
      yo: yo ? { id: yo.id, nombre: yo.nombre } : null,
      participantesTotal: db.participantes.length
    };
    if (admin) {
      v.admin = true;
      v.config = {
        claveParticipantes: db.config.claveParticipantes, claveAdmin: db.config.claveAdmin,
        aportacion: +db.config.aportacion || 0, boteInicial: +db.config.boteInicial || 0
      };
      v.participantes = db.participantes.map(function (p) {
        return { id: p.id, nombre: p.nombre, tienePin: !!p.pin, creado: p.creado };
      }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    }
    return v;
  }

  function fallo(msg, code) { return { res: { ok: false, error: msg, code: code || 'error' }, changed: false }; }
  function bien(db, now, yo, admin, extra, changed) {
    var v = vista(db, now, yo, admin);
    if (extra) for (var k in extra) v[k] = extra[k];
    return { res: v, changed: !!changed };
  }

  // ---------- punto de entrada ----------
  function handle(db, req, now) {
    asegurar(db);
    now = now || new Date();
    req = req || {};
    var a = String(req.action || 'estado');
    var esAdmin = !!req.claveAdmin && String(req.claveAdmin) === String(db.config.claveAdmin);

    if (a.indexOf('admin') === 0) {
      if (!esAdmin) return fallo('Esa no es la contraseña de Antonio. ¡Fuera de mi despacho! 🚪', 'clave_admin');
      return admin(db, req, now, a);
    }

    if (!esAdmin && String(req.clave || '') !== String(db.config.claveParticipantes)) {
      return fallo('Contraseña de la porra incorrecta.', 'clave');
    }

    var yo = null;
    if (req.nombre) {
      yo = participantePorNombre(db, req.nombre);
      if (yo && (!yo.pin || yo.pin !== hashPin(req.pin))) yo = null;
    }

    if (a === 'estado' || a === 'comprobar') return bien(db, now, yo, false);

    if (a === 'registro') {
      var nombre = limpio(req.nombre);
      if (nombre.length < 2 || nombre.length > 40) return fallo('Pon un nombre de verdad (entre 2 y 40 letras).', 'nombre');
      if (!/^\d{4}$/.test(String(req.pin || ''))) return fallo('El PIN tiene que ser de 4 números.', 'pin');
      var ex = participantePorNombre(db, nombre);
      if (ex && ex.pin) return fallo('Ya hay alguien apuntado como "' + ex.nombre + '". Si eres tú, entra con tu PIN.', 'existe');
      if (ex) { ex.pin = hashPin(req.pin); yo = ex; }
      else {
        yo = { id: uid(), nombre: nombre, pin: hashPin(req.pin), creado: now.toISOString() };
        db.participantes.push(yo);
      }
      return bien(db, now, yo, false, { nuevo: true }, true);
    }

    if (a === 'entrar') {
      if (!yo) return fallo('Nombre o PIN incorrectos. ¿Seguro que no eres del Sevilla intentando colarte?', 'login');
      return bien(db, now, yo, false);
    }

    if (a === 'pronosticar') {
      if (!yo) return fallo('Tienes que entrar con tu nombre y PIN.', 'login');
      var j = buscar(db.jornadas, req.jornadaId);
      if (!j) return fallo('Esa jornada no existe.', 'jornada');
      if (!abierta(j, now)) return fallo('La porra de esta jornada ya está cerrada. Haber madrugado, fiera. ⏰', 'cerrada');
      var goles = validarGoles(req.goles);
      if (!goles) return fallo('Rellena los tres resultados (números del 0 al 99).', 'goles');
      for (var i = 0; i < db.pronosticos.length; i++) {
        var p = db.pronosticos[i];
        if (p.jornadaId === j.id && p.participanteId !== yo.id && mismosGoles(p.goles, goles)) {
          return fallo('Ese pronóstico exacto ya lo tiene otro compañero. Como máximo podéis coincidir en dos resultados. ¡Échale imaginación!', 'duplicado');
        }
      }
      var mio = null;
      db.pronosticos.forEach(function (p) { if (p.jornadaId === j.id && p.participanteId === yo.id) mio = p; });
      if (mio && mio.pagado) return fallo('Tu pronóstico ya está pagado y bloqueado. Solo se puede cambiar hasta las 12:30 horas del viernes si aún no has pagado.', 'pagado');
      var nuevo = !mio;
      if (mio) { mio.goles = goles; mio.fecha = now.toISOString(); }
      else {
        mio = { id: uid(), jornadaId: j.id, participanteId: yo.id, goles: goles, pagado: false, fecha: now.toISOString() };
        db.pronosticos.push(mio);
      }
      return bien(db, now, yo, false, { guardado: { nuevo: nuevo, pagado: !!mio.pagado, jornadaId: j.id } }, true);
    }

    return fallo('Acción desconocida: ' + a);
  }

  function admin(db, req, now, a) {
    var j, p;
    switch (a) {
      case 'adminEstado':
        return bien(db, now, null, true);

      case 'adminJornada': {
        var d = req.jornada || {};
        if (!d.partidos || d.partidos.length !== 3) return fallo('Una jornada necesita exactamente 3 partidos.');
        for (var i = 0; i < 3; i++) {
          if (!limpio(d.partidos[i].local) || !limpio(d.partidos[i].visitante)) return fallo('Falta algún equipo en el partido ' + (i + 1) + '.');
        }
        if (!d.cierre || isNaN(new Date(d.cierre).getTime())) return fallo('Pon la fecha y hora de cierre.');
        var partidos = d.partidos.map(function (x) {
          return { local: limpio(x.local), visitante: limpio(x.visitante), etiqueta: limpio(x.etiqueta), cuando: limpio(x.cuando) };
        });
        j = d.id ? buscar(db.jornadas, d.id) : null;
        if (!j) { j = { id: uid(), resultados: [null, null, null], cerrada: false }; db.jornadas.push(j); }
        j.numero = +d.numero || db.jornadas.length;
        j.titulo = limpio(d.titulo);
        j.cierre = new Date(d.cierre).toISOString();
        j.partidos = partidos;
        return bien(db, now, null, true, { jornadaId: j.id }, true);
      }

      case 'adminBorrarJornada':
        db.jornadas = db.jornadas.filter(function (x) { return x.id !== req.jornadaId; });
        db.pronosticos = db.pronosticos.filter(function (x) { return x.jornadaId !== req.jornadaId; });
        return bien(db, now, null, true, null, true);

      case 'adminResultados':
        j = buscar(db.jornadas, req.jornadaId);
        if (!j) return fallo('Esa jornada no existe.');
        j.resultados = [0, 1, 2].map(function (i) {
          var r = (req.resultados || [])[i];
          return resValido(r) ? [+r[0], +r[1]] : null;
        });
        return bien(db, now, null, true, null, true);

      case 'adminCerrar':
        j = buscar(db.jornadas, req.jornadaId);
        if (!j) return fallo('Esa jornada no existe.');
        j.cerrada = !!req.cerrada;
        return bien(db, now, null, true, null, true);

      case 'adminPagado':
        p = buscar(db.pronosticos, req.pronosticoId);
        if (!p) return fallo('Ese pronóstico no existe.');
        p.pagado = !!req.pagado;
        return bien(db, now, null, true, null, true);

      case 'adminBorrarPronostico':
        db.pronosticos = db.pronosticos.filter(function (x) { return x.id !== req.pronosticoId; });
        return bien(db, now, null, true, null, true);

      case 'adminPronosticoManual': {
        j = buscar(db.jornadas, req.jornadaId);
        if (!j) return fallo('Esa jornada no existe.');
        var nombre = limpio(req.nombre);
        if (nombre.length < 2) return fallo('Pon el nombre del participante.');
        var goles = validarGoles(req.goles);
        if (!goles) return fallo('Rellena los tres resultados.');
        var part = participantePorNombre(db, nombre);
        if (!part) { part = { id: uid(), nombre: nombre, pin: '', creado: now.toISOString() }; db.participantes.push(part); }
        for (var k = 0; k < db.pronosticos.length; k++) {
          var o = db.pronosticos[k];
          if (o.jornadaId === j.id && o.participanteId !== part.id && mismosGoles(o.goles, goles)) {
            return fallo('Ese pronóstico exacto ya lo tiene otra persona (regla 3).', 'duplicado');
          }
        }
        var ya = null;
        db.pronosticos.forEach(function (x) { if (x.jornadaId === j.id && x.participanteId === part.id) ya = x; });
        if (ya) { ya.goles = goles; ya.fecha = now.toISOString(); if (req.pagado) ya.pagado = true; }
        else db.pronosticos.push({ id: uid(), jornadaId: j.id, participanteId: part.id, goles: goles, pagado: !!req.pagado, fecha: now.toISOString() });
        return bien(db, now, null, true, null, true);
      }

      case 'adminPin':
        p = buscar(db.participantes, req.participanteId);
        if (!p) return fallo('Ese participante no existe.');
        if (!/^\d{4}$/.test(String(req.pin || ''))) return fallo('El PIN tiene que ser de 4 números.');
        p.pin = hashPin(req.pin);
        return bien(db, now, null, true, null, true);

      case 'adminRenombrar':
        p = buscar(db.participantes, req.participanteId);
        if (!p) return fallo('Ese participante no existe.');
        var nn = limpio(req.nombre);
        if (nn.length < 2) return fallo('Nombre demasiado corto.');
        var otro = participantePorNombre(db, nn);
        if (otro && otro.id !== p.id) return fallo('Ya existe alguien con ese nombre.');
        p.nombre = nn;
        return bien(db, now, null, true, null, true);

      case 'adminBorrarParticipante':
        db.participantes = db.participantes.filter(function (x) { return x.id !== req.participanteId; });
        db.pronosticos = db.pronosticos.filter(function (x) { return x.participanteId !== req.participanteId; });
        return bien(db, now, null, true, null, true);

      case 'adminConfig': {
        var c = req.config || {};
        if (c.claveParticipantes !== undefined) {
          if (limpio(c.claveParticipantes).length < 3) return fallo('La contraseña de la porra debe tener al menos 3 caracteres.');
          db.config.claveParticipantes = limpio(c.claveParticipantes);
        }
        if (c.claveAdmin !== undefined) {
          if (limpio(c.claveAdmin).length < 4) return fallo('La contraseña de Antonio debe tener al menos 4 caracteres.');
          db.config.claveAdmin = limpio(c.claveAdmin);
        }
        if (c.aportacion !== undefined && !isNaN(+c.aportacion)) db.config.aportacion = +c.aportacion;
        if (c.boteInicial !== undefined && !isNaN(+c.boteInicial)) db.config.boteInicial = +c.boteInicial;
        return bien(db, now, null, true, null, true);
      }

      case 'adminEscudo': {
        var key = clave(req.equipo);
        if (!key) return fallo('Indica el equipo.');
        var img = String(req.img || '');
        if (img && img.length > 45000) return fallo('La imagen es demasiado grande.');
        if (img) db.escudos[key] = img; else delete db.escudos[key];
        return bien(db, now, null, true, null, true);
      }
    }
    return fallo('Acción de administración desconocida: ' + a);
  }

  return {
    EQUIPOS: EQUIPOS, equipo: equipo, clave: clave, nuevaBD: nuevaBD, asegurar: asegurar,
    handle: handle, calcular: calcular, repartoFinal: repartoFinal, hashPin: hashPin
  };
})();
