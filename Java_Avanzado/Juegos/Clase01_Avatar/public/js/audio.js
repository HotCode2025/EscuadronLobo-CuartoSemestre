/* =========================================================================
   AVATAR: LA LEYENDA DE AANG — Sonido (música y efectos)
   -------------------------------------------------------------------------
   Los sonidos del juego son archivos de la carpeta assets/audio (música y efectos
   de combate); unos pocos efectos chicos (pasos, "Jugar" de la portada) se
   GENERAN con código usando la Web Audio API del navegador. Si un archivo no se
   pudiera cargar, suena una versión equivalente generada por código.

   Qué suena:
     - Música de ENTRADA (portada, index.html): assets/audio/entrada-principal.mp3
       (tambores épicos), en loop.
     - Segunda pantalla (elegir personaje, paisaje): la MISMA música de la portada;
       al cambiar de página sigue desde donde iba.
     - BATALLA (el mapa de los jugadores): SOLO la música épica
       assets/audio/batalla-epica.mp3, en loop, desde que se elige personaje hasta
       que termina la partida (gane quien gane, o empaten).
     - Generador, sección "¿Cómo funciona?": latidos (assets/audio/latidos.mp3, ~8 s,
       en loop) mientras haya una de las explicaciones desplegada.
     - Efectos de combate (puño, patada, barrida y golpe recibido): 4 archivos de
       assets/audio/efectos. Son efectos cortos, no música.
     - Resultado: al terminar la PARTIDA suena el de ganaste o el de perdiste, y cuando
       una RONDA termina empatada suena el de empate (assets/audio/final).

   IMPORTANTE: los navegadores NO dejan reproducir audio hasta que la persona
   toca la página (click o tecla). Por eso la música arranca en el primer
   toque; el botón 🔊 de la esquina permite silenciar o reactivar todo.

   Se usa así desde avatar.js:
       Sonido.iniciar()          → enciende el audio (tras un click/tecla)
       Sonido.musica('menu')     → 'entrada' | 'menu' | 'batalla' | 'latidos' | null (para frenar)
       Sonido.efecto('Patada')   → reproduce un efecto una vez
       Sonido.pasos(true/false)  → pasos mientras el personaje camina
       Sonido.alternar()         → silenciar / reactivar
   ========================================================================= */

const Sonido = (() => {
    const CLAVE_SILENCIO = 'avatarSonidoSilenciado'
    // Volúmenes: los archivos de audio ya están "masterizados" (subidos de volumen y parejos
    // entre sí), así que acá casi todo va al máximo; lo único más bajo es la música, para que
    // los efectos de combate se escuchen por encima de ella.
    const VOLUMEN_GENERAL = 1
    const VOLUMEN_MUSICA = 0.5 // solo para la música generada por código (respaldo)

    let contexto = null // el "motor" de audio del navegador (AudioContext)
    let salidaMaestra // volumen general (también sirve para silenciar)
    let busMusica // canal donde suena la música
    let busEfectos // canal donde suenan los efectos
    let bufferRuido // ruido blanco pregrabado en memoria (base de golpes y soplidos)

    let silenciado = leerPreferencia()
    let tema = null // tema que debería estar sonando
    let reloj = null // setInterval del planificador de notas
    let proximoPaso = 0 // momento (en segundos de audio) del próximo paso
    let numeroPaso = 0
    let pista = null // <audio> con la música de archivo (si el tema actual es un archivo)
    let relojPasos = null // setInterval de los pasos al caminar
    let pieIzquierdo = false

    /* ---------------------------------------------------------------------
       Utilidades
       --------------------------------------------------------------------- */

    function leerPreferencia() {
        try {
            return localStorage.getItem(CLAVE_SILENCIO) === '1'
        } catch {
            return false
        }
    }

    function guardarPreferencia() {
        try {
            localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0')
        } catch {
            // si el navegador no deja guardar, simplemente no se recuerda
        }
    }

    // Convierte un número de nota MIDI (60 = Do central) en frecuencia (Hz)
    function hz(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12)
    }

    // Una nota "de sintetizador": un oscilador con volumen que sube y baja
    function nota(inicio, midi, duracion, tipo, volumen, destino, ataque = 0.02) {
        const oscilador = contexto.createOscillator()
        const ganancia = contexto.createGain()
        oscilador.type = tipo
        oscilador.frequency.value = hz(midi)
        ganancia.gain.setValueAtTime(0.0001, inicio)
        ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + ataque)
        ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + Math.max(duracion, ataque + 0.03))
        oscilador.connect(ganancia).connect(destino)
        oscilador.start(inicio)
        oscilador.stop(inicio + Math.max(duracion, ataque + 0.03) + 0.05)
    }

    // Soplido/ruido filtrado: la base de los golpes, patadas, hi-hat y pasos
    function ruido(inicio, duracion, tipoFiltro, frecuenciaInicial, frecuenciaFinal, volumen, destino, q = 1) {
        const fuente = contexto.createBufferSource()
        const filtro = contexto.createBiquadFilter()
        const ganancia = contexto.createGain()
        fuente.buffer = bufferRuido
        fuente.loop = true
        filtro.type = tipoFiltro
        filtro.Q.value = q
        filtro.frequency.setValueAtTime(frecuenciaInicial, inicio)
        filtro.frequency.exponentialRampToValueAtTime(frecuenciaFinal, inicio + duracion)
        ganancia.gain.setValueAtTime(0.0001, inicio)
        ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.01)
        ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)
        fuente.connect(filtro).connect(ganancia).connect(destino)
        fuente.start(inicio)
        fuente.stop(inicio + duracion + 0.05)
    }

    // Golpe grave (bombo / impacto): un tono que cae rápido de agudo a grave
    function golpeGrave(inicio, desde, hasta, duracion, volumen, destino) {
        const oscilador = contexto.createOscillator()
        const ganancia = contexto.createGain()
        oscilador.type = 'sine'
        oscilador.frequency.setValueAtTime(desde, inicio)
        oscilador.frequency.exponentialRampToValueAtTime(hasta, inicio + duracion)
        ganancia.gain.setValueAtTime(volumen, inicio)
        ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)
        oscilador.connect(ganancia).connect(destino)
        oscilador.start(inicio)
        oscilador.stop(inicio + duracion + 0.05)
    }

    /* ---------------------------------------------------------------------
       Percusión (se usa en la música de batalla)
       --------------------------------------------------------------------- */

    function bombo(t) {
        golpeGrave(t, 150, 45, 0.18, 0.9, busMusica)
    }

    function caja(t) {
        ruido(t, 0.16, 'highpass', 1800, 1800, 0.45, busMusica)
        golpeGrave(t, 220, 120, 0.1, 0.25, busMusica)
    }

    function platillo(t, volumen) {
        ruido(t, 0.05, 'highpass', 7000, 7000, volumen, busMusica)
    }

    function taiko(t, volumen) {
        golpeGrave(t, 120, 50, 0.45, volumen, busMusica) // tambor grave y largo del menú
    }

    /* ---------------------------------------------------------------------
       Temas musicales. Cada paso es una semicorchea (1/16 de compás).
       "tocar" se llama una vez por paso con el momento exacto en que debe
       sonar; el planificador de más abajo se encarga de llamarla a tiempo.
       Las melodías son { paso: [nota, duración en pasos] }.
       --------------------------------------------------------------------- */

    const TEMAS = {
        // ---- Generador (sección "¿Cómo funciona?"): latidos, mientras hay una explicación abierta ----
        // Dura unos 8 segundos y se repite en loop. Si no se pudiera cargar, suena el tema
        // tranquilo generado por código.
        latidos: {
            archivo: './assets/audio/latidos.mp3',
            volumen: 0.85,
            respaldo: 'menuSintetico',
        },

        // ---- Segunda pantalla (elegir personaje, paisaje de fondo): la MISMA música de
        // la portada. "continuar" hace que, al pasar de una página a la otra, la música
        // siga desde donde iba en vez de empezar de nuevo.
        menu: {
            archivo: './assets/audio/entrada-principal.mp3',
            volumen: 0.85,
            continuar: 'principal',
            respaldo: 'menuSintetico',
        },

        // ---- Pantalla principal (respaldo): tranquila, en Re menor pentatónica ----
        menuSintetico: {
            bpm: 76,
            pasos: 64, // 4 compases
            melodia: {
                0: [69, 4], 4: [67, 2], 6: [65, 2], 8: [62, 6],
                16: [65, 4], 20: [67, 4], 24: [69, 8],
                32: [72, 4], 36: [69, 4], 40: [67, 4], 44: [65, 4],
                48: [62, 4], 52: [65, 2], 54: [67, 2], 56: [62, 8],
            },
            // acordes de fondo: Re menor, Si bemol, Sol menor, Re menor
            acordes: {
                0: [50, 57, 65],
                16: [46, 53, 62],
                32: [43, 50, 58],
                48: [50, 57, 65],
            },
            tocar(paso, t, duracionPaso) {
                if (this.melodia[paso]) {
                    const [midi, largo] = this.melodia[paso]
                    nota(t, midi, largo * duracionPaso, 'triangle', 0.5, busMusica, 0.03)
                }
                if (this.acordes[paso]) {
                    this.acordes[paso].forEach((midi) => {
                        nota(t, midi, 15 * duracionPaso, 'sine', 0.13, busMusica, 0.35)
                    })
                }
                if (paso % 16 === 0) taiko(t, 0.5)
                if (paso % 16 === 8) taiko(t, 0.22)
            },
        },

        // ---- Portada (index.html): música de entrada (mp3 con tambores épicos) ----
        // Se reproduce en loop. Si el archivo no se puede cargar, se usa el tema
        // generado por código de más abajo (entradaSintetica).
        entrada: {
            archivo: './assets/audio/entrada-principal.mp3',
            volumen: 0.85,
            continuar: 'principal',
            respaldo: 'entradaSintetica',
        },

        // ---- Portada (respaldo): épica y lenta, generada por código ----
        entradaSintetica: {
            bpm: 64,
            pasos: 64, // 4 compases
            // melodía heroica, de notas largas (Re menor pentatónica)
            melodia: {
                0: [62, 8], 8: [69, 6], 14: [67, 2],
                16: [65, 8], 24: [67, 4], 28: [69, 4],
                32: [74, 8], 40: [72, 4], 44: [69, 4],
                48: [67, 4], 52: [65, 4], 56: [62, 8],
            },
            // acordes de fondo: Re menor, Si bemol, Sol menor, La menor
            acordes: {
                0: [38, 50, 57, 65],
                16: [34, 46, 53, 62],
                32: [31, 43, 50, 58],
                48: [33, 45, 52, 60],
            },
            // notas del arpa de cada compás (suben y bajan de a corcheas)
            arpas: [
                [57, 62, 65, 69],
                [58, 62, 65, 70],
                [55, 58, 62, 67],
                [57, 60, 64, 69],
            ],
            tocar(paso, t, duracionPaso) {
                if (this.melodia[paso]) {
                    const [midi, largo] = this.melodia[paso]
                    nota(t, midi, largo * duracionPaso, 'triangle', 0.42, busMusica, 0.06)
                    nota(t, midi + 12, largo * duracionPaso, 'sine', 0.12, busMusica, 0.1) // brillo una octava arriba
                }
                if (this.acordes[paso]) {
                    this.acordes[paso].forEach((midi) => {
                        nota(t, midi, 16 * duracionPaso, midi < 45 ? 'sawtooth' : 'sine', midi < 45 ? 0.05 : 0.11, busMusica, 0.6)
                    })
                }
                // Arpa: una nota cada dos pasos, recorriendo el acorde
                if (paso % 2 === 0) {
                    const arpa = this.arpas[Math.floor(paso / 16)]
                    const orden = [0, 1, 2, 3, 2, 1, 2, 3]
                    nota(t, arpa[orden[(paso % 16) / 2]] + 12, 5 * duracionPaso, 'triangle', 0.1, busMusica, 0.005)
                }
                // Tambores: golpe fuerte al empezar cada compás y uno suave en el medio
                if (paso % 16 === 0) taiko(t, 0.7)
                if (paso % 16 === 8) taiko(t, 0.3)
                // Redoble final que sube de intensidad antes de repetir
                if (paso >= 56 && paso % 2 === 0) taiko(t, 0.15 + (paso - 56) * 0.05)
            },
        },

        // ---- Batalla (el mapa): SOLO esta música épica, en loop, de principio a fin ----
        // Es el archivo batalla-epica.mp3 (un golpe épico con eco). Suena todo el tiempo
        // que los jugadores juegan, hasta que termina la partida. La entrada es casi
        // instantánea (150 ms) para que el golpe del principio se escuche con toda su fuerza.
        // Si el archivo no se pudiera cargar, suena la versión generada por código.
        batalla: {
            archivo: './assets/audio/batalla-epica.mp3',
            volumen: 0.9,
            fundidoEntrada: 150,
            respaldo: 'batallaSintetica',
        },

        // ---- Batalla (respaldo): rápida y con ritmo, generada por código ----
        batallaSintetica: {
            bpm: 150,
            pasos: 64, // 4 compases
            raices: [38, 38, 34, 36], // bajo de cada compás: Re, Re, Si bemol, Do
            melodia: {
                0: [74, 2], 2: [72, 2], 4: [69, 2], 6: [72, 2], 8: [74, 4], 12: [77, 2], 14: [74, 2],
                16: [72, 2], 18: [69, 2], 20: [67, 2], 22: [69, 2], 24: [72, 6], 30: [69, 2],
                32: [74, 2], 34: [72, 2], 36: [69, 2], 38: [72, 2], 40: [74, 4], 44: [77, 2], 46: [79, 2],
                48: [79, 2], 50: [77, 2], 52: [74, 2], 54: [72, 2], 56: [74, 8],
            },
            tocar(paso, t, duracionPaso) {
                const compas = Math.floor(paso / 16)
                const enCompas = paso % 16

                // Bajo: corcheas sobre la nota raíz, con salto de octava al final
                if (enCompas % 2 === 0) {
                    const octava = enCompas === 6 || enCompas === 14 ? 12 : 0
                    nota(t, this.raices[compas] + octava, duracionPaso * 1.7, 'sawtooth', 0.22, busMusica, 0.01)
                }

                // Melodía principal
                if (this.melodia[paso]) {
                    const [midi, largo] = this.melodia[paso]
                    nota(t, midi, largo * duracionPaso * 0.9, 'square', 0.12, busMusica, 0.01)
                }

                // Batería: bombo en cada negra, caja en los tiempos 2 y 4, hi-hat en corcheas
                if (enCompas % 4 === 0) bombo(t)
                if (enCompas === 4 || enCompas === 12) caja(t)
                if (enCompas % 2 === 0) platillo(t, enCompas % 4 === 2 ? 0.2 : 0.1)
            },
        },
    }

    /* ---------------------------------------------------------------------
       Efectos de sonido. Cada uno recibe el momento de inicio y el canal.
       --------------------------------------------------------------------- */

    const EFECTOS = {
        // Elegir personaje: dos notitas que suben
        seleccion(t, destino) {
            nota(t, 72, 0.14, 'triangle', 0.5, destino, 0.005)
            nota(t + 0.09, 79, 0.28, 'triangle', 0.5, destino, 0.005)
        },
        // Puño: golpe seco y corto
        Punio(t, destino) {
            ruido(t, 0.1, 'highpass', 3000, 1500, 0.5, destino)
            golpeGrave(t + 0.04, 180, 50, 0.2, 0.9, destino)
        },
        // Patada: silbido de aire que sube y golpe al final
        Patada(t, destino) {
            ruido(t, 0.22, 'bandpass', 500, 2600, 0.6, destino, 2)
            golpeGrave(t + 0.17, 140, 40, 0.25, 1, destino)
        },
        // Barrida: soplido largo que baja, con retumbe grave
        Barrida(t, destino) {
            ruido(t, 0.5, 'bandpass', 2200, 300, 0.55, destino, 1.5)
            golpeGrave(t + 0.08, 95, 45, 0.45, 0.5, destino)
        },
        // Tocar "Jugar" en la portada: soplido que sube + acorde grande + tambor
        comenzar(t, destino) {
            ruido(t, 0.7, 'bandpass', 300, 3500, 0.5, destino, 1.5)
            golpeGrave(t + 0.35, 110, 38, 0.7, 1, destino)
            ;[50, 57, 62, 69, 74].forEach((midi) => {
                nota(t + 0.35, midi, 1.1, 'triangle', 0.3, destino, 0.02)
            })
            nota(t + 0.35, 38, 1.1, 'sawtooth', 0.12, destino, 0.02)
        },
        // Golpe recibido (cuando se pierde la ronda)
        golpe(t, destino) {
            const oscilador = contexto.createOscillator()
            const ganancia = contexto.createGain()
            oscilador.type = 'square'
            oscilador.frequency.setValueAtTime(320, t)
            oscilador.frequency.exponentialRampToValueAtTime(90, t + 0.25)
            ganancia.gain.setValueAtTime(0.28, t)
            ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
            oscilador.connect(ganancia).connect(destino)
            oscilador.start(t)
            oscilador.stop(t + 0.3)
            ruido(t, 0.15, 'lowpass', 2500, 400, 0.5, destino)
        },
        // Un paso al caminar (alterna el tono para que suene a pie izquierdo/derecho)
        paso(t, destino) {
            pieIzquierdo = !pieIzquierdo
            ruido(t, 0.07, 'lowpass', pieIzquierdo ? 1100 : 850, 250, 1.4, destino)
        },
    }

    /* ---------------------------------------------------------------------
       Efectos de combate que vienen de ARCHIVOS (carpeta assets/audio/efectos).
       Son 4 sonidos cortos que se combinan para armar cada jugada:
         golpeSuave → golpe suave y rápido (el puño al conectar)
         silbido    → el aire cortado por el movimiento
         golpeAire  → golpe seco con aire (la patada al conectar)
         impacto    → impacto fuerte (cuando te pegan y perdés la ronda)
       "retraso" es cuántos segundos después de apretar el botón suena cada parte:
       el silbido va al arrancar el movimiento y el golpe justo cuando los
       personajes se juntan en el mapa. Si algún archivo no se pudiera cargar,
       se usa el efecto generado por código (el de más arriba).
       --------------------------------------------------------------------- */

    const SONIDOS_ARCHIVO = {
        finalGanado: './assets/audio/final/ganado.mp3',
        finalPerdido: './assets/audio/final/perdido.mp3',
        finalEmpatado: './assets/audio/final/empatado.mp3',
        golpeSuave: './assets/audio/efectos/golpe-suave.wav',
        silbido: './assets/audio/efectos/silbido-aire.wav',
        golpeAire: './assets/audio/efectos/golpe-aire.wav',
        impacto: './assets/audio/efectos/impacto-fuerte.wav',
    }

    const EFECTOS_DE_ARCHIVO = {
        // Puño: un solo golpe suave y rápido, justo al conectar
        Punio: [{ sonido: 'golpeSuave', retraso: 0.26, volumen: 1 }],
        // Patada: silbido al levantar la pierna + golpe de aire al conectar
        Patada: [
            { sonido: 'silbido', retraso: 0, volumen: 0.9 },
            { sonido: 'golpeAire', retraso: 0.3, volumen: 1 },
        ],
        // Barrida: silbido más lento y grave (barre el piso) + golpe suave grave al final
        Barrida: [
            { sonido: 'silbido', retraso: 0, volumen: 1, velocidad: 0.75 },
            { sonido: 'golpeSuave', retraso: 0.34, volumen: 0.9, velocidad: 0.8 },
        ],
        // Golpe recibido (perder la ronda): impacto fuerte
        golpe: [{ sonido: 'impacto', retraso: 0, volumen: 1 }],
        // Resultado: ganar o perder la PARTIDA (suena al final de la batalla) y empatar una
        // RONDA (los dos eligieron el mismo ataque). Los tres archivos ya están igualados de
        // volumen. Pertenecen al grupo "resultado": si empieza uno nuevo, corta al que
        // esté sonando.
        finalGanado: [{ sonido: 'finalGanado', retraso: 0, volumen: 1, grupo: 'resultado' }],
        finalPerdido: [{ sonido: 'finalPerdido', retraso: 0, volumen: 1, grupo: 'resultado' }],
        finalEmpatado: [{ sonido: 'finalEmpatado', retraso: 0, volumen: 1, grupo: 'resultado' }],
    }

    const sonidosBase = {} // un <audio> precargado por cada archivo
    const sonidosFallidos = new Set() // los que no se pudieron cargar

    function precargarSonidos() {
        if (Object.keys(sonidosBase).length > 0) {
            return
        }
        Object.keys(SONIDOS_ARCHIVO).forEach((clave) => {
            const audio = new Audio(SONIDOS_ARCHIVO[clave])
            audio.preload = 'auto'
            audio.addEventListener('error', () => sonidosFallidos.add(clave))
            sonidosBase[clave] = audio
        })
    }

    // Sonidos de resultado que están sonando ahora (uno por grupo)
    const sonandoPorGrupo = {}

    // Corta con un fundido rápido el sonido de resultado que esté sonando (si hay)
    function cortarResultado() {
        const sonando = sonandoPorGrupo.resultado
        if (sonando) {
            delete sonandoPorGrupo.resultado
            fundirPista(sonando, 0, 150, () => sonando.pause())
        }
    }

    // Reproduce las partes de una jugada; cada una con su retraso, volumen y velocidad
    function reproducirArchivos(partes, volumenGeneral) {
        partes.forEach((parte) => {
            const lanzar = () => {
                if (silenciado || !sonidosBase[parte.sonido]) {
                    return
                }
                // Se clona el <audio> para que varios sonidos puedan superponerse
                const audio = sonidosBase[parte.sonido].cloneNode(true)
                audio.volume = Math.min(1, parte.volumen * volumenGeneral)
                audio.preservesPitch = false // al cambiar la velocidad, también cambia el tono (más grave)
                audio.playbackRate = parte.velocidad || 1
                if (parte.grupo === 'resultado') {
                    cortarResultado() // no se pisan dos resultados
                    sonandoPorGrupo.resultado = audio
                }
                audio.play().catch(() => {})
            }
            if (parte.retraso) {
                setTimeout(lanzar, parte.retraso * 1000)
            } else {
                lanzar()
            }
        })
    }

    /* ---------------------------------------------------------------------
       Planificador: va "agendando" las notas un instante antes de que suenen.
       Así el ritmo es exacto (setInterval solo no alcanza para música).
       --------------------------------------------------------------------- */

    function planificar() {
        if (!tema || !contexto) {
            return
        }
        const duracionPaso = 60 / tema.bpm / 4
        // Si la pestaña estuvo en segundo plano y nos atrasamos, retomamos desde ahora
        if (proximoPaso < contexto.currentTime - 0.5) {
            proximoPaso = contexto.currentTime + 0.05
        }
        while (proximoPaso < contexto.currentTime + 0.15) {
            tema.tocar(numeroPaso % tema.pasos, proximoPaso, duracionPaso)
            proximoPaso += duracionPaso
            numeroPaso++
        }
    }

    function detenerReloj() {
        clearInterval(reloj)
        reloj = null
    }

    /* ---------------------------------------------------------------------
       Música de archivo (mp3). Se usa un elemento <audio> común: funciona
       también si abrís index.html con doble click (sin servidor).
       --------------------------------------------------------------------- */

    // --- Continuidad entre páginas: la posición de la música se guarda mientras suena;
    // la página siguiente la lee y sigue desde ahí (como si no hubiera cortes) ---
    const CLAVE_POSICION = 'avatarMusicaPosicion'

    function guardarPosicion() {
        if (!pista || pista.paused || !tema || !tema.continuar) {
            return
        }
        try {
            sessionStorage.setItem(
                CLAVE_POSICION,
                JSON.stringify({ clave: tema.continuar, t: pista.currentTime, ts: Date.now() })
            )
        } catch {
            // sin sessionStorage simplemente empieza de cero
        }
    }

    // Segundo (dentro del archivo) desde el que hay que seguir, o 0 si no corresponde
    function posicionGuardada(clave, duracion) {
        try {
            const guardado = JSON.parse(sessionStorage.getItem(CLAVE_POSICION))
            const segundosPasados = guardado ? (Date.now() - guardado.ts) / 1000 : Infinity
            if (guardado && guardado.clave === clave && segundosPasados < 10) {
                // suma lo que tardó en cargar la página nueva, y da la vuelta si hace falta
                return duracion ? (guardado.t + segundosPasados) % duracion : guardado.t + segundosPasados
            }
        } catch {
            // nada guardado
        }
        return 0
    }

    // Lleva el volumen de la pista hasta "objetivo" en "ms" milisegundos
    // (cada pista guarda su propio temporizador, así dos fundidos no se pisan)
    function fundirPista(audio, objetivo, ms, alTerminar) {
        clearInterval(audio.temporizadorFundido)
        const pasosTotales = Math.max(1, Math.round(ms / 50))
        const salto = (objetivo - audio.volume) / pasosTotales
        let contador = 0
        audio.temporizadorFundido = setInterval(() => {
            contador++
            audio.volume = Math.min(1, Math.max(0, audio.volume + salto))
            if (contador >= pasosTotales) {
                audio.volume = objetivo
                clearInterval(audio.temporizadorFundido)
                if (alTerminar) {
                    alTerminar()
                }
            }
        }, 50)
    }

    // Baja el volumen de la pista y la apaga
    function detenerPista() {
        if (!pista) {
            return
        }
        const vieja = pista
        pista = null
        clearInterval(vieja.temporizadorPosicion)
        fundirPista(vieja, 0, 400, () => {
            vieja.pause()
            vieja.removeAttribute('src')
            vieja.load() // libera el archivo
        })
    }

    function arrancarPista(temaArchivo) {
        const audio = new Audio(temaArchivo.archivo)
        audio.loop = true
        audio.preload = 'auto'
        audio.volume = 0
        audio.muted = silenciado
        pista = audio

        // Si la música viene de la página anterior, sigue desde donde iba
        let retomada = false
        audio.addEventListener(
            'loadedmetadata',
            () => {
                const desde = temaArchivo.continuar ? posicionGuardada(temaArchivo.continuar, audio.duration) : 0
                if (desde > 1) {
                    audio.currentTime = desde
                    retomada = true
                }
            },
            { once: true }
        )

        // Cuando realmente empieza a sonar, el volumen sube de a poco
        // (más rápido si es una continuación, para que casi no se note el cambio de página)
        audio.addEventListener(
            'playing',
            () => fundirPista(audio, temaArchivo.volumen ?? 0.6, retomada ? 500 : temaArchivo.fundidoEntrada ?? 1500),
            { once: true }
        )
        if (temaArchivo.continuar) {
            audio.temporizadorPosicion = setInterval(guardarPosicion, 500)
        }

        // Si el archivo no se puede cargar, usamos la versión generada por código
        audio.addEventListener('error', () => {
            const respaldo = TEMAS[temaArchivo.respaldo]
            if (pista === audio && tema === temaArchivo && respaldo) {
                pista = null
                tema = respaldo
                arrancarTema()
            }
        })

        // Sin un toque previo de la persona el navegador lo bloquea: no es un error,
        // iniciar() lo vuelve a intentar apenas haya un click o una tecla
        const intento = audio.play()
        if (intento && intento.catch) {
            intento.catch(() => {})
        }
    }

    // Arranca (o reanuda) la música del tema actual sin reiniciarla si ya suena
    function reanudarMusica() {
        if (!tema) {
            return
        }
        if (tema.archivo) {
            if (!pista) {
                arrancarPista(tema)
            } else if (pista.paused) {
                pista.play().catch(() => {})
            }
        } else if (!reloj) {
            arrancarTema()
        }
    }

    function arrancarTema() {
        detenerReloj()
        detenerPista()
        if (!contexto || !tema) {
            return
        }
        if (tema.archivo) {
            busMusica.gain.setTargetAtTime(0.0001, contexto.currentTime, 0.1) // el canal sintetizado se calla
            arrancarPista(tema)
            return
        }
        numeroPaso = 0
        proximoPaso = contexto.currentTime + 0.1
        // Entrada suave: el volumen sube de 0 al normal en medio segundo
        busMusica.gain.cancelScheduledValues(contexto.currentTime)
        busMusica.gain.setValueAtTime(0.0001, contexto.currentTime)
        busMusica.gain.exponentialRampToValueAtTime(VOLUMEN_MUSICA, contexto.currentTime + 0.6)
        reloj = setInterval(planificar, 30)
    }

    /* ---------------------------------------------------------------------
       API pública
       --------------------------------------------------------------------- */

    // Devuelve una promesa que se cumple cuando el audio ya está sonando
    // (así se puede esperar a que arranque antes de lanzar un efecto)
    function iniciar() {
        if (!contexto) {
            const MotorAudio = window.AudioContext || window.webkitAudioContext
            if (!MotorAudio) {
                return Promise.resolve() // navegador sin audio: todo sigue en silencio
            }
            contexto = new MotorAudio()

            // Cadena de salida: volumen general → compresor (evita saturar) → parlantes
            salidaMaestra = contexto.createGain()
            salidaMaestra.gain.value = silenciado ? 0 : VOLUMEN_GENERAL
            const compresor = contexto.createDynamicsCompressor()
            salidaMaestra.connect(compresor).connect(contexto.destination)

            // Canal de música, con un eco suave para darle ambiente
            busMusica = contexto.createGain()
            busMusica.gain.value = VOLUMEN_MUSICA
            busMusica.connect(salidaMaestra)
            const eco = contexto.createDelay(1)
            const retorno = contexto.createGain()
            const mezclaEco = contexto.createGain()
            eco.delayTime.value = 0.36
            retorno.gain.value = 0.28
            mezclaEco.gain.value = 0.25
            busMusica.connect(eco)
            eco.connect(retorno).connect(eco)
            eco.connect(mezclaEco).connect(salidaMaestra)

            // Canal de efectos
            busEfectos = contexto.createGain()
            busEfectos.gain.value = 1
            busEfectos.connect(salidaMaestra)

            // 1 segundo de ruido blanco, guardado una sola vez y reutilizado
            bufferRuido = contexto.createBuffer(1, contexto.sampleRate, contexto.sampleRate)
            const datos = bufferRuido.getChannelData(0)
            for (let i = 0; i < datos.length; i++) {
                datos[i] = Math.random() * 2 - 1
            }
        }

        precargarSonidos()
        reanudarMusica()
        if (contexto.state === 'suspended') {
            return contexto.resume().catch(() => {}) // si el navegador lo bloquea, no pasa nada
        }
        return Promise.resolve()
    }

    // Cambia la música: 'menu', 'batalla' o null para frenarla
    function musica(nombre) {
        const nuevo = TEMAS[nombre] || null
        // Si ya está sonando exactamente esa música, no se reinicia
        // (ej: abrir una segunda explicación mientras ya suenan los latidos)
        if (nuevo && nuevo === tema && contexto && ((pista && !pista.paused) || reloj)) {
            return
        }
        tema = nuevo
        if (!contexto) {
            return // queda anotado: arranca apenas se llame a iniciar()
        }
        if (tema) {
            arrancarTema()
        } else {
            detenerReloj()
            detenerPista()
            busMusica.gain.setTargetAtTime(0.0001, contexto.currentTime, 0.2) // se apaga suave
        }
    }

    // Baja el volumen de la música de archivo en "ms" sin detenerla (suaviza el cambio de página)
    function atenuar(ms) {
        if (pista) {
            fundirPista(pista, 0, ms)
        }
    }

    // Reproduce un efecto una vez. "volumen" permite hacerlo más bajo (ej: el enemigo)
    function efecto(nombre, volumen = 1) {
        if (silenciado) {
            return
        }
        // Jugadas de combate: se usan los archivos (si todos cargaron bien)
        const partes = EFECTOS_DE_ARCHIVO[nombre]
        if (partes && partes.every((parte) => sonidosBase[parte.sonido] && !sonidosFallidos.has(parte.sonido))) {
            reproducirArchivos(partes, volumen)
            return
        }
        if (!contexto || contexto.state !== 'running' || !EFECTOS[nombre]) {
            return
        }
        const canal = contexto.createGain()
        canal.gain.value = volumen
        canal.connect(busEfectos)
        EFECTOS[nombre](contexto.currentTime + 0.005, canal)
    }

    // Pasos mientras el personaje camina por el mapa
    function pasos(activar) {
        if (activar && !relojPasos) {
            relojPasos = setInterval(() => efecto('paso'), 260)
        } else if (!activar && relojPasos) {
            clearInterval(relojPasos)
            relojPasos = null
        }
    }

    // Silencia o reactiva todo. Devuelve true si quedó silenciado
    function alternar() {
        silenciado = !silenciado
        guardarPreferencia()
        if (pista) {
            pista.muted = silenciado
        }
        if (contexto) {
            salidaMaestra.gain.setTargetAtTime(silenciado ? 0 : VOLUMEN_GENERAL, contexto.currentTime, 0.05)
        }
        return silenciado
    }

    // Al irse de la página (ej: tocar "Jugar"), se guarda la posición exacta
    window.addEventListener('pagehide', guardarPosicion)

    // Para ahorrar batería: si se cambia de pestaña, el audio se pausa
    document.addEventListener('visibilitychange', () => {
        if (!contexto) {
            return
        }
        if (document.hidden) {
            contexto.suspend()
            if (pista) {
                pista.pause()
            }
        } else {
            contexto.resume()
            if (pista) {
                pista.play().catch(() => {})
            }
        }
    })

    return {
        iniciar,
        musica,
        efecto,
        cortarResultado,
        atenuar,
        pasos,
        alternar,
        estaSilenciado: () => silenciado,
        estaActivo: () => !!contexto && contexto.state === 'running',
        // Salida general del audio (la usan las pruebas para medir que suena)
        get salida() {
            return salidaMaestra
        },
        get contexto() {
            return contexto
        },
        // El <audio> de la música de archivo (lo usan las pruebas)
        get pista() {
            return pista
        },
    }
})()
