/**
 * @fileoverview Pruebas unitarias del motor de Gravitación (PhysicsEngineGravitacion):
 * órbitas ligadas para cualquier excentricidad, período medido vs Kepler III,
 * conservación de energía y momento angular.
 */

import { PhysicsEngineGravitacion } from '../js/gravitacion/physicsEngine.js';
import assert from 'assert';

const DT = 0.02;

/** Simula hasta completar `orbits` vueltas (o `maxTime`) y devuelve extremos y desviaciones. */
function runOrbits(engine, orbits, maxTime = 5000) {
  engine.isRunning = true;
  const E0 = engine.getState().E;
  const L0 = engine.x * engine.vy - engine.y * engine.vx;
  let maxR = 0;
  let maxEnergyDev = 0;
  let maxMomentumDev = 0;
  while (engine.completedOrbits < orbits && engine.t < maxTime) {
    engine.update(DT);
    const s = engine.getState();
    maxR = Math.max(maxR, s.r);
    maxEnergyDev = Math.max(maxEnergyDev, Math.abs((s.E - E0) / E0));
    const L = engine.x * engine.vy - engine.y * engine.vx;
    maxMomentumDev = Math.max(maxMomentumDev, Math.abs((L - L0) / L0));
  }
  return { maxR, maxEnergyDev, maxMomentumDev };
}

const relErr = (a, b) => Math.abs(a - b) / Math.abs(b);

export function runGravitacionTests() {
  console.log("⚡ Iniciando pruebas unitarias de gravitación y Kepler...");

  // PRUEBA 1: Órbita circular — la primera vuelta ya se cuenta y T coincide con Kepler III
  try {
    const engine = new PhysicsEngineGravitacion();
    engine.setParameters(1000, 1000, 150, 0);
    runOrbits(engine, 1);
    assert.strictEqual(engine.completedOrbits, 1, 'La primera vuelta debe contarse');
    const Tteo = engine.getTheoreticalPeriod(150);
    assert.ok(relErr(engine.period, Tteo) < 0.005, `T = ${engine.period.toFixed(4)} vs ${Tteo.toFixed(4)}`);
    console.log("  ✅ Prueba 1: Órbita circular — 1 vuelta contada y T = 2π√(a³/GM).");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Órbitas elípticas permanecen ligadas (antes e ≥ 0.34 escapaba al infinito)
  try {
    for (const ecc of [0.3, 0.5, 0.7, 0.85]) {
      const engine = new PhysicsEngineGravitacion();
      engine.setParameters(1000, 1000, 150, ecc);
      const { maxR } = runOrbits(engine, 1);
      assert.strictEqual(engine.completedOrbits, 1, `e=${ecc}: debe completar una órbita`);
      const apoTeo = 150 * (1 + ecc);
      assert.ok(relErr(maxR, apoTeo) < 0.01, `e=${ecc}: apoapsis ${maxR.toFixed(1)} vs ${apoTeo.toFixed(1)}`);
      assert.ok(relErr(engine.getState().periapsis, 150 * (1 - ecc)) < 0.01, `e=${ecc}: periapsis incorrecto`);
    }
    console.log("  ✅ Prueba 2: Órbitas elípticas ligadas con apsides a(1±e).");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: Kepler III — T depende de a, no de la excentricidad
  try {
    const periods = [];
    for (const ecc of [0, 0.4, 0.7]) {
      const engine = new PhysicsEngineGravitacion();
      engine.setParameters(1000, 1000, 150, ecc);
      runOrbits(engine, 1);
      periods.push(engine.period);
      const Tteo = engine.getTheoreticalPeriod(150);
      assert.ok(relErr(engine.period, Tteo) < 0.005, `e=${ecc}: T = ${engine.period.toFixed(4)} vs ${Tteo.toFixed(4)}`);
    }
    assert.ok(relErr(periods[2], periods[0]) < 0.01);
    console.log("  ✅ Prueba 3: El período no depende de la excentricidad (solo de a, G, M).");
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Constante a³/T² = GM/4π² medida en órbitas distintas
  try {
    for (const [G, M, a, ecc] of [[1000, 1000, 100, 0.2], [1000, 3000, 180, 0.5], [2000, 500, 220, 0.0]]) {
      const engine = new PhysicsEngineGravitacion();
      engine.setParameters(G, M, a, ecc);
      runOrbits(engine, 2);
      const measured = engine.getKeplerLog().map(e => e.ratio);
      const theoretical = engine.getTheoreticalKeplerConstant();
      measured.forEach(m => assert.ok(relErr(m, theoretical) < 0.02,
        `G=${G} M=${M} a=${a}: a³/T² = ${m.toFixed(1)} vs ${theoretical.toFixed(1)}`));
    }
    console.log("  ✅ Prueba 4: a³/T² medido coincide con GM/4π² en órbitas distintas.");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Conservación de energía y momento angular (órbita muy excéntrica)
  try {
    const engine = new PhysicsEngineGravitacion();
    engine.setParameters(1000, 1000, 150, 0.7);
    const { maxEnergyDev, maxMomentumDev } = runOrbits(engine, 3);
    assert.ok(maxEnergyDev < 1e-3, `desviación de E = ${(maxEnergyDev * 100).toFixed(4)}%`);
    assert.ok(maxMomentumDev < 1e-3, `desviación de L = ${(maxMomentumDev * 100).toFixed(4)}%`);
    console.log("  ✅ Prueba 5: Energía y momento angular conservados (Kepler II).");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  // PRUEBA 6: Entradas inválidas no producen NaN
  try {
    const engine = new PhysicsEngineGravitacion();
    engine.setParameters('x', undefined, NaN, 'abc');
    runOrbits(engine, 1);
    const s = engine.getState();
    assert.ok(Number.isFinite(s.E) && Number.isFinite(s.r));
    console.log("  ✅ Prueba 6: Sanitización de entradas.");
  } catch (err) {
    console.error("  ❌ Prueba 6 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas de gravitación han pasado exitosamente!");
}
