/**
 * @fileoverview Pruebas unitarias del motor de Dinámica rotacional (PhysicsEngineRotacion):
 * momentos de inercia, τ = I·α, fricción viscosa, impulso–momento angular y entradas límite.
 */

import { PhysicsEngineRotacion } from '../js/rotacion/physicsEngine.js';
import assert from 'assert';

const DT = 1 / 60;

function run(engine, seconds) {
  engine.isRunning = true;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) engine.update(DT);
}

const relErr = (a, b) => Math.abs(a - b) / Math.abs(b);

export function runRotacionTests() {
  console.log("⚡ Iniciando pruebas unitarias de dinámica rotacional...");

  // PRUEBA 1: Momentos de inercia de disco, aro y barra
  try {
    const engine = new PhysicsEngineRotacion();
    const B = PhysicsEngineRotacion.BODIES;
    engine.setParameters(4, 0.5, 10, 0, B.DISK);
    assert.ok(Math.abs(engine.I - 0.5 * 4 * 0.25) < 1e-12);
    engine.setParameters(4, 0.5, 10, 0, B.RING);
    assert.ok(Math.abs(engine.I - 4 * 0.25) < 1e-12);
    engine.setParameters(4, 0.5, 10, 0, B.ROD); // L = 2r = 1 m
    assert.ok(Math.abs(engine.I - (1 / 12) * 4 * 1) < 1e-12);
    console.log("  ✅ Prueba 1: Momentos de inercia (disco, aro, barra) correctos.");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Sin fricción, ω = (τ/I)·t y L = I·ω
  try {
    const engine = new PhysicsEngineRotacion();
    engine.setParameters(5, 1, 10, 0, PhysicsEngineRotacion.BODIES.DISK); // I = 2.5
    run(engine, 3);
    const s = engine.getState();
    assert.ok(relErr(s.omega, (10 / 2.5) * 3) < 1e-6, `ω = ${s.omega}`);
    assert.ok(Math.abs(s.alpha - 4) < 1e-9);
    assert.ok(relErr(s.L, 2.5 * s.omega) < 1e-12);
    console.log("  ✅ Prueba 2: τ = I·α, ω = α·t y L = I·ω sin fricción.");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: Con fricción viscosa, ω(t) sigue la solución analítica y tiende a τ/b
  try {
    const engine = new PhysicsEngineRotacion();
    engine.setParameters(5, 1, 10, 1, PhysicsEngineRotacion.BODIES.DISK);
    run(engine, 3);
    const s = engine.getState();
    assert.ok(relErr(s.omega, engine.getTheoreticalOmega(3)) < 1e-4,
      `ω = ${s.omega.toFixed(5)} vs ${engine.getTheoreticalOmega(3).toFixed(5)}`);
    run(engine, 30);
    assert.ok(relErr(engine.omega, engine.getSteadyStateOmega()) < 1e-3);
    console.log("  ✅ Prueba 3: Fricción viscosa — solución analítica y velocidad límite τ/b.");
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Impulso angular ∫τ_neto·dt = ΔL (con y sin fricción)
  try {
    for (const friction of [0, 1.5]) {
      const engine = new PhysicsEngineRotacion();
      engine.setParameters(5, 1, 10, friction, PhysicsEngineRotacion.BODIES.RING);
      run(engine, 4);
      const impulse = engine.getAngularImpulse();
      const L = engine.getState().L;
      assert.ok(relErr(impulse, L) < 0.005, `b=${friction}: ∫τdt = ${impulse.toFixed(4)} vs L = ${L.toFixed(4)}`);
    }
    console.log("  ✅ Prueba 4: Teorema impulso–momento angular (∫τ_neto·dt = ΔL).");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Torque = 0 es válido (antes se convertía en 10 N·m) y torque negativo gira al revés
  try {
    const engine = new PhysicsEngineRotacion();
    engine.setParameters(5, 1, 0, 0, PhysicsEngineRotacion.BODIES.DISK);
    assert.strictEqual(engine.torque, 0);
    run(engine, 2);
    assert.strictEqual(engine.omega, 0);

    engine.setParameters(5, 1, -10, 0, PhysicsEngineRotacion.BODIES.DISK);
    run(engine, 1);
    assert.ok(engine.omega < 0);
    console.log("  ✅ Prueba 5: Torque cero y negativo se respetan.");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  // PRUEBA 6: Entradas inválidas se sanitizan
  try {
    const engine = new PhysicsEngineRotacion();
    engine.setParameters('x', NaN, undefined, 'abc', 'inexistente');
    assert.ok(Number.isFinite(engine.I) && engine.I > 0);
    run(engine, 1);
    assert.ok(Number.isFinite(engine.omega));
    console.log("  ✅ Prueba 6: Sanitización de entradas.");
  } catch (err) {
    console.error("  ❌ Prueba 6 fallida:", err.message);
    throw err;
  }

  // PRUEBA 7: Cuerpos muy ligeros con fricción alta (caso permitido por los sliders) no divergen a NaN
  try {
    const B = PhysicsEngineRotacion.BODIES;
    for (const [m, r, tau, b, body] of [[0.5, 0.1, 10, 5, B.DISK], [0.5, 0.1, 10, 5, B.ROD], [0.5, 0.1, 50, 5, B.RING]]) {
      const engine = new PhysicsEngineRotacion();
      engine.setParameters(m, r, tau, b, body);
      run(engine, 3);
      assert.ok(Number.isFinite(engine.omega), `${body}: ω = ${engine.omega}`);
      assert.ok(relErr(engine.omega, engine.getTheoreticalOmega(engine.t)) < 1e-3,
        `${body}: ω = ${engine.omega} vs ${engine.getTheoreticalOmega(engine.t)}`);
    }
    console.log("  ✅ Prueba 7: Fricción alta con inercia pequeña es estable (sub-pasos).");
  } catch (err) {
    console.error("  ❌ Prueba 7 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas de dinámica rotacional han pasado exitosamente!");
}
