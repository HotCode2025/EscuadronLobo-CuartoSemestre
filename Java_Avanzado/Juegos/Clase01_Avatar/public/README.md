# AVATAR: La leyenda de Aang — Escuadrón Lobo

## Páginas

- **`avatar.html`** — el juego: piedra/papel/tijera temático, con selección de
  personaje, ataques, vidas y resultado de cada ronda.
- **`generador.html`** — demostración de POO: genera 100, 1000, 10.000 (o los
  que se pidan) personajes usando clases. Se llega desde el link
  "🧬 Generador de personajes (POO)" al pie del juego.

## JavaScript

- **`js/avatar-clase.js`** — ejercicios de POO y ciclos:
  1. Define la clase `Avatar`, instancia a Zuko, Katara, Aang y Toph, y los
     carga en el array `avatares` con `push()` (con ejemplos de `console.log`,
     `pop()` y `length`).
  2. Recorre ese array con `forEach()` y genera dinámicamente, con template
     literals, las tarjetas de personaje dentro de `#contenedorTarjetas`
     (ya no están escritas a mano en el HTML).
  
  3. La clase `Avatar` también guarda lo necesario para el mapa: posición
     (`x`, `y`), tamaño, velocidad, `mapaFoto` y el método `pintarAvatar()`.

  Se carga antes que `avatar.js` para que, cuando este busque los inputs de
  personaje por `id`, ya existan en el DOM.
- **`index.html`** (+ `css/portada.css`, `js/portada.js`) — portada del juego: muestra la imagen
  `assets/img/portada.jpg`, suena la música de entrada y el botón **Jugar** (o la tecla
  Enter) lleva a `avatar.html`, donde está el juego. Es la página que se abre primero.
- **`js/audio.js`** — sonido del juego (objeto `Sonido`). Los sonidos son archivos de `assets/audio/`; unos
  pocos efectos chicos (pasos, sonido de *Jugar*) se generan por código con la Web Audio API. El navegador
  solo permite sonido después del primer click o tecla; el botón 🔊 de la esquina silencia o reactiva todo
  (y recuerda la preferencia). Si algún archivo no se pudiera cargar, suena una versión generada por código.
  - **Portada y segunda pantalla (paisaje):** `entrada-principal.mp3`, en loop, con entrada suave. Al pasar de
    una página a la otra **sigue desde donde iba** (la posición se guarda en `sessionStorage`).
  - **Batalla (el mapa de los jugadores):** SOLO suena `batalla-epica.mp3`, en loop, desde que se elige
    personaje hasta que termina la partida (gane quien gane, o empaten); recién ahí se apaga suavemente.
  - **Efectos de combate** (no son música): 4 archivos en `assets/audio/efectos/` (`golpe-suave`,
    `silbido-aire`, `golpe-aire`, `impacto-fuerte`). El puño usa el golpe suave, la patada suma el silbido y
    el golpe de aire, la barrida usa el silbido y el golpe suave más lentos y graves, y el impacto fuerte suena
    cuando perdés la ronda (tabla `EFECTOS_DE_ARCHIVO` en `js/audio.js`).
  - **Resultado:** al terminar la **partida** suena `ganado.mp3` (ganaste) o `perdido.mp3` (perdiste), justo
    cuando la música épica se está apagando. `empatado.mp3` suena cuando una **ronda** termina empatada (los dos
    eligieron el mismo ataque); una partida nunca termina en empate, porque las vidas se descuentan de a una.
    Los tres están en `assets/audio/final/`; si empieza una ronda nueva, el sonido anterior se corta.
  - **Generador:** `latidos.mp3` mientras haya una explicación de "¿Cómo funciona?" abierta.
- **`js/avatar.js`** — lógica del juego (avatar.html). Estilo funcional: variables
  globales que apuntan a elementos del DOM, y funciones que se llaman entre sí.
  Incluye el mapa (`<canvas id="mapa">`): al elegir personaje se muestra el mapa
  y el jugador se mueve con las flechas del teclado (`iniciarMapa`, `pintarCanvas`,
  `sePresionoUnaTecla`, `moverArriba/Abajo/Izquierda/Derecha`, `detenerMovimiento`,
  `obtenerObjetoPersonaje`). El fondo es `assets/img/mapa.jpg` (640x500 en pantalla) y cada personaje usa dos poses
  con fondo transparente (`assets/img/mapa-<nombre>-1.png` y `-2.png`) que se alternan al caminar.
  El mapa y el panel de combate van juntos dentro de `#escenario` (lado a lado en
  pantallas anchas). Al atacar, `combate()` llama a `animarAtaques()`: cada personaje
  ejecuta en el mapa el ataque elegido (`Avatar.atacar()`: puño, patada o barrida) y el
  que pierde la ronda parpadea (`Avatar.recibirGolpe()`).
- **`js/personajes-poo.js`** — las clases del generador (generador.html):
  - `Personaje` → clase base (nombre, elemento, vidas, `atacar()`, `describir()`).
  - `PersonajeFuego`, `PersonajeAgua`, `PersonajeTierra`, `PersonajeAire` →
    heredan de `Personaje` y sobreescriben `atacar()` (polimorfismo).
  - `GeneradorPersonajes` → clase con métodos `static` para crear la cantidad
    de personajes que se le pida y agruparlos por elemento.
- **`js/generador-demo.js`** — conecta los botones de `generador.html` con
  `GeneradorPersonajes` (no define clases, solo usa las de `personajes-poo.js`).

## CSS

- **`css/styles.css`** — la base compartida por todo el sitio (paleta de
  colores, tipografías, layout del juego).
- **`css/generador.css`** — estilos propios de `generador.html` (barras de
  conteo por elemento, controles del formulario, lista de vista previa).
  Reutiliza las variables de `styles.css`, que se carga primero.

## Assets

Ver `assets/README.md` para el detalle de cada imagen.

## Estilo visual (tema de la portada)

El juego usa la misma estética que la portada: el paisaje (`assets/img/fondo-paisaje.jpg`) de fondo con un velo
oscuro suave, paneles de vidrio azul con borde celeste, títulos y botones en **Cinzel** con brillo celeste
(igual que el botón *Jugar*) y el título AVATAR sin fondo (`assets/img/titulo-avatar-transparente.png`).

## Modo partida (todo en una sola pantalla)

Al elegir personaje, `avatar.js` le agrega la clase `en-partida` al `<body>`. Con eso el
encabezado se achica (logo chico + título AVATAR en una fila) y, en pantallas anchas, el mapa
se ajusta al alto de la ventana. Así se ven a la vez el mapa, las vidas, los botones de ataque
y las cartas de cada jugada, sin tener que bajar la página. Además, el panel de **Reglas del juego** se mueve (desde `avatar.js`) justo debajo de las vidas y los
botones de ataque; se ve como una sola línea y, al abrirlo, el texto se despliega por encima de las cartas
sin mover nada. Los estilos están al final de
`css/styles.css` (sección *MODO PARTIDA*).

## Fondo, logo y capa animada

- **Fondo de la página:** `assets/img/fondo-paisaje.jpg` (con un velo oscuro suave encima para que los textos se lean).
- **Logo del encabezado:** `assets/img/logo-los-elementos.jpg`, grande y centrado en el mismo eje que el título.
- **Título AVATAR:** `assets/img/titulo-avatar-transparente.png` (sin fondo negro ni blanco).
- **Capa animada** (`.fondo-animado`, ocupa toda la pantalla): el lobo del Escuadrón
  (`lobo-escuadron.png`, se balancea) y la esfera de los 4 elementos (`esfera-elementos.png`, gira)
  recorren toda la pantalla con dos animaciones CSS por cada uno (`vagar-x` y `vagar-y`, con
  duraciones distintas). Van por delante del logo y por detrás de los paneles del juego, y no tapan
  ningún clic. Con `prefers-reduced-motion` quedan quietos en un rincón.

## Generador: explicación para novatos

En `generador.html`, la sección **¿Cómo funciona?** tiene dos opciones desplegables: una **explicación
sencilla** (con la analogía del molde de galletitas, paso a paso y un glosario en criollo) y otra **con
código** (la explicación técnica de siempre). Mientras haya una abierta suena `assets/audio/latidos.mp3`
(lo maneja `js/generador-sonido.js`); al cerrar las dos se apaga. El enlace **Volver al juego** del final es
ahora un botón grande y brillante, igual al botón *Jugar* de la portada.

## Volumen del audio

Todos los archivos de `assets/audio/` están **masterizados**: se les subió el volumen y se igualaron entre sí
(música a unos −13 LUFS, efectos y resultados a un nivel parecido), con un limitador para que no pasen de
−1,5 dB y no distorsionen. Por eso en el código casi todo va al volumen máximo (`volumen: 1`) y solo la
música está un poco más baja (`0.85` / `0.9`, en la tabla `TEMAS` de `js/audio.js`) para que los golpes se
escuchen por encima. Si hay que subir o bajar algo, se cambia ese número; si se reemplaza un archivo, conviene
igualarlo en volumen con los demás.

## Rivales en el mapa y choques

Al elegir personaje aparece el mapa con los **rivales parados** (cada uno cerca de su elemento: Katara junto al
lago, Aang junto al remolino, Zuko junto a la lava y Toph junto a las rocas, con su nombre arriba). El panel de la
derecha dice **«Buscá a tu rival»** y todavía no muestra los ataques. Se camina con las flechas y, **al chocar con
un rival, empieza el combate contra ese rival**: se frena el personaje, aparece el panel de ataques y los dos se
acomodan frente a frente (los otros rivales desaparecen del mapa).

- **Rivales:** instancias de la clase `Avatar` (`zukoEnemigo`, `kataraEnemigo`, `aangEnemigo`, `tophEnemigo`, en el
  array `enemigos`) al final de `js/avatar-clase.js`. Los dos últimos números del constructor son su posición `x, y`.
- **Choque:** `revisarColision()` en `js/avatar.js` compara los bordes del jugador y del rival; a cada dibujo se le
  descuentan `MARGEN_COLISION` píxeles de "aire", así solo cuenta cuando los cuerpos se tocan. `iniciarCombate()`
  arma el combate y `prepararDuelo()` los pone frente a frente.
- **Ataque favorito:** cada rival tiene su lista `ataques` con su favorito repetido (Zuko y Toph: Puño · Katara:
  Barrida · Aang: Patada), y `ataqueAleatorioEnemigo()` sortea de esa lista.
- Si elegís un personaje que se ve como Zuko (o uno de Fuego), no aparece otro Zuko en el mapa.

## Personajes: ahora son 6

Además de Zuko, Katara, Aang y Toph, se sumaron **Jake** (guerrero del hacha de agua) y **Terrón** (el bisonte de tierra).
Cada personaje usa dos imágenes: la de la **tarjeta de selección** (`assets/img/jake.png`, `terron.png`, con su nombre) y
las **dos poses del mapa**, sin fondo (`assets/img/mapa-jake-1.png` / `-2.png`, `mapa-terron-1.png` / `-2.png`): una
se usa de pie y la otra al caminar y al atacar, igual que en los demás.

- Están en el array `avatares` (los que se pueden elegir) y, como rivales, en `enemigos`, al final de `js/avatar-clase.js`.
  En el mapa, Jake está arriba junto al lago y Terrón abajo, entre las rocas y la lava.
- Ataque favorito como rival: **Jake, la Barrida** (su hacha barre en arco) y **Terrón, el Puño** (embiste de cabeza).
- Para sumar otro personaje: agregá sus dos imágenes, una instancia más en `avatares` y otra en `enemigos`, y su nombre en
  `PERSONAJES` y en `INPUTS_PERSONAJE` de `js/avatar.js`. Los nombres con tilde (como Terrón) se convierten con `aSlug()` para
  armar ids y nombres de archivo sin tilde (`terron`).
