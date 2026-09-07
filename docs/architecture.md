# Arquitectura — Qué significa "hacer un buen trabajo"

> Este documento define el estándar de calidad y la estructura arquitectónica del simulador. Los agentes revisores evalúan el código contra este archivo. Si no está aquí, no es un requisito.

## Principios

1. **Arquitectura desacoplada en tres capas.** El simulador físico se divide estrictamente en:
   - **Motor Físico (Modelo):** Computa el estado físico (posiciones, fuerzas, velocidades) de manera puramente matemática. Es 100% independiente del navegador y del DOM; no contiene referencias a elementos visuales, `document` ni `window`.
   - **Renderizador (Vista):** Dibuja los objetos físicos en un lienzo `<canvas>`. Recibe los datos procesados por el motor y los dibuja en pantalla.
   - **Controlador e Interfaz (UI/Bucle):** Gestiona el bucle de animación (`requestAnimationFrame`), recibe las entradas del usuario (sliders de parámetros, botones) y coordina la actualización del motor y el redibujado de la vista en cada cuadro.

2. **Sin dependencias externas.** Solo HTML5, CSS y JavaScript vainilla nativo del navegador. Esto garantiza compatibilidad, rendimiento y tiempos de carga instantáneos. Cualquier librería externa debe discutirse previamente.

3. **Ciclo de simulación óptimo y no bloqueante (High Performance).**
   - Las actualizaciones físicas y el renderizado se sincronizan a través de `requestAnimationFrame()`.
   - El paso temporal de la simulación (`dt`) se calcula dinámicamente o se fija cuidadosamente para evitar inestabilidades numéricas (efecto "túnel" de colisiones, saltos bruscos).

4. **Estado predecible e inmutable por cuadro.**
   - El estado de la simulación en un instante $t$ debe poder serializarse, resetearse al valor inicial de forma instantánea y pausarse de forma limpia.

5. **Interactividad fluida y sin memory leaks.**
   - Todos los event listeners deben ser manejados con cuidado para evitar fugas de memoria al reiniciar simulaciones.
   - Los objetos generados en bucles críticos de animación (como instancias temporales de vectores en cada cuadro) deben minimizarse para evitar que el Garbage Collector (GC) cause caídas de FPS.

## Flujo de datos

```
[Usuario] ──(Input: Sliders/Clicks)──→ [Controlador (main.js)]
                                               │
           ┌───────────────────────────────────┴───────────────────────────────────┐
           ▼                                                                       ▼
[Motor Físico (physicsEngine.js)] ──(Calcula estado t+dt)──→ [Renderizador (canvasRenderer.js)]
                                                                                   │
                                                                                   ▼
                                                                            [Lienzo <canvas>]
```

## Qué NO hacer

- **No manipular el DOM desde el Motor Físico:** El motor de cálculo no debe saber qué es un botón o un input. Solo recibe variables numéricas puras.
- **No usar `setInterval` o `setTimeout` para el bucle de animación:** Usar exclusivamente `requestAnimationFrame` para evitar desincronización de tasas de refresco.
- **No instanciar objetos masivamente dentro del bucle de simulación:** Evitar la creación excesiva de vectores u objetos auxiliares en cada cuadro para no disparar pausas del recolector de basura (GC).
- **No mezclar lógica de dibujo con lógica de física:** El método que calcula la aceleración de una partícula no debe llamar a funciones de dibujo como `.getContext('2d').arc(...)`.
- **No dejar listeners huérfanos:** Al reiniciar o destruir una simulación, asegurarse de limpiar los event listeners creados.

