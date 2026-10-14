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
3. Usá las flechas para mover la nave.
4. Pulsá la barra espaciadora para disparar.
5. Evitá las naves enemigas y derribalas para sumar puntos.

## Solución de problemas

- **No se encuentra un archivo de imagen o sonido:** comprobá que descargaste el repositorio completo y que no moviste ni renombraste nada dentro de `assets`.
- **`ModuleNotFoundError: No module named 'pygame'`:** activá `.venv` e instalá Pygame con `python -m pip install pygame==2.6.1`.
- **No se abre la ventana o no se reproduce el audio:** ejecutá el juego en una sesión de escritorio con pantalla y audio disponibles; una terminal remota o un entorno sin interfaz gráfica no es suficiente.
