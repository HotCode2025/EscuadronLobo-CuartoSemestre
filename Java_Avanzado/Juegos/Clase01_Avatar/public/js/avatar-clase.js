/* =========================================================================
   AVATAR: LA LEYENDA DE AANG — Clase 05: Clases, objetos y arrays
   -------------------------------------------------------------------------
   Este archivo es el ejercicio básico de la Clase 05 (POO):
     1) Definir una clase Avatar con su constructor.
     2) Instanciar objetos a partir de esa clase (Zuko, Katara, Aang, Toph).
     3) Guardar esas instancias dentro de un array llamado "avatares".
     4) Recorrer/inspeccionar ese array con console.log, push, pop y length.

   Es un paso intermedio y didáctico: más simple que la clase Personaje de
   personajes-poo.js (que ya usa herencia, campos privados y polimorfismo),
   pero ya con objetos de verdad en vez de simples strings sueltos como los
   que usa avatar.js (PERSONAJES = ['Zuko', 'Katara', ...]).
   ========================================================================= */

class Avatar {
    constructor(nombre, imagen, vidas) {
        this.nombre = nombre
        this.imagen = imagen
        this.vidas = vidas
    }
}

/* --- Instanciamos un Avatar por cada personaje del juego --- */
let zuko = new Avatar('Zuko', './assets/img/zuko.png', 3)
let katara = new Avatar('Katara', './assets/img/katara.png', 3)
let aang = new Avatar('Aang', './assets/img/aang.png', 3)
let toph = new Avatar('Toph', './assets/img/toph.png', 3)

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
