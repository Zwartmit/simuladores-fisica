# Contexto de la Investigación del Profesor Marcos Chacón Castro

Este documento detalla la fundamentación didáctica y el marco metodológico del **Laboratorio virtual de física**, basado en la investigación y tesis académica del **Profesor Marcos Chacón Castro (UNAB, 2021)**: *“Estrategia didáctica para fortalecer la competencia resolución de problemas en estudiantes de ingeniería [...]”*.

El objetivo principal de esta integración es convertir el software de simulación física en un andamiaje pedagógico de aprendizaje activo que guíe al estudiante mediante la resolución heurística de problemas, en lugar de ser un simple juguete visual de reproducción pasiva.

---

## 1. El Fundamento Metodológico: George Pólya

La investigación del profesor Marcos fundamenta su secuencia de aprendizaje en las **cuatro fases clásicas de George Pólya** para la resolución de problemas científicos y matemáticos. En este proyecto, cada fase se ha traducido en componentes y flujos interactivos específicos dentro de la interfaz del simulador virtual:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECUENCIA DIDÁCTICA EN EL SIMULADOR                  │
├───────────────────┬───────────────────┬────────────────┬────────────────┤
│ 1. COMPRENDER     │ 2. PLANEAR        │ 3. EJECUTAR    │ 4. REVISAR     │
│ Identificación de │ Trazado manual de │ Simulación y   │ Contraste      │
│ variables y       │ hipótesis visual  │ graficación de │ analítico y    │
│ cuestionario.     │ de trayectoria.   │ vectores (v,g).│ error relativo.│
└───────────────────┴───────────────────┴────────────────┴────────────────┘
```

---

## 2. Traducción Didáctica en el Laboratorio Virtual

### Fase 1: Comprender el problema (Comprensión Conceptual)
*   **Fundamento de Investigación:** El estudiante no puede proceder a resolver un problema si no comprende sus variables constitutivas, sus datos conocidos (condiciones del entorno) y la incógnita que se le plantea resolver.
*   **Implementación en el Simulador:** 
    *   **Configuración del Escenario:** Paneles interactivos de sliders permiten al alumno configurar las variables iniciales (altura inicial $y_0$, velocidad inicial $v_0$, ángulo $\theta$ y gravedad $g$).
    *   **Cuestionario de Asimilación:** La interfaz bloquea el avance del laboratorio hasta que el estudiante responda una pregunta conceptual crítica sobre el comportamiento vectorial del sistema (por ejemplo, identificar que la aceleración gravitatoria permanece constante e invariante durante todo el trayecto de caída libre).

### Fase 2: Concebir un plan (Modelación e Hipótesis)
*   **Fundamento de Investigación:** La resolución requiere que el estudiante elabore una hipótesis, trace una estrategia matemática o estime visualmente el comportamiento del fenómeno antes de observar el resultado.
*   **Implementación en el Simulador:**
    *   **Trazado de Hipótesis:** Habilitación táctil y por ratón directa sobre el Canvas. El estudiante debe dibujar a mano alzada la curva elíptica o parabólica que estima que recorrerá la partícula.
    *   **Estimación de Alcance:** El estudiante ingresa numéricamente la distancia en metros ($x$) donde predice que impactará el proyectil, lo que genera una bandera de meta visual en el Canvas de simulación.

### Fase 3: Ejecutar el plan (Experimentación Computacional)
*   **Fundamento de Investigación:** Desarrollo práctico de la solución aplicando los modelos y principios de la física clásica en un entorno observable.
*   **Implementación en el Simulador:**
    *   **Animación Física:** Ejecución fluida a 60 FPS del motor de cálculo clásico basado en las ecuaciones exactas de la cinemática clásica:
        $$x(t) = x_0 + v_{x0} \cdot t$$
        $$y(t) = y_0 + v_{y0} \cdot t - \frac{1}{2}g \cdot t^2$$
    *   **Visualización Vectorial en Tiempo Real:** Renderizado interactivo de flechas luminiscentes para el vector de **Velocidad (verde esmeralda)** que varía en magnitud y ángulo dinámicamente, y el vector de **Aceleración/Gravedad (rojo brillante)** que apunta permanentemente hacia abajo con una longitud proporcional a la gravedad configurada.

### Fase 4: Examinar la solución (Metacognición y "Mirar hacia atrás")
*   **Fundamento de Investigación:** La verdadera competencia se adquiere al autoevaluar el resultado obtenido, comparar el valor calculado contra la predicción heurística inicial, contrastar el error porcentual y justificar físicamente las desviaciones encontradas.
*   **Implementación en el Simulador:**
    *   **Superposición de Trayectorias:** El simulador contrasta visualmente la curva dibujada manualmente por el alumno contra el rastro real recorrido por la partícula física.
    *   **Tabla de Contraste Numérico:** Reporte instantáneo que calcula el error absoluto y el error porcentual relativo entre el alcance real medido por el motor y la predicción del estudiante:
        $$\text{Error } \% = \left| \frac{\text{Alcance Real} - \text{Alcance Predicho}}{\text{Alcance Real}} \right| \times 100$$
    *   **Tutoría Contextual Adaptativa:** El Tutor Virtual (Polya) proporciona una retroalimentación pedagógica personalizada evaluando el margen de error obtenido, diagnosticando si el estudiante subestimó la gravedad o trazó una trayectoria rectilínea ineficiente en lugar de parabólica.

---

## 3. Impacto y Competencias en la Ingeniería

La incorporación de las secuencias del Profesor Marcos Chacón Castro en este Laboratorio didáctico permite el desarrollo de habilidades clave recomendadas para estudiantes universitarios de ciencias básicas e ingeniería:

1.  **Pensamiento Crítico:** El estudiante aprende a no aceptar las simulaciones de forma pasiva, sino a predecir, contrastar y evaluar la física detrás de los modelos computacionales.
2.  **Modelación Matemática:** Se enseña al estudiante a entender cómo un conjunto de ecuaciones diferenciales elementales de cinemática (gravedad constante) se traducen en visualizaciones visuales y predictivas del mundo real.
3.  **Habilidades Metacognitivas:** La fase de "Examinar la solución" obliga al estudiante a justificar sus errores de estimación y a reconfigurar sus esquemas de pensamiento frente al comportamiento de la física clásica en entornos controlados de simulación.
