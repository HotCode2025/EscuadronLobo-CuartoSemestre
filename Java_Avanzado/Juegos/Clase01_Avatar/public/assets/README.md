# assets

Carpeta para los recursos multimedia del juego.

- `img/` → arte de los personajes y las imágenes principales:
  - `logo.png` → imagen del header ("Los Elementos: La Leyenda de Aang").
  - `fondo-elementos.png` → misma ilustración del elenco, usada como fondo de pantalla completa en el `body`.
  - `emblema-elementos.png` → esfera de los 4 elementos, gira como insignia sobre el logo del header.
  - `titulo-avatar.png` → banner del nombre "AVATAR" con los íconos de los 4 elementos, usado dentro del `h1`.
  - `zuko.png`, `katara.png`, `aang.png`, `toph.png` → arte de cada participante, usado en las tarjetas de selección.
  - `ganaste.png`, `perdiste.png`, `empate.png` → resultado de cada ronda (y de la partida completa), generadas por `avatar.js` dentro de la sección de mensajes.
- `sfx/` → carpeta lista para que cada grupo sume sonidos (ataque, victoria, derrota, música de fondo, etc.).

Para usar una imagen nueva desde el CSS: `background-image: url("../assets/img/nombre.png");`
Para usar un sonido desde el JS: `new Audio("../assets/sfx/nombre.mp3").play();`
