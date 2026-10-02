# Alas de Igualdad · App de votación de la mascota

Aplicación web para gestionar de forma transparente la **votación de ciclo** (5 al 9 de octubre), la **votación de centro** (13 y 14 de octubre) y la **gran final** (15 de octubre) del concurso «Alas de Igualdad: Diseñando la Mascota de Nuestro Cole» del CEIP San Sebastián (La Puebla del Río).

Es una **app externa a SSNet**: tiene su propio proyecto de Google Apps Script, su propio enlace y sus propios datos. SSNet solo la muestra (incrustada o enlazada) desde el canal oficial del curso. No hace falta tocar el código de SSNet.

## Cómo funciona en línea

- Cada **tutor o tutora** abre la app desde el canal del curso en SSNet, **en la pizarra digital de su clase**, con su cuenta `@g.educaand.es`.
- Todos los votos van a un mismo sitio, **en el Drive de la dirección**, y todas las pizarras ven lo mismo. Las pantallas de Seguimiento y Resultados se actualizan solas cada 12 segundos.
- El **servidor comprueba cada voto**: que la clase no haya votado ya, que la votación esté abierta, que la propuesta sea de su ciclo y que el código sea correcto. Si dos pizarras votan a la vez por la misma clase, solo cuenta un voto.
- El **panel de dirección** no tiene contraseña: entran las cuentas de la dirección (la de quien publica la app y las que se añadan en Ajustes).
- El profesorado **no ve los códigos de voto** de las clases. Si en Panel → Clases se escribe la cuenta del tutor o la tutora, esa persona vota sin código.
- Todo queda en la **Hoja «Registro de la votación»** con fecha, hora y la cuenta que hizo cada cosa: votos, anulaciones, desempates, aperturas y cierres.

En el Drive de quien publica la app se crea esta carpeta:

```
Alas de Igualdad · Votación de la mascota/
├─ estado.json                       ← clases, propuestas, votos, desempates e historial
├─ Imágenes/                         ← fotos de dibujos y cómics
└─ Alas de Igualdad · Registro de la votación   (Hoja de cálculo)
```

## Publicarla (una sola vez, unos 10 minutos)

Hazlo con la cuenta de la dirección (`@g.educaand.es`).

1. Entra en <https://script.google.com> → **Nuevo proyecto**. Ponle de nombre «Alas de Igualdad · Votación».
2. Copia los archivos de la carpeta `mascota/apps-script/`:
   - **`Mascota.gs`**: pega su contenido en el archivo `Código.gs` que viene creado (puedes renombrarlo a `Mascota`).
   - **`MascotaComun.gs`**: pulsa **＋ → Secuencia de comandos**, ponle de nombre `MascotaComun` y pega el contenido.
   - **`MascotaIndex.html`**: pulsa **＋ → HTML**, ponle de nombre `MascotaIndex` (exactamente así) y pega el contenido.
   - **`appsscript.json`**: en ⚙️ Configuración del proyecto, marca «Mostrar el archivo de manifiesto appsscript.json en el editor». Después pega su contenido en ese archivo.
3. Si otra persona de la dirección debe tener acceso fijo, añade su cuenta en `MASC_ADMINS_FIJOS`, al principio de `Mascota.gs`. También se puede añadir más tarde desde Panel → Ajustes.
4. **Implementar → Nueva implementación → Tipo: Aplicación web**:
   - Ejecutar como: **Yo** (la cuenta de la dirección).
   - Quién tiene acceso: **Cualquier usuario de g.educaand.es**.
5. Autoriza los permisos (Drive y Hojas de cálculo) y **copia la URL de la aplicación web** (termina en `/exec`).
6. Abre esa URL. La primera vez la app se pone en marcha sola: crea la carpeta en Drive y las 15 clases con sus códigos.

> **Si cambias el código más adelante** (por ejemplo, una versión nueva de este repositorio), vuelve a generar los archivos con `python3 mascota/construir_apps_script.py`. Pégalos de nuevo y usa **Implementar → Gestionar implementaciones → ✎ Editar → Versión: nueva**. Así la URL no cambia.

## Insertarla en SSNet (canal oficial del curso 26/27)

La forma más sencilla y fiable es **publicar el enlace** (la URL `/exec`) en el canal del curso. Se abre en una pestaña nueva, a pantalla completa en la pizarra.

Si preferís que se abra **dentro de SSNet**, añade este botón en el HTML de SSNet. La app ya permite mostrarse incrustada:

```html
<button onclick="abrirMascota()">🪶 Votación de la mascota</button>
<script>
  var MASCOTA_URL = 'https://script.google.com/a/macros/g.educaand.es/s/XXXXXXXX/exec'; // ← tu URL
  function abrirMascota() {
    var capa = document.createElement('div');
    capa.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#FBF6EA';
    capa.innerHTML = '<button onclick="this.parentNode.remove()" style="position:absolute;top:8px;right:8px;z-index:2;padding:8px 14px">✕ Cerrar</button>'
      + '<a href="' + MASCOTA_URL + '" target="_blank" style="position:absolute;top:12px;right:110px;z-index:2">Abrir en pestaña nueva</a>'
      + '<iframe src="' + MASCOTA_URL + '" style="width:100%;height:100%;border:0" allow="fullscreen"></iframe>';
    document.body.appendChild(capa);
  }
</script>
```

Algunos navegadores bloquean las cookies de Google dentro de un iframe y piden iniciar sesión de nuevo. Para ese caso está el enlace «Abrir en pestaña nueva».

## Cargar las propuestas (zona de dirección)

Panel de dirección → **📸 Carga rápida**:

1. Elige la clase. Aparece una casilla por cada propuesta que entrega: dibujos, nombres y lemas o historias.
2. Pulsa **«Elegir varias fotos de dibujos a la vez»** y selecciona todas las fotos de esa clase. Se colocan en orden. Desde el móvil también puedes hacer la foto directamente.
3. Si una foto ha salido de lado, pulsa **↻ Girar**.
4. Escribe los nombres y los lemas, y la autoría separada por comas: `Lucía Martín, Hugo Pérez`. Si alguien es de otro curso, escribe `Noa Ruiz (4 años A)`. Si es de toda la clase, marca «Toda la clase».
5. Pulsa **«Guardar y pasar a la siguiente clase →»**.

Las fotos se reducen en el propio dispositivo antes de subirse, así que suben rápido aunque sean de móvil. Los códigos (`D-INF-01`, `N-2C-03`…) se ponen solos. Cada botón de clase muestra cuántas propuestas lleva (por ejemplo, `4/4`).

## Modo local (sin internet, para ensayar)

Abrir `mascota/index.html` directamente en el navegador arranca la app **en modo local**:
- los datos se guardan solo en ese navegador;
- vienen datos de prueba;
- el panel se abre con la contraseña `garza2026`.

Sirve para enseñarla o ensayar sin publicar nada. Los votos reales se hacen en la versión publicada.

## Decisiones pendientes: valores por defecto

| Decisión | Valor por defecto | Dónde se cambia |
|---|---|---|
| Nombres de los grupos del tercer ciclo | 5.º A, 5.º B, 6.º A, 6.º B | Panel → Clases |
| Lema en Infantil | La finalista va **sin lema** | Panel → Clases → Ciclos («Lema / frase» para una frase dictada) |
| ¿Una clase puede votar sus propias propuestas? | Sí | Panel → Ajustes |
| ¿Quién desempata en la fase de centro? | El claustro del centro | Panel → Ajustes |
| ¿Recuento oculto o en directo? | Oculto hasta «Cerrar votación» | Panel → Ajustes |
| ¿Cómo se comparten los votos? | **En línea**: cada clase desde su pizarra | — |

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `estilos.css`, `app.js`, `muestras.js` | La app (pantallas, recuento, panel) |
| `comun.js` | Reglas de voto que comprueban a la vez el navegador y el servidor |
| `apps-script/Mascota.gs` | Servidor: guarda en Drive, valida votos y escribe el registro |
| `apps-script/MascotaComun.gs`, `apps-script/MascotaIndex.html` | **Generados** con `construir_apps_script.py`: no se editan a mano |
| `apps-script/appsscript.json` | Permisos y configuración de la aplicación web |

## Protección de datos

- De cada autor o autora solo se guardan el **nombre y el curso**.
- Mostrad nombres y dibujos solo con la **autorización de las familias**, según el protocolo del centro. En Ajustes se puede mostrar solo el nombre y la inicial del apellido.
- Solo entran cuentas `@g.educaand.es`. Los datos y las fotos están en el Drive de la dirección; no se publican en internet.
- Al terminar el concurso, Panel → Datos → **«Borrar todos los datos»**: borra propuestas, votos e historial y manda las fotos a la papelera de Drive.
