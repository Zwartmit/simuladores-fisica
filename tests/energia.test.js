/**
 * @fileoverview Pruebas unitarias del motor de Conservación de la Energía (PhysicsEngineEnergia).
 * Verifican que la energía se conserve de forma real (sin forzarla), que la altura inicial
 * corresponda al slider y que la fricción disipe energía en forma de calor.
 */

import { PhysicsEngineEnergia } from '../js/energia/physicsEngine.js';
import assert from 'assert';

const DT = 1 / 60;

/** Ejecuta la simulación y devuelve el pico de K, la máxima desviación de E y el estado final. */
function runSimulation(engine, seconds) {
  engine.isRunning = true;
  let peakKE = 0;
  let maxDeviation = 0;
  let maxHeightAfterBottom = 0;
  let crossedBottom = false;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    engine.update(DT);
    const s = engine.getState();
    peakKE = Math.max(peakKE, s.KE);
    maxDeviation = Math.max(maxDeviation, Math.abs(s.E - engine._E0) / engine._E0);
    if (s.x < 0) crossedBottom = true;
    if (crossedBottom) maxHeightAfterBottom = Math.max(maxHeightAfterBottom, s.h);
  }
  return { peakKE, maxDeviation, maxHeightAfterBottom, crossedBottom, final: engine.getState() };
}

export function runEnergiaTests() {
  console.log("⚡ Iniciando pruebas unitarias de conservación de la energía...");

  // PRUEBA 1: La altura inicial corresponde a la fracción del slider (80% → 6.4 m)
  try {
    const engine = new PhysicsEngineEnergia();
    engine.setParameters(5, 0, 9.81, 0.8);
    const s = engine.getState();
    assert.ok(Math.abs(s.h - 6.4) < 1e-9, `h inicial = ${s.h}`);
    assert.ok(Math.abs(engine._E0 - 5 * 9.81 * 6.4) < 1e-9);

    // A mayor fracción de altura, mayor energía inicial (el slider no está invertido)
    engine.setParameters(5, 0, 9.81, 0.4);
    const lowE0 = engine._E0;
    engine.setParameters(5, 0, 9.81, 0.95);
    assert.ok(engine._E0 > lowE0);
    console.log("  ✅ Prueba 1: Altura inicial coherente con el slider (sin inversión).");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Sin fricción, K + U se conserva y K_max = m·g·h₀
  try {
    const engine = new PhysicsEngineEnergia();
    engine.setParameters(5, 0, 9.81, 0.8);
    const r = runSimulation(engine, 20);
    assert.ok(r.maxDeviation < 0.005, `desviación máx de E = ${(r.maxDeviation * 100).toFixed(3)}%`);
    assert.ok(Math.abs(r.peakKE - engine._E0) / engine._E0 < 0.01,
      `K_max = ${r.peakKE.toFixed(2)} J vs E₀ = ${engine._E0.toFixed(2)} J`);
    assert.ok(r.final.Q < 1e-9, 'Sin fricción no debe generarse calor');
    assert.strictEqual(engine.isEnergyConserved(), true);
    console.log("  ✅ Prueba 2: Conservación de K + U (μ = 0) y K_max = mgh₀.");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: El bloque cruza el fondo y sube al otro lado hasta ≈ la altura inicial
  try {
    const engine = new PhysicsEngineEnergia();
    engine.setParameters(5, 0, 9.81, 0.8);
    const r = runSimulation(engine, 10);
    assert.strictEqual(r.crossedBottom, true, 'El bloque debe cruzar al lado izquierdo');
    assert.ok(Math.abs(r.maxHeightAfterBottom - 6.4) < 0.1, `h máx del otro lado = ${r.maxHeightAfterBottom.toFixed(3)} m`);
    console.log("  ✅ Prueba 3: El bloque atraviesa el fondo y alcanza la altura simétrica.");
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Con fricción, Q (trabajo de la fricción) crece, K_max < E₀ y E total se conserva
  try {
    const engine = new PhysicsEngineEnergia();
    engine.setParameters(5, 0.2, 9.81, 0.8);
    engine.isRunning = true;
    let lastQ = 0;
    let maxDeviation = 0;
    let peakKE = 0;
    for (let i = 0; i < 60 * 15; i++) {
      engine.update(DT);
      const s = engine.getState();
      assert.ok(s.Q >= lastQ - 1e-9, 'Q nunca debe decrecer');
      lastQ = s.Q;
      peakKE = Math.max(peakKE, s.KE);
      maxDeviation = Math.max(maxDeviation, Math.abs(s.E - engine._E0) / engine._E0);
    }
    assert.ok(lastQ > 0);
    assert.ok(peakKE < engine._E0 * 0.99, 'La fricción debe reducir la K máxima');
    assert.ok(maxDeviation < 0.01, `desviación máx de K+U+Q = ${(maxDeviation * 100).toFixed(3)}%`);
    console.log("  ✅ Prueba 4: Fricción disipa energía como calor y K + U + Q = E₀.");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Con fricción el bloque termina en reposo y toda la energía inicial es calor + U
  try {
    const engine = new PhysicsEngineEnergia();
    engine.setParameters(5, 0.3, 9.81, 0.8);
    runSimulation(engine, 120);
    const s = engine.getState();
    assert.strictEqual(engine.isAtRest, true, 'El bloque debe detenerse');
    assert.strictEqual(s.KE, 0);
    assert.ok(Math.abs(s.PE + s.Q - engine._E0) / engine._E0 < 0.01);
    console.log("  ✅ Prueba 5: Con fricción el bloque se detiene y E₀ = U + Q.");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  // PRUEBA 6: Parámetros inválidos nunca producen NaN y μ = 0 se respeta
  try {
    const engine = new PhysicsEngineEnergia();
    engine.setParameters('abc', 'x', undefined, NaN);
    assert.ok(Number.isFinite(engine.getState().h));
    assert.ok(Number.isFinite(engine._E0));
    engine.setParameters(5, 0, 9.81, 0.8);
    assert.strictEqual(engine.friction, 0);
    const r = runSimulation(engine, 5);
    assert.ok(Number.isFinite(r.final.E));
    console.log("  ✅ Prueba 6: Sanitización de entradas y μ = 0 válido.");
  } catch (err) {
    console.error("  ❌ Prueba 6 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas de conservación de la energía han pasado exitosamente!");
}
