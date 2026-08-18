let ataqueJugador
let ataqueEnemigo
let vidasJugador = 3
let vidasEnemigo = 3

function iniciarJuego(){
    let sectionSeleccionarAtaque = document.getElementById('seleccionar-ataque')
    sectionSeleccionarAtaque.style.display = 'none'
    let botonPersonajeJugador = document.getElementById("boton-personaje")
    botonPersonajeJugador.addEventListener('click', seleccionarPersonajeJugador)
    let sectionReiniciar = document.getElementById('reiniciar')
    sectionReiniciar.style.display = 'none'

    //document.getElementById('reglas').style.display = "none"
    //document.getElementById('mostrar-reglas').addEventListener('click')
    //document.getElementById('boton-jugar').addEventListener('click', seleccionarPersonajeJugador)

    let botonPunio = document.getElementById('boton-punio') //ahora creamos un escuchador de evento
    botonPunio.addEventListener('click', ataquePunio)
    let botonPatada = document.getElementById('boton-patada')
    botonPatada.addEventListener('click', ataquePatada)
    let botonBarrida = document.getElementById('boton-barrida')
    botonBarrida.addEventListener('click', ataqueBarrida)
    //creamos una nueva variable
    let botonReiniciar = document.getElementById('boton-reiniciar')
    botonReiniciar.addEventListener('click', reiniciarJuego)
}

function seleccionarPersonajeJugador(){
    let inputZuko = document.getElementById("zuko")
    let inputKatara = document.getElementById("katara")
    let inputAang = document.getElementById("aang")
    let inputToph = document.getElementById("toph")
    let spanpersonajejugador = document.getElementById("personaje-jugador")
    let spanPersonajeEnemigo = document.getElementById("personaje-enemigo")
    let personajes = ["Zuko", "Katara", "Aang", "Toph"] //lista de personajes
    let personajeJugador = "" //declaramos las variables de personaje jugador y enemigo
    let personajeEnemigo = ""

    let sectionSeleccionarAtaque = document.getElementById('seleccionar-ataque')
    sectionSeleccionarAtaque.style.display = 'block' //mostramos

    let sectionSeleccionarPersonaje = document.getElementById('seleccionar-personaje')
    sectionSeleccionarPersonaje.style.display = 'none' //ocultamos

    if (inputZuko.checked) {
        spanpersonajejugador.innerHTML = "Zuko"
        personajeJugador = "Zuko" //asignamos el personaje que eligió el jugador para comparar con el del enemigo
    } 
    
    else if (inputKatara.checked) {
        spanpersonajejugador.innerHTML = "Katara"
        personajeJugador = "Katara"
    } 
    
    else if (inputAang.checked) {
        spanpersonajejugador.innerHTML = "Aang"
        personajeJugador = "Aang"
    } 
    
    else if (inputToph.checked) {
        spanpersonajejugador.innerHTML = "Toph"
        personajeJugador = "Toph"
    } 
    
    else {        
        let mensajeError = document.createElement('p')
        mensajeError.innerHTML = 'Selecciona un personaje'
        mensajeError.style.color = 'red'

        let sectionSeleccionarPersonaje = document.getElementById('seleccionar-personaje')
        sectionSeleccionarPersonaje.appendChild(mensajeError)

        setTimeout(() => {
            sectionSeleccionarPersonaje.removeChild(mensajeError)
        }, 2000)
        reiniciarJuego()
        return       
    }

    //Seleccion del Personaje Enemigo
    while (personajeEnemigo == "" || personajeEnemigo == personajeJugador) { //asignamos un numero random para elegir un nombre de la lista y lo comparamos con el que eligió el jugador
        let numeroRandom = Math.floor(Math.random() * 4)                    // si es igual vuelve a elegir otro numero aleatorio. todo esto hasta que los personajes sean diferentes
        personajeEnemigo = personajes[numeroRandom]
    }    
    spanPersonajeEnemigo.innerHTML = personajeEnemigo //mostramos el nombre del personaje que eligió la máquina
}

function ataquePunio(){ //Modificamos la variable global ataqueJugador
    ataqueJugador = 'Punio'
    ataqueAleatorioEnemigo()
}

function ataquePatada(){ //Modificamos la variable global ataqueJugador
    ataqueJugador = 'Patada'
    ataqueAleatorioEnemigo()
}

function ataqueBarrida(){ //Modificamos la variable global ataqueJugador
    ataqueJugador = 'Barrida'
    ataqueAleatorioEnemigo()
}

function ataqueAleatorioEnemigo(){
    let ataqueAleatorio = Math.floor(Math.random() * 3) + 1
    if(ataqueAleatorio == 1){
        ataqueEnemigo = 'Punio'
    } else if(ataqueAleatorio == 2){
        ataqueEnemigo = 'Patada'
    } else {
        ataqueEnemigo = 'Barrida'
    }
    combate()
}

function combate(){
    let spanVidasJugador = document.getElementById('vidas-jugador')
    let spanVidasEnemigo = document.getElementById('vidas-enemigo')

    //COMBATE
    if(ataqueEnemigo == ataqueJugador){ //EMPATE
        crearMensaje("EMPATE")
    } else if(ataqueEnemigo == 'Punio' && ataqueJugador == 'Barrida') { //GANASTE
        crearMensaje("GANASTE")
        vidasEnemigo--
        spanVidasEnemigo.innerHTML = vidasEnemigo
    } else if(ataqueEnemigo == 'Patada' && ataqueJugador == 'Punio') { //GANASTE
        crearMensaje("GANASTE")
        vidasEnemigo--
        spanVidasEnemigo.innerHTML = vidasEnemigo
    } else if(ataqueEnemigo == 'Barrida' && ataqueJugador == 'Patada') { //GANASTE
        crearMensaje("GANASTE")
        vidasEnemigo--
        spanVidasEnemigo.innerHTML = vidasEnemigo
    } else { //PERDISTE
        crearMensaje("PERDISTE")
        vidasJugador--
        spanVidasJugador.innerHTML = vidasJugador
    }
    // Revisar vidas
    revisarVidas()
}

function revisarVidas(){
    if(vidasEnemigo == 0){
        //GANASTE
        crearMensajeFinal('FELICITACIONES!!! GANASTE 🎉🎉💪')
        
    } else if(vidasEnemigo == 0){
        //PERDIMOS
        crearMensajeFinal('QUE PENA, HAS PERDIDO 🤦‍♂️😭😭')        
    }
}

function crearMensajeFinal(resultado){
    let sectionReiniciar = document.getElementById('reiniciar')
    sectionReiniciar.style.display = 'block'

    let sectionMensaje = document.getElementById('mensajes') //creamos la variable de la seccion a modificar
    let parrafo = document.createElement('p') //creamos la variable que va a contener el mensaje

    parrafo.innerHTML = resultado
    sectionMensaje.appendChild(parrafo) //mostramos los ataques en el DOM

    let botonPunio = document.getElementById('boton-punio') //ahora creamos un escuchador de evento
    botonPunio.disabled = true
    let botonPatada = document.getElementById('boton-patada')
    botonPatada.disabled = true
    let botonBarrida = document.getElementById('boton-barrida')
    botonBarrida.disabled = true
}

function crearMensaje(resultado){
    let sectionMensaje = document.getElementById('mensajes') //creamos la variable de la seccion a modificar
    let parrafo = document.createElement('p') //creamos la variable que va a contener el mensaje

    parrafo.innerHTML = 'Tu personaje atacó con ' + ataqueJugador + ', el personaje del enemigo atacó con ' + ataqueEnemigo + ' ' + resultado
    sectionMensaje.appendChild(parrafo) //mostramos los ataques en el DOM
}

function reiniciarJuego(){
    location.reload()
}

window.addEventListener('load', iniciarJuego)