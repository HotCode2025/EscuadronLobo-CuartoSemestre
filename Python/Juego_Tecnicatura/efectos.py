"""Utilidades visuales: sprites, brillos (glow), partículas y fondo espacial."""
import math
import os
import random

import pygame
from constantes import ASSETS_PATH, SCREEN_WIDTH, SCREEN_HEIGHT

_cache = {}  # Guarda las imágenes ya cargadas para no leer el disco en cada cuadro


def cargar_sprite(nombre, ancho=None, alto=None, rotar=0):
    """Carga una imagen de assets/images. Devuelve None si el archivo no existe."""
    clave = (nombre, ancho, alto, rotar)
    if clave in _cache:
        return _cache[clave]
    try:
        img = pygame.image.load(os.path.join(ASSETS_PATH, 'images', nombre)).convert_alpha()
    except (pygame.error, FileNotFoundError):
        _cache[clave] = None
        return None
    if rotar:
        img = pygame.transform.rotate(img, rotar)
    if ancho or alto:
        w, h = img.get_size()
        if ancho and not alto:
            alto = max(1, int(h * ancho / w))
        elif alto and not ancho:
            ancho = max(1, int(w * alto / h))
        img = pygame.transform.smoothscale(img, (ancho, alto))
    _cache[clave] = img
    return img


def sprite_respaldo(ancho, alto, color, hacia_abajo=True):
    """Triángulo simple por si falta la imagen."""
    s = pygame.Surface((ancho, alto), pygame.SRCALPHA)
    if hacia_abajo:
        pts = [(0, 0), (ancho, 0), (ancho / 2, alto)]
    else:
        pts = [(ancho / 2, 0), (ancho, alto), (ancho / 2, alto * 0.75), (0, alto)]
    pygame.draw.polygon(s, color, pts)
    return s


def crear_glow(surf, color, radio=12):
    """Halo suave con la forma del sprite. Se dibuja con BLEND_RGB_ADD."""
    w, h = surf.get_size()
    pad = radio * 2
    mask = pygame.mask.from_surface(surf, 90)
    sil = mask.to_surface(setcolor=(*color, 255), unsetcolor=(0, 0, 0, 0))
    base = pygame.Surface((w + pad * 2, h + pad * 2), pygame.SRCALPHA)
    base.blit(sil, (pad, pad))
    f = max(2, radio // 2)
    chico = pygame.transform.smoothscale(base, (max(1, base.get_width() // f), max(1, base.get_height() // f)))
    blur = pygame.transform.smoothscale(chico, base.get_size())
    out = pygame.Surface(base.get_size(), pygame.SRCALPHA)
    out.blit(blur, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
    out.blit(blur, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
    return out, pad


def con_borde(surf, color, grosor=2):
    """Borde de luz alrededor de la silueta: separa la nave del fondo oscuro."""
    out = surf.copy()
    puntos = pygame.mask.from_surface(surf, 90).outline()
    if len(puntos) > 2:
        pygame.draw.lines(out, color, True, puntos, grosor)
    return out


def aclarar(surf, rgb):
    out = surf.copy()
    out.fill(rgb, special_flags=pygame.BLEND_RGB_ADD)
    return out


def silueta_blanca(surf):
    return pygame.mask.from_surface(surf, 90).to_surface(setcolor=(255, 255, 255, 255), unsetcolor=(0, 0, 0, 0))


class Particulas:
    """Chispas que salen en explosiones, impactos y estelas de misil."""
    def __init__(self):
        self.p = []

    def chispas(self, x, y, color, n=14, vel=5.0, vida=28):
        for _ in range(n):
            a = random.uniform(0, math.tau)
            v = random.uniform(0.8, vel)
            self.p.append([x, y, math.cos(a) * v, math.sin(a) * v, random.randint(vida // 2, vida), vida, color])

    def actualizar(self):
        for q in self.p[:]:
            q[0] += q[2]
            q[1] += q[3]
            q[2] *= 0.96
            q[3] *= 0.96
            q[4] -= 1
            if q[4] <= 0:
                self.p.remove(q)

    def dibujar(self, screen):
        for x, y, _, _, vida, total, color in self.p:
            k = vida / total
            c = (int(color[0] * k), int(color[1] * k), int(color[2] * k))
            pygame.draw.circle(screen, c, (int(x), int(y)), 1 + int(2 * k))


def cargar_fondos(nombres):
    """Carga los fondos (nebulosas verticales) ajustados al ancho de la pantalla y algo oscurecidos
    para que las naves y los disparos resalten. De cada imagen se arma una versión doble (la imagen
    y su espejo) para que el desplazamiento vertical sea continuo, sin saltos."""
    from constantes import BRILLO_FONDO
    fondos = []
    for nombre in nombres:
        img = pygame.image.load(os.path.join(ASSETS_PATH, 'images', nombre)).convert()
        alto = max(SCREEN_HEIGHT, int(img.get_height() * SCREEN_WIDTH / img.get_width()))
        img = pygame.transform.smoothscale(img, (SCREEN_WIDTH, alto))
        v = int(255 * BRILLO_FONDO)
        img.fill((v, v, v), special_flags=pygame.BLEND_RGB_MULT)
        doble = pygame.Surface((SCREEN_WIDTH, alto * 2)).convert()
        doble.blit(img, (0, 0))
        doble.blit(pygame.transform.flip(img, False, True), (0, alto))
        fondos.append({'doble': doble, 'alto': alto, 'imagen': img})
    return fondos


class Fondo:
    """Fondos de nebulosa que avanzan hacia abajo (la nave "vuela" hacia arriba), más una capa
    de estrellas rápidas para dar sensación de velocidad. Cambia de fondo en cada nivel."""
    def __init__(self, fondos):
        self.fondos = fondos
        self.actual = 0
        self.y = random.uniform(0, fondos[0]['alto'])
        self.estrellas = [[random.randint(0, SCREEN_WIDTH), random.randint(0, SCREEN_HEIGHT),
                           random.choice((1.2, 2.2, 3.6)), random.randint(100, 210)] for _ in range(36)]

    def cambiar(self, indice):
        self.actual = indice % len(self.fondos)
        self.y = random.uniform(0, self.fondos[self.actual]['alto'])

    def pantalla(self, indice=0):
        """Recorte del tamaño de la pantalla (para la introducción)."""
        f = self.fondos[indice % len(self.fondos)]
        y = int((f['alto'] - SCREEN_HEIGHT) * 0.35)
        return f['imagen'].subsurface((0, y, SCREEN_WIDTH, SCREEN_HEIGHT))

    def dibujar(self, screen, extra=0.0):
        f = self.fondos[self.actual]
        total = f['alto'] * 2
        self.y = (self.y + 1.0 + extra * 2.5) % total
        screen.blit(f['doble'], (0, self.y - total))
        screen.blit(f['doble'], (0, self.y))
        for s in self.estrellas:
            s[1] += s[2] * (1.4 + extra)
            if s[1] > SCREEN_HEIGHT:
                s[0], s[1] = random.randint(0, SCREEN_WIDTH), 0
            b = s[3]
            pygame.draw.circle(screen, (b, b, min(255, b + 30)), (int(s[0]), int(s[1])), 1 if s[2] < 2.5 else 2)
