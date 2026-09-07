/**
 * @fileoverview Controlador principal — Gravitación universal y Leyes de Kepler.
 * Orquesta motor físico, renderizador y UI con metodología de Polya.
 */

import { PhysicsEngineGravitacion } from './physicsEngine.js';
import { CanvasRendererGravitacion } from './canvasRenderer.js';

// ─── Instancias globales ─────────────────────────────────────────────────────
const engine = new PhysicsEngineGravitacion();
const canvas = document.getElementById('physics-canvas');
const renderer = new CanvasRendererGravitacion(canvas);

let animFrameId = null;
let lastTimestamp = null;
let currentPhase = 1;
const SIM_SPEED = 0.8; // Factor de velocidad de simulación

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const dom = {
  // Fase 1 — Comprender
  inputG: document.getElementById('input-g'),
  valG: document.getElementById('val-g'),
  inputM: document.getElementById('input-m'),
  valM: document.getElementById('val-m'),
  phase1Feedback: document.getElementById('phase1-feedback'),
  btnNextToPhase2: document.getElementById('btn-next-to-phase2'),
  quizOptions: document.querySelectorAll('.option-btn'),

  // Fase 2 — Planear
  inputR0: document.getElementById('input-r0'),
  valR0: document.getElementById('val-r0'),
  inputEcc: document.getElementById('input-ecc'),
  valEcc: document.getElementById('val-ecc'),
  inputPredPeriod: document.getElementById('input-pred-period'),
  valPredPeriod: document.getElementById('val-pred-period'),
  teoKeplerLabel: document.getElementById('teo-kepler-label'),
  btnNextToPhase3: document.getElementById('btn-next-to-phase3'),
  btnBackToPhase1: document.getElementById('btn-back-to-phase1'),

  // Fase 3 — Ejecutar
  btnSimPlay: document.getElementById('btn-sim-play'),
  btnSimReset: document.getElementById('btn-sim-reset'),
  btnNextToPhase4: document.getElementById('btn-next-to-phase4'),
  btnBackToPhase2: document.getElementById('btn-back-to-phase2'),
  orbitsCount: document.getElementById('orbits-count'),

  // Fase 4 — Revisar
  tablePredPeriod: document.getElementById('table-pred-period'),
  tableRealPeriod: document.getElementById('table-real-period'),
  tableTeoK3: document.getElementById('table-teo-k3'),
  badgePeriodError: document.getElementById('badge-period-error'),
  keplerRatioCell: document.getElementById('kepler-ratio-cell'),
  keplerCheck: document.getElementById('kepler-check'),
  tutorFeedback: document.getElementById('tutor-feedback-text'),
  btnRestartLab: document.getElementById('btn-restart-lab'),

  // Telemetría
  telemetryR: document.getElementById('telemetry-r'),
  telemetryV: document.getElementById('telemetry-v'),
  telemetryT: document.getElementById('telemetry-t'),
  telemetryF: document.getElementById('telemetry-f'),
  telemetryE: document.getElementById('telemetry-e'),

  // Tabs
  tabs: [1, 2, 3, 4].map(i => document.getElementById(`tab-phase${i}`)),
  phases: [1, 2, 3, 4].map(i => document.getElementById(`phase${i}-container`)),
};

// ─── Navegación de fases ─────────────────────────────────────────────────────
function showPhase(n) {
  currentPhase = n;
  dom.tabs.forEach((t, i) => {
    t.classList.toggle('active', i + 1 === n);
    t.classList.toggle('completed', i + 1 < n);
  });
  dom.phases.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
}

// ─── Aplicar parámetros al motor ─────────────────────────────────────────────
function applyParameters() {
  const G = parseFloat(dom.inputG?.value ?? 1000);
  const M = parseFloat(dom.inputM?.value ?? 1000);
  const r0 = parseFloat(dom.inputR0?.value ?? 150);
  const ecc = parseFloat(dom.inputEcc?.value ?? 0);

  engine.setParameters(G, M, r0, ecc);

  // Actualizar etiqueta del período teórico en Fase 2
  const a = r0; // Para órbita circular a = r0
  const Tteo = engine.getTheoreticalPeriod(a);
  if (dom.teoKeplerLabel) {
    dom.teoKeplerLabel.textContent = `T teórico (circular) ≈ ${Tteo.toFixed(1)} s`;
  }

  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Telemetría ───────────────────────────────────────────────────────────────
function updateTelemetry(state) {
  if (dom.telemetryR) dom.telemetryR.textContent = `${state.r.toFixed(1)} u`;
  if (dom.telemetryV) dom.telemetryV.textContent = `${state.v.toFixed(2)} u/s`;
  if (dom.telemetryT) dom.telemetryT.textContent = `${state.t.toFixed(1)} s`;
  if (dom.telemetryF) dom.telemetryF.textContent = `${state.F.toFixed(2)} u`;
  if (dom.telemetryE) dom.telemetryE.textContent = `${state.E.toFixed(1)} J`;
}

// ─── Bucle de animación ───────────────────────────────────────────────────────
function animationLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dtReal = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  // Múltiples pasos por frame para velocidad de simulación
  const steps = 4;
  const dt = dtReal * SIM_SPEED / steps;
  for (let i = 0; i < steps; i++) engine.update(dt);

  const state = engine.getState();
  renderer.draw(state, engine);
  updateTelemetry(state);

  // Actualizar contador de órbitas
  if (dom.orbitsCount) dom.orbitsCount.textContent = engine.completedOrbits;

  // Desbloquear Fase 4 tras completar al menos 1 órbita
  if (engine.completedOrbits >= 1) {
    dom.btnNextToPhase4.disabled = false;
  }

  animFrameId = requestAnimationFrame(animationLoop);
}

function startSimulation() {
  if (engine.isRunning) {
    engine.isRunning = false;
    cancelAnimationFrame(animFrameId);
    lastTimestamp = null;
    dom.btnSimPlay.textContent = '▶ Continuar';
    dom.btnSimPlay.classList.remove('success');
  } else {
    engine.isRunning = true;
    lastTimestamp = null;
    dom.btnSimPlay.textContent = '⏸ Pausar';
    dom.btnSimPlay.classList.add('success');
    animFrameId = requestAnimationFrame(animationLoop);
  }
}

function resetSimulation() {
  cancelAnimationFrame(animFrameId);
  lastTimestamp = null;
  engine.isRunning = false;
  engine.reset();
  dom.btnSimPlay.textContent = '▶ Iniciar órbita';
  dom.btnSimPlay.classList.remove('success');
  dom.btnNextToPhase4.disabled = true;
  if (dom.orbitsCount) dom.orbitsCount.textContent = '0';
  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Fase 4: Revisión ────────────────────────────────────────────────────────
function populateReview() {
  const predicted = parseFloat(dom.inputPredPeriod?.value ?? 0);
  const realT = engine.period > 0 ? engine.period : (engine.keplerLog[0]?.T ?? 0);
  const a = engine.getState().a;
  const teoT = engine.getTheoreticalPeriod(a);

  if (dom.tablePredPeriod) dom.tablePredPeriod.textContent = `${predicted.toFixed(1)} s`;
  if (dom.tableRealPeriod) dom.tableRealPeriod.textContent = `${realT.toFixed(1)} s`;

  const predError = realT > 0 ? Math.abs((predicted - realT) / realT) * 100 : 0;
  if (dom.badgePeriodError) {
    dom.badgePeriodError.textContent = `${predError.toFixed(1)}%`;
    dom.badgePeriodError.className = 'error-badge ' +
      (predError < 10 ? 'low' : predError < 30 ? 'medium' : 'high');
  }

  // Kepler III: verificar T² ∝ a³
  const keplerLog = engine.getKeplerLog();
  if (keplerLog.length > 0 && dom.keplerRatioCell) {
    const avgRatio = keplerLog.reduce((s, e) => s + e.ratio, 0) / keplerLog.length;
    dom.keplerRatioCell.textContent = `${avgRatio.toFixed(2)}`;
  }
  if (dom.tableTeoK3) {
    const k3const = (a * a * a) / (teoT * teoT);
    dom.tableTeoK3.textContent = `${k3const.toFixed(2)}`;
  }

  // Verificación Kepler III
  if (dom.keplerCheck && keplerLog.length > 0) {
    const firstRatio = keplerLog[0].ratio;
    const lastRatio = keplerLog[keplerLog.length - 1].ratio;
    const variation = Math.abs(firstRatio - lastRatio) / (Math.abs(firstRatio) + 0.001) * 100;
    dom.keplerCheck.textContent = variation < 5
      ? `✅ a³/T² = constante (variación < ${variation.toFixed(1)}%). ¡Kepler III verificado!`
      : `📊 Variación del ${variation.toFixed(1)}% — espera más órbitas para mejor precisión.`;
    dom.keplerCheck.style.color = variation < 5 ? '#10b981' : '#f59e0b';
  }

  // Retroalimentación del tutor
  if (dom.tutorFeedback) {
    const fb = predError < 20
      ? `¡Excelente predicción! Tu estimación del período tuvo un error de solo ${predError.toFixed(1)}%. ` +
      `La Tercera Ley de Kepler (T² ∝ a³) se verifica con la constante a³/T² = ${(a * a * a) / (realT * realT + 0.001).toFixed(1)} (depende solo de G y M, no del planeta).`
      : `Tu estimación difirió un ${predError.toFixed(1)}% del período real (${realT.toFixed(1)} s). ` +
      `Usa T = 2π·√(a³/GM) = ${teoT.toFixed(1)} s para calcular el período exacto de una órbita circular con r = ${a.toFixed(0)} u.`;
    dom.tutorFeedback.textContent = fb;
  }
}

// ─── Listeners ────────────────────────────────────────────────────────────────

// Sliders Fase 1
[[dom.inputG, dom.valG, v => `${v}`],
[dom.inputM, dom.valM, v => `${v} M☉`]
].forEach(([inp, disp, fmt]) => {
  if (!inp) return;
  inp.addEventListener('input', () => { disp.textContent = fmt(inp.value); applyParameters(); });
});

// Sliders Fase 2
[[dom.inputR0, dom.valR0, v => `${v} u`],
[dom.inputEcc, dom.valEcc, v => `e = ${parseFloat(v).toFixed(2)}`],
].forEach(([inp, disp, fmt]) => {
  if (!inp) return;
  inp.addEventListener('input', () => { disp.textContent = fmt(inp.value); applyParameters(); });
});

if (dom.inputPredPeriod) {
  dom.inputPredPeriod.addEventListener('input', () => {
    dom.valPredPeriod.textContent = `${dom.inputPredPeriod.value} s`;
  });
}

// Quiz Fase 1
dom.quizOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.quizOptions.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
    const correct = btn.dataset.correct === 'true';
    btn.classList.add(correct ? 'correct' : 'incorrect');
    dom.phase1Feedback.textContent = correct
      ? '✅ ¡Correcto! La Tercera Ley de Kepler establece que T² ∝ a³, donde la constante de proporcionalidad depende solo de G y M (la masa central), no del planeta en órbita.'
      : '❌ Incorrecto. El período depende del semileje mayor a y de la masa central M, pero NO de la masa del planeta en órbita.';
    dom.phase1Feedback.style.color = correct ? '#10b981' : '#ef4444';
    dom.btnNextToPhase2.disabled = !correct;
  });
});

// Navegación
dom.btnNextToPhase2?.addEventListener('click', () => showPhase(2));
dom.btnBackToPhase1?.addEventListener('click', () => showPhase(1));
dom.btnNextToPhase3?.addEventListener('click', () => {
  applyParameters();
  showPhase(3);
  resetSimulation();
});
dom.btnBackToPhase2?.addEventListener('click', () => {
  cancelAnimationFrame(animFrameId);
  engine.isRunning = false;
  showPhase(2);
});
dom.btnNextToPhase4?.addEventListener('click', () => {
  engine.isRunning = false;
  cancelAnimationFrame(animFrameId);
  populateReview();
  showPhase(4);
});
dom.btnRestartLab?.addEventListener('click', () => {
  resetSimulation();
  showPhase(1);
  dom.quizOptions.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
  dom.phase1Feedback.textContent = '';
  dom.btnNextToPhase2.disabled = true;
});

dom.btnSimPlay?.addEventListener('click', startSimulation);
dom.btnSimReset?.addEventListener('click', resetSimulation);

window.addEventListener('resize', () => {
  renderer._resize();
  renderer.draw(engine.getState(), engine);
});

// ─── Init ────────────────────────────────────────────────────────────────────
applyParameters();
showPhase(1);
