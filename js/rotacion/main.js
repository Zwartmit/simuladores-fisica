/**
 * @fileoverview Controlador principal — Dinámica rotacional.
 * Orquesta el motor físico, el renderizador y la UI con metodología de Polya.
 * Fases: Comprender → Planear → Ejecutar → Revisar.
 */

import { PhysicsEngineRotacion } from './physicsEngine.js';
import { CanvasRendererRotacion } from './canvasRenderer.js';
import { attachInstrument } from '../shared/instrument.js';
import { initPhaseTabs } from '../shared/phaseTabs.js';

// ─── Instancias globales ─────────────────────────────────────────────────────
const engine = new PhysicsEngineRotacion();
const canvas = document.getElementById('physics-canvas');
const renderer = new CanvasRendererRotacion(canvas);
attachInstrument(canvas, 'ROTACIÓN');

let animFrameId = null;
let lastTimestamp = null;
let currentPhase = 1;
let simTime = 0;   // Tiempo acumulado de simulación
let targetTime = 3;   // Tiempo en segundos para llegar a la Fase 4

// ─── Referencias al DOM ─────────────────────────────────────────────────────
const dom = {
  // Fase 1 — Comprender
  inputMass: document.getElementById('input-mass'),
  valMass: document.getElementById('val-mass'),
  inputRadius: document.getElementById('input-radius'),
  valRadius: document.getElementById('val-radius'),
  bodyBtns: document.querySelectorAll('.body-btn'),
  phase1Feedback: document.getElementById('phase1-feedback'),
  btnNextToPhase2: document.getElementById('btn-next-to-phase2'),
  quizOptions: document.querySelectorAll('.option-btn'),

  // Fase 2 — Planear
  inputTorque: document.getElementById('input-torque'),
  valTorque: document.getElementById('val-torque'),
  inputFriction: document.getElementById('input-friction'),
  valFriction: document.getElementById('val-friction'),
  inputSimTime: document.getElementById('input-sim-time'),
  valSimTime: document.getElementById('val-sim-time'),
  inputPredictedOmega: document.getElementById('input-predicted-omega'),
  valPredictedOmega: document.getElementById('val-predicted-omega'),
  btnNextToPhase3: document.getElementById('btn-next-to-phase3'),
  btnBackToPhase1: document.getElementById('btn-back-to-phase1'),

  // Fase 3 — Ejecutar
  btnSimPlay: document.getElementById('btn-sim-play'),
  btnSimReset: document.getElementById('btn-sim-reset'),
  btnNextToPhase4: document.getElementById('btn-next-to-phase4'),
  btnBackToPhase2: document.getElementById('btn-back-to-phase2'),
  timeProgress: document.getElementById('time-progress'),
  timeLabel: document.getElementById('time-label'),

  // Fase 4 — Revisar
  tableIOmega: document.getElementById('table-i'),
  tableRealOmega: document.getElementById('table-real-omega'),
  tablePredOmega: document.getElementById('table-pred-omega'),
  tableTeoOmega: document.getElementById('table-teo-omega'),
  badgeOmegaError: document.getElementById('badge-omega-error'),
  tableL: document.getElementById('table-l'),
  newtonCheck: document.getElementById('newton-check'),
  tutorFeedback: document.getElementById('tutor-feedback-text'),
  btnRestartLab: document.getElementById('btn-restart-lab'),

  // Telemetría
  telemetryOmega: document.getElementById('telemetry-omega'),
  telemetryAlpha: document.getElementById('telemetry-alpha'),
  telemetryL: document.getElementById('telemetry-l'),
  telemetryI: document.getElementById('telemetry-i'),
  telemetryT: document.getElementById('telemetry-t'),

  // Tabs
  tabs: [1, 2, 3, 4].map(i => document.getElementById(`tab-phase${i}`)),
  phases: [1, 2, 3, 4].map(i => document.getElementById(`phase${i}-container`)),
};

// ─── Navegación de fases ─────────────────────────────────────────────────────

function showPhase(n) {
  currentPhase = n;
  dom.tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i + 1 === n);
    tab.classList.toggle('completed', i + 1 < n);
  });
  dom.phases.forEach((ph, i) => ph.classList.toggle('active', i + 1 === n));
}

// ─── Tipo de cuerpo ──────────────────────────────────────────────────────────

let selectedBody = 'disk';

dom.bodyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.bodyBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedBody = btn.dataset.body;
    applyParameters();
  });
});

// ─── Aplicar parámetros al motor ─────────────────────────────────────────────

function applyParameters() {
  const mass = parseFloat(dom.inputMass?.value ?? 5);
  const radius = parseFloat(dom.inputRadius?.value ?? 1);
  const torque = parseFloat(dom.inputTorque?.value ?? 10);
  const friction = parseFloat(dom.inputFriction?.value ?? 0);
  targetTime = parseFloat(dom.inputSimTime?.value ?? 3);

  engine.setParameters(mass, radius, torque, friction, selectedBody);
  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Telemetría ───────────────────────────────────────────────────────────────

function updateTelemetry(state) {
  if (dom.telemetryOmega) dom.telemetryOmega.textContent = `${state.omega.toFixed(3)} rad/s`;
  if (dom.telemetryAlpha) dom.telemetryAlpha.textContent = `${state.alpha.toFixed(3)} rad/s²`;
  if (dom.telemetryL) dom.telemetryL.textContent = `${state.L.toFixed(3)} kg·m²/s`;
  if (dom.telemetryI) dom.telemetryI.textContent = `${state.I.toFixed(4)} kg·m²`;
  if (dom.telemetryT) dom.telemetryT.textContent = `${state.t.toFixed(2)} s`;
}

// ─── Barra de progreso de tiempo ─────────────────────────────────────────────

function updateTimeProgress(t) {
  const pct = Math.min((t / targetTime) * 100, 100);
  if (dom.timeProgress) dom.timeProgress.style.width = `${pct}%`;
  if (dom.timeLabel) dom.timeLabel.textContent = `${t.toFixed(2)} / ${targetTime.toFixed(0)} s`;
}

// ─── Bucle de animación ───────────────────────────────────────────────────────

function animationLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  engine.update(dt);
  const state = engine.getState();
  simTime = state.t;

  renderer.draw(state, engine);
  updateTelemetry(state);
  updateTimeProgress(simTime);

  // Desbloquear fase 4 cuando se alcanza el tiempo objetivo
  if (simTime >= targetTime) {
    engine.isRunning = false;
    cancelAnimationFrame(animFrameId);
    dom.btnSimPlay.textContent = 'Iniciar simulación';
    dom.btnSimPlay.classList.remove('success');
    dom.btnNextToPhase4.disabled = false;
    return;
  }

  animFrameId = requestAnimationFrame(animationLoop);
}

function startSimulation() {
  if (engine.isRunning) {
    engine.isRunning = false;
    cancelAnimationFrame(animFrameId);
    lastTimestamp = null;
    dom.btnSimPlay.textContent = 'Continuar';
    dom.btnSimPlay.classList.remove('success');
  } else {
    if (simTime >= targetTime) return;
    engine.isRunning = true;
    lastTimestamp = null;
    dom.btnSimPlay.textContent = 'Pausar';
    dom.btnSimPlay.classList.add('success');
    animFrameId = requestAnimationFrame(animationLoop);
  }
}

function resetSimulation() {
  cancelAnimationFrame(animFrameId);
  lastTimestamp = null;
  simTime = 0;
  engine.isRunning = false;
  engine.reset();
  dom.btnSimPlay.textContent = 'Iniciar simulación';
  dom.btnSimPlay.classList.remove('success');
  dom.btnNextToPhase4.disabled = true;
  updateTimeProgress(0);
  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Fase 4: Revisión ────────────────────────────────────────────────────────

function populateReview() {
  const state = engine.getState();
  const predicted = parseFloat(dom.inputPredictedOmega?.value ?? 0);
  const teoOmega = engine.getTheoreticalOmega(simTime);

  if (dom.tableIOmega) dom.tableIOmega.textContent = `${state.I.toFixed(4)} kg·m²`;
  if (dom.tableRealOmega) dom.tableRealOmega.textContent = `${state.omega.toFixed(3)} rad/s`;
  if (dom.tablePredOmega) dom.tablePredOmega.textContent = `${predicted.toFixed(3)} rad/s`;
  if (dom.tableTeoOmega) dom.tableTeoOmega.textContent = `${teoOmega.toFixed(3)} rad/s`;
  if (dom.tableL) dom.tableL.textContent = `${state.L.toFixed(3)} kg·m²/s`;

  // Error de predicción
  const realOmega = state.omega;
  const predError = realOmega !== 0
    ? Math.abs((predicted - realOmega) / realOmega) * 100 : 0;

  if (dom.badgeOmegaError) {
    dom.badgeOmegaError.textContent = `${predError.toFixed(1)}%`;
    dom.badgeOmegaError.className = 'error-badge ' +
      (predError < 10 ? 'low' : predError < 30 ? 'medium' : 'high');
  }

  // Verificación de la 2ª Ley rotacional con el torque NETO (τ_neto = τ_aplicado − b·ω):
  //  (a) τ_neto = I·α en el instante final, y
  //  (b) impulso–momento angular: ∫τ_neto·dt = ΔL = I·ω (comprobación independiente del integrador).
  const tauNet = state.tau;
  const I_alpha = state.I * state.alpha;
  const impulse = engine.getAngularImpulse();
  const tol = (a, b) => Math.abs(a - b) <= 0.02 * Math.max(Math.abs(a), Math.abs(b), 0.01);
  const newtonOk = tol(tauNet, I_alpha) && tol(impulse, state.L);
  if (dom.newtonCheck) {
    dom.newtonCheck.textContent = newtonOk
      ? `τ_neto = I·α se cumple (${tauNet.toFixed(2)} ≈ ${I_alpha.toFixed(2)} N·m) y ∫τ_neto·dt = ΔL (${impulse.toFixed(2)} ≈ ${state.L.toFixed(2)} kg·m²/s)`
      : `Discrepancia: τ_neto=${tauNet.toFixed(2)} vs I·α=${I_alpha.toFixed(2)} N·m; ∫τ_neto·dt=${impulse.toFixed(2)} vs ΔL=${state.L.toFixed(2)}`;
    dom.newtonCheck.style.color = newtonOk ? 'var(--blue)' : 'var(--ochre)';
  }

  // Retroalimentación del tutor
  if (dom.tutorFeedback) {
    const alpha0 = engine.torque / state.I;
    const hint = engine.friction === 0
      ? `α = τ/I = ${alpha0.toFixed(2)} rad/s², por tanto ω(${simTime.toFixed(0)} s) = α·t = ${teoOmega.toFixed(2)} rad/s.`
      : `Con fricción viscosa b = ${engine.friction.toFixed(1)}, α₀ = τ/I = ${alpha0.toFixed(2)} rad/s² solo al inicio; luego baja y ω(t) = (τ/b)(1 − e^(−b·t/I)) = ${teoOmega.toFixed(2)} rad/s a los ${simTime.toFixed(0)} s (límite τ/b = ${engine.getSteadyStateOmega().toFixed(2)} rad/s).`;
    const fb = predError < 15
      ? `¡Predicción excelente! Tu estimación de ω tuvo un error de solo ${predError.toFixed(1)}%. ` +
      `Esto confirma que dominas la relación τ = I·α: a mayor torque o menor inercia, mayor aceleración angular.`
      : `Tu predicción difirió un ${predError.toFixed(1)}% del valor real (${realOmega.toFixed(2)} rad/s). Recuerda: ${hint}`;
    dom.tutorFeedback.textContent = fb;
  }
}

// ─── Listeners ───────────────────────────────────────────────────────────────

// Sliders Fase 1
[[dom.inputMass, dom.valMass, v => `${v} kg`],
[dom.inputRadius, dom.valRadius, v => `${v} m`]
].forEach(([inp, disp, fmt]) => {
  if (!inp) return;
  inp.addEventListener('input', () => { disp.textContent = fmt(inp.value); applyParameters(); });
});

// Sliders Fase 2
[[dom.inputTorque, dom.valTorque, v => `${v} N·m`],
[dom.inputFriction, dom.valFriction, v => `μ = ${parseFloat(v).toFixed(2)}`],
[dom.inputSimTime, dom.valSimTime, v => `${v} s`],
].forEach(([inp, disp, fmt]) => {
  if (!inp) return;
  inp.addEventListener('input', () => { disp.textContent = fmt(inp.value); applyParameters(); });
});

if (dom.inputPredictedOmega) {
  dom.inputPredictedOmega.addEventListener('input', () => {
    dom.valPredictedOmega.textContent = `${dom.inputPredictedOmega.value} rad/s`;
  });
}

// Quiz Fase 1
dom.quizOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.quizOptions.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
    const correct = btn.dataset.correct === 'true';
    btn.classList.add(correct ? 'correct' : 'incorrect');
    dom.phase1Feedback.textContent = correct
      ? '¡Correcto! La aceleración angular α = τ/I. El momento de inercia I determina "qué tan difícil es hacer girar" el cuerpo.'
      : 'Incorrecto. La aceleración angular no depende directamente de la masa sola, sino del momento de inercia I, que también depende de cómo se distribuye esa masa.';
    dom.phase1Feedback.style.color = correct ? 'var(--blue)' : 'var(--red)';
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

// Controles simulación
dom.btnSimPlay?.addEventListener('click', startSimulation);
dom.btnSimReset?.addEventListener('click', resetSimulation);

// Responsive
window.addEventListener('resize', () => {
  renderer._resize();
  renderer.draw(engine.getState(), engine);
});

// ─── Init ────────────────────────────────────────────────────────────────────
applyParameters();
showPhase(1);

// Pestañas de fase accesibles (clic, teclado y lectores de pantalla); solo se vuelve a fases ya alcanzadas
initPhaseTabs({
  tabs: dom.tabs,
  panels: dom.phases,
  goTo: (phase) => {
    cancelAnimationFrame(animFrameId);
    engine.isRunning = false;
    showPhase(phase);
  },
});

// Estado expuesto para pruebas y auditoría en el navegador (ver docs/conventions.md)
window.currentSimulation = {
  engine,
  renderer,
  isRunning: () => engine.isRunning,
  getPhase: () => currentPhase,
};
