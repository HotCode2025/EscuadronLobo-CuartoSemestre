/* =========================================================================
   PORTADA (index.html)
   -------------------------------------------------------------------------
   1) Suena la música de entrada (objeto Sonido, de audio.js).
   2) Al tocar el botón "Jugar" suena un efecto, la pantalla se oscurece y
      se pasa a avatar.html, donde está el juego.

   Recordá: los navegadores no dejan reproducir audio hasta que la persona
   toca la página, así que la música arranca en el primer click o tecla.
   ========================================================================= */

const botonComenzar = document.getElementById('boton-comenzar')
const botonSonido = document.getElementById('boton-sonido')
const avisoSonido = document.getElementById('aviso-sonido')
const cortina = document.getElementById('cortina')

const PAGINA_DEL_JUEGO = './avatar.html'
const ESPERA_ANTES_DE_ENTRAR = 1100 // ms: lo que dura la transición con efecto de sonido

let entrando = false

function actualizarBotonSonido() {
    botonSonido.textContent = Sonido.estaSilenciado() ? '🔇' : '🔊'
}

function ocultarAviso() {
    avisoSonido.classList.add('oculto')
}

function comenzar() {
    if (entrando) {
        return
    }
    entrando = true
    botonComenzar.disabled = true

    // El efecto espera a que el audio esté listo; la transición sigue igual
    Sonido.iniciar().then(() => Sonido.efecto('comenzar', 0.8))
    cortina.classList.add('saliendo') // la pantalla se va a negro

    // La música NO se corta: en la página del juego sigue la misma canción desde donde
    // iba. Solo baja un poco el volumen justo antes de cambiar de página (se vuelve
    // a subir sola al otro lado), para que no haya un corte brusco.
    setTimeout(() => Sonido.atenuar(300), ESPERA_ANTES_DE_ENTRAR - 350)
    setTimeout(() => {
        window.location.href = PAGINA_DEL_JUEGO
    }, ESPERA_ANTES_DE_ENTRAR)
}

function arrancarSonido(evento) {
    // Si el primer toque fue en el botón de sonido, lo maneja ese botón
    if (evento.target.closest && evento.target.closest('#boton-sonido')) {
        return
    }
    Sonido.iniciar().then(() => {
        if (Sonido.estaActivo()) {
            ocultarAviso()
        }
    })
    window.removeEventListener('pointerdown', arrancarSonido)
    window.removeEventListener('keydown', arrancarSonido)
}

/* --- Inicio --- */

Sonido.musica('entrada') // queda anotada: suena apenas el audio pueda arrancar
actualizarBotonSonido()

// Por si el navegador ya permite el audio sin tocar nada
Sonido.iniciar().then(() => {
    if (Sonido.estaActivo()) {
        ocultarAviso()
    }
})
window.addEventListener('pointerdown', arrancarSonido)
window.addEventListener('keydown', arrancarSonido)

botonComenzar.addEventListener('click', comenzar)

// Enter o Espacio en cualquier parte de la pantalla también entran al juego
window.addEventListener('keydown', (evento) => {
    const estaEnUnBoton = evento.target.closest && evento.target.closest('button')
    if ((evento.key === 'Enter' || evento.key === ' ') && !estaEnUnBoton) {
        evento.preventDefault()
        comenzar()
    }
})

botonSonido.addEventListener('click', () => {
    const yaEstabaActivo = Sonido.estaActivo()
    Sonido.iniciar()
    // Primer click con el sonido todavía apagado: alcanza con encenderlo,
    // salvo que estuviera silenciado de antes (ahí lo reactivamos)
    if (yaEstabaActivo || Sonido.estaSilenciado()) {
        Sonido.alternar()
    }
    actualizarBotonSonido()
    ocultarAviso()
})

// Si la persona vuelve atrás desde el juego, el navegador puede mostrar esta
// página "congelada" con la cortina negra: la dejamos como nueva
window.addEventListener('pageshow', (evento) => {
    if (evento.persisted) {
        entrando = false
        botonComenzar.disabled = false
        cortina.classList.remove('saliendo')
        Sonido.musica('entrada')
        Sonido.iniciar()
    }
})
