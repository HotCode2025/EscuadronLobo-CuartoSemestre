import math
import os
import random

import pygame
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT, ASSETS_PATH, COLOR_LASER, AZUL, ROJO, NARANJA
from efectos import cargar_sprite, sprite_respaldo, crear_glow, con_borde, aclarar, silueta_blanca
from explosiones import Explosion  # La clase Explosion está en explosiones.py (se importa aquí para mantener "from personaje import Explosion")


class Laser:
    """Disparo (del jugador o de un enemigo). Se orienta según su velocidad.
    Laser(x, y) crea el láser original de la nave: sale hacia arriba."""
    _cache = {}

    def __init__(self, x, y, vx=0, vy=-15, color=AZUL, dano=1, ancho=6, alto=28, enemigo=False):
        clave = (color, ancho, alto)
        if clave not in Laser._cache:
            s = pygame.Surface((ancho, alto), pygame.SRCALPHA)
            pygame.draw.rect(s, color, (0, 0, ancho, alto), border_radius=ancho // 2)
            pygame.draw.rect(s, (255, 255, 255), (ancho // 2 - 1, 3, max(2, ancho // 3), alto - 6), border_radius=2)
            g, _ = crear_glow(s, color, 10)
            Laser._cache[clave] = (s, g)
        s, g = Laser._cache[clave]
        ang = math.degrees(math.atan2(vx, vy))
        self.image = pygame.transform.rotate(s, ang)
        self.glow = pygame.transform.rotate(g, ang)
        self.pos = pygame.Vector2(x, y)
        self.vel = pygame.Vector2(vx, vy)
        self.rect = self.image.get_rect(center=(x, y))
        self.dano = dano
        self.enemigo = enemigo

    def mover(self):
        self.pos += self.vel
        self.rect.center = (round(self.pos.x), round(self.pos.y))

    def fuera_de_pantalla(self):
        return not pygame.Rect(-80, -80, SCREEN_WIDTH + 160, SCREEN_HEIGHT + 160).colliderect(self.rect)

    def dibujar(self, screen):
        screen.blit(self.glow, self.glow.get_rect(center=self.rect.center), special_flags=pygame.BLEND_RGB_ADD)
        screen.blit(self.image, self.rect)


class Misil:
    """Misil buscador: persigue al enemigo más cercano y explota en área."""
    def __init__(self, x, y):
        self.pos = pygame.Vector2(x, y)
        self.vel = pygame.Vector2(0, -4)
        self.vida = 160
        base = pygame.Surface((14, 36), pygame.SRCALPHA)
        pygame.draw.polygon(base, NARANJA, [(7, 0), (14, 10), (14, 30), (0, 30), (0, 10)])
        pygame.draw.polygon(base, (255, 255, 255), [(7, 0), (11, 9), (3, 9)])
        pygame.draw.rect(base, (255, 90, 40), (3, 30, 8, 6))
        self.base = base
        self.rect = pygame.Rect(0, 0, 18, 18)
        self.rect.center = (x, y)

    def actualizar(self, enemigos, particulas):
        self.vida -= 1
        objetivo = None
        mejor = 1e9
        for e in enemigos:
            d = (e.pos - self.pos).length_squared()
            if d < mejor:
                mejor, objetivo = d, e
        vel = min(13.0, self.vel.length() + 0.45)
        if objetivo is not None:
            deseada = objetivo.pos - self.pos
            if deseada.length() > 0:
                deseada.scale_to_length(vel)
                self.vel = self.vel.lerp(deseada, 0.14)
        if self.vel.length() > 0:
            self.vel.scale_to_length(vel)
        self.pos += self.vel
        self.rect.center = (round(self.pos.x), round(self.pos.y))
        particulas.chispas(self.pos.x - self.vel.x, self.pos.y - self.vel.y, (255, 160, 60), n=2, vel=1.2, vida=14)
        return self.vida > 0 and pygame.Rect(-60, -60, SCREEN_WIDTH + 120, SCREEN_HEIGHT + 120).collidepoint(self.pos)

    def dibujar(self, screen):
        ang = math.degrees(math.atan2(self.vel.x, self.vel.y)) + 180
        img = pygame.transform.rotate(self.base, ang)
        screen.blit(img, img.get_rect(center=self.rect.center))


class Personaje:
    """Nave principal del Escuadrón Lobo."""
    def __init__(self, x, y):
        # Imagen de la nave (si falta la nueva, se usa personaje1.png del juego original)
        img = cargar_sprite('nave_lobo.png', None, 215)   # Caza Estelar con el lobo piloto
        self.motores = [(0.34, 0.85), (0.56, 0.74)]       # dónde salen las llamas (fracción del ancho y alto)
        if img is None:
            img = cargar_sprite('personaje1.png', 95, 95)
            self.motores = [(0.31, 0.88), (0.5, 0.9), (0.69, 0.88)]
        if img is None:
            img = sprite_respaldo(110, 120, (220, 235, 255), hacia_abajo=False)
            self.motores = [(0.31, 0.88), (0.5, 0.9), (0.69, 0.88)]
        self.image = con_borde(img, (140, 215, 255), 2)       # borde celeste: la nave se separa del espacio
        self.glow, self.pad = crear_glow(img, AZUL, 18)
        self.flash_img = silueta_blanca(img)
        self.shape = self.image.get_rect(center=(x, y))      # rectángulo de la nave (posición y tamaño)
        self.pos = pygame.Vector2(x, y)
        self.vel = pygame.Vector2(0, 0)
        self.lasers = []
        self.misiles = []
        self.energia = 100   # barra de energia (casco de la nave, como en el juego original)
        self.escudo = 100    # el escudo absorbe el daño antes que el casco
        self.reserva = 100   # reserva para el turbo (en pantalla aparece como ENERGÍA)
        self.n_misiles = 6
        self.cooldown = 0
        self.cd_misil = 0
        self.invulnerable = 0
        self.sin_golpes = 0
        self.flash_escudo = 0
        self.flash_casco = 0
        self.turbo = False
        w, h = self.shape.size
        self.burbuja = pygame.Surface((w + 56, h + 56), pygame.SRCALPHA)
        pygame.draw.ellipse(self.burbuja, (70, 170, 255, 26), self.burbuja.get_rect())
        pygame.draw.ellipse(self.burbuja, (140, 215, 255, 120), self.burbuja.get_rect(), 2)
        self.burbuja_fuerte = self.burbuja.copy()
        pygame.draw.ellipse(self.burbuja_fuerte, (160, 225, 255, 110), self.burbuja_fuerte.get_rect())

    @property
    def rect(self):
        return self.shape

    @property
    def hitbox(self):
        """Zona que realmente recibe golpes (más chica que el dibujo para que esquivar sea justo)."""
        r = pygame.Rect(0, 0, int(self.shape.w * 0.36), int(self.shape.h * 0.5))
        r.center = (self.shape.centerx - int(self.shape.w * 0.04), self.shape.centery)
        return r

    def mover(self, dx, dy, turbo=False):
        # La nave acelera y frena suave en vez de moverse a saltos; con SHIFT usa el turbo
        self.turbo = bool(turbo and self.reserva > 2 and (dx or dy))
        vmax = 12.0 if self.turbo else 7.5
        if self.turbo:
            self.reserva -= 0.7
        objetivo = pygame.Vector2(dx, dy)
        if objetivo.length() > 0:
            objetivo.scale_to_length(vmax)
        self.vel += (objetivo - self.vel) * 0.2
        self.pos += self.vel
        # No dejar que la nave se salga de la pantalla ni tape los paneles
        self.pos.x = max(self.shape.w / 2, min(SCREEN_WIDTH - self.shape.w / 2, self.pos.x))
        self.pos.y = max(self.shape.h / 2 + 90, min(SCREEN_HEIGHT - 95 - self.shape.h / 2, self.pos.y))
        self.shape.center = (round(self.pos.x), round(self.pos.y))

    def lanzar_laser(self):
        """Dispara dos láseres. Devuelve True solo si realmente disparó."""
        if self.cooldown > 0:
            return False
        for lado in (-22, 22):
            self.lasers.append(Laser(self.shape.centerx + lado, self.shape.top + 30, 0, -16, AZUL, 1, 6, 28))
        self.cooldown = 6
        return True

    def lanzar_misil(self):
        if self.cd_misil > 0 or self.n_misiles <= 0:
            return False
        self.n_misiles -= 1
        self.cd_misil = 28
        self.misiles.append(Misil(self.shape.centerx, self.shape.top))
        return True

    def recibir_dano(self, dano=10):
        """Primero absorbe el escudo y después la energía del casco. Devuelve False si se agota la energía."""
        if self.invulnerable > 0:
            return True
        self.invulnerable = 24
        self.sin_golpes = 0
        if self.escudo > 0:
            self.flash_escudo = 12
            absorbido = min(self.escudo, dano)
            self.escudo -= absorbido
            dano -= absorbido
        if dano > 0:
            self.energia -= dano
            self.flash_casco = 10
        if self.energia <= 0:
            self.energia = 0
            return False
        return True

    def actualizar(self, enemigos, particulas):
        """Mueve los disparos y recarga escudo y reserva con el tiempo."""
        self.cooldown = max(0, self.cooldown - 1)
        self.cd_misil = max(0, self.cd_misil - 1)
        self.invulnerable = max(0, self.invulnerable - 1)
        self.flash_escudo = max(0, self.flash_escudo - 1)
        self.flash_casco = max(0, self.flash_casco - 1)
        self.sin_golpes += 1
        if not self.turbo:
            self.reserva = min(100, self.reserva + 0.22)
        if self.sin_golpes > 150 and self.reserva > 20 and self.escudo < 100:
            self.escudo = min(100, self.escudo + 0.12)
        for laser in self.lasers[:]:
            laser.mover()
            if laser.fuera_de_pantalla():
                self.lasers.remove(laser)
        for m in self.misiles[:]:
            if not m.actualizar(enemigos, particulas):
                self.misiles.remove(m)

    def dibujar(self, screen):
        screen.blit(self.glow, self.glow.get_rect(center=self.shape.center), special_flags=pygame.BLEND_RGB_ADD)
        # Llamas de los motores (se alargan al acelerar)
        extra = 14 if self.turbo else 0
        largo = 24 + extra + int(max(0, -self.vel.y) * 2.5) + random.randint(0, 8)
        for fx, fy in self.motores:
            cx = self.shape.left + int(fx * self.shape.w)
            base_y = self.shape.top + int(fy * self.shape.h)
            pygame.draw.polygon(screen, (70, 150, 255), [(cx - 10, base_y), (cx + 10, base_y), (cx, base_y + largo)])
            pygame.draw.polygon(screen, (220, 245, 255), [(cx - 5, base_y), (cx + 5, base_y), (cx, base_y + largo * 0.6)])
        if self.invulnerable == 0 or (self.invulnerable // 3) % 2 == 0:
            screen.blit(self.image, self.shape)
        if self.flash_casco:
            screen.blit(self.flash_img, self.shape, special_flags=pygame.BLEND_RGB_ADD)
        if self.escudo > 1:
            b = self.burbuja_fuerte if self.flash_escudo else self.burbuja
            screen.blit(b, b.get_rect(center=self.shape.center))
        for laser in self.lasers:
            laser.dibujar(screen)
        for m in self.misiles:
            m.dibujar(screen)


# ---------------------------------------------------------------------------------------------
# ENEMIGOS: cada tipo ataca y se mueve distinto (diseños de la hoja de naves enemigas)
# tipo: (archivo, ancho, rotación, vida, velocidad, puntos, daño por choque)
TIPOS = {
    'caza':        ('enemigo_caza.png', 100, 0, 1, 4.6, 10, 12),
    'dron':        ('enemigo_dron.png', 74, 0, 1, 3.4, 15, 22),
    'bombardero':  ('enemigo_bombardero.png', 165, 25, 5, 1.8, 40, 20),
    'interceptor': ('enemigo_interceptor.png', 98, 0, 2, 6.2, 25, 14),
    'madre':       ('enemigo_madre.png', 500, 0, 70, 1.3, 100, 30),
}
SPR = {}  # Sprites ya preparados (con brillo y borde rojo)


def cargar_sprites_enemigos():
    """Prepara las imágenes enemigas (después de crear la ventana). Si falta alguna se usa enemigo1.png."""
    for tipo, (archivo, ancho, rot, *_resto) in TIPOS.items():
        img = cargar_sprite(archivo, ancho, None, rot)
        if img is None:
            img = cargar_sprite('enemigo1.png', ancho, int(ancho * 1.2))
        if img is None:
            img = sprite_respaldo(ancho, int(ancho * 0.9), (170, 40, 40))
        img = aclarar(img, (46, 14, 14))                      # los enemigos son muy oscuros: se aclaran
        img = con_borde(img, (255, 80, 80), 2)                # borde rojo: se ven contra el espacio
        glow, _ = crear_glow(img, ROJO, 16 if tipo != 'madre' else 26)
        SPR[tipo] = {'img': img, 'glow': glow, 'flash': silueta_blanca(img)}


class Enemigo:
    def __init__(self, x, y=-70, tipo='caza', nivel=1, fase=0.0):
        """x, y = centro donde aparece el enemigo."""
        self.tipo = tipo
        _, _, _, hp, vel, pts, dano = TIPOS[tipo]
        if tipo == 'bombardero':
            hp += nivel // 2
        if tipo == 'madre':
            hp += 25 * nivel
        self.hp = self.hp_max = hp
        self.vel = vel + min(1.8, nivel * 0.15) if tipo != 'madre' else vel
        self.puntos = pts
        self.dano_choque = dano
        self.spr = SPR[tipo]
        self.rect = self.spr['img'].get_rect(center=(x, y))
        self.pos = pygame.Vector2(x, y)
        self.x0 = x
        self.t = random.randint(0, 100)
        self.fase = fase
        self.cd = random.randint(50, 110)
        self.flash = 0
        self.estado = 'entra'
        self.y_obj = random.randint(110, 220)
        self.v = pygame.Vector2(0, 2)
        self.dir = pygame.Vector2(0, 1)
        self.patron = 0
        self.aviso = None       # línea de mira (interceptor) o carga (bombardero)
        self.vida_total = 0

    @property
    def hitbox(self):
        k = 0.4 if self.tipo == 'madre' else 0.3
        return self.rect.inflate(-self.rect.w * k, -self.rect.h * k)

    def recibir(self, d):
        """Resta vida. Devuelve True si el enemigo quedó destruido."""
        self.hp -= d
        self.flash = 4
        return self.hp <= 0

    def _apuntar(self, destino, vel, dano, ancho=6, alto=24, origen=None):
        o = pygame.Vector2(origen) if origen else pygame.Vector2(self.rect.centerx, self.rect.centery + self.rect.h * 0.3)
        d = pygame.Vector2(destino) - o
        if d.length() == 0:
            d = pygame.Vector2(0, 1)
        d.scale_to_length(vel)
        return Laser(o.x, o.y, d.x, d.y, ROJO, dano, ancho, alto, enemigo=True)

    def mover(self, jugador, nivel):
        """Mueve al enemigo según su tipo de ataque. Devuelve (disparos, enemigos_nuevos)."""
        disp, nuevos = [], []
        self.t += 1
        self.flash = max(0, self.flash - 1)
        self.vida_total += 1
        tipo = self.tipo
        self.aviso = None

        if tipo == 'caza':
            # Atacan en grupo: bajan ondulando y disparan recto
            self.pos.y += self.vel
            self.pos.x = self.x0 + math.sin(self.t * 0.05 + self.fase) * 70
            self.cd -= 1
            if self.cd <= 0 and 40 < self.pos.y < SCREEN_HEIGHT * 0.65:
                disp.append(Laser(self.pos.x, self.rect.bottom - 10, 0, 7.5, ROJO, 8, 6, 24, True))
                self.cd = random.randint(110, 190)

        elif tipo == 'dron':
            # Se acercan y explotan: persiguen girando de a poco
            if self.estado == 'entra':
                self.pos.y += self.vel
                if self.pos.y > 90:
                    self.estado = 'caza'
            else:
                d = jugador - self.pos
                if d.length() > 0:
                    d.scale_to_length(self.vel * 1.6 + min(2.0, self.vida_total / 240))
                    self.v = self.v.lerp(d, 0.04)
                self.pos += self.v

        elif tipo == 'bombardero':
            # Disparan desde la distancia: se frenan arriba, cargan y sueltan dos proyectiles pesados
            if self.estado == 'entra':
                self.pos.y += self.vel * 1.4
                if self.pos.y >= self.y_obj:
                    self.estado = 'patrulla'
            else:
                self.pos.x = self.x0 + math.sin(self.t * 0.018) * 230
                self.cd -= 1
                if self.cd < 45:
                    self.aviso = 'carga'
                if self.cd <= 0:
                    for off in (-40, 40):
                        disp.append(self._apuntar(jugador, 5.8, 16, 10, 34, origen=(self.rect.centerx + off, self.rect.bottom - 20)))
                    self.cd = max(90, random.randint(150, 210) - nivel * 6)

        elif tipo == 'interceptor':
            # Muy rápidos, ataque de precisión: entran, apuntan (línea roja) y embisten
            if self.estado == 'entra':
                self.pos.y += 8
                if self.pos.y >= self.y_obj:
                    self.estado, self.cd = 'apunta', 55
            elif self.estado == 'apunta':
                self.pos.x += (jugador.x - self.pos.x) * 0.07
                self.cd -= 1
                self.aviso = 'mira'
                if self.cd <= 0:
                    self.estado, self.cd = 'embiste', 26
                    d = jugador - self.pos
                    self.dir = d.normalize() if d.length() > 0 else pygame.Vector2(0, 1)
                    disp.append(self._apuntar(jugador, 10, 9, 5, 22))
            elif self.estado == 'embiste':
                self.pos += self.dir * 14
                self.cd -= 1
                if self.cd <= 0:
                    self.estado = 'sale'
            else:
                self.pos.y += 8

        elif tipo == 'madre':
            # Nave Madre: lanza abanicos, ráfagas apuntadas e invoca drones
            if self.pos.y < 200:
                self.pos.y += self.vel * 1.5
            else:
                self.pos.x = SCREEN_WIDTH / 2 + math.sin(self.t * 0.012) * (SCREEN_WIDTH / 2 - 300)
                self.pos.y = 200 + math.sin(self.t * 0.03) * 12
                fase2 = self.hp < self.hp_max * 0.5
                self.cd -= 1
                if self.cd <= 0:
                    self.patron = (self.patron + 1) % 3
                    o = (self.rect.centerx, self.rect.centery + 40)
                    if self.patron == 0:                              # abanico
                        for ang in range(-60, 61, 20 if not fase2 else 12):
                            v = pygame.Vector2(0, 5.4).rotate(ang)
                            disp.append(Laser(o[0], o[1], v.x, v.y, ROJO, 10, 8, 26, True))
                    elif self.patron == 1:                            # ráfaga apuntada
                        for off in (-14, 0, 14):
                            d = (jugador - pygame.Vector2(o)).rotate(off)
                            d.scale_to_length(7.2)
                            disp.append(Laser(o[0], o[1], d.x, d.y, ROJO, 12, 9, 30, True))
                    else:                                             # invoca drones
                        for off in (-170, 170):
                            nuevos.append(Enemigo(self.pos.x + off, self.pos.y + 60, 'dron', nivel))
                    self.cd = 90 if not fase2 else 55

        self.pos.x = max(-120, min(SCREEN_WIDTH + 120, self.pos.x))
        self.rect.center = (round(self.pos.x), round(self.pos.y))
        return disp, nuevos

    def fuera(self):
        return (self.rect.top > SCREEN_HEIGHT + 40 or self.rect.bottom < -300
                or self.rect.right < -250 or self.rect.left > SCREEN_WIDTH + 250)

    def dibujar(self, screen):
        g = self.spr['glow']
        screen.blit(g, g.get_rect(center=self.rect.center), special_flags=pygame.BLEND_RGB_ADD)
        if self.aviso == 'mira':                  # interceptor apuntando
            pygame.draw.line(screen, (255, 70, 70), self.rect.center, (self.rect.centerx, self.rect.centery + 900), 1)
            pygame.draw.circle(screen, (255, 70, 70), self.rect.center, 34, 1)
        if self.aviso == 'carga':                 # bombardero cargando
            r = 8 + (45 - self.cd) // 3
            for off in (-40, 40):
                pygame.draw.circle(screen, (255, 120, 90), (self.rect.centerx + off, self.rect.bottom - 20), r, 2)
        screen.blit(self.spr['img'], self.rect)
        if self.flash:
            screen.blit(self.spr['flash'], self.rect, special_flags=pygame.BLEND_RGB_ADD)
        if self.tipo == 'madre':
            w = 300
            x = self.rect.centerx - w // 2
            pygame.draw.rect(screen, (40, 10, 14), (x, self.rect.top - 14, w, 8), border_radius=4)
            pygame.draw.rect(screen, (255, 70, 70), (x, self.rect.top - 14, int(w * max(0, self.hp) / self.hp_max), 8), border_radius=4)


class Pickup:
    """Cápsulas que sueltan algunos enemigos: misiles, escudo, energía y reparación."""
    TIPOS = {'misil': ((255, 170, 60), 'M'), 'escudo': ((90, 200, 255), 'E'),
             'energia': ((255, 230, 90), 'P'), 'casco': ((90, 235, 150), '+')}

    def __init__(self, x, y, fuente):
        self.tipo = random.choice(list(self.TIPOS))
        self.pos = pygame.Vector2(x, y)
        self.t = 0
        self.color, letra = self.TIPOS[self.tipo]
        self.letra = fuente.render(letra, True, (10, 20, 40))
        self.rect = pygame.Rect(0, 0, 34, 34)

    def actualizar(self):
        self.t += 1
        self.pos.y += 2.2
        self.rect.center = (round(self.pos.x + math.sin(self.t * 0.08) * 12), round(self.pos.y))
        return self.pos.y < SCREEN_HEIGHT + 40

    def dibujar(self, screen):
        r = 17 + int(2 * math.sin(self.t * 0.2))
        halo = pygame.Surface((r * 4, r * 4))
        pygame.draw.circle(halo, tuple(c // 3 for c in self.color), (r * 2, r * 2), r * 2)
        screen.blit(halo, (self.rect.centerx - r * 2, self.rect.centery - r * 2), special_flags=pygame.BLEND_RGB_ADD)
        pygame.draw.circle(screen, self.color, self.rect.center, r)
        pygame.draw.circle(screen, (255, 255, 255), self.rect.center, r, 2)
        screen.blit(self.letra, self.letra.get_rect(center=self.rect.center))
