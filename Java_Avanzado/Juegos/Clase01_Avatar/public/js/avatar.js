/* =========================================================================
   AVATAR: LA LEYENDA DE AANG — Lógica del juego
   -------------------------------------------------------------------------
   PRINCIPIO DRY (Don't Repeat Yourself / No te repitas):
   En vez de escribir document.getElementById(...) una y otra vez adentro de
   cada función (como estaba antes), lo hacemos UNA sola vez acá arriba y
   guardamos la referencia en una variable global. Así:
     1) El navegador busca cada elemento en el DOM una sola vez, no en cada
        click ni en cada combate → el juego gasta menos recursos.
     2) Si mañana cambia un id en el HTML, se corrige en un solo lugar.
     3) Cualquier función puede reutilizar la misma variable, en vez de
        volver a declararla.

   Como el <script> está al final del <body> (justo antes de cerrarlo), el
   HTML ya está completamente parseado cuando este archivo se ejecuta, así
   que es seguro buscar los elementos apenas arranca el archivo.
   ========================================================================= */

/* --- Secciones del tablero (se muestran/ocultan según el momento del juego) --- */
const sectionSeleccionarPersonaje = document.getElementById('seleccionar-personaje')
const sectionSeleccionarAtaque = document.getElementById('seleccionar-ataque')
const sectionMensajes = document.getElementById('mensajes')
const contenedorRondas = document.getElementById('resultados-rondas')
const sectionReiniciar = document.getElementById('reiniciar')
const sectionVerMapa = document.getElementById('ver-mapa')
const sectionReglas = document.getElementById('reglas')
const escenario = document.getElementById('escenario') // mapa + combate, juntos

/* --- Mapa (canvas): "mapa" es el elemento y "lienzo" es el contexto 2D con
   el que dibujamos sobre él (drawImage, clearRect, etc.) --- */
const mapa = document.getElementById('mapa')
const lienzo = mapa.getContext('2d')

/* --- Inputs de selección de personaje --- */
const inputZuko = document.getElementById('zuko')
const inputKatara = document.getElementById('katara')
const inputAang = document.getElementById('aang')
const inputToph = document.getElementById('toph')
const selectPersonajeCustom = document.getElementById('select-personaje-custom')
const botonLimpiarPersonajes = document.getElementById('boton-limpiar-personajes')
const STORAGE_KEY_PERSONAJES = 'avatarPersonajesDisponibles'

/* --- Textos que se actualizan durante la partida --- */
const spanPersonajeJugador = document.getElementById('personaje-jugador')
const spanPersonajeEnemigo = document.getElementById('personaje-enemigo')
const spanVidasJugador = document.getElementById('vidas-jugador')
const spanVidasEnemigo = document.getElementById('vidas-enemigo')
const contenedorVidasJugador = document.getElementById('vidas-jugador-corazones')
const contenedorVidasEnemigo = document.getElementById('vidas-enemigo-corazones')

/* --- Botones --- */
const botonPersonaje = document.getElementById('boton-personaje')
const botonPunio = document.getElementById('boton-punio')
const botonPatada = document.getElementById('boton-patada')
const botonBarrida = document.getElementById('boton-barrida')
const botonReiniciar = document.getElementById('boton-reiniciar')
const botonSonido = document.getElementById('boton-sonido')

/* --- Datos del juego ---
   Guardarlos en arreglos permite recorrerlos con un loop en vez de repetir
   el mismo bloque de código una vez por personaje o por ataque. */
const PERSONAJES = ['Zuko', 'Katara', 'Aang', 'Toph']
const ATAQUES = ['Punio', 'Patada', 'Barrida']
const BOTONES_ATAQUE = [botonPunio, botonPatada, botonBarrida] // mismo orden que ATAQUES

let INPUTS_PERSONAJE = [
    { input: inputZuko, nombre: 'Zuko' },
    { input: inputKatara, nombre: 'Katara' },
    { input: inputAang, nombre: 'Aang' },
    { input: inputToph, nombre: 'Toph' },
]

// Puño vence a Barrida, Patada vence a Puño, Barrida vence a Patada
const COMBOS_GANADORES = [
    { jugador: 'Punio', enemigo: 'Barrida' },
    { jugador: 'Patada', enemigo: 'Punio' },
    { jugador: 'Barrida', enemigo: 'Patada' },
]

// Una imagen por cada resultado posible de una ronda (y del resultado final)
const IMAGENES_RESULTADO = {
    GANASTE: './assets/img/ganaste.png',
    PERDISTE: './assets/img/perdiste.png',
    EMPATE: './assets/img/empate.png',
}

/* --- Estado de la partida (cambian mientras se juega) --- */
let ataqueJugador
let ataqueEnemigo
let vidasJugador = 3
let vidasEnemigo = 3

/* --- Estado del mapa ---
   personajeJugador / personajeEnemigo guardan el NOMBRE elegido (texto);
   los "...Objeto" guardan el objeto Avatar completo (con x, y, velocidad...).
   Los declaramos acá, globales, para que las funciones del mapa los
   compartan, y se les asigna el valor recién cuando se elige personaje. */
let personajeJugador
let personajeEnemigo
let personajeJugadorObjeto
let personajeEnemigoObjeto
let intervalo // guarda el setInterval que repinta el mapa, para poder frenarlo
let temporizadorSonidoEmpate // espera del sonido de empate de la última ronda (se cancela si empieza otra)

// Imagen de fondo del mapa: la creamos y le damos el src apenas arranca el
// archivo para que ya esté cargada cuando se dibuje por primera vez
const VELOCIDAD = 5 // píxeles que avanza el personaje en cada repintado (cada 30 ms)
let mapaBackground = new Image()
mapaBackground.src = './assets/img/mapa.jpg'

function cargarPersonajesCustom() {
    try {
        const personajes = JSON.parse(sessionStorage.getItem(STORAGE_KEY_PERSONAJES) || '[]')
        return Array.isArray(personajes) ? personajes : []
    } catch {
        return []
    }
}

function renderizarPersonajesCustom() {
    const personajesCustom = cargarPersonajesCustom()

    if (!selectPersonajeCustom) {
        return
    }

    selectPersonajeCustom.innerHTML = '<option value="">Elegí un personaje disponible</option>'

    if (personajesCustom.length === 0) {
        const opcion = document.createElement('option')
        opcion.value = ''
        opcion.textContent = 'Creá personajes desde el generador'
        opcion.disabled = true
        selectPersonajeCustom.appendChild(opcion)
        return
    }

    personajesCustom.forEach((personaje) => {
        const opcion = document.createElement('option')
        opcion.value = personaje.nombre
        opcion.textContent = `${personaje.nombre} (${personaje.elemento})`
        selectPersonajeCustom.appendChild(opcion)
    })
}

function limpiarPersonajesCustom() {
    sessionStorage.removeItem(STORAGE_KEY_PERSONAJES)
    renderizarPersonajesCustom()
}

/* =========================================================================
   Sonido (la música y los efectos están en audio.js, objeto "Sonido")
   ========================================================================= */

function actualizarBotonSonido() {
    botonSonido.textContent = Sonido.estaSilenciado() ? '🔇' : '🔊'
}

function inicializarSonido() {
    // La música del menú queda "anotada": los navegadores no dejan sonar nada
    // hasta que la persona toca la página, así que arranca en el primer
    // click o tecla (o apenas el navegador lo permita)
    Sonido.musica('menu')
    actualizarBotonSonido()

    const arrancarSonido = (evento) => {
        // Si el primer toque fue en el botón de sonido, lo maneja el botón
        if (evento.target.closest && evento.target.closest('#boton-sonido')) {
            return
        }
        Sonido.iniciar()
        window.removeEventListener('pointerdown', arrancarSonido)
        window.removeEventListener('keydown', arrancarSonido)
    }
    window.addEventListener('pointerdown', arrancarSonido)
    window.addEventListener('keydown', arrancarSonido)

    botonSonido.addEventListener('click', () => {
        const yaEstabaActivo = Sonido.estaActivo()
        Sonido.iniciar()
        // Primer click con el sonido todavía apagado: alcanza con encenderlo,
        // salvo que estuviera silenciado de antes (ahí lo reactivamos)
        if (yaEstabaActivo || Sonido.estaSilenciado()) {
            Sonido.alternar()
        }
        actualizarBotonSonido()
    })

    Sonido.iniciar() // por si el navegador ya permite audio sin tocar nada
}

function iniciarJuego() {
    inicializarSonido()
    sectionSeleccionarAtaque.style.display = 'none'
    sectionReiniciar.style.display = 'none'
    sectionVerMapa.style.display = 'none'
    renderizarPersonajesCustom()

    botonPersonaje.addEventListener('click', seleccionarPersonajeJugador)
    botonReiniciar.addEventListener('click', reiniciarJuego)

    if (botonLimpiarPersonajes) {
        botonLimpiarPersonajes.addEventListener('click', limpiarPersonajesCustom)
    }

    // Un solo loop registra el escuchador de los 3 botones de ataque,
    // en vez de repetir addEventListener 3 veces
    BOTONES_ATAQUE.forEach((boton, indice) => {
        boton.addEventListener('click', () => elegirAtaque(ATAQUES[indice]))
    })
}

function seleccionarPersonajeJugador() {
    // Buscamos, dentro del arreglo, cuál input quedó marcado
    const seleccionado = INPUTS_PERSONAJE.find((personaje) => personaje.input.checked)
    const personajeCustomSeleccionado = selectPersonajeCustom && selectPersonajeCustom.value

    if (!seleccionado && !personajeCustomSeleccionado) {
        mostrarError('Selecciona un personaje')
        return
    }

    personajeJugador = seleccionado ? seleccionado.nombre : personajeCustomSeleccionado
    spanPersonajeJugador.innerHTML = personajeJugador

    // Batalla: la música de la pantalla anterior se apaga (con fundido) y arranca la música
    // épica, que suena en loop todo el tiempo que se juega, hasta que termina la partida
    Sonido.musica('batalla')

    sectionSeleccionarAtaque.style.display = 'block' // mostramos
    sectionSeleccionarPersonaje.style.display = 'none' // ocultamos

    personajeEnemigo = elegirPersonajeEnemigo(personajeJugador)
    spanPersonajeEnemigo.innerHTML = personajeEnemigo

    // El mapa se inicia ACÁ, después de saber quién es el jugador y quién el
    // enemigo: iniciarMapa() necesita esos dos nombres para buscar sus objetos
    // (si se llamara antes, las variables todavía serían undefined)
    sectionVerMapa.style.display = 'flex'
    escenario.classList.add('escenario--activo') // muestra mapa y combate juntos
    document.body.classList.add('en-partida') // modo compacto: todo entra en una pantalla

    // Las reglas pasan a estar justo DEBAJO de las vidas y los botones de ataque, así
    // se pueden consultar sin irse de la zona de combate (antes de jugar quedan al
    // final de la página). Es el mismo elemento: solo cambia de lugar en el HTML.
    sectionSeleccionarAtaque.after(sectionReglas)
    iniciarMapa()

    // Con el encabezado achicado, todo el escenario entra arriba de la página:
    // volvemos al principio para verlo completo (sin tener que bajar)
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* =========================================================================
   Mapa y movimiento con el teclado
   ========================================================================= */

function iniciarMapa() {
    mapa.width = ANCHO_MAPA
    mapa.height = ALTO_MAPA

    // Buscamos el objeto Avatar completo de cada uno y lo guardamos en las
    // variables globales para que todas las funciones de movimiento lo usen
    personajeJugadorObjeto = obtenerObjetoPersonaje(personajeJugador)
    personajeEnemigoObjeto = obtenerObjetoPersonaje(personajeEnemigo)

    intervalo = setInterval(pintarCanvas, 30) // repinta el mapa cada 30 ms

    window.addEventListener('keydown', sePresionoUnaTecla) // al apretar una tecla
    window.addEventListener('keyup', detenerMovimiento) // al soltarla, frena
}

// Antes se llamaba pintarPersonaje, pero ya no pinta solo al personaje: pinta
// todo el canvas (fondo + jugador + enemigo), por eso el nombre nuevo
function pintarCanvas() {
    // 1) Actualizamos la posición según la velocidad actual
    personajeJugadorObjeto.x += personajeJugadorObjeto.velocidadX
    personajeJugadorObjeto.y += personajeJugadorObjeto.velocidadY

    // 2) Evitamos que el personaje se salga del mapa
    personajeJugadorObjeto.x = Math.max(0, Math.min(mapa.width - personajeJugadorObjeto.ancho, personajeJugadorObjeto.x))
    personajeJugadorObjeto.y = Math.max(0, Math.min(mapa.height - personajeJugadorObjeto.alto, personajeJugadorObjeto.y))

    // 3) Limpiamos y dibujamos: primero el fondo, después los personajes
    lienzo.clearRect(0, 0, mapa.width, mapa.height)
    lienzo.drawImage(mapaBackground, 0, 0, mapa.width, mapa.height)
    // El que está más abajo en el mapa (y mayor) se dibuja al final, así queda
    // por delante del otro: da sensación de profundidad
    ;[personajeEnemigoObjeto, personajeJugadorObjeto]
        .sort((a, b) => a.y - b.y)
        .forEach((avatar) => avatar.pintarAvatar(lienzo))

    // Los efectos de ataque van al final, por encima de todo
    personajeEnemigoObjeto.pintarEfecto(lienzo)
    personajeJugadorObjeto.pintarEfecto(lienzo)
}

function sePresionoUnaTecla(event) {
    // event es un objeto que trae toda la info del evento; event.key dice
    // qué tecla se apretó
    switch (event.key) {
        case 'ArrowUp':
            event.preventDefault() // evita que la flecha también haga scroll
            Sonido.pasos(true)
            moverArriba()
            break
        case 'ArrowDown':
            event.preventDefault()
            Sonido.pasos(true)
            moverAbajo()
            break
        case 'ArrowLeft':
            event.preventDefault()
            Sonido.pasos(true)
            moverIzquierda()
            break
        case 'ArrowRight':
            event.preventDefault()
            Sonido.pasos(true)
            moverDerecha()
            break
        default:
            break
    }
}

function moverArriba() {
    personajeJugadorObjeto.velocidadY = -VELOCIDAD
}

function moverAbajo() {
    personajeJugadorObjeto.velocidadY = VELOCIDAD
}

function moverIzquierda() {
    personajeJugadorObjeto.velocidadX = -VELOCIDAD
}

function moverDerecha() {
    personajeJugadorObjeto.velocidadX = VELOCIDAD
}

function detenerMovimiento() {
    Sonido.pasos(false) // al frenar, dejan de sonar los pasos
    personajeJugadorObjeto.velocidadX = 0
    personajeJugadorObjeto.velocidadY = 0
}

// Cada elemento se dibuja en el mapa con el aspecto de un personaje base:
// Fuego → Zuko, Agua → Katara, Tierra → Toph, Aire → Aang
const PERSONAJE_POR_ELEMENTO = { fuego: 'Zuko', agua: 'Katara', tierra: 'Toph', aire: 'Aang' }

// Devuelve el personaje base (Zuko, Katara, Aang o Toph) cuyo aspecto le toca a
// "nombre". Los 4 principales son su propia base; los personalizados (creados en
// el generador) usan la base de su elemento. Si no se puede saber, devuelve ''.
function personajeBaseDe(nombre) {
    if (PERSONAJES.includes(nombre)) {
        return nombre
    }
    const personalizado = cargarPersonajesCustom().find((personaje) => personaje.nombre === nombre)
    const elemento = personalizado ? String(personalizado.elemento).trim().toLowerCase() : ''
    return PERSONAJE_POR_ELEMENTO[elemento] || ''
}

// Recorre el array "avatares" (creado en avatar-clase.js) y devuelve el
// objeto completo del personaje cuyo nombre coincide. Si el nombre no está (un
// personaje creado desde el generador), devuelve un Avatar nuevo con ese nombre
// pero con el aspecto de su elemento, para que el mapa lo dibuje igual.
function obtenerObjetoPersonaje(nombre) {
    for (let i = 0; i < avatares.length; i++) {
        if (nombre === avatares[i].nombre) {
            return avatares[i]
        }
    }

    const base = personajeBaseDe(nombre).toLowerCase() // ej: 'zuko'
    if (base) {
        return new Avatar(
            nombre,
            `./assets/img/${base}.png`,
            3,
            `./assets/img/mapa-${base}-1.png`,
            `./assets/img/mapa-${base}-2.png`
        )
    }

    // Último recurso (elemento desconocido): el emblema de los 4 elementos
    return new Avatar(nombre, './assets/img/emblema-elementos.png', 3)
}

function elegirPersonajeEnemigo(personajeJugador) {
    let personajeEnemigo = ''
    // Elegimos un personaje al azar de la lista y lo comparamos con el del
    // jugador; si coinciden, volvemos a sortear hasta que sean distintos
    // (se compara con la base del jugador: si elegiste un personaje de Fuego,
    // el enemigo no puede ser Zuko porque se verían iguales en el mapa)
    const baseJugador = personajeBaseDe(personajeJugador)
    while (personajeEnemigo === '' || personajeEnemigo === baseJugador) {
        const indiceAleatorio = Math.floor(Math.random() * PERSONAJES.length)
        personajeEnemigo = PERSONAJES[indiceAleatorio]
    }
    return personajeEnemigo
}

function mostrarError(texto) {
    const parrafo = crearParrafo(texto, sectionSeleccionarPersonaje)
    parrafo.style.color = 'red'

    setTimeout(() => {
        sectionSeleccionarPersonaje.removeChild(parrafo)
    }, 2000)
}

function elegirAtaque(ataque) {
    ataqueJugador = ataque
    ataqueAleatorioEnemigo()
}

function ataqueAleatorioEnemigo() {
    const indiceAleatorio = Math.floor(Math.random() * ATAQUES.length)
    ataqueEnemigo = ATAQUES[indiceAleatorio]
    combate()
}

function combate() {
    // Si quedó sonando (o por sonar) el resultado de la ronda anterior, se corta:
    // empieza una ronda nueva
    clearTimeout(temporizadorSonidoEmpate)
    Sonido.cortarResultado()

    // Los dos personajes ejecutan en el mapa el ataque que eligieron
    animarAtaques()

    if (ataqueJugador === ataqueEnemigo) {
        crearMensaje('EMPATE')
        // Ronda empatada: suena el sonido de empate cuando terminan los golpes
        temporizadorSonidoEmpate = setTimeout(() => Sonido.efecto('finalEmpatado'), DURACION_ATAQUE + 250)
    } else if (esVictoriaDelJugador(ataqueJugador, ataqueEnemigo)) {
        crearMensaje('GANASTE')
        restarVida('enemigo')
        personajeEnemigoObjeto.recibirGolpe() // el enemigo parpadea: perdió la ronda
        sonarGolpeRecibido()
    } else {
        crearMensaje('PERDISTE')
        restarVida('jugador')
        personajeJugadorObjeto.recibirGolpe()
        sonarGolpeRecibido()
    }

    revisarVidas()
}

// Cada personaje hace en el mapa el ataque que eligió (puño, patada o barrida),
// mirando y lanzándose hacia su oponente
function animarAtaques() {
    personajeJugadorObjeto.atacar(ataqueJugador, personajeEnemigoObjeto)
    personajeEnemigoObjeto.atacar(ataqueEnemigo, personajeJugadorObjeto)

    // Cada ataque suena: el del enemigo un poco más bajo y apenas después
    Sonido.efecto(ataqueJugador)
    setTimeout(() => Sonido.efecto(ataqueEnemigo, 0.75), 80)
}

// El golpe del que pierde la ronda suena justo cuando el ataque rival llega
// (a la mitad de la animación), igual que el parpadeo en el mapa
function sonarGolpeRecibido() {
    setTimeout(() => Sonido.efecto('golpe'), DURACION_ATAQUE / 2)
}

function esVictoriaDelJugador(ataqueJugador, ataqueEnemigo) {
    // Recorremos los combos ganadores en vez de escribir un if por cada uno
    return COMBOS_GANADORES.some(
        (combo) => combo.jugador === ataqueJugador && combo.enemigo === ataqueEnemigo
    )
}

function restarVida(quien) {
    if (quien === 'jugador') {
        vidasJugador--
        spanVidasJugador.innerHTML = vidasJugador
        actualizarCorazones(contenedorVidasJugador, vidasJugador)
    } else {
        vidasEnemigo--
        spanVidasEnemigo.innerHTML = vidasEnemigo
        actualizarCorazones(contenedorVidasEnemigo, vidasEnemigo)
    }
}

// Recorre los corazones del contenedor y "apaga" (con animación) los que ya
// se perdieron, según cuántas vidas quedan
function actualizarCorazones(contenedor, vidasRestantes) {
    const corazones = contenedor.querySelectorAll('.vidas__corazon')
    corazones.forEach((corazon, indice) => {
        corazon.classList.toggle('vidas__corazon--perdido', indice >= vidasRestantes)
    })
}

function revisarVidas() {
    if (vidasEnemigo === 0) {
        crearMensajeFinal('GANASTE')
    } else if (vidasJugador === 0) {
        crearMensajeFinal('PERDISTE')
    }
}

function crearMensajeFinal(resultado) {
    sectionReiniciar.style.display = 'block'
    detenerMapa()

    // La música épica sigue sonando mientras se ve el último golpe, y recién después se
    // apaga suavemente; justo cuando se está yendo, suena el sonido del resultado final
    // (ganaste o perdiste). Así los golpes, la música y el resultado no se pisan.
    setTimeout(() => Sonido.musica(null), DURACION_ATAQUE + 300)
    setTimeout(
        () => Sonido.efecto(resultado === 'GANASTE' ? 'finalGanado' : 'finalPerdido'),
        DURACION_ATAQUE + 550
    )

    // Va directo a sectionMensajes (no a la fila de rondas), así queda solo,
    // debajo de la fila, bien destacado
    crearImagenResultado(resultado, 'mensaje-resultado mensaje-resultado--final', sectionMensajes)

    // Reutilizamos el mismo arreglo de botones que ya armamos en iniciarJuego
    BOTONES_ATAQUE.forEach((boton) => {
        boton.disabled = true
    })
}

// Frena el repintado del mapa y deja de escuchar el teclado (fin de partida)
function detenerMapa() {
    // El personaje deja de responder al teclado ya mismo...
    window.removeEventListener('keydown', sePresionoUnaTecla)
    window.removeEventListener('keyup', detenerMovimiento)
    detenerMovimiento()

    // ...pero el mapa sigue repintándose un momento más, para que se llegue a
    // ver completa la animación del último golpe
    setTimeout(() => clearInterval(intervalo), DURACION_ATAQUE + 600)
}

function crearMensaje(resultado) {
    // Cada ronda se agrega a la fila de resultados, para que no crezca hacia abajo
    crearImagenResultado(resultado, 'mensaje-resultado', contenedorRondas)
}

// Reutilizable: crea la imagen de GANASTE/PERDISTE/EMPATE que corresponda y
// la agrega al contenedor indicado. La usan tanto cada ronda (crearMensaje,
// contenedorRondas) como el resultado final de la partida (crearMensajeFinal,
// sectionMensajes). Además de la clase base, suma un modificador con el
// resultado (mensaje-resultado--ganaste, --perdiste o --empate) para poder
// darle a cada uno su propio fondo llamativo en el CSS
function crearImagenResultado(resultado, clase, contenedor) {
    const imagen = document.createElement('img')
    imagen.src = IMAGENES_RESULTADO[resultado]
    imagen.alt = resultado
    imagen.className = clase + ' mensaje-resultado--' + resultado.toLowerCase()
    contenedor.appendChild(imagen)
    return imagen
}

// Función reutilizable: crea un <p>, le pone el texto y lo agrega al
// contenedor indicado. La usan crearMensaje, crearMensajeFinal y
// mostrarError, en vez de que cada una repita createElement + appendChild
function crearParrafo(texto, contenedor) {
    const parrafo = document.createElement('p')
    parrafo.innerHTML = texto
    contenedor.appendChild(parrafo)
    return parrafo
}

function reiniciarJuego() {
    location.reload()
}

// Como el script ya está al final del <body>, el DOM está listo apenas se
// ejecuta este archivo: no hace falta esperar el evento 'load' (que además
// demora hasta que terminen de cargar imágenes y estilos)
iniciarJuego()
