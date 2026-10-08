"""Genera apps_script/Codigo.gs e apps_script/Index.html a partir de
porra_core.js, porra_apps_script.gs, porra.html y antonio_porra.png.
Uso: python3 apps_script/construir.py   (requiere Pillow)"""
import base64, io, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
leer = lambda n: open(os.path.join(R, n), encoding='utf-8').read()
core, gs, html = leer('porra_core.js'), leer('porra_apps_script.gs'), leer('porra.html')

im = Image.open(os.path.join(R, 'antonio_porra.png'))
im = im.resize((int(im.width * 400 / im.height), 400), Image.LANCZOS)
b = io.BytesIO(); im.save(b, 'WEBP', quality=80)
foto = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

aviso = ('/* ARCHIVO GENERADO: no editar a mano. Se crea con apps_script/construir.py */\n\n')
codigo = aviso + core + '\n\n' + gs
for a, c in [('<link rel="manifest" href="manifest-porra.json">\n', ''),
             ('<link rel="apple-touch-icon" href="antonio_porra.png">\n', ''),
             ('<img src="antonio_porra.png"', '<img src="' + foto + '"'),
             ("var FOTO_ANTONIO = 'antonio_porra.png';", "var FOTO_ANTONIO = document.querySelector('.antonio img').src;"),
             ('<script src="porra_core.js"></script>', '<script>\n' + core + '\n</script>')]:
    assert a in html, a
    html = html.replace(a, c, 1)
os.makedirs(os.path.join(R, 'apps_script'), exist_ok=True)
open(os.path.join(R, 'apps_script', 'Codigo.gs'), 'w', encoding='utf-8').write(codigo)
open(os.path.join(R, 'apps_script', 'Index.html'), 'w', encoding='utf-8').write(html)
print('OK', len(codigo), len(html))
