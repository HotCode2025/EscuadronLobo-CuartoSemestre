import pygame
from efectos import cargar_sprite


class Explosion:
    """Animación de explosión con los frames originales (regularExplosion000 a 008).
    Se le agregó un destello de luz y un tamaño (escala) para explosiones grandes."""
    _grad = None

    def __init__(self, x, y, escala=1.0):
        # Imágenes de la explosión (se cargan una sola vez gracias a la caché)
        self.images = [cargar_sprite(f'regularExplosion{i:03d}.png') for i in range(9)]
        if any(img is None for img in self.images):
            self.images = []
        self.index = 0
        self.rect = pygame.Rect(0, 0, 10, 10)
        self.rect.center = (x, y)
        self.pos = (x, y)
        self.escala = escala
        self.frame_rate = 0  # Contador de los frames de la animacion
        self.max_frames = 3  # frames por imagen (antes 20: la explosión duraba 3 segundos)
        self.t = 0
        self.dur = max(1, self.max_frames * 9)

    @classmethod
    def _gradiente(cls):
        if cls._grad is None:
            n = 128
            g = pygame.Surface((n, n))
            for r in range(n // 2, 0, -1):
                i = (1 - r / (n / 2)) ** 1.6
                pygame.draw.circle(g, (int(255 * min(1, i * 1.6)), int(170 * i ** 1.2), int(60 * i ** 2)), (n // 2, n // 2), r)
            cls._grad = g
        return cls._grad

    def actualizar(self):
        # Actualiza la animación
        self.t += 1
        self.frame_rate += 1
        if self.frame_rate >= self.max_frames:
            self.frame_rate = 0
            self.index += 1
            if self.index >= 9:
                return False  # Termina la animación si se han mostrado todas las imágenes
        return True

    def dibujar(self, screen):
        k = min(1.0, self.t / self.dur)
        fade = 1 - k
        # Destello de luz detrás de la explosión
        diam = max(8, int((90 + 150 * k ** 0.6) * self.escala))
        g = pygame.transform.smoothscale(self._gradiente(), (diam, diam))
        g.fill((int(255 * fade),) * 3, special_flags=pygame.BLEND_RGB_MULT)
        screen.blit(g, g.get_rect(center=self.pos), special_flags=pygame.BLEND_RGB_ADD)
        # Imagen de la explosión del juego original
        if self.images and self.index < 9:
            img = self.images[self.index]
            tam = int(img.get_width() * self.escala * 1.2)
            img = pygame.transform.smoothscale(img, (tam, tam))
            screen.blit(img, img.get_rect(center=self.pos))
