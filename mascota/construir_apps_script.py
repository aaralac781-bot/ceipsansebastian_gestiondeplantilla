#!/usr/bin/env python3
"""Genera los archivos para pegar en el proyecto de Google Apps Script.

  apps-script/MascotaIndex.html  ← index.html con estilos y scripts incluidos (un solo archivo)
  apps-script/MascotaComun.gs    ← copia de comun.js (reglas de voto que comprueba el servidor)

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
for js in ('comun.js', 'muestras.js', 'app.js'):
    codigo = leer(js)
    assert '</script' not in codigo, js
    html = html.replace(f'<script src="{js}"></script>', '<script>\n' + codigo + '\n</script>')
assert not re.search(r'(src|href)="(estilos\.css|[a-z]+\.js)"', html), 'Quedan recursos sin incluir'

os.makedirs(SALIDA, exist_ok=True)
with open(os.path.join(SALIDA, 'MascotaIndex.html'), 'w', encoding='utf-8') as f:
    f.write(html)
with open(os.path.join(SALIDA, 'MascotaComun.gs'), 'w', encoding='utf-8') as f:
    f.write('// GENERADO a partir de mascota/comun.js — no editar aquí.\n' + leer('comun.js'))
print('Listo:', ', '.join(sorted(os.listdir(SALIDA))))
