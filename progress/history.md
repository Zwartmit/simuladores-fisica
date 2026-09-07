w

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
