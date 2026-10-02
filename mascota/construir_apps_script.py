#!/usr/bin/env python3
"""Genera los archivos para pegar en el proyecto de Google Apps Script.

  apps-script/MascotaIndex.html  ← index.html con estilos y scripts incluidos (un solo archivo)
  apps-script/Codigo.gs          ← comun.js + Mascota.gs en un solo archivo (servidor)

Uso:  python3 mascota/construir_apps_script.py
"""
import os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, 'apps-script')

def leer(nombre):
    with open(os.path.join(AQUI, nombre), encoding='utf-8') as f:
        return f.read()

html = leer('index.html')
html = html.replace('<link rel="stylesheet" href="estilos.css">', '<style>\n' + leer('estilos.css') + '\n</style>')
# El servidor de Apps Script retoca el JavaScript escrito directamente en la página
# (por ejemplo, recorta lo que va detrás de «//»). Para que no pueda tocarlo, el código
# va empaquetado en base64url (solo letras, números, «-» y «_») y se desempaqueta en el navegador.
import base64
codigo = '\n;\n'.join(leer(js) for js in ('comun.js', 'muestras.js', 'app.js')) + '\n//# sourceURL=alas-de-igualdad.js\n'
empaquetado = base64.urlsafe_b64encode(codigo.encode('utf-8')).decode('ascii')
lineas = '\n'.join(empaquetado[k:k + 120] for k in range(0, len(empaquetado), 120))
cargador = ('<script type="text/plain" id="adi-codigo">\n' + lineas + '\n</script>\n<script>\n'
  '(function () {\n'
  '  var t = document.getElementById("adi-codigo").textContent.split("\\n").join("").split("-").join("+").split("_").join(String.fromCharCode(47));\n'
  '  var b = atob(t), u = new Uint8Array(b.length);\n'
  '  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);\n'
  '  var s = document.createElement("script");\n'
  '  s.textContent = new TextDecoder("utf-8").decode(u);\n'
  '  document.body.appendChild(s);\n'
  '})();\n</script>')
html = html.replace('<script src="comun.js"></script>\n<script src="muestras.js"></script>\n<script src="app.js"></script>', cargador)
assert not re.search(r'(src|href)="(estilos\.css|[a-z]+\.js)"', html), 'Quedan recursos sin incluir'

os.makedirs(SALIDA, exist_ok=True)
with open(os.path.join(SALIDA, 'MascotaIndex.html'), 'w', encoding='utf-8') as f:
    f.write(html)
# Un único archivo .gs para pegar: reglas comunes + servidor.
servidor = open(os.path.join(SALIDA, 'Mascota.gs'), encoding='utf-8').read()
with open(os.path.join(SALIDA, 'Codigo.gs'), 'w', encoding='utf-8') as f:
    f.write('// GENERADO por mascota/construir_apps_script.py a partir de comun.js y apps-script/Mascota.gs.\n'
            '// Pega este archivo entero en «Código.gs» del proyecto de Apps Script.\n\n'
            + leer('comun.js') + '\n\n' + servidor)
viejo = os.path.join(SALIDA, 'MascotaComun.gs')
if os.path.exists(viejo):
    os.remove(viejo)
print('Listo:', ', '.join(sorted(os.listdir(SALIDA))))
