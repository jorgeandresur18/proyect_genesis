<!-- guion:cap02.json -->
# Capítulo 2 — El viaje del héroe

> **Estado:** borrador. Inicio del capítulo escrito por Claude a partir del plan del autor (docs/guion/cap02_plan.md). Todavía no está enlazado al final del Capítulo 1: para probarlo, abrir el juego con ?escena=cap02_001. No es canon hasta que el autor lo apruebe.
>
> **Cómo editar:** cambia el hablante (entre `**...:**`) o el texto de cualquier línea, o el texto de una opción.
> No borres ni cambies los códigos entre comillas invertidas (`063`): así se sabe a qué escena corresponde cada línea.
> Narración: líneas que empiezan con «—». Las líneas que empiezan con «>» son notas y no se importan.
> Al terminar, corre `npm run guion:importar` y después `npm run test:routes`.
> Para agregar, quitar o reordenar escenas, pídemelo: la importación solo cambia textos.


### fondos/puente_rojo.webp

> ♪ música: serene
`001` — Rikka le cura el tobillo a Cami en el refugio con un ungüento que huele a flores y a algo que mejor no preguntar.

`002` **Cami:** Arde.

`003` **Rikka:** Es para que aprendas a caer mejor.

`004` **Cami:** Caí desde otra dimensión.

`005` **Rikka:** Por eso. Hay que aprender.

`006` — Una hora después, Cami camina. Cojea un poco, pero camina sola, y se encarga de que Jair lo note: le pasa por delante dos veces sin necesidad.

`007` **Jair:** (Recuperó el tobillo y yo perdí el trabajo de mochila. Es la primera vez que me despiden de algo y me alivia.)

`008` **Rikka:** Vengan. Mi casa está al otro lado del bosque. La ciudadela de la Primavera.

`009` **Jair:** ¿Ciudadela?

`010` **Rikka:** Es una ciudad con murallas, pero más elegante. Como yo.

`011` **Cami:** Una ciudad con murallas y una guardiana que se pasa el día mirando un arroyo.

`012` **Rikka:** Lo miro con mucha concentración.


### ciudadela_primavera

`013` — La ciudadela aparece de golpe, como si el bosque se hubiera apartado para presentarla: murallas blancas, techos curvos, faroles de papel y cerezos en flor en cada esquina. Huele a té, a madera y a pan dulce.

`014` — La gente saluda a Rikka con reverencias. Ella responde a cada una con una inclinación exacta, ni un grado más ni uno menos.

`015` **Jair:** (Saluda como una noble. Y hace un rato me preguntó si le iba a cobrar por hablar con ella.)

`016` **???:** ¡RIKKAAA!

`017` — Dos niños bajan corriendo por la calle. Un chico con una espada de madera más larga que él y una niña con una canasta llena de flores, la mitad aplastadas.

`018` **Rikka:** Mike. Nora. ¿Qué les dije de correr por la calle principal?

`019` **Mike:** ¡Que si corremos, que sea rápido!

`020` **Nora:** Te trajimos flores. Bueno, eran flores. Mike se cayó encima.

`021` **Mike:** ¡Fue una maniobra!

`022` — Rikka se agacha y recibe las flores aplastadas como si fueran un tesoro. Por un segundo, la guardiana del puente desaparece y queda otra cosa: alguien que se acuerda de ser tierna.

`023` **Jair:** (Esto no lo escribí yo.)

`024` **Jair:** (...¿O sí?)

`025` **Nora:** ¿Y él quién es? ¿Es tu novio?

`026` **Rikka:** ¡N-no! Es... un viajero.

`027` **Mike:** ¿Y la rubia? ¿Es la novia del viajero?

`028` **Cami:** Soy su escolta. Él es mi carga.

`029` **Mike:** Todo el pueblo dice que algo cayó del cielo. ¿Fueron ustedes? ¿Se cayeron del cielo?


> **DECISIÓN**
- `029#0` «Sí. Soy un dios.» ⟶ va a `029a`
- `029#1` «No, vinimos caminando.» ⟶ va a `029b`
- `029#2` «Es complicado.» ⟶ va a `029c`

`029a` **Jair:** Sí. Del cielo. Soy un dios.

`029a2` **Mike:** ¡Mentira!

`029a3` **Nora:** Los dioses no tienen ojeras.

`029a4` **Jair:** (Ni los niños me creen. Y esta vez era verdad.)

> ⤷ continúa en `030`

`029b` **Jair:** No, no. Vinimos caminando. Como la gente normal.

`029b2` **Nora:** Tienes pasto en el pelo. Y una hoja en la oreja.

`029b3` **Mike:** Y hay un agujero con tu forma en el bosque. Lo vimos.

`029b4` **Jair:** (Me ganó una investigación de dos niños. Sin presupuesto.)

> ⤷ continúa en `030`

`029c` **Jair:** Es complicado.

`029c2` **Mike:** Eso dicen los grandes cuando no saben.

`029c3` **Jair:** (Tiene seis años y ya entendió cómo funciona la ingeniería de software.)

`030` — Rikka los lleva por la calle principal. Los niños se les pegan a los talones como dos perros que acaban de adoptar a un forastero.

`031` **Rikka:** Hace años esto no era así. Las calles estaban vacías. Las ventanas, cerradas con tablas.

`032` **Jair:** ¿Qué pasó?

`033` **Rikka:** Una heralda del Rey Malvado. Tzai. Ocupó la ciudadela durante mucho tiempo. Cobraba tributo por todo: por el agua, por el pan. Por mirar el cielo.

`034` **Rikka:** La derrotamos. Yo y... un grupo. Gente que ya no está aquí. Cada una siguió su camino.

`035` **Rikka:** Desde entonces cuido el puente de la entrada. Nadie entra a la ciudadela sin que yo lo vea.

`036` **Cami:** ¿Desde cuándo?

`037` **Rikka:** ...No me acuerdo. Mucho. Dejé de contar los inviernos cuando empezaron a parecerse.

`038` **Rikka:** El Rey Malvado todavía quiere estas tierras. Siempre las quiso. Pero el Rey Primavera no se lo ha permitido. Gracias a él, los cuatro reinos están en paz.

`039` **Rikka:** Yo me acuerdo de cuando no lo estaban. Me acuerdo de las guerras.

`040` **Cami:** Te acuerdas de muchas cosas. ¿Cuántos años tienes?

`041` **Rikka:** Esa es una pregunta muy grosera.

`042` **Jair:** Más de quinientos, ¿verdad?

`043` — Lo dice sin pensar. Como quien completa una línea de código que ya escribió mil veces.

`044` **Voz:** Dato recuperado: «guardiana, más de quinientos años». Origen: un archivo del usuario. Sin terminar.

`045` **Rikka:** ...Más o menos. Se podría decir que sí. Creo que sí.

`046` **Rikka:** ¿Cómo sabes eso?

`047` **Cami:** ¿Quinientos?

`048` **Jair:** (Porque lo escribí yo. Hace años, en un borrador que nunca terminé: una heroína que peleó en una guerra dentro de su propio universo. Quinientos años de guardia. Me pareció un número épico.)

`049` **Jair:** (No puedo decir eso. «Hola, te inventé un martes a las dos de la mañana».)

`050` **Jair:** Lo... leí por ahí.

`051` **Rikka:** ¿Dónde?

`052` **Jair:** En un libro. De historia. De aquí. Muy famoso. Tú eres muy famosa.

`053` **Rikka:** ...Bueno. Eso es cierto.

`054` — Rikka sigue caminando, satisfecha. Cami no. Cami lo mira con los ojos entrecerrados, como quien encuentra un error en un informe y decide no reportarlo todavía.

`055` **Cami:** (Susurrando) Tú no lees libros de historia.

`056` **Jair:** Leo muchas cosas.

`057` **Cami:** Hace dos horas no sabías ni en qué dimensión estabas.

> ♪ música: sad_suspense
`058` — Entonces la ciudadela se queda callada. No de golpe: por partes. Primero los pájaros. Después los vendedores. Después los niños.

`059` — Por la calle principal entran soldados de negro. Cascos lisos, sin cara. Los mismos del castillo. Marchan sin prisa, como si la calle ya fuera suya.

`060` **Cami:** No.

`061` **Rikka:** ¿Soldados de la Federación? ¿Aquí? Es imposible. Nadie de otra dimensión llega tan fácil hasta la ciudadela. Nadie.

`062` **Rikka:** ...Nadie, cuando yo estoy en el puente.

`063` **Jair:** (Y no estaba en el puente. Estaba con nosotros.)

`064` **Soldado enmascarado:** Buscamos a una fugitiva de la dimensión espacial. Rubia. Traje azul. Peligrosa. Sabemos que está aquí.

`065` **Rikka:** Mike. Nora. A casa. Ahora.

`066` **Mike:** Pero...

`067` **Rikka:** Ahora.

`068` — Los niños corren. Esta vez nadie les dice que lo hagan rápido.

`069` **Cami:** Vienen por mí. Ustedes no tienen nada que ver.

`070` **Jair:** Tenemos que salir de aquí.

`071` **Rikka:** Por el mercado. Conozco un camino por los techos. Síganme y no pregunten.


### ciudadela_tejados

> ♪ música: adventure1
`072` — Rikka salta a un toldo, del toldo a una cornisa y de la cornisa a un tejado, sin despeinarse. Cami la sigue, cojeando y maldiciendo. Jair las sigue a las dos, sin dignidad.

`073` **Jair:** (No hago ejercicio desde la secundaria. Ahora salto tejados. Mi doctor estaría orgulloso. Si tuviera doctor.)

`074` **Rikka:** No pises las tejas rojas. Son de la casa del herrero y me odia.

`075` **Jair:** ¿Por qué te odia?

`076` **Rikka:** Porque siempre piso sus tejas rojas.


### almacen_te

> ♪ música: sad_suspense
`077` — Terminan escondidos en un almacén de té pegado a la muralla. Huele a hojas secas y a polvo. Afuera, las botas siguen marchando.

`078` **Rikka:** Bueno. Ahora sí pregunto. ¿Por qué la Federación cruzaría una dimensión entera por ti?

`079` **Cami:** Porque soy un problema. Y porque mi misión es derrotar al Rey Malvado.

`080` **Rikka:** ¿Derrotar al Rey Malvado? ¿Tú? ¿Con un tobillo recién curado y una pistola?

`081` **Cami:** Y con él.

`082` **Jair:** ¿Yo?

`083` **Rikka:** Es una idea suicida.

`084` **Cami:** Nadie te pidió permiso.

`085` **Rikka:** Nadie me pide permiso nunca. Por eso sigo viva.

`086` — Las dos se miran. Jair conoce esa mirada: la vio en mil reuniones de proyecto, justo antes de que alguien dijera «mejor lo hablamos por separado».

`087` **Jair:** Cami tiene sus motivos.

`088` **Jair:** No los sé todos. Creo que ni ella los sabe todos. Pero los tiene. Y yo la voy a apoyar.

`089` — Lo dice y se sorprende de decirlo. No tartamudea. No se justifica. Por una vez, no busca la salida de emergencia.

`090` **Jair:** (¿Quién dijo eso? ¿Fui yo? Afuera no apoyo ni mis propias ideas.)

`091` **Cami:** ...No necesito que me apoyes.

`092` **Jair:** Ya sé. Igual.

`093` — Rikka no dice nada. Lo mira. Al chico de ojeras, sin espada, sin armadura y sin dinero, que acaba de ofrecerse para una guerra que no es suya como quien se ofrece a cargar las bolsas del mercado.

`094` **Rikka:** (Hay una profecía. La leí hace siglos, en los archivos del palacio.)

`095` **Rikka:** (Un salvador que destruiría al Rey Malvado y se convertiría en el nuevo rey soberano. Que no pertenecería a ninguna dimensión. Que vendría de un lugar más allá de esta existencia.)

`096` **Rikka:** (Siempre creí que era un mito. Un cuento para que los niños durmieran tranquilos.)

`097` **Rikka:** (Pero cayó del cielo. Sabe mi edad. Y no tiene miedo de la manera correcta.)

`098` — Algo le late a Rikka en el pecho. Algo que no es la guardiana. Lo aplasta enseguida, con la eficiencia de quien lleva siglos aplastando cosas.

`099` **Rikka:** Yo perdí mucho por culpa del Rey Malvado. Hace años. Aprendí a vivir con eso.

`100` **Rikka:** Y por eso te lo digo: son tres. Tres. No le harían ni cosquillas a su ejército.

`101` **Jair:** Técnicamente somos dos y medio. Yo cuento como medio.

`102` **Cami:** Como un cuarto.

`103` **Rikka:** ...¿Y quién dijo que yo era la tercera?

`104` — Afuera, algo cambia. Un cuerno, largo y grave, cruza la ciudadela.

`105` **Rikka:** Los caballeros estacionales.


### ciudadela_primavera

> ♪ música: adventure1
`106` — Por la ventana del almacén se ve la calle principal. Un grupo de jinetes con armaduras de cuatro colores, rosa, verde, ocre y blanco, les corta el paso a los soldados de negro.

`107` **Caballero estacional:** ¿Con qué permiso entran seres de otra dimensión a la ciudadela de la Primavera? ¿Quién les abrió las puertas de este reino?

`108` **Soldado enmascarado:** Buscamos a una fugitiva. No es asunto del reino.

`109` **Caballero estacional:** Todo lo que pisa este suelo es asunto del reino.

`110` **Soldado enmascarado:** La fugitiva. Entréguenla y nos vamos.

`111` — Los caballeros no se mueven. Los soldados tampoco. Es el tipo de silencio que siempre termina igual.


### almacen_te

`112` **Rikka:** No van a aguantar mucho. Vamos, ahora que están ocupados.


### sendero_primavera

> ♪ música: serene
`113` — Rikka los saca por una puerta de servicio, entre huertos, y los deja en un sendero que baja hacia el bosque.

`114` **Rikka:** Desde aquí siguen solos. El sendero baja hacia el bosque y se aleja de la ciudadela.

`115` **Jair:** ¿No vienes?

`116` **Rikka:** Los ayudé a escapar. No dije que los iba a ayudar con su idea loca de derrotar a un rey.

`117` **Rikka:** Tengo un puente que cuidar. Y dos niños que no saben correr despacio.

`118` **Cami:** Nadie te lo pidió.

`119` **Rikka:** Lo sé. Lo noté.

`120` — Pero no se va. Se queda en la puerta, mirándolos bajar, más tiempo del que haría falta.


### sala_rey_malvado

> ◐ transición: negro
> ♪ música: sad_suspense
`121` — Lejos de ahí, en una sala sin ventanas, la oscuridad tiene forma de trono.

`122` — Sobre un estanque negro se mueve una imagen: tres figuras pequeñas en un sendero. Una rubia que cojea. Una peliverde en una puerta. Y entre las dos, un chico sin espada.

`123` — Lo que Rikka no sabe: los cuatro reyes estacionales, también el Rey Primavera, al que tanto agradece, hace mucho que están a merced de alguien.

`124` **???:** Rikka. Tan leal. Tan segura de que la paz se la debe a su rey.

`125` **???:** La paz es mía. Yo la presto. Y cobro intereses.

`126` — Los soldados no persiguen a la rubia porque alguien crea que puede derrotarlo. Nadie que la haya visto pelear lo cree.

`127` **???:** La buscan porque ella es un puente. Un puente entre esta realidad y otra.

`128` **???:** Con lo que lleva dentro, este mundo podría tocar el otro. Lo que existe aquí podría existir allá.

`129` **???:** Pero un puente no se cruza solo. Alguien tiene que dar la orden.

`130` — La imagen del estanque se acerca al chico. A sus ojeras. A sus manos vacías.

`131` **???:** El creador de esta realidad.

`132` **???:** Lo esperé más de un milenio. Muchas civilizaciones lo adoraron como a un dios. Lo llamaban el Gran Ingeniero.

`133` **???:** Yo siempre dudé de ese dios.

`134` — En el estanque, el chico se tropieza con una raíz y casi se cae. La rubia lo agarra del cuello de la camisa sin mirarlo.

`135` **???:** ...Y ahora que lo veo, sigo dudando de él.

> **FIN DEL CAPÍTULO 2** (no es un final: sigue en el capítulo siguiente)

---
