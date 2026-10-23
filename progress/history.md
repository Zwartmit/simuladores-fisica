# Bitácora de sesiones anteriores

## Sesión: 2026-05-26 — Implementación de Cinemática 2D (Feature 1)

**Resultados obtenidos:**

* Se desarrolló con éxito la primera característica del Laboratorio Virtual: **Cinemática 2D y Trayectorias**.
* **Arquitectura de simulación:** Se estructuró de forma totalmente desacoplada, separando la física (`js/physicsEngine.js`), el renderizado sobre el lienzo (`js/canvasRenderer.js`) y el orquestador principal (`js/main.js`).
* **Método de Polya:** Se diseñaron las 4 fases didácticas basadas en George Polya y la investigación del profesor Marcos:
  1. *Comprender:* Formulario de variables de escenario y cuestionario interactivo de análisis conceptual.
  2. *Planear:* Herramienta interactiva para que el alumno trace visualmente en Canvas su hipótesis e ingrese su alcance predicho.
  3. *Ejecutar:* Simulación animada a 60 FPS estables, con trazado de vectores vectoriales de velocidad (verde) y aceleración (rojo) dinámicos y telemetría en tiempo real.
  4. *Revisar:* Contraste analítico clásico, cálculo preciso del error porcentual y retroalimentación pedagógica del tutor según el desempeño.
* **Estética premium:** Se aplicó un tema en modo oscuro (`#090f1a` y `#0f172a`), bordes luminiscentes, micro-animaciones fluidas y tipografía moderna `Outfit`.
* **Control de calidad y verificación:** Se implementó una suite de pruebas unitarias (`tests/vector.test.js` y `tests/run-all.js`) corriendo de forma 100% verde bajo Node.js.

## Sesión: 2026-05-27 — Implementación de Leyes de Newton y Fuerzas (Feature 2)

**Resultados obtenidos:**

* Se desarrolló exitosamente el segundo laboratorio interactivo: **Leyes de Newton y Fuerzas en Plano Inclinado**.
* **Capas desacopladas:** Se implementaron `js/physicsEngineNewton.js` (cálculo analítico de componentes de peso $W$, fuerza normal $N$, umbral estático y dinámica de rozamiento), `js/canvasRendererNewton.js` (dibujo geométrico, vectores e interactividad del DCL) y `js/mainNewton.js` (controlador de eventos y bucle a 60 FPS).
* **Metodología de Pólya-Marcos:** Implementada con éxito en 4 pestañas:
  1. *Comprender:* Parametrización y test de asimilación interactivo de la Fuerza Normal.
  2. *Planear:* Herramienta digital interactiva sobre Canvas para dibujar el Diagrama de cuerpo libre (DCL) definiendo ángulos y magnitudes polares.
  3. *Ejecutar:* Simulación del bloque físico rampa abajo mostrando las ecuaciones de Newton dinámicamente.
  4. *Revisar:* Contraste y reporte del error de magnitudes/ángulos del DCL, con retroalimentación detallada del Tutor Polya.
* **Guía Didáctica Interactiva:** Creada en `guide_newton.html` con material didáctico ilustrado y capturas de pantalla de la interfaz cargando perfectamente sin enlaces rotos.
* **Suite de Pruebas Unitarias:** Implementada en `tests/newton.test.js` e integrada en `tests/run-all.js` pasando al 100% en verde.

## Sesión: 2026-07-18 — Implementación de Conservación de la Energía (Feature 3)

**Resultados obtenidos:**

* Se desarrolló exitosamente el tercer laboratorio interactivo: **Conservación de la Energía (rampa tipo skatepark)**.
* **Motor Físico:** `js/physicsEngineEnergia.js` implementa un integrador **Runge-Kutta de 4° orden (RK4)** sobre una rampa de perfil senoidal paramétrico. Calcula energía cinética (K), potencial (U) y térmica disipada (Q) en cada paso.
* **Renderizador:** `js/canvasRendererEnergia.js` dibuja la rampa curva, el bloque con velocímetro interno, el vector de velocidad tangencial, gráficas de barras de energía en tiempo real y una mini-gráfica histórica de K/U/Q vs. t en la esquina superior.
* **Metodología de Pólya-Marcos:** Implementada en 4 fases:
  1. *Comprender:* Sliders de masa, gravedad y altura inicial. Quiz de conservación de energía.
  2. *Planear:* Predicción cuantitativa del estudiante sobre K_max en el fondo. Selector de fricción (μ).
  3. *Ejecutar:* Simulación animada con barras de energía en color. Leyenda K/U/Q explicada.
  4. *Revisar:* Tabla comparativa predicción vs. física real, badge de error y retroalimentación del tutor.
* **Bug detectado y corregido durante validación:** La Fase 4 mostraba `KE = 0.00 J` porque leía el estado al pausar. Corregido rastreando el pico máximo de KE con la variable `peakKE` durante el bucle de animación.
* **Menú Principal actualizado:** La tarjeta de Trabajo y Energía en `index.html` fue desbloqueada y enlazada a `energia.html`.
* **Servidor de desarrollo:** Levantado con `python -m http.server 5500` (puerto 3000 ocupado por otro proyecto).

## Sesión: 2026-07-18 — Implementación de Dinámica rotacional (Feature 4)

**Resultados obtenidos:**

* Se desarrolló exitosamente el cuarto laboratorio interactivo: **Dinámica rotacional (τ = I·α)**.
* **Motor Físico:** `js/physicsEngineRotacion.js` implementa integración RK4 con soporte para tres tipos de cuerpo rígido (disco: I = ½mr², aro: I = mr², barra: I = mL²/12), torque aplicado, fricción viscosa angular y cálculo del momento angular L = I·ω.
* **Renderizador:** `js/canvasRendererRotacion.js` dibuja el cuerpo seleccionado animado (disco con radios, aro con rayos, barra con masas en extremos), vector de torque como arco curvo, vectores ω y α como flechas, gráfica temporal ω(t)/L(t) y panel de magnitudes instantáneas.
* **Metodología de Pólya-Marcos:** Implementada en 4 fases:
  1. *Comprender:* Selector de cuerpo rígido (disco/aro/barra), sliders de masa y radio, quiz sobre el efecto del radio en I.
  2. *Planear:* Configuración de torque, fricción y duración. Predicción cuantitativa de ω final.
  3. *Ejecutar:* Simulación con barra de progreso temporal. Leyenda de vectores. Telemetría en tiempo real.
  4. *Revisar:* Tabla comparativa predicción vs. simulación vs. valor teórico. Verificación de τ = I·α con error < 2%.
* **Validación en navegador:** Sin errores de consola. ω crece linealmente (sin fricción), verificación de τ = I·α ≈ 10.00 N·m confirmada en Fase 4.
* **Menú Principal actualizado:** Tarjeta de Dinámica rotacional desbloqueada en `index.html`.

## Sesión: 2026-07-18 — Implementación de Gravitación universal (Feature 5)

**Resultados obtenidos:**
*   Se desarrolló exitosamente el quinto laboratorio interactivo: **Leyes de Kepler y Gravitación**.
*   **Motor Físico:** `js/physicsEngineGravitacion.js` implementa integración RK4 en 2D sobre la fuerza gravitatoria ($F = G \cdot M \cdot m / r^2$). Rastrea el periapsis, apoapsis y detecta cruces de cuadrante para medir el período orbital ($T$) y el semieje mayor ($a$).
*   **Renderizador:** `js/canvasRendererGravitacion.js` dibuja la estrella central con halo, el planeta animado con su rastro elíptico (órbita), vectores en tiempo real para velocidad tangencial y fuerza gravitacional, además de paneles de telemetría y una tabla dinámica para verificar la Tercera Ley de Kepler.
*   **Metodología de Pólya-Marcos:**
    1.  *Comprender:* Configuración de la constante gravitacional $G$ y la masa central $M$. Cuestionario conceptual sobre la dependencia del período según Kepler III.
    2.  *Planear:* Ajuste del radio inicial y excentricidad. El estudiante calcula y predice manualmente el período $T$ usando la fórmula teórica.
    3.  *Ejecutar:* Simulación en tiempo real (múltiples pasos RK4 por frame para acelerar). Detección automática de órbitas completadas.
    4.  *Revisar:* Contraste del período predicho vs simulado. Verificación en tiempo real de la constante $a^3/T^2$ frente al valor teórico $GM/4\pi^2$ confirmando Kepler III.
*   **Validación en navegador:** Sin errores de consola. El planeta orbita correctamente. La Fase 4 se desbloquea al completar 1 órbita y verifica la constante $a^3/T^2$ exitosamente.
*   **Menú Principal actualizado:** Tarjeta de Gravitación universal desbloqueada en `index.html`.

## Sesión: 2026-07-18 — Implementación de Oscilaciones mecánicas (Feature 6)

**Resultados obtenidos:**
*   Se desarrolló exitosamente el sexto y último laboratorio interactivo: **Movimiento Armónico Simple (MAS)**.
*   **Motor Físico:** `js/physicsEngineOscilaciones.js` implementa integración RK4 para dos sistemas físicos: Péndulo simple ($\theta'' = -g/L \sin\theta - b/m \cdot \omega$) y Masa-Resorte ($x'' = -k/m \cdot x - b/m \cdot v$). Soporta fricción (amortiguamiento) y calcula energía cinética ($KE$) y potencial ($PE$) en tiempo real.
*   **Renderizador:** `js/canvasRendererOscilaciones.js` dibuja de manera responsiva el péndulo o el resorte. Incluye dos gráficas dinámicas de telemetría en la parte inferior: una para posición vs tiempo ($\theta(t)$ o $x(t)$) y otra para el ciclo de energía ($KE$ y $PE$ vs $t$).
*   **Metodología de Pólya-Marcos:**
    1.  *Comprender:* Selector de sistema (Péndulo/Resorte) con actualización de parámetros e interfaces dinámicas. Cuestionario conceptual adaptativo según el sistema elegido.
    2.  *Planear:* Ajuste de condiciones iniciales (ángulo/desplazamiento) y coeficiente de amortiguamiento. Predicción manual del período $T$.
    3.  *Ejecutar:* Simulación en tiempo real. Detección automática de ciclos completados (cruces por cero).
    4.  *Revisar:* Contraste del período predicho vs real, cálculo del porcentaje de error y retroalimentación didáctica diferenciada (con/sin fricción).
*   **Validación en navegador:** Sin errores de consola. Las animaciones y gráficas se renderizan fluidamente. Fase 4 desbloqueada tras completar 1 ciclo.
*   **Menú Principal actualizado:** Tarjeta de Oscilaciones mecánicas desbloqueada en `index.html`.
*   **Hito del Proyecto:** Con esta feature, se completan **todas** las funcionalidades planificadas en el `feature_list.json`. El desarrollo del proyecto base de Simuladores de Física ha concluido exitosamente.

## Sesión: 2026-10-22 — Auditoría y corrección de bugs de física (Features 3, 4, 5 y 6)

**Contexto:** Auditoría completa en navegador + motores en Node. No se abrió una feature nueva: se corrigieron errores de cálculo en los motores de Energía, Gravitación, Rotación y Oscilaciones, cada uno con su suite de tests.

**Bugs corregidos:**

* **Energía:** el motor omitía el término y''·ẋ² de la ecuación de Lagrange (K+U llegaba a +245% de E₀), la "energía térmica" se calculaba como E₀−(K+U) (conservación circular, siempre "verificada"), el bloque se frenaba en seco en θ=0.98π y el slider de altura estaba invertido (80% → 1.3 m). Ahora la pista es un cuenco y(x)=A(1−cos(πx/W)), Q se integra desde el trabajo real de la fricción (Coulomb con reposo), sub-pasos RK4 de 1/240 s. K_max = mgh₀ exacto.
* **Gravitación:** v_periapsis = v_c·√((1+e)/(1−e)) superaba la velocidad de escape para e ≥ 1/3 (la órbita escapaba al infinito). Ahora vis-viva con el semieje mayor `a` como parámetro (T no depende de e). Período con interpolación del cruce (la primera vuelta ya cuenta; antes hacían falta 2), softening artificial eliminado, sub-pasos adaptativos, Kepler III comparado contra GM/4π² (antes: primera vs última órbita), texto del tutor sin float crudo.
* **Rotación:** el check τ=I·α comparaba el torque aplicado con I·α (falso aviso con fricción); ahora usa τ_neto y el teorema impulso–momento angular. Texto del tutor ya no dice "sin fricción" con fricción. Torque 0 ya no se convierte en 10 N·m.
* **Oscilaciones:** 0° se convertía en 30° y x₀=0 en 1 m; sin límite de dt (explotaba al volver de otra pestaña); período con interpolación; detección de sobreamortiguamiento (antes callejón sin salida en Fase 3→4); `getExpectedPeriod()` (AGM para amplitud finita y T_d amortiguado) para que el tutor explique la desviación respecto a 2π√(L/g).

**Tests:** `tests/energia.test.js`, `rotacion.test.js`, `gravitacion.test.js`, `oscilaciones.test.js` (24 pruebas nuevas) integrados en `tests/run-all.js`; las 6 suites pasan. Verificación en navegador sin errores de consola.

**Pendiente (siguiente sesión):** rediseño UI/UX con la skill `anti-slop-design`; responsive (no hay `@media`; el canvas mide 0 px en móvil), LaTeX crudo en newton/guías, guías sin capturas (energía, rotación, gravitación, oscilaciones), exponer `window.currentSimulation` en los 4 simuladores, Newton: estado "Equilibrio / Estático" en t=0 con a>0 y velocidad final perdida al llegar al fondo, cinemática: `evaluatePrediction` devuelve 0% de error si el alcance real es 0.

## Sesión: 2026-10-22 — Rediseño UI/UX "Cuaderno de laboratorio" (fase 1: base, portada y Cinemática)

**Contexto:** Se instaló la skill `anti-slop-design` y se eligió la dirección "Cuaderno de laboratorio" (papel crema, tinta, lapicero azul y corrector bermellón; Fraunces + Newsreader + IBM Plex Mono) frente a "Instrumento de laboratorio". Se retiró el tema oscuro neón (degradados, vidrio esmerilado, brillos, emojis, tarjetas idénticas).

**Hecho:**

* `css/tokens.css` (nuevo): tokens de color/tipografía/forma, base y entrada escalonada (`.rise`, respeta `prefers-reduced-motion`).
* `css/style.css` reescrito: escenario a la izquierda (lienzo fijo con `position: sticky`) y hoja de cuaderno a la derecha con las 4 fases de Pólya; responsive (`@media` a 1180 px y 960 px; antes no había ninguno, el lienzo medía 0 px en móvil). Mantiene compatibilidad con el marcado anterior (`<header>` + telemetría superpuesta) de los otros cinco simuladores mientras migran.
* `css/index.css` + `index.html`: portada como índice editorial con enlaces reales (`<a>`, no `onclick` en `div`) y método de Pólya en pasos escalonados.
* `pages/cinematica.html` + `js/cinematica/canvasRenderer.js`: plantilla nueva (título en el escenario, tira de datos, notas al margen). El lienzo dibuja papel milimetrado alineado a metros, escala automática (`fitView`: el alcance de 53 m ya no se sale de pantalla), hipótesis en ocre y vectores en tinta; colores leídos de los tokens. `resize()` usa `setTransform` (antes acumulaba escalas).
* `js/cinematica/main.js`: ajuste de vista, hipótesis del alumno guardada en metros (sobrevive a cambios de escala), botón "Lanzamiento completo" al aterrizar y texto del tutor sin "amortiguadas" (no hay rozamiento).

**Migración completada (misma sesión):** Newton, Energía, Rotación, Gravitación y Oscilaciones pasaron a la plantilla nueva (`<main id="simulation-area">` con `.masthead`, `.stage-title`, `.canvas-wrap` y tira `.readout`; hoja de Pólya a la derecha). Se eliminaron los bloques `<style>` y todos los estilos en línea de las páginas (componentes compartidos ahora en `css/style.css`), los emojis y el LaTeX crudo de Newton. Los cinco renderizadores se reescribieron en la paleta de tinta con `js/shared/inkPalette.js` (colores leídos de los tokens, sin sombras ni degradados, `setTransform` para DPR); Newton, Energía, Gravitación y Oscilaciones escalan la escena a la altura/anchura disponible, y los recuadros de datos del canvas (barras de energía, gráficas, tabla de Kepler) ya no tapan la escena. Cambios de contenido menores: Newton muestra "Se deslizará" / "Deslizando" / "Equilibrio estático" según la física (antes decía "Equilibrio / Estático" con a = 1.93 m/s²). Verificado en navegador a 800 px y a 375 px (sin desbordamiento horizontal, canvas 323×320) y con consola limpia.

**Guías didácticas rehechas (misma sesión):** las 6 guías (`pages/guide_*.html`) se reescribieron en el diseño Cuaderno con `css/guide.css`: hoja con margen rojo, índice, marco teórico con ecuaciones en `.eq`, cuatro fases con numeral grande, figura con pie, hoja de trabajo (tablas con huecos para escribir) y preguntas «Para pensar», más conclusiones y reflexión final. Se eliminaron los estilos en línea, la fuente Inter, los emojis, el LaTeX crudo y los `**` literales, y se actualizó el contenido a los cambios de física (Gravitación: el semieje mayor `a` es el parámetro y T no depende de e; Oscilaciones: período con amplitud finita y sobreamortiguamiento; Energía: Q se calcula del trabajo real de la fricción; Rotación: verificación con torque neto; Newton: estados de la tira de datos y calificación del DCL). Capturas nuevas (19, tomadas del simulador real): `assets/guides/<simulador>_fase<n>.jpg` — 3 por guía y 4 en Newton — y retiradas las 6 PNG antiguas con el tema oscuro. Además: símbolos y unidades dejan de ponerse en mayúsculas en etiquetas, lecturas y cabeceras de tabla (la «m» de metro y la «M» de masa no son lo mismo).

**Pendiente:** exponer `window.currentSimulation` en los 4 simuladores que no lo tienen; tests de interfaz (hoy solo hay tests de motores); cinemática: `evaluatePrediction` devuelve 0 % de error si el alcance real es 0; `og:url` y `og:image` apuntan a `steam-unir.netlify.app` en todas las páginas.

## Sesión: 2026-10-23 — Pendientes de calidad

* **`window.currentSimulation` en los 6 simuladores** (`engine`, `renderer`, `isRunning()`, `getPhase()`; Newton conserva `newtonSimulation` como alias y Oscilaciones añade `getSystem()`), tal como exige `docs/conventions.md`. Verificado en navegador.
* **Cinemática:** `evaluatePrediction` ya no devuelve 0 % de error cuando el alcance real es 0 y el alumno predijo otra cosa (ahora 100 %); prueba nueva. Su renderizador pasa a la paleta compartida `inkPalette.js` (antes tenía una copia propia con colores de respaldo).
* **Tests de interfaz estáticos** (`tests/ui.test.js`, 7 pruebas, sin dependencias): IDs que busca cada `main.js`, plantilla común, enlaces/recursos locales, estilos en línea, emojis, LaTeX y Markdown crudos, `<label for>` de cada slider, canvas sin colores fijos, guías con capturas y fases, CSS responsive sin restos del diseño anterior. Documentado en `docs/verification.md` (Nivel 1b). Nada más estrenarse detectó un `$T$` crudo que quedaba en `oscilaciones.html` (corregido).
* **Metadatos sociales:** `og:url` de cada página apunta ahora a su propia URL (`https://steam-unir.netlify.app/<ruta>`; antes todas decían la raíz). Se asume que el sitio se publica desde la raíz del repositorio, como indica su estructura.
* Suite completa: 43 pruebas en verde (36 de física + 7 de interfaz).

**Pendiente:** verificación visual automatizada (capturas de regresión) si algún día se añade un navegador sin interfaz al proyecto; hoy es manual (`docs/verification.md`, Niveles 2 y 3).

