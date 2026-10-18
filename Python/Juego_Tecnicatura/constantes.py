import os

# Dimension de la pantalla, el alto y ancho de la pantalla
SCREEN_WIDTH = 1366
SCREEN_HEIGHT = 768
FPS = 60  # Cuadros por segundo del juego

# Especificamos los colores de la pantalla
COLOR_LASER = (0, 0, 255) #AZUL
AZUL = (70, 180, 255)      # Escuadrón Lobo
CELESTE = (150, 225, 255)
ROJO = (255, 70, 70)       # Flota enemiga
NARANJA = (255, 170, 60)
AMARILLO = (255, 225, 90)

# Reglas del juego
PUNTOS_POR_NIVEL = 250  # Al llegar a estos puntos aparece la Nave Madre; al vencerla se sube de nivel
BRILLO_FONDO = 0.62     # Qué tan brillantes se ven las nebulosas (0 a 1). Más bajo = naves y disparos resaltan más
AUTOFUEGO = False       # False: un disparo por pulsación (como el juego original). True: disparo continuo al mantener ESPACIO

# Ruta a la carpeta assets
ASSETS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
