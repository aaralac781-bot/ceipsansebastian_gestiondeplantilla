/* Alas de Igualdad · datos de ejemplo e ilustraciones de prueba.
   Los dibujos de ejemplo son garzas generadas por código (SVG) para poder probar
   la app antes de escanear los dibujos reales. Los nombres de autoría son inventados. */
(function () {
  'use strict';
  let seed = 20261015;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const INK = '#26352C';
  // Escrito sin dos barras seguidas: el servidor de Apps Script borra lo que va detrás de «//».
  const SVGNS = 'http:' + '\/\/www.w3.org/2000/svg';

  const NOMBRES = ['Lucía', 'Martina', 'Sofía', 'Valeria', 'Carmen', 'Rocío', 'Alba', 'Noa', 'Triana', 'Macarena', 'Irene', 'Lola', 'Paula', 'Daniela', 'Aitana', 'Candela',
    'Hugo', 'Manuel', 'Pablo', 'Mateo', 'Álvaro', 'Antonio', 'Leo', 'Daniel', 'Marco', 'José', 'Rafael', 'Bruno', 'Adrián', 'Curro', 'Iván', 'Thiago'];
  const APELLIDOS = ['García', 'Rodríguez', 'Romero', 'Pérez', 'Muñoz', 'Sánchez', 'Jiménez', 'Moreno', 'Ruiz', 'Díaz', 'Márquez', 'Vega', 'Castro', 'Ortiz', 'Navarro', 'Reyes'];
  const persona = curso => ({ name: `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`, course: curso });

  const NOMBRES_MASCOTA = ['Garzi', 'Alita', 'Plumi', 'Iguali', 'Garcilla', 'Doñanita', 'Lucera', 'Nubi', 'Brisa', 'Marisma', 'Pluma', 'Celeste', 'Juncia',
    'Vuela', 'Arena', 'Garzón', 'Tita', 'Arcoíris', 'Sebi', 'Libélula', 'Riberita', 'Estrella', 'Pío', 'Albita', 'Lunera', 'Plumita', 'Dehesa', 'Sol', 'Garzalia', 'Volandera'];
  const LEMAS = ['Juntas y juntos volamos más alto', 'En mi cole, las alas son de todas y todos', 'Cuidamos el nido entre todas y todos', 'Igualdad en cada pluma',
    'Compartir es volar', 'Del río al cole: alas para la igualdad', 'Si nos turnamos, crecemos todas y todos', 'Respeto en la tierra, igualdad en el cielo',
    'Mismas alas, mismos sueños', 'Una garza, mil colores', 'Cuidar es cosa de todas y todos', 'Brillamos juntas y juntos como estrellas'];
  const HISTORIAS = [
    ['La garza que repartía las tareas', 'En la Dehesa de Abajo vivían dos garzas, Brisa y Junco. Cuando llegó la primavera decidieron construir un nido.\n\n—Tú traes ramitas y yo las coloco —dijo Brisa.\n—Y mañana cambiamos —respondió Junco.\n\nAsí, día tras día, las dos aprendieron a hacer de todo. Cuando nacieron sus crías, las dos sabían darles de comer, protegerlas de la lluvia y enseñarles a volar. Y las crías aprendieron que cuidar es cosa de todas y todos.'],
    ['El nido de todas', 'Una tormenta rompió el nido de una garza joven. Las garzas vecinas, grandes y pequeñas, volaron a ayudarla. Unas trajeron juncos, otras barro, otras plumas suaves.\n\nAl final el nido quedó más bonito que nunca, porque estaba hecho con un poquito de cada una. Desde entonces, en la marisma dicen: «Ningún nido se construye con un solo pico».'],
    ['Plumi y el río', 'Plumi era una garza que no sabía pescar. Sus compañeras y compañeros no se rieron: le enseñaron, cada cual a su manera. Una le mostró a esperar quieta, otro a mirar el reflejo del agua.\n\nCuando Plumi pescó su primer pez, lo compartió con toda la bandada. Aprendió que nadie lo sabe todo y que juntas y juntos sabemos mucho.'],
    ['El turno de la luna', 'Las garzas de Doñana se turnan para vigilar los huevos. Una noche, a Lunera le tocaba descansar, pero vio a su compañero muy cansado.\n\n—Hoy me quedo yo un ratito más —le dijo.\n\nAl día siguiente él hizo lo mismo por ella. Así descubrieron que la corresponsabilidad es cuidarse también el uno al otro.']
  ];

  const BODY = ['#FFFFFF', '#EEF2F5', '#E4ECF2', '#F1EAF4', '#F6F0E2'];
  const WING = ['#B9C7D3', '#C9B6D6', '#A9C9B7', '#E3C48E', '#9FBFD6'];
  const BG = ['#FBE9C6', '#DCEBDF', '#D7E6EF', '#EADDF0', '#F6DCCB', '#FDF2D0'];
  const ACC = ['#7A4E8E', '#2F6C8F', '#3F7A5B', '#D89A3C', '#C2506E'];
  const ACCESORIOS = ['lazo', 'flores', 'bufanda', 'gafas', 'corazon', 'mochila', 'corona', 'ninguno'];

  function accesorio(tipo, c) {
    switch (tipo) {
      case 'lazo': return `<path d="M141 112l-17-11v22zM141 112l17-11v22z" fill="${c}" stroke="${INK}" stroke-width="2"/><circle cx="141" cy="112" r="5" fill="${c}" stroke="${INK}" stroke-width="2"/>`;
      case 'flores': return [[110, 58], [123, 53], [136, 57]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}" stroke="${INK}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="2.2" fill="#F2C46B"/>`).join('');
      case 'bufanda': return `<rect x="122" y="116" width="40" height="13" rx="6" fill="${c}" stroke="${INK}" stroke-width="2"/><rect x="148" y="124" width="11" height="28" rx="4" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M130 117v11M140 117v11" stroke="#fff" stroke-width="3"/>`;
      case 'gafas': return `<circle cx="117" cy="72" r="9" fill="rgba(255,255,255,.3)" stroke="${c}" stroke-width="3"/><path d="M126 70l16-3" stroke="${c}" stroke-width="3"/>`;
      case 'corazon': return `<path d="M88 222c-28-18-20-42 0-30 20-12 28 12 0 30z" fill="#D9534F" stroke="${INK}" stroke-width="2"/>`;
      case 'mochila': return `<rect x="196" y="148" width="30" height="28" rx="7" fill="${c}" stroke="${INK}" stroke-width="2.5"/><path d="M200 160h22" stroke="${INK}" stroke-width="2"/>`;
      case 'corona': return `<path d="M108 58l4-15 8 10 7-13 7 13 7-9v14z" fill="#F2C46B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      default: return '';
    }
  }

  function svgURL(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

  function garza(opts = {}) {
    const body = opts.body || pick(BODY), wing = opts.wing || pick(WING), bg = opts.bg || pick(BG);
    const acc = opts.acc || pick(ACCESORIOS), c = opts.color || pick(ACC);
    const etiqueta = opts.label === undefined ? 'Dibujo de prueba' : opts.label;
    const svg = `<svg xmlns="${SVGNS}" viewBox="0 0 320 320">
<rect width="320" height="320" fill="${bg}"/>
<circle cx="262" cy="60" r="28" fill="#F2C46B" opacity=".9"/>
<path d="M0 255q80-18 160 0t160 0v65H0z" fill="#9CC3D5"/>
<g stroke="#3F7A5B" stroke-width="4" stroke-linecap="round"><path d="M28 262V168M44 262V184M286 262V172M300 262V190"/></g>
<g fill="#8B5E3C"><ellipse cx="28" cy="170" rx="5" ry="14"/><ellipse cx="286" cy="174" rx="5" ry="14"/></g>
<g stroke="#C9962E" stroke-width="6" stroke-linecap="round" fill="none"><path d="M168 205l-8 78M186 205l7 78M160 283h-14M193 283h14"/></g>
<path d="M218 178l46 22-18-30z" fill="${wing}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="186" cy="180" rx="56" ry="34" transform="rotate(-12 186 180)" fill="${body}" stroke="${INK}" stroke-width="3"/>
<path d="M160 172q42-24 82 6-36 18-82-6z" fill="${wing}" stroke="${INK}" stroke-width="2.5"/>
<path d="M150 170c-32-20 0-52-22-82" stroke="${INK}" stroke-width="22" fill="none" stroke-linecap="round"/>
<path d="M150 170c-32-20 0-52-22-82" stroke="${body}" stroke-width="16" fill="none" stroke-linecap="round"/>
<circle cx="124" cy="76" r="19" fill="${body}" stroke="${INK}" stroke-width="3"/>
<path d="M108 71L56 80l52 8z" fill="#E2A93B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
<circle cx="118" cy="72" r="4" fill="${INK}"/><circle cx="119.6" cy="70.6" r="1.4" fill="#fff"/>
<circle cx="128" cy="85" r="4.5" fill="#F4A7A0" opacity=".75"/>
<path d="M138 66q26-14 44-8M138 71q24-7 38-1" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
${accesorio(acc, c)}
${etiqueta ? `<text x="160" y="309" text-anchor="middle" font-family="Caveat,'Comic Sans MS',cursive" font-size="20" fill="${INK}">${etiqueta}</text>` : ''}
</svg>`;
    return svgURL(svg);
  }

  function comic(i) {
    const c = ACC[i % ACC.length];
    const panel = (x, dibujo, txt) => `<g transform="translate(${x} 0)"><rect x="6" y="6" width="98" height="120" rx="6" fill="#fff" stroke="${INK}" stroke-width="2.5"/>${dibujo}<rect x="6" y="128" width="98" height="26" rx="6" fill="#FBF6EA" stroke="${INK}" stroke-width="2"/><text x="55" y="145" text-anchor="middle" font-family="Nunito,Arial" font-size="9.5" fill="${INK}">${txt}</text></g>`;
    const mini = (x, y, col) => `<path d="M${x} ${y + 30}c-8-6 0-16-6-24" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${x} ${y + 30}c-8-6 0-16-6-24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="${x - 6}" cy="${y + 4}" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M${x - 11} ${y + 3}l-12 2 12 2z" fill="#E2A93B"/><ellipse cx="${x + 8}" cy="${y + 34}" rx="13" ry="8" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M${x + 2} ${y + 33}q7-6 15 1" stroke="${col}" stroke-width="2.5" fill="none"/>`;
    const svg = `<svg xmlns="${SVGNS}" viewBox="0 0 330 160"><rect width="330" height="160" fill="#FBF6EA"/>
${panel(0, `<ellipse cx="55" cy="105" rx="34" ry="10" fill="#8B5E3C"/>${mini(34, 50, c)}${mini(76, 50, '#2F6C8F')}`, 'Hacemos el nido juntas')}
${panel(110, `<ellipse cx="55" cy="104" rx="30" ry="9" fill="#8B5E3C"/><ellipse cx="55" cy="90" rx="13" ry="16" fill="#F6F0E2" stroke="${INK}" stroke-width="2"/><path d="M55 40c-8-10-22 0 0 16 22-16 8-26 0-16z" fill="#D9534F"/>`, 'Nos turnamos para cuidar')}
${panel(220, `<circle cx="80" cy="30" r="12" fill="#F2C46B"/>${mini(40, 52, c)}<path d="M70 92q10-12 20 0" stroke="${INK}" stroke-width="2" fill="none"/>`, '¡Y aprendemos a volar!')}
</svg>`;
    return svgURL(svg);
  }

  /** Rellena el estado vacío con propuestas de prueba según las cuotas de cada clase. */
  function build(state, uid) {
    seed = 20261015;
    let n = 0, l = 0, h = 0;
    const cnt = {};
    const code = (letter, short) => { const k = letter + short; cnt[k] = (cnt[k] || 0) + 1; return `${letter}-${short}-${String(cnt[k]).padStart(2, '0')}`; };
    const now = new Date().toISOString();
    state.classes.forEach(k => {
      const c = state.cycles.find(x => x.id === k.cycleId);
      const add = (type, extra) => state.proposals.push(Object.assign({
        id: uid(), type, classId: k.id, code: code({ dibujo: 'D', nombre: 'N', lema: 'L', historia: 'H' }[type], c.short),
        text: '', title: '', images: [], alt: '', authors: [persona(k.name)], wholeClass: false, created: now
      }, extra));
      for (let i = 0; i < (k.quota.dibujo || 0); i++) {
        const authors = [persona(k.name)]; if (rnd() < .35) authors.push(persona(k.name));
        add('dibujo', { images: [garza()], authors, alt: 'Garza dibujada por el alumnado (dibujo de prueba)' });
      }
      for (let i = 0; i < (k.quota.nombre || 0); i++) add('nombre', { text: NOMBRES_MASCOTA[n++ % NOMBRES_MASCOTA.length] });
      for (let i = 0; i < (k.quota.texto || 0); i++) {
        if (!c.textoType) continue;
        if (c.textoType === 'historia' || (c.textoType === 'ambos' && i % 2 === 1)) {
          const st = HISTORIAS[h % HISTORIAS.length];
          if (h % 2 === 0) add('historia', { title: st[0], text: st[1], authors: [persona(k.name), persona(k.name)] });
          else add('historia', { title: 'Cómic: ' + st[0], images: [comic(h)], alt: 'Cómic de tres viñetas sobre garzas que cuidan el nido juntas', authors: [persona(k.name), persona(k.name), persona(k.name)] });
          h++;
        } else {
          const whole = k.quota.texto === 1 && k.cycleId === '1C';
          add('lema', { text: LEMAS[l++ % LEMAS.length], wholeClass: whole, authors: whole ? [] : [persona(k.name)] });
        }
      }
    });
    state.meta.sample = true;
    return state;
  }

  window.ADI_SAMPLE = { build, garza };
})();
