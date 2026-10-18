"""Sonidos del juego. Usa los .mp3 originales de assets/sounds (laserdis, explosion, efectos y
Imperial March) y suma efectos nuevos generados por código, así no hace falta agregar archivos."""
import array
import math
import os
import random

import pygame
from constantes import ASSETS_PATH


def _formato():
    info = pygame.mixer.get_init()
    return (info[0], info[2]) if info else (44100, 2)


def _crear(muestras, vol):
    rate, canales = _formato()
    buf = array.array('h')
    for s in muestras:
        v = int(max(-1.0, min(1.0, s)) * 32767 * vol)
        for _ in range(canales):
            buf.append(v)
    return pygame.mixer.Sound(buffer=buf.tobytes())


def sintetizar(f0, f1, dur, vol=0.5, forma='seno', ruido=0.0, ataque=0.004):
    """Crea un efecto de sonido: un tono que cambia de frecuencia f0 -> f1."""
    rate, _ = _formato()
    n = int(rate * dur)
    fase = 0.0
    out = []
    for i in range(n):
        t = i / n
        fase += math.tau * (f0 + (f1 - f0) * t) / rate
        if forma == 'cuadrada':
            s = 0.6 if math.sin(fase) > 0 else -0.6
        elif forma == 'sierra':
            s = ((fase / math.tau) % 1) * 2 - 1
        else:
            s = math.sin(fase)
        s = s * (1 - ruido) + random.uniform(-1, 1) * ruido
        out.append(s * (1 - t) ** 2 * min(1.0, i / (rate * ataque)))
    return _crear(out, vol)


def _archivo(nombre, vol):
    try:
        s = pygame.mixer.Sound(os.path.join(ASSETS_PATH, 'sounds', nombre))
        s.set_volume(vol)
        return s
    except (pygame.error, FileNotFoundError):
        return None


class Audio:
    def __init__(self):
        self.ok = pygame.mixer.get_init() is not None
        self.s = {}
        if not self.ok:
            return
        S = self.s
        # Sonidos originales (si faltan, se sintetizan)
        S['laser'] = _archivo('laserdis.mp3', 0.35) or sintetizar(1500, 320, 0.13, 0.22, 'cuadrada')
        S['explosion'] = _archivo('explosion.mp3', 0.6) or sintetizar(150, 40, 0.5, 0.55, 'seno', 0.75)
        # Sonidos nuevos
        S['laser_enemigo'] = sintetizar(520, 170, 0.22, 0.2, 'sierra')
        S['laser_pesado'] = sintetizar(260, 70, 0.4, 0.3, 'sierra', 0.15)
        S['explosion_grande'] = sintetizar(110, 25, 1.2, 0.65, 'seno', 0.8)
        S['misil'] = sintetizar(180, 900, 0.4, 0.3, 'sierra', 0.3)
        S['pickup'] = sintetizar(600, 1500, 0.2, 0.3, 'seno')
        S['golpe'] = sintetizar(230, 80, 0.22, 0.5, 'cuadrada', 0.4)
        S['escudo'] = sintetizar(950, 300, 0.28, 0.3, 'seno', 0.2)
        S['aviso'] = sintetizar(350, 1300, 0.35, 0.2, 'sierra')
        S['alarma'] = sintetizar(500, 900, 0.7, 0.28, 'cuadrada')
        S['nivel'] = sintetizar(400, 1200, 0.6, 0.3, 'cuadrada')

    def play(self, nombre, vol=None):
        if self.ok and nombre in self.s:
            canal = self.s[nombre].play()
            if canal is not None and vol is not None:
                canal.set_volume(vol)

    def _musica(self, archivo, vol):
        if not self.ok:
            return
        try:
            pygame.mixer.music.load(os.path.join(ASSETS_PATH, 'sounds', archivo))
            pygame.mixer.music.set_volume(vol)
            pygame.mixer.music.play(-1)
        except (pygame.error, FileNotFoundError):
            pass

    def musica_normal(self):
        """Música de fondo en bucle (efectos.mp3, la del juego original)."""
        self._musica('efectos.mp3', 0.4)

    def musica_jefe(self):
        """Cuando llega la Nave Madre suena la Marcha Imperial que ya estaba en la carpeta de sonidos."""
        self._musica('Imperial March - Kenobi.mp3', 0.55)
