/* =========================================================================
   AVATAR: LA LEYENDA DE AANG — Personajes con POO
   -------------------------------------------------------------------------
   Esta parte del juego se separa del resto (avatar.js) porque tiene un
   objetivo distinto: en vez de manejar la partida contra un solo enemigo,
   acá el objetivo es poder CREAR muchos personajes (100, 1000, los que
   sean) de forma prolija, usando el paradigma de Programación Orientada
   a Objetos.

   Conceptos de POO que se ven en este archivo:
     - Clase (class): un "molde" para crear objetos con la misma forma.
     - Constructor: lo que se ejecuta al crear (instanciar) un objeto.
     - Encapsulamiento: los campos privados (con #) no se pueden tocar
       desde afuera de la clase, solo a través de sus métodos.
     - Herencia (extends): las 4 clases de elemento heredan todo lo que
       tiene Personaje, y solo agregan/cambian lo que las hace distintas.
     - Polimorfismo: las 4 subclases tienen un método atacar() con el
       mismo nombre, pero cada una lo implementa a su manera.
     - Miembros estáticos (static): pertenecen a la clase en sí, no a
       cada objeto (por ejemplo, el contador de ids, o el generador).
   ========================================================================= */

class Personaje {
    // Campos privados: solo se pueden leer/modificar desde adentro de la
    // clase. Desde afuera, "vidas" es de solo lectura (ver el getter).
    #vidas
    static #totalCreados = 0

    constructor(nombre, elemento) {
        Personaje.#totalCreados++
        this.id = Personaje.#totalCreados
        this.nombre = nombre
        this.elemento = elemento
        this.#vidas = 3
    }

    get vidas() {
        return this.#vidas
    }

    recibirGolpe() {
        if (this.#vidas > 0) {
            this.#vidas--
        }
        return this.#vidas
    }

    // Cada subclase va a pisar (sobreescribir) este método con su propio
    // ataque. Esto es polimorfismo: mismo nombre de método, distinto
    // comportamiento según la clase real del objeto.
    atacar() {
        return `${this.nombre} ataca`
    }

    describir() {
        return `#${this.id} · ${this.nombre} (${this.elemento}) · ${this.#vidas} vidas`
    }

    static reiniciarContador() {
        Personaje.#totalCreados = 0
    }
}

/* --- Herencia: una subclase por elemento --- */

class PersonajeFuego extends Personaje {
    constructor(nombre) {
        super(nombre, 'Fuego')
    }

    atacar() {
        return `${this.nombre} 🔥 lanza una bola de fuego`
    }
}

class PersonajeAgua extends Personaje {
    constructor(nombre) {
        super(nombre, 'Agua')
    }

    atacar() {
        return `${this.nombre} 💧 lanza un latigazo de agua`
    }
}

class PersonajeTierra extends Personaje {
    constructor(nombre) {
        super(nombre, 'Tierra')
    }

    atacar() {
        return `${this.nombre} 🪨 lanza una roca`
    }
}

class PersonajeAire extends Personaje {
    constructor(nombre) {
        super(nombre, 'Aire')
    }

    atacar() {
        return `${this.nombre} 🌪️ lanza una ráfaga de aire`
    }
}

/* =========================================================================
   Generador: crea la cantidad de personajes que se le pida (100, 1000,
   10000...) combinando al azar un nombre y un elemento. Al ser una clase
   con métodos static, no hace falta instanciarla (no existe "new
   GeneradorPersonajes()"): se usa directamente GeneradorPersonajes.generar(...)
   ========================================================================= */

class GeneradorPersonajes {
    static #NOMBRES = [
        'Aang', 'Katara', 'Sokka', 'Zuko', 'Toph', 'Iroh', 'Azula', 'Suki',
        'Ty Lee', 'Mai', 'Bumi', 'Pakku', 'Hama', 'Jet', 'Haru', 'Teo',
        'Roku', 'Kyoshi', 'Kuruk', 'Yangchen',
    ]

    // Une cada elemento con la clase que le corresponde. Agregar un quinto
    // elemento el día de mañana es sumar una línea acá, nada más.
    static #CLASES_POR_ELEMENTO = [
        { elemento: 'Fuego', Clase: PersonajeFuego },
        { elemento: 'Agua', Clase: PersonajeAgua },
        { elemento: 'Tierra', Clase: PersonajeTierra },
        { elemento: 'Aire', Clase: PersonajeAire },
    ]

    static generar(cantidad) {
        Personaje.reiniciarContador()
        const personajes = []

        for (let i = 0; i < cantidad; i++) {
            const { Clase } = this.#elegirAlAzar(this.#CLASES_POR_ELEMENTO)
            const nombreBase = this.#elegirAlAzar(this.#NOMBRES)
            personajes.push(new Clase(`${nombreBase} #${i + 1}`))
        }

        return personajes
    }

    // Agrupa el resultado por elemento, para poder mostrar un resumen
    // (por ejemplo: Fuego: 253, Agua: 248, Tierra: 251, Aire: 248)
    static contarPorElemento(personajes) {
        return personajes.reduce((conteo, personaje) => {
            conteo[personaje.elemento] = (conteo[personaje.elemento] || 0) + 1
            return conteo
        }, {})
    }

    static #elegirAlAzar(lista) {
        const indice = Math.floor(Math.random() * lista.length)
        return lista[indice]
    }
}
