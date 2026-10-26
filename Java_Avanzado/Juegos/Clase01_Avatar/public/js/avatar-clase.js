/* =========================================================================
   AVATAR: LA LEYENDA DE AANG — Clase 01: Clases, objetos y arrays
   -------------------------------------------------------------------------
   Este archivo es el ejercicio básico de la Clase 01 (POO):
     1) Definir una clase Avatar con su constructor.
     2) Instanciar objetos a partir de esa clase (Zuko, Katara, Aang, Toph).
     3) Guardar esas instancias dentro de un array llamado "avatares".
     4) Recorrer/inspeccionar ese array con console.log, push, pop y length.

   Es un paso intermedio y didáctico: más simple que la clase Personaje de
   personajes-poo.js (que ya usa herencia, campos privados y polimorfismo),
   pero ya con objetos de verdad en vez de simples strings sueltos como los
   que usa avatar.js (PERSONAJES = ['Zuko', 'Katara', ...]).
   ========================================================================= */

// Tamaño del mapa (canvas). Lo definimos acá porque Avatar necesita saberlo
// para ubicarse al azar dentro del mapa; avatar.js lo reutiliza.
const ANCHO_MAPA = 640
const ALTO_MAPA = 500
const TAMANIO_AVATAR = 90

// Animación de combate en el mapa
const DURACION_ATAQUE = 650 // ms que dura el ataque de cada personaje
const ALCANCE_ATAQUE = { Punio: 70, Patada: 90, Barrida: 110 } // px que avanza
const EMOJI_ATAQUE = { Punio: '👊', Patada: '🦵', Barrida: '🧹' }

// Devuelve un número entero al azar entre min y max (ambos incluidos)
function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

class Avatar {
    // imagen = foto de la tarjeta de selección; imagenMapa1/2 = las dos poses
    // (con fondo transparente) que se usan para dibujarlo en el mapa
    constructor(nombre, imagen, vidas, imagenMapa1 = imagen, imagenMapa2 = imagenMapa1) {
        this.nombre = nombre
        this.imagen = imagen
        this.vidas = vidas
        this.ataques = ['Punio', 'Patada', 'Barrida']

        // --- Datos para dibujarlo en el mapa (canvas) ---
        this.ancho = TAMANIO_AVATAR
        this.alto = TAMANIO_AVATAR
        this.x = aleatorio(0, ANCHO_MAPA - this.ancho)
        this.y = aleatorio(0, ALTO_MAPA - this.alto)
        this.mapaFoto = new Image()
        this.mapaFoto.src = imagenMapa1
        this.mapaFoto2 = new Image() // segunda pose: se alterna al caminar
        this.mapaFoto2.src = imagenMapa2
        this.velocidadX = 0
        this.velocidadY = 0
        this.mirandoIzquierda = false
        this.ataqueActual = null // ataque que se está animando (si hay)
        this.golpeInicio = 0 // cuándo empieza a parpadear por un golpe recibido
        this.efectoVisible = null // emoji/destello del ataque, si hay uno en pantalla
    }

    // Ejecuta un ataque (Punio, Patada o Barrida) en el mapa: el personaje se
    // lanza hacia su oponente y vuelve. pintarAvatar() se encarga de animarlo.
    atacar(tipo, oponente) {
        const dx = oponente.x - this.x
        const dy = oponente.y - this.y
        const distancia = Math.hypot(dx, dy) || 1

        this.mirandoIzquierda = dx < 0 // se da vuelta para mirar al oponente
        this.ataqueActual = {
            tipo: tipo,
            inicio: Date.now(),
            // dirección (de largo 1) hacia el oponente
            ux: dx / distancia,
            uy: dy / distancia,
            // cuánto avanza: nunca más del 60% de la distancia que los separa
            alcance: Math.min(distancia * 0.6, ALCANCE_ATAQUE[tipo] || 80),
        }
    }

    // Marca que este avatar pierde la ronda: parpadea y se sacude un instante,
    // justo cuando el golpe del rival llega (a la mitad de la animación)
    recibirGolpe() {
        this.golpeInicio = Date.now() + DURACION_ATAQUE / 2
    }

    // Cada avatar sabe dibujarse a sí mismo en el lienzo que le pasen
    pintarAvatar(lienzo) {
        const ahora = Date.now()
        const seMueve = this.velocidadX !== 0 || this.velocidadY !== 0

        // --- Ataque en curso: calculamos cuánto se desplaza en este instante ---
        let desplazaX = 0
        let desplazaY = 0 // avance por el piso (la sombra lo acompaña)
        let salto = 0 // altura sobre el piso (la sombra se queda abajo)
        let escalaY = 1
        let efecto = null

        if (this.ataqueActual) {
            const a = this.ataqueActual
            const t = (ahora - a.inicio) / DURACION_ATAQUE // progreso: 0 → 1
            if (t >= 1) {
                this.ataqueActual = null
            } else {
                const ida = Math.sin(Math.PI * t) // 0 → 1 → 0: va y vuelve
                desplazaX = a.ux * a.alcance * ida
                desplazaY = a.uy * a.alcance * ida
                if (a.tipo === 'Patada') salto = 45 * ida // salta al patear
                if (a.tipo === 'Barrida') escalaY = 1 - 0.25 * ida // se agacha al barrer
                efecto = { tipo: a.tipo, t: t, ida: ida, ux: a.ux, uy: a.uy, alcance: a.alcance }
            }
        } else if (this.velocidadX !== 0) {
            this.mirandoIzquierda = this.velocidadX < 0 // mira hacia donde camina
        }

        // --- Golpe recibido: parpadeo + sacudida de 400 ms ---
        let transparencia = 1
        let sacudida = 0
        const sdesdeGolpe = ahora - this.golpeInicio
        if (sdesdeGolpe >= 0 && sdesdeGolpe < 400) {
            sacudida = Math.sin(sdesdeGolpe / 25) * 5
            transparencia = Math.floor(sdesdeGolpe / 60) % 2 === 0 ? 0.45 : 1
        }

        // Al caminar alterna las dos poses cada 150 ms; quieto, la primera.
        // Al atacar usa la segunda pose (la más "de combate").
        const usarPose2 = efecto ? true : seMueve && Math.floor(ahora / 150) % 2 === 1
        const foto = usarPose2 ? this.mapaFoto2 : this.mapaFoto

        const centroX = this.x + this.ancho / 2 + desplazaX + sacudida
        const pies = this.y + this.alto + desplazaY

        // Sombra en el piso: da sensación de profundidad (efecto 3D)
        lienzo.fillStyle = 'rgba(0, 0, 0, 0.28)'
        lienzo.beginPath()
        lienzo.ellipse(centroX, pies - 6, this.ancho * 0.33 * (1 - salto / 150), 8, 0, 0, Math.PI * 2)
        lienzo.fill()

        // Personaje: anclado en los pies; se espeja si mira a la izquierda
        lienzo.save()
        lienzo.globalAlpha = transparencia
        lienzo.translate(centroX, pies - salto)
        lienzo.scale(this.mirandoIzquierda ? -1 : 1, escalaY)
        lienzo.drawImage(foto, -this.ancho / 2, -this.alto, this.ancho, this.alto)
        lienzo.restore()

        // Guardamos el efecto del ataque; se dibuja aparte (pintarEfecto) y DESPUÉS
        // de los dos personajes, para que el otro avatar no lo tape
        if (efecto) {
            const adelante = 45 // a un paso por delante del personaje (que ya viene desplazado)
            this.efectoVisible = {
                emoji: EMOJI_ATAQUE[efecto.tipo] || '💥',
                transparencia: Math.sin(Math.PI * efecto.t),
                grande: efecto.ida,
                x: centroX + efecto.ux * adelante,
                y: pies - this.alto / 2 - salto + efecto.uy * adelante,
            }
        } else {
            this.efectoVisible = null
        }
    }

    // Destello + emoji del ataque (sale hacia el oponente, crece y se desvanece)
    pintarEfecto(lienzo) {
        const e = this.efectoVisible
        if (!e) {
            return
        }
        lienzo.save()
        lienzo.globalAlpha = e.transparencia
        lienzo.strokeStyle = '#ffd24a'
        lienzo.lineWidth = 4
        lienzo.beginPath()
        lienzo.arc(e.x, e.y, 12 + 20 * e.grande, 0, Math.PI * 2)
        lienzo.stroke()
        lienzo.font = `${30 + 22 * e.grande}px serif`
        lienzo.textAlign = 'center'
        lienzo.textBaseline = 'middle'
        lienzo.fillText(e.emoji, e.x, e.y)
        lienzo.restore()
    }
}

/* --- Instanciamos un Avatar por cada personaje del juego --- */
let zuko = new Avatar('Zuko', './assets/img/zuko.png', 3, './assets/img/mapa-zuko-1.png', './assets/img/mapa-zuko-2.png')
let katara = new Avatar('Katara', './assets/img/katara.png', 3, './assets/img/mapa-katara-1.png', './assets/img/mapa-katara-2.png')
let aang = new Avatar('Aang', './assets/img/aang.png', 3, './assets/img/mapa-aang-1.png', './assets/img/mapa-aang-2.png')
let toph = new Avatar('Toph', './assets/img/toph.png', 3, './assets/img/mapa-toph-1.png', './assets/img/mapa-toph-2.png')

/* --- Creamos el array vacío y cargamos las instancias con push --- */
let avatares = []
avatares.push(zuko, katara, aang, toph)

// Vemos el resultado: 4 objetos Avatar dentro del array
console.log('Avatares cargados:', avatares)
console.log('Cantidad de avatares (length):', avatares.length)

/* --- pop(): saca (y devuelve) el último elemento del array ---
   Lo guardamos en una variable aparte para no perder la referencia,
   y lo volvemos a agregar para no alterar el array que usa el resto
   del juego. Así queda documentado cómo se usa, sin romper nada. */
let ultimoAvatar = avatares.pop()
console.log('Último avatar sacado con pop():', ultimoAvatar.nombre)
console.log('Cantidad luego de pop():', avatares.length)

avatares.push(ultimoAvatar) // lo reinsertamos
console.log('Cantidad luego de volver a hacer push():', avatares.length)

/* =========================================================================
   Ciclos: manipulando el DOM con iteradores
   -------------------------------------------------------------------------
   Ahora que tenemos el array "avatares" con los 4 objetos Avatar, en vez de
   escribir las 4 tarjetas de personaje a mano en el HTML, las generamos
   dinámicamente recorriendo el array con forEach().

   Este bloque corre ANTES que avatar.js (mirá el orden de los <script> en
   avatar.html), así que cuando avatar.js busca document.getElementById
   ('zuko'), ('katara'), etc., esos inputs ya existen en el DOM porque los
   creamos acá.
   ========================================================================= */

// Capturamos el elemento en el HTML donde vamos a inyectar las tarjetas
const contenedorTarjetas = document.getElementById('contenedorTarjetas')

// Variable global que reutilizamos dentro del forEach para armar cada tarjeta
let opcionAvatares

// Recorremos el array de avatares y por cada uno armamos su tarjeta con
// template literals (backticks), respetando las mismas clases CSS y el
// mismo id/value que ya usaba la versión estática de avatar.html, para no
// romper ni el diseño (styles.css) ni la lógica de selección (avatar.js)
avatares.forEach((avatar) => {
    const nombreEnMinuscula = avatar.nombre.toLowerCase()

    opcionAvatares = `
        <div class="carta-personaje carta-personaje--${nombreEnMinuscula}">
            <input class="carta-personaje__input" type="radio" name="personaje" id="${nombreEnMinuscula}" value="${nombreEnMinuscula}" />
            <label class="carta-personaje__label" for="${nombreEnMinuscula}">
                <img class="carta-personaje__imagen" src="${avatar.imagen}" alt="${avatar.nombre}" />
            </label>
        </div>
    `

    contenedorTarjetas.innerHTML += opcionAvatares
})
