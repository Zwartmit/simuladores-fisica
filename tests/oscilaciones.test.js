/**
 * @fileoverview Pruebas unitarias del motor de Oscilaciones (PhysicsEngineOscilaciones):
 * período masa-resorte y péndulo (incluida la gran amplitud), amortiguamiento,
 * conservación de energía, estabilidad numérica y entradas límite.
 */

import { PhysicsEngineOscilaciones } from '../js/oscilaciones/physicsEngine.js';
import assert from 'assert';

const DT = 1 / 60;

function run(engine, seconds, dt = DT) {
  engine.isRunning = true;
  const steps = Math.round(seconds / dt);
  let maxEnergyDev = 0;
  const E0 = engine.getState().E;
  for (let i = 0; i < steps; i++) {
    engine.update(dt);
    if (E0 > 0) maxEnergyDev = Math.max(maxEnergyDev, Math.abs(engine.getState().E - E0) / E0);
  }
  return { maxEnergyDev };
}

const relErr = (a, b) => Math.abs(a - b) / Math.abs(b);

export function runOscilacionesTests() {
  console.log("⚡ Iniciando pruebas unitarias de oscilaciones mecánicas...");

  // PRUEBA 1: Masa-resorte — T = 2π√(m/k) medido con precisión y energía conservada
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setSpringParams(50, 2, 1, 0);
    const { maxEnergyDev } = run(engine, 20);
    const Tteo = 2 * Math.PI * Math.sqrt(2 / 50);
    assert.ok(engine.completedCycles >= 5);
    assert.ok(relErr(engine.period, Tteo) < 0.002, `T = ${engine.period.toFixed(5)} vs ${Tteo.toFixed(5)}`);
    assert.ok(maxEnergyDev < 1e-6, `desviación de E = ${maxEnergyDev}`);
    console.log("  ✅ Prueba 1: Masa-resorte — T = 2π√(m/k) y E conservada.");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Péndulo de ángulo pequeño — T ≈ 2π√(L/g)
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setPendulumParams(2, 1, 5, 0);
    run(engine, 20);
    assert.ok(relErr(engine.period, engine.getTheoreticalPeriod()) < 0.005,
      `T = ${engine.period.toFixed(4)} vs ${engine.getTheoreticalPeriod().toFixed(4)}`);
    console.log("  ✅ Prueba 2: Péndulo a 5° — T ≈ 2π√(L/g).");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: Péndulo de gran amplitud — T real > T₀ y coincide con el valor exacto (AGM)
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setPendulumParams(2, 1, 60, 0);
    const { maxEnergyDev } = run(engine, 30);
    const T0 = engine.getTheoreticalPeriod();
    assert.ok(engine.period > T0 * 1.05, 'A 60° el período debe superar claramente al de ángulos pequeños');
    assert.ok(relErr(engine.period, engine.getExpectedPeriod()) < 0.003,
      `T = ${engine.period.toFixed(4)} vs exacto ${engine.getExpectedPeriod().toFixed(4)}`);
    assert.ok(maxEnergyDev < 1e-5);
    console.log("  ✅ Prueba 3: Péndulo a 60° — T medido = período exacto (amplitud finita).");
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Amortiguamiento subcrítico — T_d analítico y energía siempre decreciente
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setSpringParams(50, 2, 1, 4); // ζ = 4/(2√100) = 0.2
    assert.ok(Math.abs(engine.getDampingRatio() - 0.2) < 1e-12);
    engine.isRunning = true;
    let lastE = engine.getState().E;
    for (let i = 0; i < 60 * 20; i++) {
      engine.update(DT);
      const E = engine.getState().E;
      assert.ok(E <= lastE + 1e-9, 'La energía no puede aumentar con amortiguamiento');
      lastE = E;
    }
    assert.ok(relErr(engine.period, engine.getExpectedPeriod()) < 0.003,
      `T = ${engine.period.toFixed(4)} vs T_d = ${engine.getExpectedPeriod().toFixed(4)}`);
    assert.ok(engine.period > engine.getTheoreticalPeriod());
    console.log("  ✅ Prueba 4: Amortiguamiento subcrítico — T_d y disipación de energía.");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Sobreamortiguamiento detectado — no completa ciclos
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setSpringParams(50, 2, 1, 40); // ζ = 2
    assert.strictEqual(engine.isOverdamped(), true);
    assert.strictEqual(engine.getExpectedPeriod(), Infinity);
    run(engine, 20);
    assert.strictEqual(engine.completedCycles, 0);

    engine.setSpringParams(50, 2, 1, 4);
    assert.strictEqual(engine.isOverdamped(), false);
    console.log("  ✅ Prueba 5: Régimen sobreamortiguado detectado y sin ciclos.");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  // PRUEBA 6: Un dt enorme (pestaña en segundo plano) no desestabiliza la integración
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setSpringParams(200, 0.5, 1, 0); // ω = 20 rad/s: sistema rígido
    const { maxEnergyDev } = run(engine, 200, 5);
    assert.ok(Number.isFinite(engine.q));
    assert.ok(maxEnergyDev < 1e-3, `desviación de E = ${maxEnergyDev}`);
    console.log("  ✅ Prueba 6: dt grande acotado y sub-pasos estables.");
  } catch (err) {
    console.error("  ❌ Prueba 6 fallida:", err.message);
    throw err;
  }

  // PRUEBA 7: Valores 0 y entradas inválidas se respetan / sanean (antes 0° → 30° y x₀ = 0 → 1 m)
  try {
    const engine = new PhysicsEngineOscilaciones();
    engine.setPendulumParams(2, 1, 0, 0);
    assert.strictEqual(engine.theta0, 0);
    engine.setSpringParams(50, 2, 0, 0);
    assert.strictEqual(engine.x0, 0);
    engine.setPendulumParams('x', NaN, undefined, 'abc');
    assert.ok(Number.isFinite(engine.theta0) && Number.isFinite(engine.L));
    run(engine, 2);
    assert.ok(Number.isFinite(engine.q));
    console.log("  ✅ Prueba 7: Ceros respetados y entradas inválidas saneadas.");
  } catch (err) {
    console.error("  ❌ Prueba 7 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas de oscilaciones han pasado exitosamente!");
}
