# Convenciones de código

> Homogeneidad extrema y excelencia visual. La IA predice mejor cuando el repositorio se parece a sí mismo, y el usuario final es cautivado por un diseño premium.

## Tecnologías Principales

- **Core:** HTML5 semántico para la estructura y JavaScript moderno (ES6+) para la lógica y las simulaciones físicas.
- **Estilo (CSS):** Vanilla CSS para máxima flexibilidad y control. No usar librerías o frameworks de CSS externos a menos que se solicite explícitamente.
- **Estética Visual:** Diseños premium modernos con paletas de colores armoniosas (preferiblemente basadas en HSL), esquemas oscuros por defecto, tipografía moderna (ej: `Inter`, `Outfit` o `Roboto` importadas de Google Fonts) y micro-animaciones fluidas para interactividad.

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
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
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
El archivo CSS debe definir variables globales (CSS Variables) para mantener consistencia estética y un diseño de alta gama:

```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --accent-color: hsl(217.2, 91.2%, 59.8%);
  --accent-glow: hsla(217.2, 91.2%, 59.8%, 0.15);
  --text-primary: #f8fafc;
  --text-muted: #94a3b8;
  --font-family: 'Outfit', sans-serif;
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

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

- **Guía Interactiva HTML:** Cada característica u objetivo de física completado debe acompañarse obligatoriamente de una guía didáctica interactiva en formato HTML dentro de `pages/` (por ejemplo, `pages/guide_cinematica.html` para la Feature 1, o `pages/guide_<simulador>.html` para las demás) explicando detalladamente los conceptos físicos clásicos y el flujo heurístico de Pólya. Las capturas de pantalla que use la guía van en `assets/guides/`.
- **Portabilidad de Pantallazos:** Cualquier captura de pantalla o mockup interactivo generado para ilustrar las fases en la guía debe **copiarse físicamente al directorio del proyecto** (por ejemplo, a la raíz o a una carpeta `images/` del repositorio).
- **Rutas Relativas:** Queda estrictamente prohibido utilizar rutas absolutas locales del Conversation ID (como `C:\Users\Usuario\...`) en los archivos HTML o Markdown, ya que estas causan imágenes rotas en el navegador del estudiante. Toda imagen debe referenciarse usando **rutas relativas portables**.

