# Amenaza Fantasma

Juego de StarWars hecho con Python y Pygame.

## Requisitos

- Python 3.11 o superior.
- `pip`, incluido normalmente con Python.
- Windows, macOS o Linux con entorno gráfico y soporte de audio.

El juego fue desarrollado y probado con Python 3.11 y Pygame 2.6.1.

## Descargar el proyecto

Cloná el repositorio completo para obtener el código y los recursos gráficos y de sonido:

```bash
git clone <URL_DEL_REPOSITORIO>
cd Tecnicatura3/Python/Juego_Tecnicatura
```

Si ya descargaste el repositorio como ZIP, extraelo y abrí una terminal dentro de `Python/Juego_Tecnicatura`.

> Es importante conservar las carpetas `assets/images` y `assets/sounds` junto con los archivos Python. El juego carga los recursos desde esas rutas.

## Instalar y ejecutar

### Windows (PowerShell)

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install pygame==2.6.1
python main.py
```

Si PowerShell bloquea la activación del entorno virtual, podés omitir el paso de activación y ejecutar los comandos directamente con el Python del entorno:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install pygame==2.6.1
.\.venv\Scripts\python.exe main.py
```

### macOS o Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install pygame==2.6.1
python main.py
```

## Cómo jugar

1. En la pantalla inicial, pulsá cualquier tecla para continuar.
2. Se mostrará la introducción durante unos segundos y luego comenzará la partida.
3. Usá las flechas (o W A S D) ó (Arriba: ▲  ó  ↑, Abajo: ▼  ó  ↓, Izquierda: ◄  ó  ←, Derecha: ►  ó  →) para mover la nave.
4. Pulsá la barra espaciadora para disparar (un disparo por pulsación).
5. Pulsá **Z** o **X** para lanzar un misil buscador y **SHIFT** para usar el turbo.
6. Evitá las naves enemigas y derribalas para sumar puntos. **P** pausa y **ESC** sale.

### Qué hay de nuevo

- **Nave del Escuadrón Lobo**: la Caza Estelar con el lobo piloto dentro, con el logo del escuadrón y un halo azul para distinguirla del espacio.
- **Portada nueva** (`assets/images/inicio/star.png`) con los controles incluidos. Las imágenes originales reemplazadas quedaron guardadas en `assets/images/originales`.
- **Flota enemiga con 5 tipos de nave**, cada uno con su forma de atacar:
  - *Cazas*: bajan en formación de V y disparan.
  - *Drones*: te persiguen y explotan.
  - *Bombarderos*: se frenan arriba, cargan y disparan proyectiles pesados.
  - *Interceptores*: te apuntan con una línea roja y embisten.
  - *Nave Madre*: jefe del nivel, con abanicos de disparos, ráfagas e invocación de drones.
- **Niveles**: al llegar a 250 puntos aparece la Nave Madre; al vencerla se sube de nivel y cambia el fondo. Hay tres fondos de nebulosas (`fondo2`, `fondo3` y `fondo4`) que se repiten en ciclo y se desplazan suavemente; su brillo se regula con `BRILLO_FONDO` en `constantes.py`.
- **Mejores puntajes**: al perder, si tu puntaje entra entre los 5 mejores escribís tu nombre y se guarda en `puntajes.json`. El récord se ve en pantalla durante la partida.
- **Estilo unificado**: la introducción, el aviso de nuevo mejor puntaje, el GAME OVER y la tabla de puntajes usan el fondo del juego y el mismo estilo del panel, con las fuentes Orbitron y Audiowide (carpeta `assets/fonts`, licencia OFL incluida).
- **Panel de información** (como el diseño de batalla): nave principal, flota enemiga, radar, misiles, escudo y energía, y mensajes.
- **Cápsulas** que sueltan algunos enemigos: misiles, escudo, energía y reparación.
- **Más velocidad**: nave más ágil (acelera y frena suave), enemigos y disparos más rápidos, turbo y explosiones rápidas.
- **Sonido**: se mantienen los sonidos originales y se suman efectos nuevos (disparos enemigos, misiles, escudo, alarmas); al aparecer la Nave Madre suena la Marcha Imperial.

En `constantes.py` se puede cambiar `AUTOFUEGO = True` para disparar sin soltar la barra espaciadora.

La carpeta `diseños_sin_texto` guarda los diseños de las naves y de la batalla sin textos (no la usa el juego).

## Solución de problemas

- **No se encuentra un archivo de imagen o sonido:** comprobá que descargaste el repositorio completo y que no moviste ni renombraste nada dentro de `assets`.
- **`ModuleNotFoundError: No module named 'pygame'`:** activá `.venv` e instalá Pygame con `python -m pip install pygame==2.6.1`.
- **No se abre la ventana o no se reproduce el audio:** ejecutá el juego en una sesión de escritorio con pantalla y audio disponibles; una terminal remota o un entorno sin interfaz gráfica no es suficiente.
