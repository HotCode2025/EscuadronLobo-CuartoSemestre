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

function iniciarJuego() {
    sectionSeleccionarAtaque.style.display = 'none'
    sectionReiniciar.style.display = 'none'
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

    const personajeJugador = seleccionado ? seleccionado.nombre : personajeCustomSeleccionado
    spanPersonajeJugador.innerHTML = personajeJugador

    sectionSeleccionarAtaque.style.display = 'block' // mostramos
    sectionSeleccionarPersonaje.style.display = 'none' // ocultamos

    const personajeEnemigo = elegirPersonajeEnemigo(personajeJugador)
    spanPersonajeEnemigo.innerHTML = personajeEnemigo
}

function elegirPersonajeEnemigo(personajeJugador) {
    let personajeEnemigo = ''
    // Elegimos un personaje al azar de la lista y lo comparamos con el del
    // jugador; si coinciden, volvemos a sortear hasta que sean distintos
    while (personajeEnemigo === '' || personajeEnemigo === personajeJugador) {
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
    if (ataqueJugador === ataqueEnemigo) {
        crearMensaje('EMPATE')
    } else if (esVictoriaDelJugador(ataqueJugador, ataqueEnemigo)) {
        crearMensaje('GANASTE')
        restarVida('enemigo')
    } else {
        crearMensaje('PERDISTE')
        restarVida('jugador')
    }

    revisarVidas()
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
    // Va directo a sectionMensajes (no a la fila de rondas), así queda solo,
    // debajo de la fila, bien destacado
    crearImagenResultado(resultado, 'mensaje-resultado mensaje-resultado--final', sectionMensajes)

    // Reutilizamos el mismo arreglo de botones que ya armamos en iniciarJuego
    BOTONES_ATAQUE.forEach((boton) => {
        boton.disabled = true
    })
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
