/* =========================================================================
   Página de demostración del generador de personajes (POO)
   -------------------------------------------------------------------------
   Este archivo NO define ninguna clase: solo conecta los botones de
   generador.html con las clases de personajes-poo.js (que se carga antes,
   así que GeneradorPersonajes ya existe cuando este script se ejecuta).
   ========================================================================= */

/* --- Referencias del DOM (una sola vez, igual que en avatar.js) --- */
const inputCantidad = document.getElementById('input-cantidad')
const botonGenerar = document.getElementById('boton-generar')
const botonesPreset = document.querySelectorAll('.boton--preset')
const inputNombrePersonaje = document.getElementById('input-nombre-personaje')
const selectElementoPersonaje = document.getElementById('select-elemento-personaje')
const botonAgregarPersonaje = document.getElementById('boton-agregar-personaje')
const STORAGE_KEY_PERSONAJES = 'avatarPersonajesDisponibles'

const sectionResultado = document.getElementById('resultado')
const elResultadoTotal = document.getElementById('resultado-total')
const elResultadoTiempo = document.getElementById('resultado-tiempo')
const contenedorConteo = document.getElementById('resultado-conteo')
const listaPreview = document.getElementById('resultado-lista')

// Clase CSS (ver generador.css) que le toca a cada elemento
const CLASE_CSS_POR_ELEMENTO = {
    Fuego: 'fuego',
    Agua: 'agua',
    Tierra: 'tierra',
    Aire: 'aire',
}

const CANTIDAD_MAXIMA = 200000

function obtenerPersonajesDisponibles() {
    try {
        const personajes = JSON.parse(sessionStorage.getItem(STORAGE_KEY_PERSONAJES) || '[]')
        return Array.isArray(personajes) ? personajes : []
    } catch {
        return []
    }
}

function guardarPersonajesDisponibles(personajes) {
    sessionStorage.setItem(STORAGE_KEY_PERSONAJES, JSON.stringify(personajes))
    return personajes
}

function normalizarPersonajes(personajes) {
    return personajes
        .map((personaje) => ({
            nombre: String(personaje.nombre ?? '').trim(),
            elemento: String(personaje.elemento ?? 'Fuego').trim(),
        }))
        .filter((personaje) => personaje.nombre)
}

function quitarDuplicados(personajes) {
    const mapa = new Map()

    personajes.forEach((personaje) => {
        const clave = String(personaje.nombre ?? '').trim().toLowerCase()

        if (!clave) {
            return
        }

        if (!mapa.has(clave)) {
            mapa.set(clave, personaje)
        }
    })

    return [...mapa.values()]
}

function iniciar() {
    botonesPreset.forEach((boton) => {
        boton.addEventListener('click', () => {
            const cantidad = Number(boton.dataset.cantidad)
            inputCantidad.value = cantidad
            generarYMostrar(cantidad)
        })
    })

    botonGenerar.addEventListener('click', () => {
        const cantidad = Number(inputCantidad.value)
        generarYMostrar(cantidad)
    })

    botonAgregarPersonaje.addEventListener('click', () => {
        const nombre = inputNombrePersonaje.value
        const elemento = selectElementoPersonaje.value

        try {
            const personajes = GeneradorPersonajes.crearPersonajesPersonalizados(nombre, elemento)
            const personajesGuardados = obtenerPersonajesDisponibles()
            const nuevos = personajes.map((personaje) => ({
                nombre: personaje.nombre,
                elemento: personaje.elemento,
            }))

            guardarPersonajesDisponibles(quitarDuplicados([...personajesGuardados, ...nuevos]))
            mostrarResultado(personajes, 0)
            inputNombrePersonaje.value = ''
        } catch (error) {
            alert(error.message)
        }
    })
}

function generarYMostrar(cantidad) {
    if (!cantidad || cantidad < 1) {
        return
    }

    // Evita que alguien tipee un número gigante y trabe el navegador
    const cantidadFinal = Math.min(cantidad, CANTIDAD_MAXIMA)

    const inicio = performance.now()
    const personajes = GeneradorPersonajes.generar(cantidadFinal)
    const tiempoMs = performance.now() - inicio

    const personajesNormalizados = normalizarPersonajes(personajes)
    const personajesExistentes = obtenerPersonajesDisponibles()
    const listaUnificada = quitarDuplicados([
        ...personajesExistentes,
        ...personajesNormalizados,
    ])

    guardarPersonajesDisponibles(listaUnificada)
    mostrarResultado(personajes, tiempoMs)
}

function mostrarResultado(personajes, tiempoMs) {
    sectionResultado.classList.add('resultado--visible')

    elResultadoTotal.textContent = personajes.length
    elResultadoTiempo.textContent = tiempoMs.toFixed(1)

    mostrarConteoPorElemento(personajes)
    mostrarVistaPrevia(personajes)
}

function mostrarConteoPorElemento(personajes) {
    const conteo = GeneradorPersonajes.contarPorElemento(personajes)
    contenedorConteo.innerHTML = ''

    Object.entries(conteo).forEach(([elemento, cantidad]) => {
        contenedorConteo.appendChild(crearBarraElemento(elemento, cantidad, personajes.length))
    })
}

// Reutilizable: arma la fila "Fuego ████░░ 253" para un elemento
function crearBarraElemento(elemento, cantidad, total) {
    const porcentaje = Math.round((cantidad / total) * 100)
    const claseColor = CLASE_CSS_POR_ELEMENTO[elemento]

    const fila = document.createElement('div')
    fila.className = `barra-elemento barra-elemento--${claseColor}`

    const etiqueta = document.createElement('span')
    etiqueta.className = 'barra-elemento__etiqueta'
    etiqueta.textContent = elemento

    const pista = document.createElement('div')
    pista.className = 'barra-elemento__pista'

    const relleno = document.createElement('div')
    relleno.className = 'barra-elemento__relleno'
    relleno.style.width = porcentaje + '%'
    pista.appendChild(relleno)

    const valor = document.createElement('span')
    valor.className = 'barra-elemento__valor'
    valor.textContent = cantidad

    fila.append(etiqueta, pista, valor)
    return fila
}

function mostrarVistaPrevia(personajes) {
    listaPreview.innerHTML = ''

    personajes.slice(0, 20).forEach((personaje) => {
        const item = document.createElement('li')
        item.textContent = personaje.describir()
        listaPreview.appendChild(item)
    })
}

iniciar()
