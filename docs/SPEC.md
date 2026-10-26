# SPEC — Especificación técnica de PROYECTO GENESIS

## 1. Principios

- La narrativa vive en archivos de datos (JSON), separada de los componentes. El motor lee, interpreta y renderiza; no contiene texto de capítulos.
- Primero lógica y diálogos con cajas grises (greyboxing). Sprites, imágenes y música al final.
- Proyecto por capítulos. Cada capítulo es un archivo JSON.

## 2. Funciones del motor

- Avance manual del texto y autoavance opcional.
- **Transiciones:** cuando cambia el fondo de una escena a la siguiente, la pantalla funde a negro (0,35 s) y vuelve a aparecer (0,45 s); la línea nueva empieza a escribirse al aparecer. Los personajes que entran en el mismo fondo aparecen con un desvanecido de 0,25 s. Una escena con `"transicion": "blanco"` entra con un fundido largo a blanco (1,2 s + 1,6 s), aunque no cambie el fondo: se usa en los cruces entre el mundo real y el de la IA (Capítulo 1: Jair entra al juego en `cap01_g1_001`). Con «Saltar leído» no hay transición. Código: `src/engine/useSceneTransition.ts`.
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
- **Recursos:** `PLACEHOLDER:nombre` se dibuja como caja gris; cualquier otro valor es una ruta dentro de `public/` (p. ej. `sprites/nikki/ebria1.png`). La prueba de rutas falla si el archivo no existe. Sprites de prueba de Jair y Nikki autorizados por el autor antes de la fase de arte.
- **Sprites:** `npm run sprites` genera `public/sprites/<personaje>/<expresion>.webp` (lienzo 1200×1600). Fuente preferida: un PSD en `docs/sprites/` con un grupo por personaje y una capa por expresión, acomodadas a mano sobre la plantilla; cada capa se exporta tal cual (el PSD no va a git). Si un personaje no está en el PSD, se usan sus PNG de `docs/sprites/<PERSONAJE>/` y se escalan solos a su línea de estatura. Las expresiones que el juego pide y aún no existen usan un sustituto temporal (`alias` en `tools/sprites.config.json`) hasta que se generen.
- **Orientación de los sprites:** `src/data/orientacion.json` dice hacia dónde mira cada imagen (izquierda, derecha o frente; se puede ajustar por expresión). Los personajes de los costados miran al centro; el del centro mira a quien le habla (o a quien le habló antes si habla él). El motor voltea en espejo el sprite que mira al lado contrario. Un personaje puede forzar su dirección con `"mira"` en el JSON de la escena.
- **Interacciones físicas** (cargar, abrazar, caer): no se hacen sprites combinados. En los momentos clave se usa una imagen de escena como fondo (`background: "PLACEHOLDER:cg_..."`, sin personajes); el resto del tiempo, cada personaje con su sprite separado.
- **Libreto editable:** `npm run guion:exportar` genera `docs/guion/capXX.md` desde el JSON; `npm run guion:importar` pasa al JSON los cambios de hablante y texto (diálogos y opciones). Solo cambia textos: agregar, quitar o reordenar escenas se hace en el JSON. La exportación no pisa un libreto con cambios sin importar.
- Un archivo con `"estado": "borrador"` tiene diálogos no aprobados por el autor; no son canon.
- Mientras un capítulo no tenga continuación, termina en un final oculto de prototipo (p. ej. `fin_prototipo_cap01`), que se reemplaza por el `next` al capítulo siguiente.

### 3.2 Funciones tomadas de Shiny Days (pedidas por el autor)

- **Mapa de escenas:** muestra las escenas vistas por archivo; permite volver a una escena con las variables de su primera visita.
- **Galería de finales:** finales alcanzados con fecha; los no alcanzados aparecen como `???`. Los bad ends (`"tipo": "Bad end"` en el registro) van en su propia sección.
- **Mapa de decisiones:** árbol horizontal que muestra solo decisiones, opciones y finales (`src/engine/flow.ts`).
- **Bad ends:** pantalla «BAD END» y vuelta al título.

## 4. Estado y variables

Estado global con Zustand o Context, persistido en `localStorage`.

- `ruta`: pieza activa (`base`, `genesis_pp`, `rikkaquest`, `genesis_sharp`).
- `confianza_rikka`, `lucidez_cami`, `sospecha_nikki`.
- Capítulo 1: `beso_nikki`, `insistio_relacion`, `confeso_creador` (Jair le dijo a Cami que creó el mundo), `inicio_cap2` (`normal`, `sobrio` o `rechazo`: cómo empieza el Capítulo 2; ver docs/FINALES.md).
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
| 2 | `cap02.json` | `TODO(canon)` | El viaje del héroe. Empieza distinto según `inicio_cap2`. | 1 h 30 min |
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
