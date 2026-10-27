# Fondos e imágenes que faltan (Capítulo 1) y cómo pedírselos a Gemini

Listos: `oficina_dia`, `bar_noche`, `departamento_noche`, `pasillo_castillo`, `refugio_capsula`, `puente_rojo`, `claro_cuatro_estaciones`, `nucleo_grieta`, `pozo_central`, `hangar`, `puente_torres`.

En espera:
- `dulce_frio_fachada`: la imagen que hay dice «SWEET CHILL» y queda como la versión en inglés. Falta la versión en español: pídela igual, pero con el letrero «DULCE FRÍO» (o sin texto) y guárdala como `docs/fondos/dulcefrio.png`; la de inglés renómbrala `dulcefrio_en.png`.
- `hangar_destruido`: se usará más adelante (ninguna escena del Capítulo 1 lo usa todavía).

## Cómo entregarlos

1. Guarda cada imagen en `docs/fondos/` **con el nombre exacto de la tabla** (por ejemplo `pasillo_castillo.png`). Si el archivo ya se llama así, no hace falta tocar `tools/fondos.config.json`.
2. Corre `npm run fondos`: la convierte, la achica a 1920 px y la pone en todas las escenas que usan ese fondo.
3. Tamaño: 16:9, ideal 2752×1536 (como los que ya hiciste). Mínimo 1920×1080.

## Bloque de estilo (pégalo al final de cada prompt)

> Fondo para novela visual estilo anime, ilustración digital con línea limpia y sombreado suave, iluminación cinematográfica, mucho detalle ambiental, formato horizontal 16:9. Sin personajes ni personas, sin texto legible, sin logotipos, sin firma, sin marca de agua. Encuadre a la altura de los ojos, con espacio libre en el centro y abajo para que se paren los personajes.

Consejos:
- Pídele siempre **«sin firma ni marca de agua»** y revisa las esquinas antes de entregarla.
- No pidas «al estilo de» un artista o un anime concreto.
- Para que todos los fondos combinen, adjunta `docs/fondos/bar.png` como referencia de estilo y dile: «mismo estilo de dibujo y acabado que esta imagen, pero de este lugar: …».
- Las imágenes con personajes (CG) llevan como referencia los sprites base (`public/sprites/jair/base.webp`, `cami/base.webp`) y le dices «mismos personajes, misma ropa».

## Prioridad 1: los que más se ven

| Archivo | Escenas | Prompt (más el bloque de estilo) |
| --- | --- | --- |
| `castillo_flotante_ruinas` | 42 | Ruinas de un castillo de piedra blanca suspendidas en el espacio, girando despacio, como una explosión en pausa. Plataforma de piedra blanca lisa en primer plano, bloques, columnas partidas y escaleras flotando alrededor. Cielo magenta con estrellas arriba, abajo y a los lados. |

## Prioridad 2

| Archivo | Escenas | Prompt (más el bloque de estilo) |
| --- | --- | --- |
| `bosque_invierno` | 29 | Bosque de abedules cubierto de nieve, inspirado en el invierno ruso. Un arroyo congelado cruza de lado a lado. Silencio, luz azulada y fría, copos cayendo. |
| `pasillo_giratorio` | 18 | Pasillo futurista cilíndrico que gira sobre sí mismo: ventanas en el piso, las paredes y el techo dan a un espacio estrellado magenta. Al fondo, una compuerta circular de metal medio cerrada. Perspectiva vertiginosa. |
| `bosque_ancestral` | 15 | Pasto húmedo en el borde de un bosque antiguo, visto casi desde el suelo. Árboles enormes, cielo dorado de atardecer quieto, color de miel. Olor a lluvia, paz. |
| `dulce_frio_fachada` | 14 | Fachada de una heladería de barrio llamada «Dulce Frío», de noche, en una ciudad calurosa. Persiana metálica a medio bajar, un letrero con un cono de helado (sin texto legible o con el nombre simple), vereda, poste de luz amarilla. *Prueba pedirle el nombre; si sale mal escrito, pídela sin texto.* |
| `desierto_cristal` | 13 | Isla de cristal transparente flotando en la nada, en medio de una caída entre dimensiones. Debajo del cristal se ven franjas de colores (magenta, dorado, verde, azul) y fragmentos de otros mundos a medio hacer. Grietas con luz blanca. |
| `calle_noche` | 10 | Calle de una ciudad calurosa, de noche, con asfalto húmedo, puestos de comida cerrados, cables de luz cruzando, luces de neón moradas de un bar en la esquina y un taxi amarillo a lo lejos. Ambiente áspero y sofocante. |
| `calabozo` | 4 | Celda futurista blanca, pequeña y sin ventanas, con un catre, una luz que nunca se apaga y barrotes de energía; al otro lado se ve otra celda igual. Frío, clínico, burocrático. |

## Imágenes con personajes (CG)

Adjunta los sprites base como referencia y pide «misma ropa, mismo estilo».

| Archivo | Escenas | Prompt |
| --- | --- | --- |
| `cg_jair_carga_cami` | 4 | Escena de novela visual: un chico de lentes y pelo rizado negro, camisa negra estampada de manga corta y pantalón beige, carga en brazos (como a una novia) a una chica rubia de pelo largo con traje azul ajustado de piloto espacial. Ella mira para otro lado, sonrojada y molesta. Fondo: ruinas de piedra blanca flotando bajo un cielo magenta. Plano medio. |
| `cg_jair_carga_cami_espalda` | 1 | El mismo chico carga a la misma chica rubia en la espalda, como una mochila. Ella tiene el tobillo vendado y cara de fastidio. Pasillo de una fortaleza futurista. |
| `cg_caida_multiverso` | 17 | Dos figuras pequeñas (un chico y una chica rubia abrazados) cayendo en un vacío hecho de franjas de colores: magenta, dorado, verde y azul. Alrededor flotan fragmentos de otros mundos: un desierto de cristal, un bosque congelado, una ciudad de techos curvos con lluvia de pétalos y un cuarto pequeño con un ventilador. |
| `departamento_poster` | 2 | Primer plano de un póster de anime colgado sobre una cama desordenada: un chico de cara genérica, con el pelo tapándole los ojos, rodeado de varias chicas muy distintas entre sí que lo miran enamoradas. Diseño original, sin título ni texto. Luz nocturna del cuarto. |

## Hechos en código (listos)

No hace falta generarlos: se dibujan en `src/components/CodeScreen.tsx` y su texto vive en `src/data/pantallas.json`. En el guion se usan como `PANTALLA:<nombre>`.

- `gravity_ide` (39 escenas): el IDE GRAVITY. La consola de GENESIS va mostrando las líneas de GRAVITY y los prompts de Jair a medida que aparecen.
- `pc_correo` (21): la bandeja de entrada con el correo de GRAVITY y los botones «Descargar» y «Eliminar».
- `celular_mensaje` (8): el chat con Nikki; los mensajes aparecen uno por uno.
- `negro` (8): pantalla negra.
- `nebulosa_magenta` (6): cielo magenta con estrellas en todas direcciones.
