/**
 * @fileoverview Pruebas unitarias para validar los cálculos físicos y la lógica
 * analítica del motor de física clásica (PhysicsEngine) en caída libre y tiro parabólico.
 */

import { PhysicsEngine } from '../js/cinematica/physicsEngine.js';
import assert from 'assert';

export function runVectorTests() {
  console.log("⚡ Iniciando pruebas unitarias de cinemática...");

  const engine = new PhysicsEngine();

  // PRUEBA 1: Verificar inicialización por defecto
  try {
    assert.strictEqual(engine.y0, 10);
    assert.strictEqual(engine.gravity, 9.81);
    assert.strictEqual(engine.isLanded, false);
    console.log("  ✅ Prueba 1: Inicialización correcta.");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Verificar reconfiguración de parámetros y componentes iniciales
  try {
    // 0 metros de altura, 20 m/s, 0 grados (lanzamiento horizontal plano), gravedad estándar
    engine.setParameters(0, 20, 0, 9.81);
    
    assert.strictEqual(engine.y0, 0);
    assert.strictEqual(engine.vx0, 20); // vx0 = 20 * cos(0) = 20
    assert.strictEqual(engine.vy0, 0);  // vy0 = 20 * sin(0) = 0
    console.log("  ✅ Prueba 2: Configuración de componentes iniciales correcta.");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: Verificación de trayectoria y gravedad en Caída Libre Pura
  try {
    // Altura inicial = 20m, Velocidad = 0 m/s (caída libre clásica), Gravedad = 10 m/s^2
    engine.setParameters(20, 0, 90, 10);
    engine.reset();
    
    // Simular un paso temporal de t = 1s usando 10 pasos de 0.1s para evitar el límite de lag del motor
    for (let i = 0; i < 10; i++) {
      engine.update(0.1);
    }
    
    // y(1) = y0 + vy0*t - 0.5*g*t^2 = 20 + 0 - 0.5 * 10 * 1 = 15m (tolerancia float)
    assert.ok(Math.abs(engine.y - 15) < 1e-9, `Posición y esperada 15, obtenida ${engine.y}`);
    
    // vy(1) = vy0 - g*t = 0 - 10 * 1 = -10 m/s (tolerancia float)
    assert.ok(Math.abs(engine.vy - (-10)) < 1e-9, `Velocidad vy esperada -10, obtenida ${engine.vy}`);
    
    console.log("  ✅ Prueba 3: Ecuaciones analíticas de Caída Libre correctas.");
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Verificación de tiempo de vuelo analítico cuadrático
  try {
    // Lanzamiento vertical hacia arriba desde el suelo
    // y0 = 0m, v0 = 30 m/s, angle = 90°, g = 10 m/s^2
    engine.setParameters(0, 30, 90, 10);
    engine.reset();

    // Tiempo de vuelo teórico exacto: t = 2 * vy0 / g = 2 * 30 / 10 = 6 segundos
    const flightTime = engine.getTheoreticalFlightTime();
    assert.strictEqual(flightTime, 6);
    
    console.log("  ✅ Prueba 4: Tiempo de vuelo teórico (cuadrática) correcto.");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Verificación del Evaluador de Hipótesis y predicción del alumno
  try {
    // Lanzamiento parabólico de prueba
    // y0 = 0m, v0 = 20 m/s, angle = 45°, g = 10 m/s^2
    engine.setParameters(0, 20, 45, 10);
    
    // Alcance real = (v0^2 * sin(2*theta)) / g = (400 * sin(90)) / 10 = 40 metros
    const predictedRange = 38; // El estudiante predice 38 metros (error absoluto = 2m)
    const evaluation = engine.evaluatePrediction(predictedRange);
    
    assert.strictEqual(evaluation.realRange, 40);
    assert.strictEqual(evaluation.absoluteError, 2);
    // error relativo % = (2 / 40) * 100 = 5%
    assert.strictEqual(evaluation.relativeErrorPercent, 5.0);
    
    console.log("  ✅ Prueba 5: Módulo evaluador de hipótesis y error relativo correcto.");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  // PRUEBA 6: Con alcance real 0 el error relativo no debe decir "0 %" si el alumno predijo otra cosa
  try {
    engine.setParameters(0, 20, 0, 10); // disparo rasante desde el suelo: alcance real = 0
    assert.strictEqual(engine.getTheoreticalMaxRange(), 0);

    assert.strictEqual(engine.evaluatePrediction(30).relativeErrorPercent, 100);
    assert.strictEqual(engine.evaluatePrediction(0).relativeErrorPercent, 0);

    console.log("  ✅ Prueba 6: Error relativo con alcance real nulo correcto.");
  } catch (err) {
    console.error("  ❌ Prueba 6 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas de física analítica han pasado exitosamente!");
}
