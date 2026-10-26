/**
 * @fileoverview Controlador principal de la simulación de Conservación de la Energía.
 * Orquesta el motor físico, el renderizador Canvas y la interfaz de usuario con
 * la metodología de Polya (Comprender → Planear → Ejecutar → Revisar).
 */

import { PhysicsEngineEnergia } from './physicsEngine.js';
import { CanvasRendererEnergia } from './canvasRenderer.js';
import { initPhaseTabs } from '../shared/phaseTabs.js';

// ─── Instancias globales ────────────────────────────────────────────────────
const engine = new PhysicsEngineEnergia();
const canvas = document.getElementById('physics-canvas');
const renderer = new CanvasRendererEnergia(canvas);

let animFrameId = null;
let lastTimestamp = null;
let currentPhase = 1;
let peakKE = 0;   // Máxima energía cinética registrada durante la simulación

// ─── Referencias al DOM ─────────────────────────────────────────────────────
const dom = {
  // Fase 1 — Comprender
  inputMass: document.getElementById('input-mass'),
  valMass: document.getElementById('val-mass'),
  inputGravity: document.getElementById('input-gravity'),
  valGravity: document.getElementById('val-gravity'),
  inputHeight: document.getElementById('input-height'),
  valHeight: document.getElementById('val-height'),
  phase1Feedback: document.getElementById('phase1-feedback'),
  btnNextToPhase2: document.getElementById('btn-next-to-phase2'),
  quizOptions: document.querySelectorAll('.option-btn'),

  // Fase 2 — Planear
  inputPredictedKE: document.getElementById('input-predicted-ke'),
  valPredictedKE: document.getElementById('val-predicted-ke'),
  inputFriction: document.getElementById('input-friction'),
  valFriction: document.getElementById('val-friction'),
  btnNextToPhase3: document.getElementById('btn-next-to-phase3'),
  btnBackToPhase1: document.getElementById('btn-back-to-phase1'),

  // Fase 3 — Ejecutar
  btnSimPlay: document.getElementById('btn-sim-play'),
  btnSimReset: document.getElementById('btn-sim-reset'),
  btnNextToPhase4: document.getElementById('btn-next-to-phase4'),
  btnBackToPhase2: document.getElementById('btn-back-to-phase2'),

  // Fase 4 — Revisar
  tableKEReal: document.getElementById('table-ke-real'),
  tablePEReal: document.getElementById('table-pe-real'),
  tablePredKE: document.getElementById('table-pred-ke'),
  badgeKEError: document.getElementById('badge-ke-error'),
  conservationMsg: document.getElementById('conservation-msg'),
  tutorFeedback: document.getElementById('tutor-feedback-text'),
  btnRestartLab: document.getElementById('btn-restart-lab'),

  // Telemetría
  telemetryV: document.getElementById('telemetry-v'),
  telemetryKE: document.getElementById('telemetry-ke'),
  telemetryPE: document.getElementById('telemetry-pe'),
  telemetryH: document.getElementById('telemetry-h'),
  telemetryT: document.getElementById('telemetry-t'),

  // Tabs de Polya
  tabs: [1, 2, 3, 4].map(i => document.getElementById(`tab-phase${i}`)),
  phases: [1, 2, 3, 4].map(i => document.getElementById(`phase${i}-container`)),
};

// ─── Utilidades de navegación de fases ─────────────────────────────────────

function showPhase(n) {
  currentPhase = n;
  dom.tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i + 1 === n);
    tab.classList.toggle('completed', i + 1 < n);
  });
  dom.phases.forEach((ph, i) => {
    ph.classList.toggle('active', i + 1 === n);
  });
}

// ─── Configuración del motor desde los sliders ──────────────────────────────

function applyParameters() {
  const mass = parseFloat(dom.inputMass.value);
  const gravity = parseFloat(dom.inputGravity.value);
  const heightFrac = parseFloat(dom.inputHeight.value) / 100; // 0-100 → fracción
  const friction = parseFloat(dom.inputFriction?.value ?? 0);

  // El motor convierte la fracción en altura inicial (100% = cima de la pista, 2A)
  engine.setParameters(mass, friction, gravity, heightFrac);
  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Telemetría en tiempo real ───────────────────────────────────────────────

function updateTelemetry(state) {
  if (dom.telemetryV) dom.telemetryV.textContent = `${state.v.toFixed(2)} m/s`;
  if (dom.telemetryKE) dom.telemetryKE.textContent = `${state.KE.toFixed(1)} J`;
  if (dom.telemetryPE) dom.telemetryPE.textContent = `${state.PE.toFixed(1)} J`;
  if (dom.telemetryH) dom.telemetryH.textContent = `${state.h.toFixed(2)} m`;
  if (dom.telemetryT) dom.telemetryT.textContent = `${state.t.toFixed(2)} s`;
}

// ─── Bucle de animación ──────────────────────────────────────────────────────

function animationLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  engine.update(dt);
  const state = engine.getState();

  // Rastrear el pico máximo de energía cinética
  if (state.KE > peakKE) peakKE = state.KE;

  renderer.draw(state, engine);
  updateTelemetry(state);

  // Desbloquear "Ver Resultados" cuando el bloque pasa por el fondo (h < 0.2 m)
  if (state.h < engine.rampAmplitude * 0.1 && state.v > 0.5) {
    dom.btnNextToPhase4.disabled = false;
  }

  animFrameId = requestAnimationFrame(animationLoop);
}

function startSimulation() {
  if (engine.isRunning) {
    // Pausar
    engine.isRunning = false;
    cancelAnimationFrame(animFrameId);
    lastTimestamp = null;
    dom.btnSimPlay.textContent = 'Continuar Simulación';
    dom.btnSimPlay.classList.remove('success');
  } else {
    // Iniciar / Reanudar
    engine.isRunning = true;
    lastTimestamp = null;
    dom.btnSimPlay.textContent = 'Pausar Simulación';
    dom.btnSimPlay.classList.add('success');
    animFrameId = requestAnimationFrame(animationLoop);
  }
}

function resetSimulation() {
  cancelAnimationFrame(animFrameId);
  lastTimestamp = null;
  engine.isRunning = false;
  engine.reset();
  peakKE = 0;
  dom.btnSimPlay.textContent = 'Iniciar simulación';
  dom.btnSimPlay.classList.remove('success');
  dom.btnNextToPhase4.disabled = true;
  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Fase 4: Revisión ────────────────────────────────────────────────────────

function populateReview() {
  const state = engine.getState();
  const predicted = parseFloat(dom.inputPredictedKE.value);
  // Usar el pico de KE registrado durante la simulación (no el estado al pausar)
  const realKE = peakKE > 0 ? peakKE : state.KE;

  // Llenar tabla
  if (dom.tableKEReal) dom.tableKEReal.textContent = `${realKE.toFixed(2)} J`;
  if (dom.tablePEReal) dom.tablePEReal.textContent = `${state.PE.toFixed(2)} J`;
  if (dom.tablePredKE) dom.tablePredKE.textContent = `${predicted.toFixed(2)} J`;

  // Error relativo en KE
  const keError = realKE > 0
    ? Math.abs((predicted - realKE) / realKE) * 100
    : 0;

  if (dom.badgeKEError) {
    dom.badgeKEError.textContent = `${keError.toFixed(1)}%`;
    dom.badgeKEError.className = 'error-badge ' +
      (keError < 10 ? 'low' : keError < 30 ? 'medium' : 'high');
  }

  // Mensaje de conservación
  const friction = parseFloat(dom.inputFriction?.value ?? 0);
  const conserved = engine.isEnergyConserved();
  if (dom.conservationMsg) {
    if (friction === 0) {
      dom.conservationMsg.textContent = conserved
        ? 'La energía mecánica se conservó. Sistema conservativo perfecto.'
        : 'Pequeña discrepancia por error numérico del integrador.';
      dom.conservationMsg.style.color = conserved ? 'var(--blue)' : 'var(--ochre)';
    } else {
      const Q = state.Q.toFixed(1);
      dom.conservationMsg.textContent =
        `Se disiparon ${Q} J como calor por fricción (μ=${friction.toFixed(2)}). Energía total conservada con disipación.`;
      dom.conservationMsg.style.color = 'var(--ochre)';
    }
  }

  // Retroalimentación del tutor
  if (dom.tutorFeedback) {
    const feedback = keError < 15
      ? `¡Excelente predicción! Tu estimación de la energía cinética máxima fue de ${predicted.toFixed(1)} J y la real es ${realKE.toFixed(1)} J (error: ${keError.toFixed(1)}%). ` +
      `Esto confirma que comprendes cómo se transforma la energía potencial (U = mgh) en cinética (K = ½mv²).`
      : `Tu predicción (${predicted.toFixed(1)} J) difirió un ${keError.toFixed(1)}% de la energía cinética real (${realKE.toFixed(1)} J). ` +
      (friction === 0
        ? `Recuerda: sin fricción, E₀ = mgh₀ = ${engine._E0.toFixed(1)} J se convierte íntegramente en cinética al llegar al fondo.`
        : `Recuerda: con fricción, parte de E₀ = mgh₀ = ${engine._E0.toFixed(1)} J se disipa como calor en el camino, así que la cinética en el fondo es menor que E₀.`);
    dom.tutorFeedback.textContent = feedback;
  }
}

// ─── Listeners de la interfaz ────────────────────────────────────────────────

// Sliders de Fase 1
[
  [dom.inputMass, dom.valMass, v => `${v} kg`],
  [dom.inputGravity, dom.valGravity, v => `${v} m/s²`],
  [dom.inputHeight, dom.valHeight, v => `${v}% (${(v / 100 * 2 * engine.rampAmplitude).toFixed(1)} m)`],
].forEach(([input, display, fmt]) => {
  if (!input) return;
  input.addEventListener('input', () => {
    display.textContent = fmt(input.value);
    applyParameters();
  });
});

// Slider de fricción (Fase 2)
if (dom.inputFriction) {
  dom.inputFriction.addEventListener('input', () => {
    dom.valFriction.textContent = `μ = ${parseFloat(dom.inputFriction.value).toFixed(2)}`;
    applyParameters();
  });
}

// Predicción KE (Fase 2)
if (dom.inputPredictedKE) {
  dom.inputPredictedKE.addEventListener('input', () => {
    dom.valPredictedKE.textContent = `${dom.inputPredictedKE.value} J`;
  });
}

// Quiz de Fase 1
dom.quizOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.quizOptions.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
    const correct = btn.dataset.correct === 'true';
    btn.classList.add(correct ? 'correct' : 'incorrect');
    dom.phase1Feedback.textContent = correct
      ? '¡Correcto! La energía total del sistema se conserva (sin fricción). KE + PE = constante.'
      : 'Incorrecto. No es la velocidad — es la suma de energías (mecánica total) lo que se conserva.';
    dom.phase1Feedback.style.color = correct ? 'var(--blue)' : 'var(--red)';
    dom.btnNextToPhase2.disabled = !correct;
  });
});

// Navegación entre fases
dom.btnNextToPhase2?.addEventListener('click', () => showPhase(2));
dom.btnBackToPhase1?.addEventListener('click', () => showPhase(1));
dom.btnNextToPhase3?.addEventListener('click', () => {
  applyParameters(); // Re-aplicar con fricción elegida
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

// Controles de simulación
dom.btnSimPlay?.addEventListener('click', startSimulation);
dom.btnSimReset?.addEventListener('click', resetSimulation);

// Responsive canvas
window.addEventListener('resize', () => {
  renderer._resize();
  renderer.draw(engine.getState(), engine);
});

// ─── Arranque inicial ────────────────────────────────────────────────────────
dom.valHeight.textContent = `${dom.inputHeight.value}% (${(dom.inputHeight.value / 100 * 2 * engine.rampAmplitude).toFixed(1)} m)`;
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
