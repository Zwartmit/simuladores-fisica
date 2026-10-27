# Física — Laboratorio UNIR con Antigravity

Este repositorio implementa un entorno didáctico interactivo para el aprendizaje de **Física**, integrando la metodología de resolución de problemas de **George Polya** (basada en la investigación de Marcos Chacón Castro) y simulaciones activas en 2D/3D mediante interfaces web premium y el arnés de **Antigravity**.

> El sistema actúa como un **Tutor de Física** que guía al estudiante a través de la experimentación visual e interactiva, garantizando que cada concepto sea validado mediante simulación antes de avanzar.
> El código de la aplicación es deliberadamente simple. Lo importante de este repo no es **qué** hace, sino **cómo** está estructurado para que un agente de IA pueda trabajar sobre él de forma autónoma, responsiva y verificable en un navegador web.

## Cómo está organizado el arnés

| Pilar | Manifestación en este repo |
|-------|----------------------------|
| **1. El repositorio ES el sistema** | `AGENTS.md`, `feature_list.json`, `progress/`, `docs/` |
| **2. Orquestación multi-agente**    | `.gemini/agents/leader.md`, `implementer.md`, `reviewer.md` |
| **3. Supervisión y mejora**         | `CHECKPOINTS.md`, hooks en `.gemini/settings.json`, `tests/` |

## Probarlo tú mismo con Gemini Code y el navegador

Si te descargas el repo y abres Gemini Code en la raíz, ya estás dentro del arnés: `GEMINI.md` fuerza al modelo a actuar como `leader` (orquesta, no edita código).

Receta rápida:

1. Abre `feature_list.json` y deja al menos una feature con `status: "pending"`. Si todas están en `done`, añade una nueva al final del array o cambia el estado de una existente para reabrirla.
2. Lanza Gemini Code en la raíz del repo: `Gemini`.
3. Pídele literalmente: **«implementa la siguiente feature pendiente»**.

Lo que verás en chat:

- El **leader** anuncia el plan, lanza un `implementer` y luego un `reviewer`.
- Por chat **no pasa código** — solo referencias del tipo `done -> progress/impl_<feature>.md`. Esa es la regla anti-teléfono-descompuesto.

Dónde queda la traza de cada subagente (esto es la "visualización" persistente):

| Archivo                          | Quién lo escribe | Qué contiene                                        |
|----------------------------------|------------------|-----------------------------------------------------|
| `progress/current.md`            | leader           | Plan vivo de la sesión                              |
| `progress/impl_<feature>.md`     | implementer      | Archivos tocados + output de los tests              |
| `progress/review_<feature>.md`   | reviewer         | Checklist contra `docs/` y `CHECKPOINTS.md`         |
| `feature_list.json`              | implementer      | `pending` → `in_progress` → `done`                  |
| `progress/history.md`            | leader           | Resumen append-only al cerrar la sesión             |

Abre `progress/` en tu editor mientras Gemini trabaja: cada informe aparece en cuanto el subagente termina. Así puedes auditar paso a paso quién decidió qué — el contenido no circula por chat, vive en disco y queda versionado.

## Estructura

```
.
├── AGENTS.md               # Mapa para agentes (divulgación progresiva)
├── CHECKPOINTS.md          # Criterios de "estado final correcto"
├── GEMINI.md               # Instrucciones globales e inicialización para agentes
├── feature_list.json       # Alcance: una feature a la vez
├── package.json            # Configuración de NPM y script de servidor (live-server)
├── progress/
│   ├── current.md          # Sesión activa (estado vivo)
│   └── history.md          # Bitácora append-only
├── docs/
│   ├── architecture.md     # Qué significa "buen trabajo"
│   ├── conventions.md      # Estilo, nombres, errores
│   └── verification.md     # Cómo demostrar que funciona
├── .gemini/
│   ├── agents/             # Definiciones de líder, implementador, revisor
│   └── settings.json       # Hooks que automatizan la verificación
├── index.html              # Portada: un libro que se abre (tapa, método de Pólya e índice de los 6 laboratorios)
├── pages/                  # Un HTML de simulador + un HTML de guía por feature
│   ├── cinematica.html / guide_cinematica.html
│   ├── newton.html / guide_newton.html
│   ├── energia.html / guide_energia.html
│   ├── rotacion.html / guide_rotacion.html
│   ├── gravitacion.html / guide_gravitacion.html
│   └── oscilaciones.html / guide_oscilaciones.html
├── css/
│   ├── tokens.css          # Tokens de diseño "Cuaderno de laboratorio" (color, tipografía, forma)
│   ├── style.css           # Interfaz de los simuladores (escenario + hoja de Pólya), responsive
│   ├── index.css           # Portada-libro: tapa, páginas, marcapáginas
│   └── guide.css           # Guías didácticas: hoja de cuaderno, figuras y hojas de trabajo
├── js/
│   ├── home/book.js         # Portada-libro: abrir/cerrar con Motion, teclado, memoria de sesión
│   ├── shared/              # inkPalette.js (colores de los canvas) y phaseTabs.js (pestañas accesibles)
│   ├── vendor/              # Código de terceros incluido tal cual (Motion; ver su README)
│   └── <simulador>/        # Una carpeta por feature (cinematica, newton, energia, rotacion, gravitacion, oscilaciones)
│       ├── main.js             # Controlador, eventos y bucle requestAnimationFrame
│       ├── physicsEngine.js    # Motor de simulación física desacoplado del DOM
│       └── canvasRenderer.js   # Lógica de dibujo/pintado sobre lienzo Canvas
├── assets/
│   ├── favicon.png, og-image.png
│   └── guides/              # Capturas del simulador (<simulador>_fase<n>.jpg) usadas por las guías
└── tests/
    ├── run-all.js          # Ejecutor de pruebas automatizadas locales
    ├── vector.test.js      # Pruebas unitarias de js/cinematica/physicsEngine.js
    ├── newton.test.js      # Pruebas unitarias de js/newton/physicsEngine.js
    ├── energia.test.js     # Conservación de K+U+Q, fricción y altura inicial
    ├── rotacion.test.js    # τ = I·α, fricción viscosa, impulso–momento angular
    ├── gravitacion.test.js # Órbitas ligadas, Kepler III, energía y momento angular
    ├── oscilaciones.test.js # Período MAS/péndulo, amortiguamiento, estabilidad
    └── ui.test.js          # Interfaz estática: IDs, enlaces, estilos en línea, canvas sin colores fijos, guías
```

## Aprendizajes que ilustra este proyecto

- **Divulgación progresiva** en `AGENTS.md`: el agente no recibe todas las reglas de golpe, recibe un mapa para buscarlas bajo demanda.
- **Una feature a la vez** validada con el navegador (rechaza más de un `in_progress` en `feature_list.json`).
- **Estado en disco**, no en chat: `progress/current.md` y `history.md` sobreviven a reinicios y context windows de los modelos de lenguaje.
- **Verificación ejecutable**: en el navegador corre los tests reales y auditorías visuales/consola, no se fía de lo que diga la IA de manera teórica.
- **Patrón Líder-Trabajador-Revisor**: el líder no implementa, el implementador no se autoaprueba, el revisor no edita código.
- **Anti teléfono-descompuesto**: los subagentes escriben sus resultados en archivos en disco y solo devuelven una referencia ligera en chat.

