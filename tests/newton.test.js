/**
 * @fileoverview Pruebas unitarias para validar los cálculos físicos, estáticos,
 * dinámicos y evaluaciones del DCL del motor del plano inclinado (PhysicsEngineNewton).
 */

import { PhysicsEngineNewton } from '../js/newton/physicsEngine.js';
import assert from 'assert';

export function runNewtonTests() {
  console.log("⚡ Iniciando pruebas unitarias de fuerzas (Leyes de Newton)...");

  const engine = new PhysicsEngineNewton();

  // PRUEBA 1: Inicialización correcta por defecto
  try {
    assert.strictEqual(engine.mass, 5.0);
    assert.strictEqual(engine.angleDeg, 30);
    assert.strictEqual(engine.muS, 0.5);
    assert.strictEqual(engine.muK, 0.35);
    assert.strictEqual(engine.gravity, 9.81);
    console.log("  ✅ Prueba 1: Parámetros iniciales por defecto correctos.");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Cálculo correcto de componentes vectoriales del peso y fuerza Normal
  try {
    // Masa 10 kg, rampa a 45°, gravedad 10 m/s^2 (para simplificar matemática)
    engine.setParameters(10, 45, 0.6, 0.4, 10);

    // Peso: W = 10 * 10 = 100 N
    assert.strictEqual(engine.W, 100);

    // Componentes del peso (Wx paralela, Wy perpendicular)
    // Wx = 100 * sin(45°) = 100 * 0.707106...
    // Normal: N = Wy = 100 * cos(45°) = 100 * 0.707106...
    const expectedComp = 100 * Math.sin(45 * Math.PI / 180);
    assert.ok(Math.abs(engine.Wx - expectedComp) < 1e-9);
    assert.ok(Math.abs(engine.Wy - expectedComp) < 1e-9);
    assert.ok(Math.abs(engine.N - expectedComp) < 1e-9);

    console.log("  ✅ Prueba 2: Componentes del Peso y Normal calculados correctamente.");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: Condición de Equilibrio Estático (El bloque permanece quieto)
  try {
    // Rampa poco inclinada (10°), masa 5kg, fricción estática alta (0.8), g = 10
    engine.setParameters(5, 10, 0.8, 0.6, 10);

    // Peso: W = 50 N
    // Wx = 50 * sin(10°) = 50 * 0.1736... = 8.68 N
    // Wy = N = 50 * cos(10°) = 50 * 0.9848... = 49.24 N
    // Ffs_max = 0.8 * 49.24 = 39.39 N
    // Como Wx (8.68) <= Ffs_max (39.39), el bloque permanece estático.

    assert.strictEqual(engine.isMoving, false);
    assert.strictEqual(engine.acceleration, 0);

    // La fuerza de fricción estática real es exactamente igual a la fuerza impulsora: Ff = Wx
    assert.ok(Math.abs(engine.Ff_real - engine.Wx) < 1e-9);

    // Si actualizamos, no debe moverse
    engine.update(1.0);
    assert.strictEqual(engine.distance, 0);
    assert.strictEqual(engine.velocity, 0);

    console.log("  ✅ Prueba 3: Equilibrio Estático y Rozamiento Estático correctos.");
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Movimiento Dinámico Acelerado (Deslizamiento rampa abajo)
  try {
    // Rampa inclinada (60°), sin fricción para probar aceleración gravitacional pura (g = 10)
    engine.setParameters(5, 60, 0, 0, 10);

    // Como no hay fricción, el bloque debe deslizar con aceleración pura:
    // a = g * sin(theta) = 10 * sin(60°) = 10 * 0.866... = 8.66025... m/s^2
    const expectedAccel = 10 * Math.sin(60 * Math.PI / 180);
    assert.strictEqual(engine.isMoving, true);
    assert.ok(Math.abs(engine.acceleration - expectedAccel) < 1e-9);

    // Simular un avance de 2 segundos de forma controlada paso a paso
    // d = 0.5 * a * t^2 = 0.5 * 8.66025 * 4 = 17.3205... metros
    engine.reset();
    for (let i = 0; i < 20; i++) {
      engine.update(0.1);
    }

    const expectedDist = 0.5 * expectedAccel * Math.pow(2.0, 2);
    assert.ok(Math.abs(engine.distance - expectedDist) < 1e-9);
    assert.ok(Math.abs(engine.velocity - (expectedAccel * 2)) < 1e-9);

    console.log("  ✅ Prueba 4: Dinámica acelerada y fricción dinámica correctas.");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Evaluador del Diagrama de cuerpo libre (DCL)
  try {
    // Configurar plano de prueba a 30 grados
    // Normal Teórica: angle = 30 + 90 = 120°
    // Peso Teórico: angle = 270°
    // Fricción Teórica: angle = 30°
    engine.setParameters(5, 30, 0.5, 0.35, 10);

    const userForcesCorrect = {
      W: { angle: 270, magnitude: engine.W },
      N: { angle: 120, magnitude: engine.N },
      Ff: { angle: 30, magnitude: engine.Ff_real }
    };

    const evaluation = engine.evaluateDCL(userForcesCorrect);
    assert.strictEqual(evaluation.score, 100);
    assert.strictEqual(evaluation.W.status, 'correct');
    assert.strictEqual(evaluation.N.status, 'correct');
    assert.strictEqual(evaluation.Ff.status, 'correct');

    // Probar un DCL con un error angular de la Normal (ej. dibuja 90° en vez de 120°)
    const userForcesIncorrect = {
      W: { angle: 270, magnitude: engine.W },
      N: { angle: 90, magnitude: engine.N }, // 30 grados de desviación
      Ff: { angle: 30, magnitude: engine.Ff_real }
    };

    const evaluationBad = engine.evaluateDCL(userForcesIncorrect);
    assert.ok(evaluationBad.score < 100);
    assert.strictEqual(evaluationBad.N.status, 'incorrect');

    console.log("  ✅ Prueba 5: Módulo evaluador y validador de DCL correcto.");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas de plano inclinado y fuerzas han pasado exitosamente!");
}
