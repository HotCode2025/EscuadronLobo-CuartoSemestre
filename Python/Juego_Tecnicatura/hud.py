"""HUD (panel de información) como en la imagen de batalla: nave principal, flota enemiga,
radar, misiles/escudo/energía y mensaje inferior."""
import math
import os

import pygame
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT, AZUL, CELESTE, ROJO, NARANJA, AMARILLO, ASSETS_PATH
from efectos import cargar_sprite

F = {}  # Fuentes


def _fuente(archivo, tam, negrita=False):
    """Carga una fuente de assets/fonts (si falta, usa una del sistema)."""
    try:
        f = pygame.font.Font(os.path.join(ASSETS_PATH, 'fonts', archivo), tam)
    except (pygame.error, FileNotFoundError):
        f = pygame.font.SysFont('bahnschrift,consolas,arial', tam)
    f.set_bold(negrita)
    return f


def iniciar():
    """Fuentes del juego: Orbitron para el panel y Audiowide para los títulos."""
    F['chica'] = _fuente('Orbitron.ttf', 15, True)
    F['media'] = _fuente('Orbitron.ttf', 19, True)
    F['grande'] = _fuente('Orbitron.ttf', 28, True)
    F['sub'] = _fuente('Orbitron.ttf', 24, True)
    F['titulo'] = _fuente('Audiowide-Regular.ttf', 84)
    F['titulo2'] = _fuente('Audiowide-Regular.ttf', 50)
    F['intro'] = _fuente('Audiowide-Regular.ttf', 80)


def texto_degradado(txt, fuente, c1, c2, glow=None, radio=10):
    """Texto con degradado vertical (de c1 a c2) y un resplandor de color alrededor."""
    base = F[fuente].render(txt, True, (255, 255, 255))
    w, h = base.get_size()
    grad = pygame.Surface((w, h))
    for y in range(h):
        k = y / max(1, h - 1)
        pygame.draw.line(grad, tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3)), (0, y), (w, y))
    base.blit(grad, (0, 0), special_flags=pygame.BLEND_RGB_MULT)
    if glow is None:
        return base
    pad = radio * 2
    sil = F[fuente].render(txt, True, glow)
    g = pygame.Surface((w + pad * 2, h + pad * 2), pygame.SRCALPHA)
    g.blit(sil, (pad, pad))
    chico = pygame.transform.smoothscale(g, (max(1, g.get_width() // 4), max(1, g.get_height() // 4)))
    blur = pygame.transform.smoothscale(chico, g.get_size())
    out = pygame.Surface(g.get_size(), pygame.SRCALPHA)
    for _ in range(3):
        out.blit(blur, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)
    out.blit(base, (pad, pad))
    return out


def tecla(screen, txt, x, y):
    """Dibuja una "tecla" (ENTER, ESC...) y devuelve su ancho."""
    s = F['chica'].render(txt, True, (225, 245, 255))
    r = pygame.Rect(x, y, s.get_width() + 22, s.get_height() + 12)
    pygame.draw.rect(screen, (8, 22, 50), r, border_radius=7)
    pygame.draw.rect(screen, AZUL, r, 2, border_radius=7)
    screen.blit(s, s.get_rect(center=r.center))
    return r.width


def texto(screen, txt, pos, fuente='media', color=(255, 255, 255), centro=False):
    s = F[fuente].render(txt, True, color)
    r = s.get_rect(center=pos) if centro else s.get_rect(topleft=pos)
    screen.blit(s, r)
    return r


def panel(screen, rect, color, alpha=175, corte=14):
    """Recuadro con esquinas cortadas y borde de neón."""
    x, y, w, h = rect
    pts = [(corte, 0), (w - corte, 0), (w, corte), (w, h - corte), (w - corte, h), (corte, h), (0, h - corte), (0, corte)]
    s = pygame.Surface((w + 4, h + 4), pygame.SRCALPHA)
    p = [(a + 2, b + 2) for a, b in pts]
    pygame.draw.polygon(s, (4, 10, 26, alpha), p)
    pygame.draw.polygon(s, (*color, 255), p, 2)
    screen.blit(s, (x - 2, y - 2))


def barra(screen, rect, frac, color, fondo=(14, 26, 50)):
    x, y, w, h = rect
    frac = max(0.0, min(1.0, frac))
    pygame.draw.rect(screen, fondo, rect, border_radius=h // 2)
    if frac > 0:
        pygame.draw.rect(screen, color, (x, y, max(h, int(w * frac)), h), border_radius=h // 2)
        pygame.draw.rect(screen, tuple(min(255, c + 70) for c in color), (x + 3, y + 1, max(2, int(w * frac) - 6), max(1, h // 4)), border_radius=2)


def emblema_enemigo(screen, c, tam, color):
    x, y = c
    pts = [(x, y + tam), (x - tam * 0.9, y - tam * 0.2), (x - tam * 0.45, y - tam * 0.1), (x - tam * 0.5, y - tam),
           (x, y - tam * 0.35), (x + tam * 0.5, y - tam), (x + tam * 0.45, y - tam * 0.1), (x + tam * 0.9, y - tam * 0.2)]
    pygame.draw.polygon(screen, color, pts, 2)


def radar(screen, centro, R, jugador_pos, enemigos, t):
    """Radar circular: triángulo azul = tu nave, triángulos rojos = enemigos."""
    s = pygame.Surface((R * 2 + 6, R * 2 + 6), pygame.SRCALPHA)
    c = (R + 3, R + 3)
    pygame.draw.circle(s, (4, 14, 34, 190), c, R)
    for k in (0.33, 0.66, 1.0):
        pygame.draw.circle(s, (60, 150, 255, 150), c, int(R * k), 2 if k == 1.0 else 1)
    pygame.draw.line(s, (60, 150, 255, 90), (c[0] - R, c[1]), (c[0] + R, c[1]), 1)
    pygame.draw.line(s, (60, 150, 255, 90), (c[0], c[1] - R), (c[0], c[1] + R), 1)
    a = (t * 0.04) % math.tau
    pygame.draw.line(s, (120, 220, 255, 170), c, (c[0] + math.cos(a) * R, c[1] + math.sin(a) * R), 2)
    alcance = 750.0
    for e in enemigos:
        d = (e.pos - jugador_pos) / alcance
        if d.length() > 1:
            d.scale_to_length(1)
        ex, ey = c[0] + d.x * (R - 6), c[1] + d.y * (R - 6)
        col = (255, 60, 60) if e.tipo != 'madre' else (255, 160, 60)
        pygame.draw.polygon(s, col, [(ex, ey + 5), (ex - 4, ey - 4), (ex + 4, ey - 4)])
    pygame.draw.polygon(s, (90, 200, 255), [(c[0], c[1] - 7), (c[0] - 5, c[1] + 5), (c[0] + 5, c[1] + 5)])
    screen.blit(s, (centro[0] - R - 3, centro[1] - R - 3))


def dibujar(screen, juego):
    p = juego.personaje
    # ---- arriba izquierda: nave principal (barra grande = energía del casco, barra fina = escudo) ----
    panel(screen, (14, 14, 360, 80), AZUL)
    logo = cargar_sprite('logo_cabeza.png', 54)
    if logo:
        screen.blit(logo, logo.get_rect(center=(56, 54)))
    texto(screen, 'NAVE PRINCIPAL', (96, 22), 'media', CELESTE)
    barra(screen, (96, 50, 258, 16), p.energia / 100, (40, 150, 255))
    barra(screen, (96, 72, 258, 5), p.escudo / 100, (120, 225, 255))
    # ---- arriba derecha: flota enemiga ----
    panel(screen, (SCREEN_WIDTH - 374, 14, 360, 80), ROJO)
    emblema_enemigo(screen, (SCREEN_WIDTH - 332, 54), 22, ROJO)
    texto(screen, 'FLOTA ENEMIGA', (SCREEN_WIDTH - 296, 22), 'media', (255, 150, 150))
    barra(screen, (SCREEN_WIDTH - 296, 50, 266, 16), juego.fraccion_flota(), (255, 50, 50), (40, 10, 16))
    # ---- arriba centro: nivel y puntos ----
    texto(screen, f'NIVEL {juego.nivel}', (SCREEN_WIDTH // 2, 28), 'media', CELESTE, True)
    texto(screen, f'PUNTOS {juego.puntos}', (SCREEN_WIDTH // 2, 58), 'grande', (255, 255, 255), True)
    texto(screen, f'RÉCORD {juego.record}', (SCREEN_WIDTH // 2, 84), 'chica', (150, 190, 230), True)
    if juego.combo > 1:
        texto(screen, f'COMBO x{juego.combo}', (SCREEN_WIDTH // 2, 104), 'chica', AMARILLO, True)
    # ---- abajo izquierda: radar ----
    radar(screen, (104, SCREEN_HEIGHT - 104), 84, p.pos, juego.enemigos, juego.frame)
    # ---- abajo derecha: misiles / escudo / energía ----
    x0, y0 = SCREEN_WIDTH - 330, SCREEN_HEIGHT - 118
    panel(screen, (x0, y0, 316, 104), AZUL)
    icono = cargar_sprite('nave_lobo.png', None, 86)
    if icono:
        screen.blit(icono, icono.get_rect(center=(x0 + 46, y0 + 52)))
    filas = (('MISILES', f'{p.n_misiles}', min(1, p.n_misiles / 10), NARANJA),
             ('ESCUDO', f'{int(p.escudo)}%', p.escudo / 100, (80, 190, 255)),
             ('ENERGÍA', f'{int(p.reserva)}%', p.reserva / 100, AMARILLO))
    for i, (n, v, fr, col) in enumerate(filas):
        y = y0 + 12 + i * 30
        texto(screen, n, (x0 + 92, y), 'chica', (210, 230, 255))
        r = F['chica'].render(v, True, (255, 255, 255))
        screen.blit(r, (x0 + 300 - r.get_width(), y))
        barra(screen, (x0 + 92, y + 19, 208, 4), fr, col)
    # ---- abajo centro: mensaje ----
    txt = juego.mensaje if juego.mensaje_t > 0 else '¡SIGUE ASÍ, LA VICTORIA ES NUESTRA!'
    ancho = max(380, F['media'].size(txt)[0] + 60)
    panel(screen, (SCREEN_WIDTH // 2 - ancho // 2, SCREEN_HEIGHT - 52, ancho, 38), AZUL, 160, 10)
    texto(screen, txt, (SCREEN_WIDTH // 2, SCREEN_HEIGHT - 33), 'media', (225, 245, 255), True)
