import pygame
import sys
import random
import os
from personaje import Personaje, Enemigo, Explosion
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT, ASSETS_PATH

def mostrar_pantalla_inicio(screen, imagen_path):
    # Cargar y adaptar la ilustración de inicio al tamaño de la ventana.
    imagen = pygame.image.load(imagen_path).convert()
    imagen = pygame.transform.scale(imagen, (SCREEN_WIDTH, SCREEN_HEIGHT))
    clock = pygame.time.Clock()
    fuente = pygame.font.Font(None, 48)
    texto = fuente.render("Pulse un boton para comenzar", True, (255, 224, 92))
    franja = pygame.Surface((SCREEN_WIDTH, 80), pygame.SRCALPHA)
    franja.fill((0, 0, 0, 150))

    # Mantener la portada en pantalla y esperar una pulsación, sin bloquear eventos de cierre.
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                return

        # Dibujar la portada y una franja oscura para que el texto se lea con claridad.
        screen.blit(imagen, (0, 0))
        screen.blit(franja, (0, SCREEN_HEIGHT - 110))
        screen.blit(
            texto,
            texto.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 70)),
        )
        pygame.display.flip()
        clock.tick(60)


def mostrar_intro(screen, fondo, duracion):
    # Presenta el texto amarillo de apertura durante la duración indicada
    # Preparar el texto en dos renglones para mantenerlo centrado y legible.
    fuente = pygame.font.Font(None, 64)
    lineas = (
        fuente.render("En una galaxia muy,", True, (255, 220, 65)),
        fuente.render("muy lejana...", True, (255, 220, 65)),
    )
    clock = pygame.time.Clock()
    tiempo_inicial = pygame.time.get_ticks()

    # Mantener el mensaje exactamente el tiempo solicitado y seguir aceptando el cierre.
    while pygame.time.get_ticks() - tiempo_inicial < duracion:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

        # Mostrar el fondo de apertura con una sombra detrás de cada línea amarilla.
        screen.blit(fondo, (0, 0))
        centro_y = SCREEN_HEIGHT // 2
        for indice, linea in enumerate(lineas):
            posicion = linea.get_rect(
                center=(SCREEN_WIDTH // 2, centro_y + (indice - 0.5) * 70)
            )
            sombra = linea.copy()
            sombra.fill((0, 0, 0), special_flags=pygame.BLEND_RGB_MULT)
            screen.blit(sombra, posicion.move(3, 3))
            screen.blit(linea, posicion)

        pygame.display.flip()
        clock.tick(60)


def main():
    # Crear la ventana y fijar el título antes de cargar imágenes convertidas.
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption('Amenaza Fantasma')

    # Mostrar la portada y esperar una tecla antes de continuar.
    imagen_inicial_path = os.path.join(ASSETS_PATH, 'images', 'inicio', 'star.png')
    mostrar_pantalla_inicio(screen, imagen_inicial_path)

    # Cargar el icono y los fondos usados por la introducción y las partidas.
    icon = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'personaje1.png'))
    pygame.display.set_icon(icon)

    fondo1 = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'fondo2.png'))
    fondo1 = pygame.transform.scale(fondo1, (SCREEN_WIDTH, SCREEN_HEIGHT))

    fondo2 = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'fondo2.png'))
    fondo2 = pygame.transform.scale(fondo2, (SCREEN_WIDTH, SCREEN_HEIGHT))

    fondo3 = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'fondo3.png'))
    fondo3 = pygame.transform.scale(fondo3, (SCREEN_WIDTH, SCREEN_HEIGHT))

    # Presentar la frase de apertura durante tres segundos antes de iniciar la partida.
    mostrar_intro(screen, fondo1, 3000)

    # La partida comienza con el primer fondo de juego.
    fondo_actual = fondo2

    # Cargar los efectos de sonido y empezar la música en bucle.
    sonido_laser = pygame.mixer.Sound(os.path.join(ASSETS_PATH, 'sounds', 'laserdis.mp3'))
    sonido_explosion = pygame.mixer.Sound(
        os.path.join(ASSETS_PATH, 'sounds', 'explosion.mp3'))
    pygame.mixer.music.load(os.path.join(ASSETS_PATH, 'sounds', 'efectos.mp3'))
    pygame.mixer.music.play(-1)

    # Crear el jugador y el estado inicial de la partida.
    personaje = Personaje(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
    enemigos = []
    explosiones = []
    puntos = 0
    nivel = 1

    # Ejecutar el ciclo principal a un máximo de 60 cuadros por segundo.
    clock = pygame.time.Clock()
    running = True
    while running:
        # Atender el cierre de ventana y disparar una sola vez por pulsación.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                # Dispara una sola vez por cada pulsación de la barra espaciadora.
                personaje.lanzar_laser()
                sonido_laser.play()

        # Esta era la lógica anterior, que disparaba repetidamente mientras se mantenía espacio:
        # if keys[pygame.K_SPACE]:
        #     personaje.lanzar_laser()
        #     sonido_laser.play()

        # Leer las teclas de movimiento y trasladar al jugador.
        keys = pygame.key.get_pressed()
        dx, dy = 0, 0
        if keys[pygame.K_LEFT]:
            dx = -5
        if keys[pygame.K_RIGHT]:
            dx = 5
        if keys[pygame.K_UP]:
            dy = -5
        if keys[pygame.K_DOWN]:
            dy = 5

        personaje.mover(dx, dy)

        # Mover enemigos, retirar los que salen de pantalla y comprobar las colisiones.
        for enemigo in enemigos[:]:
            enemigo.mover()
            if enemigo.rect.top > SCREEN_HEIGHT:
                enemigos.remove(enemigo)

            # Una colisión de láser destruye al enemigo, suma puntos y crea una explosión.
            for laser in personaje.lasers[:]:
                if enemigo.rect.colliderect(laser.rect):
                    explosiones.append(
                        Explosion(enemigo.rect.centerx, enemigo.rect.centery))
                    enemigos.remove(enemigo)
                    personaje.lasers.remove(laser)
                    sonido_explosion.play()
                    puntos += 10
                    break

            # Si un enemigo alcanza al jugador, reducir su energía y terminar al agotarse.
            if enemigo.rect.colliderect(personaje.shape):
                if not personaje.recibir_dano():
                    running = False

        # Crear enemigos aleatoriamente en una posición horizontal dentro de la pantalla.
        if random.random() < 0.02:
            x = random.randint(0, SCREEN_WIDTH - 50)
            enemigo = Enemigo(x, 0)
            enemigos.append(enemigo)

        # Avanzar las animaciones y quitar las explosiones ya finalizadas.
        explosiones = [explosion for explosion in explosiones if explosion.actualizar()]

        # Alternar entre fondos al alcanzar un múltiplo de 250 puntos.
        if puntos > 0 and puntos % 250 == 0:
            if fondo_actual == fondo2:
                fondo_actual = fondo3
            else:
                fondo_actual = fondo2
            puntos += 10

        # Dibujar el escenario, el jugador, los enemigos y los efectos.
        screen.blit(fondo_actual, (0, 0))
        personaje.dibujar(screen)
        for enemigo in enemigos:
            enemigo.dibujar(screen)
        for explosion in explosiones:
            explosion.dibujar(screen)

        # Renderizar el marcador con los puntos y el nivel actual.
        font = pygame.font.Font(None, 36)
        texto_puntos = font.render(f"Puntos: {puntos}", True, (255, 255, 255))
        texto_nivel = font.render(f"Nivel: {nivel}", True, (255, 255, 255))
        screen.blit(texto_puntos, (10, 50))
        screen.blit(texto_nivel, (10, 90))

        if puntos >= 250:
            nivel += 1
            puntos = 0

        pygame.display.flip()
        clock.tick(60)

    # Al terminar la energía, mostrar el mensaje final antes de cerrar Pygame.
    screen.fill((0, 0, 0))
    font_large = pygame.font.Font(None, 74)
    font_small = pygame.font.Font(None, 36)
    texto_game_over = font_large.render("GAME OVER", True, (255, 0, 0))
    texto_mensaje = font_small.render(
        "Que la Fuerza te acompañe", True, (255, 255, 255))

    # Calcular posiciones que centren ambos textos en la pantalla.
    pos_x_game_over = SCREEN_WIDTH // 2 - texto_game_over.get_width() // 2
    pos_y_game_over = SCREEN_HEIGHT // 2 - texto_game_over.get_height() // 2 - \
        20

    pos_x_mensaje = SCREEN_WIDTH // 2 - texto_mensaje.get_width() // 2
    pos_y_mensaje = SCREEN_HEIGHT // 2 + texto_game_over.get_height() // 2 + \
        20

    # Presentar GAME OVER durante dos segundos y liberar los recursos.
    screen.blit(texto_game_over, (pos_x_game_over, pos_y_game_over))
    screen.blit(texto_mensaje, (pos_x_mensaje, pos_y_mensaje))
    pygame.display.flip()
    pygame.time.wait(2000)
    pygame.quit()
    sys.exit()


if __name__ == '__main__':
    # Ejecutar el juego solamente al iniciar este archivo directamente.
    main()
