# AVATAR: La leyenda de Aang — Escuadrón Lobo

## Páginas

- **`avatar.html`** — el juego: piedra/papel/tijera temático, con selección de
  personaje, ataques, vidas y resultado de cada ronda.
- **`generador.html`** — demostración de POO: genera 100, 1000, 10.000 (o los
  que se pidan) personajes usando clases. Se llega desde el link
  "🧬 Generador de personajes (POO)" al pie del juego.

## JavaScript

- **`js/avatar-clase.js`** — ejercicios de POO y ciclos:
  1. Define la clase `Avatar`, instancia a Zuko, Katara, Aang y Toph, y los
     carga en el array `avatares` con `push()` (con ejemplos de `console.log`,
     `pop()` y `length`).
  2. Recorre ese array con `forEach()` y genera dinámicamente, con template
     literals, las tarjetas de personaje dentro de `#contenedorTarjetas`
     (ya no están escritas a mano en el HTML).
  
  Se carga antes que `avatar.js` para que, cuando este busque los inputs de
  personaje por `id`, ya existan en el DOM.
- **`js/avatar.js`** — lógica del juego (avatar.html). Estilo funcional: variables
  globales que apuntan a elementos del DOM, y funciones que se llaman entre sí.
- **`js/personajes-poo.js`** — las clases del generador (generador.html):
  - `Personaje` → clase base (nombre, elemento, vidas, `atacar()`, `describir()`).
  - `PersonajeFuego`, `PersonajeAgua`, `PersonajeTierra`, `PersonajeAire` →
    heredan de `Personaje` y sobreescriben `atacar()` (polimorfismo).
  - `GeneradorPersonajes` → clase con métodos `static` para crear la cantidad
    de personajes que se le pida y agruparlos por elemento.
- **`js/generador-demo.js`** — conecta los botones de `generador.html` con
  `GeneradorPersonajes` (no define clases, solo usa las de `personajes-poo.js`).

## CSS

- **`css/styles.css`** — la base compartida por todo el sitio (paleta de
  colores, tipografías, layout del juego).
- **`css/generador.css`** — estilos propios de `generador.html` (barras de
  conteo por elemento, controles del formulario, lista de vista previa).
  Reutiliza las variables de `styles.css`, que se carga primero.

## Assets

Ver `assets/README.md` para el detalle de cada imagen.
