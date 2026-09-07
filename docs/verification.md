# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**. Toda nueva característica o simulación termina con evidencia comprobable y no con meras afirmaciones.

## Niveles de verificación

### Nivel 1 — Tests unitarios de lógica física (obligatorio)
Toda lógica matemática o de física pura (vectores, integradores, cálculos de colisión) debe estar respaldada por pruebas de resultados concretos. Se pueden estructurar en archivos de test bajo la carpeta `tests/` y ejecutarse en un entorno local compatible (por ejemplo, utilizando Node.js):

```javascript
// Ejemplo de prueba unitaria en tests/vector.test.js
import { PhysicsEngine } from '../js/cinematica/physicsEngine.js';
import assert from 'assert';

try {
  const v1 = new Vector2D(3, 4);
  const v2 = new Vector2D(1, 2);
  const res = v1.add(v2);
  assert.strictEqual(res.x, 4);
  assert.strictEqual(res.y, 6);
  console.log("✅ Vector2D.add: PASSED");
} catch (err) {
  console.error("❌ Vector2D.add: FAILED", err);
  process.exit(1);
}
```

Comando sugerido de verificación de backend/lógica:
```bash
node tests/run-all.js
```

### Nivel 2 — Validación de integración e interactividad (obligatorio para cambios en UI)
Para validar controles interactivos (botones, sliders) y el Canvas:
1. Inspeccionar mediante herramientas del navegador o scripts de automatización que los elementos DOM interactivos posean IDs unívocos (ej: `#gravity-slider`, `#btn-reset`).
2. Validar que la variación del control interactivo se propague inmediatamente al modelo físico (por ejemplo, modificando `#gravity-slider` y comprobando que `window.currentSimulation.gravity` tome el nuevo valor).

### Nivel 3 — Smoke test y diagnóstico en consola (obligatorio)
Antes de finalizar la sesión de desarrollo, abre el simulador en el navegador y verifica:
1. **Consola Limpia:** No debe haber mensajes de error (rojos) ni advertencias críticas (amarillas) de recursos no encontrados (404), fallos numéricos (`NaN`), o errores de sintaxis en JavaScript.
2. **Ciclo de Animación Estable:** Verifica que la tasa de cuadros por segundo (FPS) se mantenga constante y cercana a 60 FPS sin tirones visuales ni picos por el recolector de basura (GC).
3. **Responsive Design:** Redimensiona la ventana del navegador para verificar que el Canvas y los paneles de control se adapten estéticamente al tamaño de pantalla sin desbordamientos visuales.

## Anti-patrones (no hacer)

- ❌ "He subido los archivos al repositorio, debería cargar bien." → Es obligatorio levantar el servidor local (`npm run dev` o similar) y abrir la simulación en un navegador real para verificar visual y funcionalmente los cambios.
- ❌ Ignorar errores silenciosos. → Dejar que variables físicas se degraden a `NaN` sin que la simulación lo detecte ni suspenda el render de forma amigable.
- ❌ Modificar estilos globales de CSS sin probar la visualización responsiva.
- ❌ Declarar tareas como completadas (`done`) si la consola del navegador arroja errores al interactuar.

## Verificación final antes de cerrar

Realiza la prueba completa en el navegador. Si el comportamiento visual se rompe o existen errores en consola, **no** catalogues la tarea como `done`. Documenta detalladamente el fallo en `progress/current.md` y marca el estado como `blocked` en `feature_list.json`.

