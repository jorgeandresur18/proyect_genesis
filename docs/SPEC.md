# SPEC — Especificación técnica de PROYECTO GENESIS

## 1. Principios

- La narrativa vive en archivos de datos (JSON), separada de los componentes. El motor lee, interpreta y renderiza; no contiene texto de capítulos.
- Primero lógica y diálogos con cajas grises (greyboxing). Sprites, imágenes y música al final.
- Proyecto por capítulos. Cada capítulo es un archivo JSON.

## 2. Funciones del motor

- Avance manual del texto y autoavance opcional.
- **Transiciones:** cuando cambia el fondo entre dos imágenes, el nuevo se funde encima del anterior (0,7 s). Si uno de los dos es una pantalla en código o un marcador, la pantalla funde a negro (0,35 s) y vuelve a aparecer (0,45 s); la línea nueva empieza a escribirse al aparecer. La escena nueva no se muestra hasta que su fondo terminó de descargar (máximo 8 s), y el juego precarga los fondos y sprites de las próximas 12 escenas de todas las ramas (`src/engine/preload.ts`). Los personajes que entran en el mismo fondo aparecen con un desvanecido de 0,25 s. Una escena con `"transicion": "blanco"` entra con un fundido largo a blanco (1,2 s + 1,6 s), aunque no cambie el fondo: se usa en los cruces entre el mundo real y el de la IA (Capítulo 1: Jair entra al juego en `cap01_g1_001`). Con «Saltar leído» no hay transición. Código: `src/engine/useSceneTransition.ts`.
- **Música** (`public/audio/musica/`, `src/engine/music.ts`): el campo `audio` de una escena cambia el tema (`"audio/musica/serene.mp3"`) o lo apaga (`"silencio"`); `null` deja sonar el que está. Transición suave entre temas, bucle con desvanecido (no hace falta que el archivo termine en fade) y volumen propio en Opciones. El tema vigente se guarda en la variable interna `_musica`, así suena bien al cargar o saltar desde el mapa. El tema del título está en `src/data/juego.json`. Los finales suenan en silencio.
- Efectos de sonido de la interfaz (`public/audio/sfx/`, `src/engine/sound.ts`): `texto.mp3` en bucle mientras se escribe una línea y `seleccion.mp3` al elegir una opción. Opciones: volumen de efectos y apagar el sonido del texto.
- Celular: el juego es horizontal. Al tocar «Nueva partida» o «Cargar» pide pantalla completa y fija la horizontal donde el navegador lo permite (Android). En vertical aparece «Gira tu celular» (iPhone no permite fijar la orientación). En pantallas bajas o angostas la interfaz se compacta: menú ☰, caja de diálogo y decisiones más chicas, paneles a pantalla completa.
- Texto con efecto máquina de escribir; velocidad en Opciones (letras por segundo o instantáneo). Clic o Espacio: primero completa la línea, después avanza. Las decisiones aparecen al terminar el texto. El modo auto avanza solo cuando la línea terminó, tras una pausa configurable.
- Elecciones que modifican variables y desbloquean escenas.
- Historial de diálogo.
- Guardado y carga (`localStorage`); varios espacios de guardado.
- Saltar texto ya leído.
- Condiciones para mostrar escenas, opciones y finales.
- Pantalla de advertencia de contenido al iniciar (contenido adulto).
- Opción de accesibilidad `reduceEffects` que desactiva glitches y efectos de interfaz.

- **Idiomas:** español e inglés (`src/engine/i18n.ts`). «Automático» toma el idioma del navegador (que suele ser el del sistema); en una versión de escritorio se leería directamente el del sistema operativo. Se ve qué idioma se detectó al pie de la advertencia y en Opciones, donde también se cambia. Textos de la interfaz: `src/data/i18n/es.json` y `en.json`. Las pantallas y menús con texto en JSON tienen su versión en inglés en `src/data/en/` (solo lo traducido; el resto cae al español). Los finales tienen `nombre_en` y los capítulos `title_en`. **El guion de los capítulos todavía está solo en español**; en inglés, el título lo avisa.

- **Menú del título:** botón «Nueva partida» y mosaicos (Cargar, Mapa, Extras, Opciones, Conoce más). Extras agrupa la galería y los finales. Cada opción suena con el sonido de decisión; cerrar o cancelar suena con `cancel.mp3`. Los paneles se abren como una terminal. Versión en una esquina (`version` en `src/data/juego.json`).
- **Easter egg:** 69 clics en el logo (cada clic hace un glitch sutil de colores con `glitch.mp3`, bajo; la pista está en el código Coffee del fondo). La pantalla se oscurece y aparece Nikki con un globo que la apunta y escribe su texto como un diálogo, pidiendo una donación; el menú queda bloqueado hasta responder. «Donar con PayPal» abre PayPal y Nikki agradece; «En otro momento» la pone celosa («será para otra ocasión»). En los dos casos se va con un glitch. Textos en `src/data/easter_egg.json`.

- **Partidas guardadas:** cada espacio muestra una miniatura de la escena (fondo y personajes; las pantallas en código, con su color) a partir de `sceneId`, así que también sirve con partidas viejas.

## 3. Modelo de escena

```json
{
  "scene_id": "cap01_esc01",
  "chapter": 1,
  "background": "PLACEHOLDER:departamento_noche",
  "video_fondo": null,
  "loop_video": false,
  "characters": [
    { "id": "jair", "sprite": "PLACEHOLDER:jorge_cansado", "pos": "centro" }
  ],
  "dialogue": {
    "speaker": "Jair",
    "text": "Gano poco, vivo en una caja de zapatos y mi mejor relación es con un ventilador."
  },
  "choices": [
    {
      "text": "Dejar que Nikki entre",
      "next": "cap01_esc02",
      "set": { "sospecha_nikki": 0 }
    },
    {
      "text": "Fingir que no escuchas",
      "next": "cap01_esc03",
      "set": { "sospecha_nikki": 1 },
      "locked": false
    }
  ],
  "conditions": [],
  "audio": null,
  "ui_effect": null,
  "next": null
}
```

Campos: `scene_id` único; `background` o `video_fondo` (Shining Days como referencia: video de fondo con texto encima); `characters` con sprite y expresión; `dialogue`; `choices` (texto, escena siguiente, cambios de variable, `locked` para opciones heroicas tachadas); `conditions`; `audio`; `ui_effect` (ver sección 5).

### 3.1 Detalles del modelo (implementados en `src/engine/types.ts`)

- **Condición:** `{ "var": "confianza_rikka", "op": ">=", "value": 2 }`. Operadores: `==`, `!=`, `>`, `>=`, `<`, `<=`.
- **`conditions` de escena:** si no se cumplen al entrar, la escena se salta y se sigue su `next`.
- **`conditions` de opción:** si no se cumplen, la opción no se muestra.
- **`next`:** un `scene_id`, `null`, o una lista de ramas `[{ "conditions": [...], "to": "id" }, { "to": "id_por_defecto" }]`; gana la primera que se cumple.
- **`set`** asigna valores; **`add`** suma a variables numéricas (`{ "confianza_rikka": 1 }`).
- **`ending`:** ID de final del registro. La escena cierra la partida y no puede tener `next` ni `choices`.
- Una escena usa `choices` o `next`, nunca ambos.
- Archivo por pieza o capítulo: `{ "ruta", "chapter", "title", "scenes": [...] }`.
- `src/data/juego.json` define la escena de inicio; `src/data/variables.json` declara todas las variables con su valor inicial; `src/data/registro_finales.json` lista los finales (`estado: jugable | por_escribir`). Solo los `jugable` deben ser alcanzables.
- **Recursos:** `PLACEHOLDER:nombre` se dibuja como caja gris; `PANTALLA:nombre` (solo en `background`) es una pantalla dibujada en código: IDE, correo, celular, negro, nebulosa (`src/components/CodeScreen.tsx`, textos en `src/data/pantallas.json`; la prueba falla si la pantalla no existe); cualquier otro valor es una ruta dentro de `public/` (p. ej. `sprites/nikki/ebria1.png`). La prueba de rutas falla si el archivo no existe. Sprites de prueba de Jair y Nikki autorizados por el autor antes de la fase de arte.
- **Sprites:** `npm run sprites` genera `public/sprites/<personaje>/<expresion>.webp`. Escala común de 15 px por cm y el mismo corte inferior; el lienzo de cada sprite depende de su estatura (`src/data/estaturas.json`): 1200×1600 hasta 1,65 m y más alto para los enemigos. Fuente preferida: un PSD en `docs/sprites/` con un grupo por personaje y una capa por expresión, acomodadas a mano sobre la plantilla (un PSD con «enemigo» en el nombre usa la plantilla alta de enemigos); el PSD no va a git. Si un personaje no está en un PSD, se usan sus PNG de `docs/sprites/<PERSONAJE>/` y se escalan solos. Las expresiones que faltan usan un sustituto (`alias` en `tools/sprites.config.json`). En escena, si hay alguien más alto que 1,65 m, la «cámara» se aleja para que el más alto quepa entero (todos a la misma escala). En el PSD también valen capas sueltas sin grupo con el nombre del personaje (`soldado`, `general`, `sombra`, `sombra_armored`: personaje y, tras el guion bajo, la expresión; sin expresión es `base`); el sufijo « copia N» de Photoshop se ignora y las capas genéricas («Capa 2», «Rectángulo 1») se omiten. Los nombres cortos se traducen con `prefijos` en `tools/sprites.config.json` (`general` → `capitan_enmascarado`, `sombra` → `monstruo_sombras`).
- **Fondos:** `npm run fondos` convierte `docs/fondos/*.{jpg,png,webp}` en `public/fondos/<fondo>.webp` (máximo 1920 px de ancho, sin agrandar; conviene 16:9 porque se recortan para cubrir el escenario) y cambia en los capítulos cada `PLACEHOLDER:<fondo>` con imagen por `fondos/<fondo>.webp`, y al revés si la imagen se quita. El nombre del archivo se traduce al del guion con `tools/fondos.config.json` (`bar` → `bar_noche`, `oficina` → `oficina_dia`, `habitacion_jorge` → `departamento_noche`); `omitir` deja fuera los que todavía no se publican.
- **Orientación de los sprites:** `src/data/orientacion.json` dice hacia dónde mira cada imagen (izquierda, derecha o frente; se puede ajustar por expresión). Los personajes de los costados miran al centro; el del centro mira a quien le habla (o a quien le habló antes si habla él). El motor voltea en espejo el sprite que mira al lado contrario. Un personaje puede forzar su dirección con `"mira"` en el JSON de la escena. Si un sprite tiene texto o un detalle que no puede verse al revés (el gafete de Nikki), se dibuja su versión en espejo como capa `<personaje>_<expresión>_volteada`; `npm run sprites` la anota en `src/data/volteadas.json` y el motor la usa en vez de voltear la imagen. Además, `npm run sprites` alinea cada expresión con la base de su ropa por la cabeza (centro y tope), para que al cambiar de pose no se vea la anterior corrida detrás; se saltan las poses distintas y los corrimientos de más de 40 px. En el juego, la expresión nueva se funde encima de la anterior y lo que asoma de la anterior se desvanece al final.
- **Interacciones físicas** (cargar, abrazar, caer): no se hacen sprites combinados. En los momentos clave se usa una imagen de escena como fondo (`background: "PLACEHOLDER:cg_..."`, sin personajes); el resto del tiempo, cada personaje con su sprite separado.
- **Libreto editable:** `npm run guion:exportar` genera `docs/guion/capXX.md` desde el JSON; `npm run guion:importar` pasa al JSON los cambios de hablante y texto (diálogos y opciones). Solo cambia textos: agregar, quitar o reordenar escenas se hace en el JSON. La exportación no pisa un libreto con cambios sin importar.
- Un archivo con `"estado": "borrador"` tiene diálogos no aprobados por el autor; no son canon.
- **Fin de capítulo** (`"fin_capitulo": N`): no es un final ni va a la galería. Mientras el capítulo siguiente no exista: fundido a negro y pantalla «FIN DEL CAPÍTULO N» (con el título del capítulo) sobre un lugar del capítulo oscurecido, con la cuadrícula del título, y la música del título (Capítulo 1: el cuarto de Jair; se configura en `fondos` de `src/data/fin_capitulo.json`). Botones: Continuar (ventana «Capítulo N+1 — En desarrollo — Próximamente»), Guardar (la partida guardada vuelve a esta pantalla) y Volver al inicio. Textos en `src/data/fin_capitulo.json`. Cuando exista el capítulo siguiente, esa escena lleva `next` hacia él. Solo los finales (`ending`) y los bad ends cuentan en la galería. Un bad end se muestra con fundido a negro, «BAD END» y el nombre del final en rojo con glitch, y el botón «Volver al menú principal» (textos en `src/data/pantalla_final.json`).

### 3.2 Funciones tomadas de Shiny Days (pedidas por el autor)

- **Mapa de escenas:** muestra las escenas vistas por archivo; permite volver a una escena con las variables de su primera visita.
- **Galería de finales:** finales alcanzados con fecha; los no alcanzados aparecen como `???`. Los bad ends (`"tipo": "Bad end"` en el registro) van en su propia sección.
- **Mapa de decisiones:** árbol horizontal que muestra solo decisiones, opciones y finales (`src/engine/flow.ts`).
- **Bad ends:** pantalla «BAD END» y vuelta al título.

## 4. Estado y variables

Estado global con Zustand o Context, persistido en `localStorage`.

- `ruta`: pieza activa (`base`, `genesis_pp`, `rikkaquest`, `genesis_sharp`).
- `confianza_rikka`, `lucidez_cami`, `sospecha_nikki`.
- Capítulo 1: `beso_nikki`, `insistio_relacion`, `confeso_creador` (Jair le dijo a Cami que creó el mundo), `noche` (`normal`, `sin_bar` o `rechazo`: si la noche que crea el juego ocurre; ver docs/FINALES.md).
- `descubrieron_el_edit` (booleano).
- `sashi_murio` (solo Génesis++).
- `final_alcanzado`: ID del final (ver `docs/FINALES.md`).

No hay registro global de finales entre piezas.

## 5. Efectos de meta-horror en la interfaz

Solo cuando tengan función narrativa; no saturar desde el comienzo. Cada efecto en un módulo CSS aislado y apagable con `reduceEffects`.

- `os_menu`: menús de guardado y carga que simulan el sistema operativo de Jair.
- `glitch`: fallos de interfaz cuando Cami o Rikka sufren disonancia.
- `boringram_flash`: imágenes de Boringram que parpadean (con marcadores, no personas reales).
- `ai_vowels`: resalta las letras A e I en los nombres de Rikka, Cami, Sashi y Aylin.
- `locked_choice`: opciones heroicas que el juego tacha, forzando las evasivas.

## 6. Capítulos del juego base (7, con dos versiones del 7)

Estructura definida por el autor (2026-10-24). Los títulos que faltan están por definir.

| Nº | Archivo | Capítulo | Contenido | Duración |
| --- | --- | --- | --- | --- |
| 1 | `cap01.json` | Una vida en bucle | Trabajo, bar con Nikki, GRAVITY y GENESIS, despertar en la dimensión espacial, rescate de Cami, huida a la dimensión ancestral, encuentro con Rikka. Borrador escrito. | 1 h 30 min |
| 2 | `cap02.json` | `TODO(canon)` | El viaje del héroe. | 1 h 30 min |
| 3 | `cap03.json` | `TODO(canon)` | La batalla final contra el Rey Malvado. | 2 h 30 min a 3 h |
| 4 | `cap04.json` | `TODO(canon)` | La materialización de Cami y Rikka y la convivencia con Jair. | 2 h |
| 5 | `cap05.json` | `TODO(canon)` | La rivalidad entre Cami y Nikki; termina con el descubrimiento de quiénes son realmente ellas. | 1 h 30 min |
| 6 | `cap06.json` | `TODO(canon)` | Las consecuencias del descubrimiento. Lo que ocurra aquí decide qué versión del Capítulo 7 se juega. | 1 h 30 min |
| 7A | `cap07a.json` | `TODO(canon)` | El colapso del mundo real con el de la IA y la fusión de Rikka con Cami en The Anothergirl (`final_canon_2`). | 1 h 30 min |
| 7B | `cap07b.json` | `TODO(canon)` | Epílogo: Cami vuelve con Jair después del salto temporal (`final_canon_1`). | `TODO(canon)` |

Una partida dura unas 12 horas; todo el contenido del juego base, unas 13 h 30 min más las ramas.

### Expansiones (unas 4 h cada una)

| Expansión | Carpeta | Dónde encaja |
| --- | --- | --- |
| RikkaQuest | `expansions/rikkaquest/` | Ruta aparte desde el menú. Ocurre durante el Capítulo 1: los más de 800 años del reino ancestral mientras GENESIS escribe el juego. |
| Génesis++ | `expansions/genesis_pp/` | Reemplaza al Capítulo 5 (versión alternativa con Sashi); termina con el mismo descubrimiento y sigue al Capítulo 6 normal. |
| Génesis# | `expansions/genesis_sharp/` | Después del Capítulo 7B, como un «Capítulo 8». |

## 7. Pruebas

`npm run test:routes` debe recorrer automáticamente todas las rutas y finales y fallar si:

- una opción apunta a un `scene_id` inexistente;
- un final es inalcanzable;
- una variable se usa sin declararse;
- un final canon se modifica sin cambiar `docs/FINALES.md`.

## 8. Producción

Ritmo del autor: 15 horas semanales. Fases: 1) diseño y alcance, 2) prototipo gris, 3) capítulo 1 jugable, 4) sistema de rutas, 5) producción narrativa, 6) arte y audio, 7) QA y accesibilidad, 8) publicación en Steam (tarifa de USD 100 por juego).

Antes de publicar: sustituir los marcadores de personas reales por personajes ficticios, revisar derechos de imágenes, cosplays, música y recursos, y definir la clasificación según el contenido realmente incluido.

## 9. Buenas prácticas con IA

- Pasar `CLAUDE.md` y `docs/` al inicio de cada sesión.
- Commits pequeños tras verificar cada bloque.
- Si un bloque de código toca más de una ruta narrativa, probar todas las rutas antes de seguir.
