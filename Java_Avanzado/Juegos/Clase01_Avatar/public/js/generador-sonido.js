/* =========================================================================
   Generador: sonido de la sección "¿Cómo funciona?"
   -------------------------------------------------------------------------
   Mientras haya UNA de las dos explicaciones desplegadas (la sencilla o la
   del código) suena la música de latidos (objeto Sonido, de audio.js). Cuando
   se cierran las dos, la música se apaga suavemente.

   Los navegadores solo dejan reproducir audio después de que la persona toca
   la página; abrir un desplegable cuenta como ese toque.
   ========================================================================= */

const desplegables = document.querySelectorAll('.desplegable')
const botonSonido = document.getElementById('boton-sonido')

function actualizarBotonSonido() {
    botonSonido.textContent = Sonido.estaSilenciado() ? '🔇' : '🔊'
}

// Música según haya algún desplegable abierto o no
function actualizarMusica() {
    const hayAlgunoAbierto = Array.from(desplegables).some((desplegable) => desplegable.open)
    Sonido.musica(hayAlgunoAbierto ? 'latidos' : null)
    if (hayAlgunoAbierto) {
        Sonido.iniciar()
    }
}

desplegables.forEach((desplegable) => {
    // Al tocar el título se enciende el audio en el mismo instante del toque
    desplegable.querySelector('summary').addEventListener('click', () => Sonido.iniciar())
    // "toggle" avisa cuando el desplegable ya terminó de abrirse o cerrarse
    desplegable.addEventListener('toggle', actualizarMusica)
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
})

actualizarBotonSonido()
