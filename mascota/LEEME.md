# Alas de Igualdad · App de votación de la mascota

Aplicación web para gestionar de forma transparente la **votación de ciclo** (5 al 9 de octubre), la **votación de centro** (13 y 14 de octubre) y la **gran final** (15 de octubre) del concurso «Alas de Igualdad: Diseñando la Mascota de Nuestro Cole» del CEIP San Sebastián (La Puebla del Río).

## Instalación

No hace falta instalar nada ni tener un servidor. Son cuatro archivos estáticos:

| Archivo | Contenido |
|---|---|
| `index.html` | Página de la app |
| `estilos.css` | Estilo visual (cuaderno de campo) |
| `app.js` | Lógica: votos, recuento, desempates y pantallas |
| `muestras.js` | Datos de ejemplo y dibujos de garza de prueba |

Hay dos formas de abrirla:

1. **Desde GitHub Pages** (si el repositorio está publicado): `https://<usuario>.github.io/ceipsansebastian_gestiondeplantilla/mascota/`
2. **Sin internet**: copia la carpeta `mascota` a un pendrive o al escritorio y abre `index.html` con Chrome o Edge. Sin conexión las tipografías se cambian por otras del sistema; todo lo demás funciona igual.

## Cómo se guardan los datos

Se ha elegido la opción **(a)**: hay **un único dispositivo de votación** (por ejemplo, el portátil del vestíbulo o el de la pizarra digital) y las clases pasan por turnos.

- Los datos se guardan **en el navegador de ese ordenador** (IndexedDB). Si abres la app en otro ordenador o en otro navegador, no verás los mismos datos.
- **Haz una copia de seguridad cada día** en Panel docente → Datos → «Descargar copia de seguridad». Con «Restaurar una copia» se recupera todo o se pasa a otro ordenador.
- No borres los datos de navegación de ese navegador mientras dure el concurso.

## Primeros pasos

1. Abre **Panel docente**. La contraseña inicial es `garza2026`. **Cámbiala** en Ajustes.
2. La app trae **datos de prueba** (las 15 clases reales con propuestas inventadas). Ensaya el proceso completo: abre la votación, usa «Simular votos de prueba», cierra los ciclos, resuelve los empates y prueba la gran final.
3. Cuando terminéis, pulsa **Datos → «Empezar con datos reales»**. Así se borran las propuestas y los votos de prueba, y se conservan las clases, los códigos y los ajustes.
4. En **Clases**, revisa los nombres de los grupos (el tercer ciclo viene como 5.º A, 5.º B, 6.º A y 6.º B) e **imprime las tarjetas con el código de voto** de cada clase.
5. En **Propuestas**, da de alta los dibujos (foto o escaneo), los nombres y los lemas o historias, con su autoría.

La pantalla **Ayuda** de la app explica cómo dar de alta propuestas, cómo vota una clase y cómo se cierra una fase.

## Decisiones pendientes: valores por defecto

Los puntos marcados con [DECIDIR] en el encargo se pueden cambiar desde el panel, sin tocar el código:

| Decisión | Valor por defecto | Dónde se cambia |
|---|---|---|
| Nombres de los grupos del tercer ciclo | 5.º A, 5.º B, 6.º A, 6.º B | Panel → Clases |
| Lema en Infantil | (a) La finalista va **sin lema** | Panel → Clases → Ciclos: «Lema / frase» para añadir una frase dictada por la clase |
| ¿Una clase puede votar sus propias propuestas? | Sí | Panel → Ajustes |
| ¿Quién desempata en la fase de centro? | El claustro del centro | Panel → Ajustes (también dirección o comisión de coeducación) |
| ¿Recuento oculto o en directo? | Oculto hasta «Cerrar votación» | Panel → Ajustes |
| ¿Cómo se comparten los votos? | (a) Un único dispositivo | Lo explica el apartado anterior |

## Reglas que aplica la app

- Un voto por clase en cada categoría (dibujo, nombre y lema o historia). Las categorías se votan por separado.
- Cada clase solo ve las propuestas de su ciclo. Para votar, hay que escribir el código de la clase. Si hay una sesión docente iniciada, no se pide el código.
- Una clase no puede votar dos veces la misma categoría. Solo un docente puede anular un voto, y tiene que indicar el motivo. La anulación queda en el historial.
- Cuando hay empate, la app lo muestra y el equipo docente registra el desempate en Resultados, con la nota «Desempate decidido por el equipo docente del ciclo».
- Al cerrar un ciclo, la finalista se compone sola con el dibujo, el nombre y el lema más votados. El Aula de las Estrellas es finalista directa.
- La votación de centro se abre cuando las cinco finalistas están completas. Cuando empieza, ya no se pueden reabrir los ciclos.
- Todo queda registrado con fecha y hora: votos, anulaciones, desempates, aperturas y cierres (Panel → Votos e historial).
- El acta se puede imprimir o guardar como PDF, y los resultados se pueden descargar en CSV (se abre con Excel o con Hojas de cálculo).

## Protección de datos

- De cada autor o autora solo se guardan el **nombre y el curso**.
- Mostrad nombres y dibujos solo con la **autorización de las familias**, según el protocolo del centro.
- En Ajustes se puede mostrar solo el nombre y la inicial del apellido.
- Para entrar en el panel hace falta contraseña. Si la app se publica en GitHub Pages, la dirección es pública aunque los datos no: los datos están solo en el navegador del dispositivo de votación.
- Al terminar el concurso, usa Panel → Datos → **«Borrar todos los datos»**.
