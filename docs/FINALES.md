# FINALES — PROYECTO GENESIS

Los finales se registran aquí con un ID estable. Agrega los nuevos al final de la tabla. No modifiques los finales canon sin una orden explícita del autor.

| ID | Nombre | Pieza | Tipo | Estado |
| --- | --- | --- | --- | --- |
| `final_canon_1` | El Malo, "La Jaula Voluntaria" | Juego base | Canon | Escrito |
| `final_canon_2` | El Bueno, "The Anothergirl" | Juego base | Canon | Confirmado, texto por completar |
| `alt_1` a `alt_6` | Alternativos del juego base | Juego base | No canon | Por escribir |
| `gpp_1` a `gpp_4` | Finales de Génesis++ | Génesis++ | No canon | Por escribir |
| `gs_1` a `gs_4` | Finales de Génesis# (secuela del Capítulo 7B) | Génesis# | Por definir | Sin definir |

Total confirmado: 12. Con Génesis#, hasta 16. RikkaQuest no tiene finales.

## Bad ends (game over) — aparte de los 12 `[CANON]`

Muertes o fracasos tempranos, estilo Shiny Days. No cuentan entre los 12 finales ni afectan a los canon. Al llegar a uno, la partida termina y vuelve al título. Se muestran en la galería en su propia sección.

| ID | Nombre | Capítulo | Decisión que lo dispara | Estado |
| --- | --- | --- | --- | --- |
| `bad_cap01_huida` | Nadie más se encarga | 1 | Al despertar, «Correr en dirección contraria» en vez de ir hacia la voz de Cami | Borrador |
| `bad_cap01_escudo` | Escudo humano | 1 | Ante el monstruo, «Esconderte detrás de Cami» | Borrador |
| `bad_cap01_patrulla` | Pendiente de revisión | 1 | En la patrulla, «Cruzar ya» a destiempo | Borrador |
| `bad_cap01_sin_bar` | Una noche normal | 1 | «Decir que estás cansado» a Nikki: no hay bar; sobrio, borra el correo de GRAVITY | Borrador |
| `bad_cap01_rechazo` | La única vez que dijo que no | 1 | Apartar a Nikki cuando pide el beso; en casa borra el correo de GRAVITY | Borrador |
| `bad_cap01_correo` | Spam | 1 | Frente al correo de GRAVITY, «Eliminar el correo» | Borrador |
| `bad_cap01_capitan` | Un solo turno | 1 | Frente al capitán en el núcleo de la Grieta, «Pelear contra el capitán» | Borrador |
| `bad_cap01_acorazado` | Valiente, por una vez | 1 | En el invierno, frente al monstruo acorazado, «Enfrentar al monstruo» | Borrador |

Los nombres son propuestas por confirmar.

Pelear contra el primer monstruo o contra los soldados no es un bad end: Jair lo intenta, sale mal, Cami lo salva y la historia sigue por el camino de siempre. Las opciones de pelear ya no se muestran tachadas.

## La noche que crea el juego `[CANON]`

La noche del bar con Nikki es lo que lleva a Jair a instalar GRAVITY y crear el videojuego. Si esa noche no ocurre (no va al bar), si la rechaza, o si borra el correo de GRAVITY, el juego nunca se crea y la historia jamás ocurre: son bad ends (`bad_cap01_sin_bar`, `bad_cap01_rechazo`, `bad_cap01_correo`). Variable `noche`: `normal`, `sin_bar` o `rechazo`.

Los finales de la tabla principal (canon, alternativos, Génesis++ y Génesis#) son del juego completo. Mientras no estén escritos no se muestran en la galería; el Capítulo 1 solo tiene bad ends.

## Reglas

- Los dos finales canon ocurren en **dos líneas temporales diferentes**.
- Los alternativos y los de Génesis++ no son canon: no afectan a los canon ni se leen entre sí. Basta una variable `ruta` por pieza; no hay registro global de finales.
- Cada final debe tener condiciones explícitas y probadas por `npm run test:routes`.

## `final_canon_1` — El Malo, "La Jaula Voluntaria"

Cami se encuentra con Jair. Se acerca de forma sumisa y tímida y dice que lo extrañaba; después de pasear lo besa, pide quedarse y promete no volver a irse. Jair cuenta que ahora le va mejor y que arregló sus cosas con Nikki: son solo amigos. En realidad Nikki tiene 4 meses de embarazo y el bebé es de Jair. Cami se va a vivir con él y tienen relaciones; no puede quedar embarazada porque no tiene órganos. Cami le pregunta si es la mejor creación de las dos y Jair dice que sí, aunque siempre le gustó más la versión real de Rikka. Aquí acaba la historia.

Escena final (borrador aprobado como "más simple"):

- —¿Estás pensando en el bebé?
- —No. Trato de no pensar en nada.
- —De todo lo que programaste... ¿fui yo tu mejor creación?
- —Sí. Eres mi obra maestra.

## `final_canon_2` — El Bueno, "The Anothergirl"

Cami y Rikka se fusionan en The Anothergirl. Resumen de una versión anterior, **por confirmar**: la fusión permite separar la amalgama entre el juego y la realidad y comprimir GRAVITY en un archivo sellado que no debe volver a abrirse; Jair y Nikki reconstruyen su vida y su relación. `TODO(canon)`: pedir al autor el texto original (qué lo dispara, cómo es la fusión, cómo termina Jair con Nikki).

## Alternativos del juego base (candidatos, no canon)

Variaciones temporales aisladas. Propuestas por confirmar:

- `alt_1` Ocho años: Jair y Nikki convierten la ambigüedad en relación; exige honestidad, límites y que Nikki afronte sus problemas sin delegarlos.
- `alt_2` La fantasía: Jair elige a Cami; ¿puede ella querer algo que él no previó?
- `alt_3` La autonomía: Jair elige a Rikka; su paciencia no debe ser obligación de soportar abusos.
- `alt_4` Ruptura: prioriza la verdad y la independencia de las heroínas.
- `alt_5` Responsabilidad: no elige a nadie, arregla su vida y apaga GRAVITY.
- `alt_6` Libre.

Puntos de bifurcación propuestos: capítulos 5 a 8, según decisiones previas.
