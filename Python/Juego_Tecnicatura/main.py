import pygame
import sys
import random
import os
import math
import hud
from personaje import Personaje, Enemigo, Explosion, Pickup, cargar_sprites_enemigos
from constantes import (SCREEN_WIDTH, SCREEN_HEIGHT, ASSETS_PATH, FPS, PUNTOS_POR_NIVEL, AUTOFUEGO,
                        AMARILLO, AZUL, CELESTE, ROJO)

ROJO_NEON = (255, 80, 80)
from efectos import Fondo, Particulas, cargar_sprite, cargar_fondos
from sonidos import Audio
import puntajes


def mostrar_pantalla_inicio(screen, imagen_path):
    # Cargar y adaptar la ilustración de inicio al tamaño de la ventana (sin deformarla).
    imagen = pygame.image.load(imagen_path).convert()
    esc = max(SCREEN_WIDTH / imagen.get_width(), SCREEN_HEIGHT / imagen.get_height())
    imagen = pygame.transform.smoothscale(
        imagen, (int(imagen.get_width() * esc), int(imagen.get_height() * esc)))
    pos = ((SCREEN_WIDTH - imagen.get_width()) // 2, (SCREEN_HEIGHT - imagen.get_height()) // 2)
    clock = pygame.time.Clock()

    # Mantener la portada en pantalla y esperar una pulsación, sin bloquear eventos de cierre.
    # La propia imagen incluye el texto "Pulse un botón para comenzar" y los controles.
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                return

        screen.blit(imagen, pos)
        pygame.display.flip()
        clock.tick(60)


def mostrar_intro(screen, fondo, duracion):
    # Presenta el texto de apertura durante la duración indicada, con el estilo del juego:
    # letra Audiowide, degradado celeste-violeta y resplandor a juego con la nebulosa del fondo.
    lineas = [hud.texto_degradado(t, 'intro', (225, 245, 255), (150, 160, 255), (110, 80, 255), 14)
              for t in ("En una galaxia muy,", "muy lejana...")]
    hueco = 6
    bloque = pygame.Surface((max(l.get_width() for l in lineas),
                             sum(l.get_height() for l in lineas) + hueco), pygame.SRCALPHA)
    y = 0
    for linea in lineas:
        bloque.blit(linea, linea.get_rect(midtop=(bloque.get_width() // 2, y)))
        y += linea.get_height() + hueco
    velo = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
    velo.fill((0, 0, 14, 90))  # oscurece un poco el fondo para que el texto se lea bien
    clock = pygame.time.Clock()
    tiempo_inicial = pygame.time.get_ticks()

    # Mantener el mensaje exactamente el tiempo solicitado y seguir aceptando el cierre.
    while pygame.time.get_ticks() - tiempo_inicial < duracion:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                return  # cualquier tecla salta la introducción

        # El texto aparece suavemente, se agranda un poco y se desvanece al final.
        k = (pygame.time.get_ticks() - tiempo_inicial) / duracion
        alpha = int(255 * min(1.0, k / 0.2, (1 - k) / 0.2))
        escala = 1 + 0.12 * k
        img = pygame.transform.smoothscale(
            bloque, (int(bloque.get_width() * escala), int(bloque.get_height() * escala)))
        img.set_alpha(max(0, alpha))
        fondo.dibujar(screen)
        screen.blit(velo, (0, 0))
        screen.blit(img, img.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)))
        pygame.display.flip()
        clock.tick(60)


class Juego:
    """Estado de una partida: jugador, enemigos, disparos, puntos y nivel.
    Cada nivel termina con la Nave Madre; al vencerla se sube de nivel y cambia el fondo."""

    def __init__(self, screen, audio, fondo):
        self.screen = screen
        self.audio = audio
        self.fondo = fondo
        self.reiniciar()

    def reiniciar(self):
        # Crear el jugador y el estado inicial de la partida.
        self.personaje = Personaje(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 190)
        self.enemigos, self.disparos, self.explosiones, self.pickups = [], [], [], []
        self.particulas = Particulas()
        self.puntos = 0
        self.record = puntajes.record()  # mejor puntaje guardado
        self.nivel = 1
        self.combo = 0
        self.combo_t = 0
        self.frame = 0
        self.shake = 0
        self.mensaje, self.mensaje_t = '', 0
        self.preparar_nivel()

    # ---------- niveles ----------
    def umbral(self):
        """Puntos que hay que sumar en el nivel para que aparezca la Nave Madre."""
        return PUNTOS_POR_NIVEL + 50 * (self.nivel - 1)

    def preparar_nivel(self):
        self.puntos_nivel = 0
        self.jefe = None
        self.jefe_listo = False
        self.fondo.cambiar(self.nivel - 1)  # cambia de fondo en cada nivel
        self.avisar(f'NIVEL {self.nivel}: ¡ESCUADRÓN LOBO, ADELANTE!', 200)
        self.audio.musica_normal()

    def avisar(self, txt, dur=150):
        self.mensaje, self.mensaje_t = txt, dur

    def fraccion_flota(self):
        """Barra de FLOTA ENEMIGA: baja al sumar puntos y, durante el jefe, muestra su vida."""
        if self.jefe:
            return max(0, self.jefe.hp) / self.jefe.hp_max
        return 1 - min(1, self.puntos_nivel / self.umbral())

    def generar(self):
        """Crea enemigos al azar; los tipos más peligrosos aparecen en niveles más altos."""
        n = self.nivel
        if len(self.enemigos) >= 5 + n * 2:
            return
        opciones = [('cazas', 6), ('dron', 3)]
        if n >= 2:
            opciones += [('interceptor', 3), ('bombardero', 2)]
        elif self.puntos_nivel > 100:
            opciones += [('bombardero', 1)]
        tipo = random.choices([o[0] for o in opciones], [o[1] for o in opciones])[0]
        x = random.randint(160, SCREEN_WIDTH - 160)
        if tipo == 'cazas':                      # formación en V
            cant = min(3 + n // 2, 5)
            offs = [(0, 0), (-65, -50), (65, -50), (-130, -100), (130, -100)][:cant]
            for i, (ox, oy) in enumerate(offs):
                self.enemigos.append(Enemigo(max(60, min(SCREEN_WIDTH - 60, x + ox)), -60 + oy, 'caza', n, i * 0.6))
        else:
            self.enemigos.append(Enemigo(x, -70, tipo, n))

    def soltar(self, e):
        if e.tipo != 'dron' and random.random() < (0.3 if e.tipo != 'bombardero' else 0.7):
            self.pickups.append(Pickup(e.pos.x, e.pos.y, hud.F['chica']))

    def matar(self, e, por_jugador=True):
        """Destruye un enemigo: explosión, sonido, puntos y posible cápsula."""
        if e in self.enemigos:
            self.enemigos.remove(e)
        grande = e.tipo in ('madre', 'bombardero')
        self.explosiones.append(Explosion(e.rect.centerx, e.rect.centery, 2.6 if e.tipo == 'madre' else (1.5 if grande else 1.0)))
        self.particulas.chispas(e.pos.x, e.pos.y, (255, 160, 70), 26 if grande else 14, 6)
        self.audio.play('explosion_grande' if grande else 'explosion')
        if e.tipo == 'madre':
            self.shake = 40
            for i in range(5):
                self.explosiones.append(Explosion(e.pos.x + random.randint(-170, 170), e.pos.y + random.randint(-60, 60), 1.8))
        if por_jugador:
            self.combo += 1
            self.combo_t = 150
            self.puntos += e.puntos * (1 + min(self.combo, 10) // 5)
            self.record = max(self.record, self.puntos)
            if e.tipo != 'madre':
                self.puntos_nivel += e.puntos
            self.soltar(e)
            if self.combo in (5, 10, 20):
                self.avisar(f'¡COMBO x{self.combo}! ¡SIGAN ASÍ!', 120)
        if e is self.jefe:
            self.jefe = None
            self.victoria_nivel()

    def victoria_nivel(self):
        self.nivel += 1
        p = self.personaje
        p.escudo = 100
        p.n_misiles += 3
        p.energia = min(100, p.energia + 30)
        self.audio.play('nivel')
        self.enemigos = [e for e in self.enemigos if e.tipo != 'dron']
        self.preparar_nivel()
        self.avisar(f'¡NAVE MADRE DESTRUIDA! NIVEL {self.nivel}', 220)

    def dano_area(self, centro, radio, dano):
        """Explosión de misil: daña a todos los enemigos cercanos."""
        self.explosiones.append(Explosion(centro[0], centro[1], 2.0))
        self.particulas.chispas(centro[0], centro[1], (255, 180, 80), 30, 7)
        self.audio.play('explosion_grande')
        self.shake = max(self.shake, 12)
        for e in self.enemigos[:]:
            if (e.pos - pygame.Vector2(centro)).length() < radio + e.rect.w * 0.3 and e.recibir(dano):
                self.matar(e)

    def golpe_jugador(self, dano):
        p = self.personaje
        antes = p.escudo
        vivo = p.recibir_dano(dano)
        self.audio.play('escudo' if antes > 0 else 'golpe')
        self.shake = max(self.shake, 8)
        self.combo = 0
        self.particulas.chispas(p.pos.x, p.pos.y - 20, (120, 210, 255) if antes > 0 else (255, 120, 80), 10, 4)
        if vivo and p.energia < 30 and p.escudo <= 0:
            self.avisar('¡CUIDADO! CASCO CRÍTICO', 150)
            self.audio.play('alarma')
        return vivo

    # ---------- acciones del jugador ----------
    def disparar(self):
        if self.personaje.lanzar_laser():
            self.audio.play('laser')

    def lanzar_misil(self):
        if self.personaje.lanzar_misil():
            self.audio.play('misil')

    # ---------- bucle ----------
    def actualizar(self, keys):
        """Avanza un cuadro del juego. Devuelve False cuando la nave se queda sin energía."""
        self.frame += 1
        p = self.personaje
        # Leer las teclas de movimiento y trasladar al jugador (flechas, o WASD).
        dx = (keys[pygame.K_RIGHT] or keys[pygame.K_d]) - (keys[pygame.K_LEFT] or keys[pygame.K_a])
        dy = (keys[pygame.K_DOWN] or keys[pygame.K_s]) - (keys[pygame.K_UP] or keys[pygame.K_w])
        p.mover(dx, dy, keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT])
        if AUTOFUEGO and keys[pygame.K_SPACE]:
            self.disparar()
        p.actualizar(self.enemigos, self.particulas)
        self.mensaje_t = max(0, self.mensaje_t - 1)
        self.combo_t = max(0, self.combo_t - 1)
        if self.combo_t == 0:
            self.combo = 0
        self.shake = max(0, self.shake - 1)

        # Crear enemigos aleatoriamente (como en el juego original) hasta llegar a los puntos del nivel
        if not self.jefe_listo:
            if random.random() < min(0.05, 0.024 + 0.004 * self.nivel):
                self.generar()
            if self.puntos_nivel >= self.umbral():
                self.jefe_listo = True
                self.jefe = Enemigo(SCREEN_WIDTH // 2, -200, 'madre', self.nivel)
                self.enemigos.append(self.jefe)
                self.avisar('¡ALERTA! LA NAVE MADRE ENEMIGA SE APROXIMA', 220)
                self.audio.play('alarma')
                self.audio.musica_jefe()

        # Mover enemigos, retirar los que salen de pantalla y comprobar las colisiones.
        for e in self.enemigos[:]:
            disp, nuevos = e.mover(p.pos, self.nivel)
            for d in disp:
                self.disparos.append(d)
                self.audio.play('laser_pesado' if d.rect.w >= 10 or e.tipo == 'madre' else 'laser_enemigo', 0.5)
            self.enemigos.extend(nuevos)
            if e.estado == 'apunta' and e.tipo == 'interceptor' and e.cd == 54:
                self.audio.play('aviso')
            if e.fuera():
                self.enemigos.remove(e)
                continue
            # Una colisión de láser daña al enemigo, suma puntos y crea una explosión al destruirlo.
            muerto = False
            for laser in p.lasers[:]:
                if e.hitbox.colliderect(laser.rect):
                    p.lasers.remove(laser)
                    self.particulas.chispas(laser.pos.x, laser.pos.y, (140, 210, 255), 4, 3, 14)
                    if e.recibir(1):
                        self.matar(e)
                        muerto = True
                        break
            if muerto:
                continue
            for m in p.misiles[:]:
                if e.hitbox.colliderect(m.rect):
                    p.misiles.remove(m)
                    self.dano_area(m.rect.center, 120, 6)
                    muerto = e not in self.enemigos
                    break
            if muerto or e not in self.enemigos:
                continue
            # Si un enemigo alcanza al jugador, reducir su energía y terminar al agotarse.
            if e.hitbox.colliderect(p.hitbox):
                if not self.golpe_jugador(e.dano_choque):
                    return False
                if e.tipo == 'dron':
                    self.matar(e, False)
                elif e.tipo != 'madre' and e.recibir(3):
                    self.matar(e)

        # Disparos enemigos
        for d in self.disparos[:]:
            d.mover()
            if d.fuera_de_pantalla():
                self.disparos.remove(d)
            elif d.rect.colliderect(p.hitbox):
                self.disparos.remove(d)
                if not self.golpe_jugador(d.dano):
                    return False

        # Cápsulas
        for k in self.pickups[:]:
            if not k.actualizar():
                self.pickups.remove(k)
            elif k.rect.colliderect(p.shape):
                self.pickups.remove(k)
                self.audio.play('pickup')
                if k.tipo == 'misil':
                    p.n_misiles += 2
                    self.avisar('MISILES +2', 90)
                elif k.tipo == 'escudo':
                    p.escudo = min(100, p.escudo + 40)
                    self.avisar('ESCUDO RECARGADO', 90)
                elif k.tipo == 'energia':
                    p.reserva = 100
                    self.avisar('ENERGÍA AL MÁXIMO', 90)
                else:
                    p.energia = min(100, p.energia + 25)
                    self.avisar('CASCO REPARADO +25', 90)
                self.puntos += 5
                self.record = max(self.record, self.puntos)

        # Avanzar las animaciones y quitar las explosiones ya finalizadas.
        self.explosiones = [ex for ex in self.explosiones if ex.actualizar()]
        self.particulas.actualizar()
        return p.energia > 0

    def dibujar(self):
        s = self.screen
        # Dibujar el escenario, el jugador, los enemigos y los efectos.
        self.fondo.dibujar(s, 0.8 if self.personaje.turbo else 0.0)
        for k in self.pickups:
            k.dibujar(s)
        for e in self.enemigos:
            e.dibujar(s)
        for d in self.disparos:
            d.dibujar(s)
        self.personaje.dibujar(s)
        self.particulas.dibujar(s)
        for ex in self.explosiones:
            ex.dibujar(s)
        if self.shake:  # sacudida de pantalla en golpes y explosiones grandes
            copia = s.copy()
            s.fill((0, 0, 0))
            s.blit(copia, (random.randint(-self.shake // 3, self.shake // 3), random.randint(-self.shake // 3, self.shake // 3)))
        hud.dibujar(s, self)


_velo = None


def _fondo_pantalla(screen, fondo):
    """Dibuja el fondo del juego (en movimiento) algo oscurecido, para las pantallas finales."""
    global _velo
    if _velo is None:
        _velo = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        _velo.fill((0, 0, 12, 120))
    fondo.dibujar(screen)
    screen.blit(_velo, (0, 0))


def mostrar_game_over(screen, fondo, puntos, nivel):
    """Mensaje final del juego original, durante unos segundos y sobre el fondo del juego."""
    titulo = hud.texto_degradado("GAME OVER", 'titulo', (255, 150, 130), (215, 25, 45), (255, 40, 40), 16)
    mensaje = hud.texto_degradado("Que la Fuerza te acompañe", 'sub', (255, 255, 255), (185, 215, 255))
    resumen = hud.F['grande'].render(f"Puntos: {puntos}    Nivel: {nivel}", True, (255, 224, 92))
    clock = pygame.time.Clock()
    inicio = pygame.time.get_ticks()
    while pygame.time.get_ticks() - inicio < 2600:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
        alpha = int(255 * min(1.0, (pygame.time.get_ticks() - inicio) / 500))
        _fondo_pantalla(screen, fondo)
        cx, cy = SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2
        hud.panel(screen, (cx - 430, cy - 190, 860, 380), ROJO_NEON, 205, 26)
        for surf, y in ((titulo, cy - 85), (mensaje, cy + 30), (resumen, cy + 105)):
            surf.set_alpha(alpha)
            screen.blit(surf, surf.get_rect(center=(cx, y)))
        pygame.display.flip()
        clock.tick(60)
    pygame.event.clear()


def pedir_nombre(screen, fondo, puntos):
    """Pide el nombre del piloto cuando el puntaje entra en la tabla de mejores puntajes."""
    titulo = hud.texto_degradado("¡NUEVO MEJOR PUNTAJE!", 'titulo2', (255, 245, 170), (255, 175, 50), (255, 190, 60), 12)
    logo = cargar_sprite('logo_cabeza.png', 78)
    clock = pygame.time.Clock()
    nombre = ""
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_RETURN:
                    return nombre.strip() or "PILOTO"
                if event.key == pygame.K_BACKSPACE:
                    nombre = nombre[:-1]
                elif event.unicode and event.unicode.isprintable() and len(nombre) < 12:
                    nombre += event.unicode.upper()
        _fondo_pantalla(screen, fondo)
        cx, cy = SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2
        hud.panel(screen, (cx - 440, cy - 230, 880, 460), AMARILLO, 210, 26)
        if logo:
            screen.blit(logo, logo.get_rect(center=(cx, cy - 170)))
        screen.blit(titulo, titulo.get_rect(center=(cx, cy - 95)))
        hud.texto(screen, f"{puntos} PUNTOS", (cx, cy - 35), 'grande', (255, 255, 255), True)
        # Caja de texto con el nombre y cursor parpadeante
        caja = pygame.Rect(cx - 250, cy + 10, 500, 66)
        pygame.draw.rect(screen, (6, 16, 40), caja, border_radius=12)
        pygame.draw.rect(screen, AZUL, caja, 2, border_radius=12)
        cursor = "_" if (pygame.time.get_ticks() // 400) % 2 == 0 else " "
        hud.texto(screen, nombre + cursor, caja.center, 'grande', CELESTE, True)
        hud.texto(screen, "Escribí tu nombre y pulsá ENTER", (cx, cy + 135), 'media', (190, 215, 245), True)
        pygame.display.flip()
        clock.tick(30)


def mostrar_puntajes(screen, fondo, resaltado=None):
    """Tabla de mejores puntajes. Devuelve True si el jugador quiere volver a jugar."""
    titulo = hud.texto_degradado("MEJORES PUNTAJES", 'titulo2', (255, 245, 170), (255, 175, 50), (255, 190, 60), 12)
    logo = cargar_sprite('logo_cabeza.png', 56)
    lista = puntajes.cargar()
    medallas = [(255, 215, 90), (205, 215, 230), (225, 150, 90), AZUL, AZUL]  # oro, plata, bronce
    clock = pygame.time.Clock()
    pygame.event.clear()
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT or (event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE):
                return False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                return True
        _fondo_pantalla(screen, fondo)
        cx = SCREEN_WIDTH // 2
        x0, y0, ancho, alto = cx - 400, 84, 800, 600
        hud.panel(screen, (x0, y0, ancho, alto), AMARILLO, 210, 26)
        if logo:
            screen.blit(logo, logo.get_rect(center=(x0 + 42, y0 + 72)))
            screen.blit(logo, logo.get_rect(center=(x0 + ancho - 42, y0 + 72)))
        screen.blit(titulo, titulo.get_rect(center=(cx, y0 + 72)))
        pulso = 0.5 + 0.5 * math.sin(pygame.time.get_ticks() / 220)
        for i in range(5):
            y = y0 + 135 + i * 76
            fila = pygame.Rect(x0 + 34, y, ancho - 68, 64)
            d = lista[i] if i < len(lista) else None
            color = medallas[i]
            es_nuevo = (d is not None and resaltado is not None
                        and d['nombre'] == resaltado[0] and d['puntos'] == resaltado[1])
            tira = pygame.Surface(fila.size, pygame.SRCALPHA)
            tira.fill((10, 26, 58, 190))
            if es_nuevo:
                tira.fill((30, 90, 150, 200))  # fila del puntaje nuevo: fondo azul y borde que pulsa
            screen.blit(tira, fila)
            borde = tuple(int(c * (0.65 + 0.35 * pulso)) for c in CELESTE) if es_nuevo else (color if d else (50, 70, 110))
            pygame.draw.rect(screen, borde, fila, 3 if es_nuevo else 2, border_radius=10)
            # Número de puesto dentro de un círculo
            pygame.draw.circle(screen, color if d else (50, 70, 110), (fila.x + 36, fila.centery), 22)
            hud.texto(screen, str(i + 1), (fila.x + 36, fila.centery), 'media', (8, 16, 36), True)
            if d:
                col_texto = (255, 255, 255) if not es_nuevo else CELESTE
                nom = hud.F['grande'].render(d['nombre'], True, col_texto)
                screen.blit(nom, nom.get_rect(midleft=(fila.x + 82, fila.centery)))
                pts = hud.F['grande'].render(str(d['puntos']), True, color)
                screen.blit(pts, pts.get_rect(midright=(fila.right - 150, fila.centery)))
                niv = hud.F['chica'].render(f"NIVEL {d.get('nivel', 1)}", True, (160, 195, 235))
                screen.blit(niv, niv.get_rect(midleft=(fila.right - 130, fila.centery)))
            else:
                vac = hud.F['grande'].render("- - -", True, (70, 95, 140))
                screen.blit(vac, vac.get_rect(midleft=(fila.x + 82, fila.centery)))
        # Pie con las teclas
        yb = y0 + alto - 52
        x = cx - 270
        x += hud.tecla(screen, "ENTER", x, yb) + 10
        hud.texto(screen, "JUGAR DE NUEVO", (x, yb + 4), 'chica', (200, 225, 250))
        x += 190
        x += hud.tecla(screen, "ESC", x, yb) + 10
        hud.texto(screen, "SALIR", (x, yb + 4), 'chica', (200, 225, 250))
        pygame.display.flip()
        clock.tick(60)


def main():
    # Crear la ventana y fijar el título antes de cargar imágenes convertidas.
    try:
        pygame.mixer.pre_init(44100, -16, 2, 512)  # audio con poca demora para que los disparos suenen al instante
    except pygame.error:
        pass
    pygame.init()
    try:
        pygame.mixer.init()
    except pygame.error:
        print("Aviso: No se detectó dispositivo de audio. El juego funcionará sin sonido.")
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption('Amenaza Fantasma - Escuadrón Lobo')

    # Mostrar la portada y esperar una tecla antes de continuar.
    imagen_inicial_path = os.path.join(ASSETS_PATH, 'images', 'inicio', 'star.png')
    mostrar_pantalla_inicio(screen, imagen_inicial_path)

    # Cargar el icono (el lobo del Escuadrón) y los fondos usados por la introducción y las partidas.
    icon = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'logo_cabeza.png'))
    pygame.display.set_icon(icon)

    # Fondos de nebulosa (uno por nivel: fondo2, fondo3, fondo4 y vuelve a empezar)
    fondo = Fondo(cargar_fondos(['fondo2.png', 'fondo3.png', 'fondo4.png']))

    # Fuentes del juego (las usan la introducción, el panel y las pantallas finales).
    hud.iniciar()

    # Presentar la frase de apertura antes de iniciar la partida.
    mostrar_intro(screen, fondo, 3600)

    # Preparar los sprites enemigos y los sonidos (efectos + música en bucle).
    cargar_sprites_enemigos()
    audio = Audio()

    juego = Juego(screen, audio, fondo)

    # Ejecutar el ciclo principal a un máximo de 60 cuadros por segundo.
    clock = pygame.time.Clock()
    pausa = False
    running = True
    while running:
        # Atender el cierre de ventana y disparar una sola vez por pulsación.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                if event.key == pygame.K_p:
                    pausa = not pausa
                if not pausa and event.key == pygame.K_SPACE:
                    # Dispara una sola vez por cada pulsación de la barra espaciadora.
                    juego.disparar()
                if not pausa and event.key in (pygame.K_z, pygame.K_x):
                    juego.lanzar_misil()

        if pausa:
            hud.texto(screen, 'PAUSA', (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2), 'titulo', (255, 255, 255), True)
            pygame.display.flip()
            clock.tick(15)
            continue

        vivo = juego.actualizar(pygame.key.get_pressed())
        juego.dibujar()
        pygame.display.flip()
        clock.tick(FPS)

        if not vivo:
            # Explosión final de la nave antes del mensaje
            juego.audio.play('explosion_grande')
            for _ in range(70):
                if random.random() < 0.3:
                    juego.explosiones.append(Explosion(juego.personaje.pos.x + random.randint(-50, 50),
                                                       juego.personaje.pos.y + random.randint(-50, 50), 1.6))
                juego.explosiones = [ex for ex in juego.explosiones if ex.actualizar()]
                juego.fondo.dibujar(screen)
                for e in juego.enemigos:
                    e.dibujar(screen)
                for ex in juego.explosiones:
                    ex.dibujar(screen)
                pygame.display.flip()
                clock.tick(FPS)
            # Al terminar la energía, mostrar el mensaje final y la tabla de mejores puntajes.
            mostrar_game_over(screen, juego.fondo, juego.puntos, juego.nivel)
            nuevo = None
            if puntajes.entra_en_tabla(juego.puntos):
                nombre = pedir_nombre(screen, juego.fondo, juego.puntos)
                puntajes.guardar(nombre, juego.puntos, juego.nivel)
                nuevo = (nombre, juego.puntos)
            if mostrar_puntajes(screen, juego.fondo, nuevo):
                juego.reiniciar()
            else:
                running = False

    pygame.quit()
    sys.exit()


if __name__ == '__main__':
    # Ejecutar el juego solamente al iniciar este archivo directamente.
    main()
