# Convenciones de código

> Homogeneidad extrema y excelencia visual. La IA predice mejor cuando el repositorio se parece a sí mismo, y el usuario final es cautivado por un diseño premium.

## Tecnologías Principales

- **Core:** HTML5 semántico para la estructura y JavaScript moderno (ES6+) para la lógica y las simulaciones físicas.
- **Estilo (CSS):** Vanilla CSS para máxima flexibilidad y control. No usar librerías o frameworks de CSS externos a menos que se solicite explícitamente.
- **Estética Visual — "Cuaderno de laboratorio":** papel crema, tinta casi negra, lapicero azul (velocidad, datos) y tinta de corrector bermellón (fuerzas, errores), con ocre para predicciones y verde para energía cinética. Tipografía: *Fraunces* (titulares), *Newsreader* (cuerpo) e *IBM Plex Mono* (datos y ecuaciones). Formas rectas (radio 0), sin degradados de color, vidrio esmerilado, brillos ni emojis; entrada escalonada con `.rise` (respeta `prefers-reduced-motion`). Los tokens viven en `css/tokens.css` y los canvas los leen con `js/shared/inkPalette.js`: **no se escriben colores a mano en los renderizadores**. Si se cambia de dirección visual, se hace en esos dos archivos.

## Nombres y Nomenclatura

| Entorno / Tipo          | Convención      | Ejemplo |
|-------------------------|-----------------|---------|
| Archivos HTML / CSS     | `kebab-case`    | `index.html`, `main-style.css` |
| Archivos JavaScript     | `camelCase`     | `vectorMath.js`, `physicsEngine.js` |
| Clases CSS              | `kebab-case`    | `.btn-primary`, `.simulation-container` |
| Variables y Funciones JS| `camelCase`     | `gravityConstant`, `calculateTrajectory()` |
| Clases JavaScript       | `PascalCase`    | `Vector2D`, `ParticleSimulator` |
| Constantes JS           | `UPPER_SNAKE`   | `PI_DOUBLE`, `MAX_PARTICLES` |
| Elementos HTML (IDs)    | `kebab-case`    | `#canvas-output`, `#btn-start-simulation` |

## Estructura de Archivos

### 1. HTML5 Estructura y SEO
Cada página HTML debe ser semántica y contener optimización SEO base:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Simulación física interactiva de [Tema] con alta precisión y controles en tiempo real.">
  <title>Simulador de Física - [Nombre de la Simulación]</title>
  <!-- Tipografía premium -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- Las fuentes se importan desde css/tokens.css -->
  <!-- Estilos (archivo HTML vive en pages/, por eso ../) -->
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <header>
    <h1>Simulador de Física: [Tema]</h1>
  </header>
  <main>
    <!-- Contenedores interactivos e IDs únicos para pruebas -->
    <div id="simulation-viewport" class="viewport-container">
      <canvas id="physics-canvas"></canvas>
    </div>
  </main>
  <!-- Lógica modular: cada feature vive en su propia carpeta js/<simulador>/ -->
  <script type="module" src="../js/<simulador>/main.js"></script>
</body>
</html>
```

### 2. Estructura CSS
Tres hojas, una por responsabilidad: `css/tokens.css` (variables y base tipográfica), `css/style.css` (simuladores: escenario + hoja de Pólya) y `css/index.css` (portada). Ejemplo de tokens:

```css
:root {
  --paper: #F2ECDF;   --paper-2: #FBF8EF;
  --ink: #1B1A17;     --ink-soft: #4A463E;   --muted: #6B6455;
  --blue: #2B4C8C;    --red: #B83A26;        --ochre: #8A5E0E;   --green: #2F6B4F;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Newsreader', Georgia, serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

Los estilos en línea (`style="..."`) están prohibidos salvo `--i` (orden de la entrada escalonada) y `display:none` gestionado por JS; los colores con significado se expresan con clases (`c-blue`, `bg-red`, `edge-ochre`…).

### 3. Módulos JavaScript (ES6)
Cada archivo JavaScript debe tener una única responsabilidad y exportar componentes de forma limpia:

```javascript
/**
 * @fileoverview Lógica matemática y vectorial para el motor físico.
 */

export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(vector) {
    return new Vector2D(this.x + vector.x, this.y + vector.y);
  }
}
```

## Portada-libro

- `index.html` es un libro: cerrado muestra la tapa («Seis experimentos, un método»); abierto, a la izquierda el método de Pólya y a la derecha el índice de los 6 laboratorios. Los simuladores se abren como páginas normales.
- Sin JavaScript el libro se muestra **abierto** y usable (`html:not(.js)`); con JavaScript empieza cerrado, salvo que ya se abriera en la sesión (`sessionStorage['libro-abierto']`, clase `start-open`). El estado lo gobierna `js/home/book.js`: no se animan `transform` ni `opacity` desde CSS.
- Todo se dimensiona en `em` desde `--page-h`; por debajo de 900 px las páginas se apilan y la tapa se aparta en vez de girar sobre el lomo.
- Accesible: la tapa es un `<button>` con `aria-expanded`, las páginas son `inert` mientras está cerrado, Esc lo cierra y `prefers-reduced-motion` desactiva las animaciones.

## Accesibilidad

- Las pestañas de fase de Pólya se activan con `initPhaseTabs()` (`js/shared/phaseTabs.js`) en cada `main.js`: no se enlazan `click` a mano sobre `.step-tab`.
- Todo slider lleva su `<label for>` (lo comprueba `tests/ui.test.js`), el foco visible usa `:focus-visible` definido en `tokens.css` y las animaciones respetan `prefers-reduced-motion`.

## Pruebas y Validación

- **IDs Únicos:** Todo elemento interactivo (botones de control, sliders, inputs) debe tener un ID descriptivo único para permitir pruebas automatizadas fáciles en el navegador.
- **Validación del Estado de Simulación:** El motor físico debe exponer hooks o variables globales de diagnóstico accesibles para validar que la simulación está ejecutándose correctamente (por ejemplo, `window.currentSimulation.isRunning`).

## Manejo de Errores y Robustez

- Toda entrada de usuario (inputs numéricos, sliders de gravedad, masas) debe validarse y sanitizarse.
- El motor de física debe implementar un bloque `try-catch` en el bucle principal de renderizado/actualización para capturar fallos numéricos (como división por cero o valores de punto flotante `NaN`) y suspender la simulación de forma segura, informando al usuario en una interfaz no intrusiva en lugar de congelar el navegador.

## Comentarios

- **Código General:** Preferiblemente autoexplicativo mediante nombres claros de variables y funciones.
- **Modelado Físico:** Los comentarios *sí* son requeridos en ecuaciones o aproximaciones numéricas complejas (como integradores Runge-Kutta o Euler) para justificar coeficientes físicos o pasos temporales (`dt`).

## Guías Didácticas e Imágenes del Estudiante

- **Guía interactiva HTML:** cada laboratorio tiene una guía en `pages/guide_<simulador>.html` con la estructura: marco teórico, las cuatro fases de Pólya (cada una con su captura del simulador y una hoja de trabajo para rellenar a mano) y conclusiones con una pregunta de reflexión final. Usa `css/guide.css`; no lleva estilos en línea (salvo `--i`), ni emojis, ni LaTeX o Markdown crudos: las ecuaciones se escriben con `<sub>`/`<sup>` dentro de `.eq`.
- **Capturas:** van en `assets/guides/` con el nombre `<simulador>_fase<n>.jpg` (n = 1, 2, 3 o 4). Deben tomarse del simulador real con el diseño vigente (800 × 600 aprox.), en el estado que ilustra el pie de figura, y **copiarse físicamente al repositorio**. Al rediseñar la UI hay que rehacerlas.
- **Rutas relativas:** queda prohibido usar rutas absolutas locales (como `C:\Users...`) en HTML o Markdown. Toda imagen se referencia con **rutas relativas portables** (`../assets/guides/...`).
- **Coherencia con el simulador:** los pies de figura y las instrucciones deben describir lo que se ve (colores, controles, etiquetas). Si cambia la física o la interfaz, se actualiza la guía en la misma sesión.
