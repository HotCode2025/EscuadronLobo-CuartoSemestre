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

// Choque entre personajes: a cada dibujo se le descuentan estos píxeles de borde (las poses
// tienen aire y efectos alrededor), así solo cuenta cuando los cuerpos realmente se tocan
const MARGEN_COLISION = 14

// Animación de combate en el mapa
const DURACION_ATAQUE = 650 // ms que dura el ataque de cada personaje
const ALCANCE_ATAQUE = { Punio: 70, Patada: 90, Barrida: 110 } // px que avanza
const EMOJI_ATAQUE = { Punio: '👊', Patada: '🦵', Barrida: '🧹' }

// Convierte un nombre en algo seguro para usar de id o de clase CSS: sin tildes y en minúscula
// (ej: "Terrón" -> "terron"; así los nombres con tilde no complican los ids ni los archivos)
function aSlug(nombre) {
    return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Devuelve un número entero al azar entre min y max (ambos incluidos)
function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

class Avatar {
    // imagen = foto de la tarjeta de selección; imagenMapa1/2 = las dos poses
    // (con fondo transparente) que se usan para dibujarlo en el mapa
    // x, y (opcionales) = dónde aparece en el mapa; si no se indican, en un lugar al azar
    constructor(nombre, imagen, vidas, imagenMapa1 = imagen, imagenMapa2 = imagenMapa1, x, y) {
        this.nombre = nombre
        this.imagen = imagen
        this.vidas = vidas
        this.ataques = ['Punio', 'Patada', 'Barrida']

        // --- Datos para dibujarlo en el mapa (canvas) ---
        this.ancho = TAMANIO_AVATAR
        this.alto = TAMANIO_AVATAR
        this.x = x ?? aleatorio(0, ANCHO_MAPA - this.ancho)
        this.y = y ?? aleatorio(0, ALTO_MAPA - this.alto)
        this.objetivo = null // lugar al que se acerca solo (para ponerse frente a frente en el duelo)
        this.etiqueta = '' // cartelito con el nombre que se dibuja sobre la cabeza (los rivales del mapa)
        this.reposoAnimado = false // si es true, alterna de pose despacito aun estando quieto
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

    // Se desliza de a poco hacia this.objetivo (cuando llega, deja de moverse)
    moverHaciaObjetivo() {
        if (!this.objetivo) {
            return
        }
        this.x += (this.objetivo.x - this.x) * 0.18
        this.y += (this.objetivo.y - this.y) * 0.18
        if (Math.hypot(this.objetivo.x - this.x, this.objetivo.y - this.y) < 1) {
            this.x = this.objetivo.x
            this.y = this.objetivo.y
            this.objetivo = null
        }
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
        const usarPose2 = efecto
            ? true
            : seMueve
              ? Math.floor(ahora / 150) % 2 === 1
              : this.reposoAnimado && Math.floor(ahora / 700) % 2 === 1
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

        // Cartelito con el nombre (los rivales del mapa lo llevan, para saber quién es quién)
        if (this.etiqueta) {
            lienzo.save()
            lienzo.font = 'bold 12px "Work Sans", Arial, sans-serif'
            lienzo.textAlign = 'center'
            lienzo.textBaseline = 'middle'
            const anchoCartel = lienzo.measureText(this.etiqueta).width + 16
            const yCartel = pies - this.alto - salto - 6
            lienzo.beginPath()
            if (lienzo.roundRect) {
                lienzo.roundRect(centroX - anchoCartel / 2, yCartel - 10, anchoCartel, 20, 10)
            } else {
                lienzo.rect(centroX - anchoCartel / 2, yCartel - 10, anchoCartel, 20) // navegadores viejos
            }
            lienzo.fillStyle = 'rgba(2, 12, 38, 0.8)'
            lienzo.fill()
            lienzo.strokeStyle = 'rgba(170, 235, 255, 0.85)'
            lienzo.lineWidth = 1
            lienzo.stroke()
            lienzo.fillStyle = '#eaffff'
            lienzo.fillText(this.etiqueta, centroX, yCartel)
            lienzo.restore()
        }

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
// Los dos personajes nuevos: la imagen de la tarjeta (con su nombre) y las dos poses que se usan en el mapa
let jake = new Avatar('Jake', './assets/img/jake.png', 3, './assets/img/mapa-jake-1.png', './assets/img/mapa-jake-2.png')
let terron = new Avatar('Terrón', './assets/img/terron.png', 3, './assets/img/mapa-terron-1.png', './assets/img/mapa-terron-2.png')

/* --- Creamos el array vacío y cargamos las instancias con push --- */
let avatares = []
avatares.push(zuko, katara, aang, toph, jake, terron)

// Vemos el resultado: 6 objetos Avatar dentro del array
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
   Ahora que tenemos el array "avatares" con los 6 objetos Avatar, en vez de
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
    const nombreEnMinuscula = aSlug(avatar.nombre) // sin tildes: 'Terrón' -> 'terron'

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

/* =========================================================================
   Los RIVALES que se ven en el mapa
   -------------------------------------------------------------------------
   Son otras instancias de la clase Avatar (una por personaje), parados en un
   lugar fijo del mapa: cada uno cerca de "su" elemento (Katara junto al lago,
   Aang junto al remolino de viento, Zuko junto a la lava, Toph junto a las
   rocas, Jake en el bosque de arriba y Terrón en el pasto de abajo). Al chocar con uno de ellos empieza el combate contra ese rival.
   Los dos últimos números del constructor son su posición: x, y.
   ========================================================================= */
let zukoEnemigo = new Avatar('Zuko', './assets/img/zuko.png', 3, './assets/img/mapa-zuko-1.png', './assets/img/mapa-zuko-2.png', 430, 320)
let kataraEnemigo = new Avatar('Katara', './assets/img/katara.png', 3, './assets/img/mapa-katara-1.png', './assets/img/mapa-katara-2.png', 100, 70)
let aangEnemigo = new Avatar('Aang', './assets/img/aang.png', 3, './assets/img/mapa-aang-1.png', './assets/img/mapa-aang-2.png', 470, 40)
let tophEnemigo = new Avatar('Toph', './assets/img/toph.png', 3, './assets/img/mapa-toph-1.png', './assets/img/mapa-toph-2.png', 80, 310)
let jakeEnemigo = new Avatar('Jake', './assets/img/jake.png', 3, './assets/img/mapa-jake-1.png', './assets/img/mapa-jake-2.png', 290, 60)
let terronEnemigo = new Avatar('Terrón', './assets/img/terron.png', 3, './assets/img/mapa-terron-1.png', './assets/img/mapa-terron-2.png', 260, 350)

let enemigos = []
enemigos.push(zukoEnemigo, kataraEnemigo, aangEnemigo, tophEnemigo, jakeEnemigo, terronEnemigo)

// Cada rival tiene un ataque FAVORITO: aparece 3 veces en su lista, así sale más seguido
// cuando se sortea (Zuko y Toph: Puño · Katara y Jake: Barrida · Aang: Patada · Terrón: Puño, embiste de cabeza)
zukoEnemigo.ataques = ['Punio', 'Punio', 'Punio', 'Patada', 'Barrida']
kataraEnemigo.ataques = ['Barrida', 'Barrida', 'Barrida', 'Patada', 'Punio']
aangEnemigo.ataques = ['Patada', 'Patada', 'Patada', 'Punio', 'Barrida']
tophEnemigo.ataques = ['Punio', 'Punio', 'Punio', 'Patada', 'Barrida']
jakeEnemigo.ataques = ['Barrida', 'Barrida', 'Barrida', 'Punio', 'Patada'] // su hacha barre en arco
terronEnemigo.ataques = ['Punio', 'Punio', 'Punio', 'Barrida', 'Patada'] // embiste de cabeza

// En el mapa llevan el nombre arriba y respiran (alternan de pose despacito)
enemigos.forEach((enemigo) => {
    enemigo.etiqueta = enemigo.nombre
    enemigo.reposoAnimado = true
})
