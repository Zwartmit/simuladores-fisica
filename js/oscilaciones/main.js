/**
 * @fileoverview Controlador principal — Oscilaciones mecánicas (MAS).
 * Orquesta motor físico, renderizador y UI con metodología de Polya.
 */

import { PhysicsEngineOscilaciones } from './physicsEngine.js';
import { CanvasRendererOscilaciones } from './canvasRenderer.js';
import { initPhaseTabs } from '../shared/phaseTabs.js';

// ─── Instancias globales ─────────────────────────────────────────────────────
const engine = new PhysicsEngineOscilaciones();
const canvas = document.getElementById('physics-canvas');
const renderer = new CanvasRendererOscilaciones(canvas);

let animFrameId = null;
let lastTimestamp = null;
let currentPhase = 1;
let currentSystem = PhysicsEngineOscilaciones.SYSTEMS.PENDULUM; // 'pendulum' o 'spring'
const SIM_SPEED = 1.0;

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const dom = {
  // Selector de Sistema
  btnSysPendulum: document.getElementById('btn-sys-pendulum'),
  btnSysSpring: document.getElementById('btn-sys-spring'),

  // Paneles de Parámetros Dinámicos (Fase 1 y 2)
  panelPendulumPhase1: document.getElementById('panel-pendulum-phase1'),
  panelSpringPhase1: document.getElementById('panel-spring-phase1'),
  panelPendulumPhase2: document.getElementById('panel-pendulum-phase2'),
  panelSpringPhase2: document.getElementById('panel-spring-phase2'),

  // Entradas Péndulo
  inputPL: document.getElementById('input-p-L'), valPL: document.getElementById('val-p-L'),
  inputPm: document.getElementById('input-p-m'), valPm: document.getElementById('val-p-m'),
  inputPTh: document.getElementById('input-p-th'), valPTh: document.getElementById('val-p-th'),
  inputPb: document.getElementById('input-p-b'), valPb: document.getElementById('val-p-b'),

  // Entradas Resorte
  inputSk: document.getElementById('input-s-k'), valSk: document.getElementById('val-s-k'),
  inputSm: document.getElementById('input-s-m'), valSm: document.getElementById('val-s-m'),
  inputSx: document.getElementById('input-s-x'), valSx: document.getElementById('val-s-x'),
  inputSb: document.getElementById('input-s-b'), valSb: document.getElementById('val-s-b'),

  // Quiz y Polya
  phase1Feedback: document.getElementById('phase1-feedback'),
  btnNextToPhase2: document.getElementById('btn-next-to-phase2'),
  quizOptions: document.querySelectorAll('.option-btn'),
  teoPeriodLabel: document.getElementById('teo-period-label'),
  inputPredPeriod: document.getElementById('input-pred-period'),
  valPredPeriod: document.getElementById('val-pred-period'),
  btnNextToPhase3: document.getElementById('btn-next-to-phase3'),
  btnBackToPhase1: document.getElementById('btn-back-to-phase1'),

  // Ejecución
  btnSimPlay: document.getElementById('btn-sim-play'),
  btnSimReset: document.getElementById('btn-sim-reset'),
  btnNextToPhase4: document.getElementById('btn-next-to-phase4'),
  btnBackToPhase2: document.getElementById('btn-back-to-phase2'),
  cyclesCount: document.getElementById('cycles-count'),

  // Revisión
  tablePredPeriod: document.getElementById('table-pred-period'),
  tableRealPeriod: document.getElementById('table-real-period'),
  badgePeriodError: document.getElementById('badge-period-error'),
  tutorFeedback: document.getElementById('tutor-feedback-text'),
  btnRestartLab: document.getElementById('btn-restart-lab'),

  // Telemetría
  telemetryQ: document.getElementById('telemetry-q'),
  telemetryV: document.getElementById('telemetry-v'),
  telemetryE: document.getElementById('telemetry-e'),
  telemetryT: document.getElementById('telemetry-t'),
  qLabel: document.getElementById('q-label'),
  vLabel: document.getElementById('v-label'),

  // Tabs
  tabs: [1, 2, 3, 4].map(i => document.getElementById(`tab-phase${i}`)),
  phases: [1, 2, 3, 4].map(i => document.getElementById(`phase${i}-container`)),
};

// ─── Lógica de UI ────────────────────────────────────────────────────────────

function showPhase(n) {
  currentPhase = n;
  dom.tabs.forEach((t, i) => {
    t.classList.toggle('active', i + 1 === n);
    t.classList.toggle('completed', i + 1 < n);
  });
  dom.phases.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
}

function switchSystem(sys) {
  currentSystem = sys;
  const isPendulum = (sys === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM);

  dom.btnSysPendulum.classList.toggle('active', isPendulum);
  dom.btnSysSpring.classList.toggle('active', !isPendulum);

  dom.panelPendulumPhase1.style.display = isPendulum ? 'block' : 'none';
  dom.panelSpringPhase1.style.display = !isPendulum ? 'block' : 'none';
  dom.panelPendulumPhase2.style.display = isPendulum ? 'block' : 'none';
  dom.panelSpringPhase2.style.display = !isPendulum ? 'block' : 'none';

  dom.qLabel.textContent = isPendulum ? 'Ángulo (θ)' : 'Posición (x)';
  dom.vLabel.textContent = isPendulum ? 'Vel. Angular (ω)' : 'Velocidad (v)';

  // Resetear quiz al cambiar de sistema
  dom.quizOptions.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
  dom.phase1Feedback.textContent = '';
  dom.btnNextToPhase2.disabled = true;

  // Cambiar pregunta del quiz según el sistema
  const questionEl = document.getElementById('dynamic-quiz-question');
  const opt1 = dom.quizOptions[0], opt2 = dom.quizOptions[1], opt3 = dom.quizOptions[2];

  if (isPendulum) {
    questionEl.textContent = 'En un péndulo simple, si aumentas la masa de la pesa al doble, ¿qué sucede con su período de oscilación?';
    opt1.textContent = 'Se reduce a la mitad'; opt1.dataset.correct = 'false';
    opt2.textContent = 'Aumenta al doble'; opt2.dataset.correct = 'false';
    opt3.textContent = 'Se mantiene igual'; opt3.dataset.correct = 'true';
  } else {
    questionEl.textContent = 'En un sistema masa-resorte, si aumentas la rigidez del resorte (k), ¿qué sucede con la frecuencia de oscilación?';
    opt1.textContent = 'Disminuye'; opt1.dataset.correct = 'false';
    opt2.textContent = 'Aumenta'; opt2.dataset.correct = 'true';
    opt3.textContent = 'Se mantiene igual'; opt3.dataset.correct = 'false';
  }

  applyParameters();
}

function applyParameters() {
  if (currentSystem === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
    engine.setPendulumParams(
      dom.inputPL.value, dom.inputPm.value, dom.inputPTh.value, dom.inputPb.value
    );
  } else {
    engine.setSpringParams(
      dom.inputSk.value, dom.inputSm.value, dom.inputSx.value, dom.inputSb.value
    );
  }

  const Tteo = engine.getTheoreticalPeriod();
  if (dom.teoPeriodLabel) {
    if (engine.isOverdamped()) {
      dom.teoPeriodLabel.textContent =
        `Amortiguamiento crítico o superior (ζ = ${engine.getDampingRatio().toFixed(2)} ≥ 1): el sistema vuelve al equilibrio sin oscilar.`;
    } else {
      dom.teoPeriodLabel.textContent = `T teórico (sin amortiguamiento) ≈ ${Tteo.toFixed(2)} s`;
    }
  }

  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

function updateTelemetry(state) {
  const isP = state.type === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM;
  const qUnit = isP ? 'rad' : 'm';
  const vUnit = isP ? 'rad/s' : 'm/s';

  if (dom.telemetryQ) dom.telemetryQ.textContent = `${state.q.toFixed(2)} ${qUnit}`;
  if (dom.telemetryV) dom.telemetryV.textContent = `${state.v.toFixed(2)} ${vUnit}`;
  if (dom.telemetryE) dom.telemetryE.textContent = `${state.E.toFixed(2)} J`;
  if (dom.telemetryT) dom.telemetryT.textContent = `${state.t.toFixed(1)} s`;
}

// ─── Bucle de Animación ──────────────────────────────────────────────────────
function animationLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dtReal = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  const steps = 4;
  const dt = dtReal * SIM_SPEED / steps;
  for (let i = 0; i < steps; i++) engine.update(dt);

  const state = engine.getState();
  renderer.draw(state, engine);
  updateTelemetry(state);

  if (dom.cyclesCount) dom.cyclesCount.textContent = state.cycles;

  // Se desbloquea tras 1 ciclo completo; un sistema sobreamortiguado nunca oscila,
  // así que se desbloquea cuando vuelve prácticamente al equilibrio.
  const initialAmplitude = Math.abs(
    engine.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM ? engine.theta0 : engine.x0
  );
  const settled = engine.isOverdamped() && Math.abs(state.q) < 0.02 * initialAmplitude;
  if (state.cycles >= 1 || settled) {
    dom.btnNextToPhase4.disabled = false;
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
  engine.isRunning = false;
  engine.reset();
  dom.btnSimPlay.textContent = 'Iniciar oscilación';
  dom.btnSimPlay.classList.remove('success');
  dom.btnNextToPhase4.disabled = true;
  if (dom.cyclesCount) dom.cyclesCount.textContent = '0';
  renderer.draw(engine.getState(), engine);
  updateTelemetry(engine.getState());
}

// ─── Fase 4: Revisión ────────────────────────────────────────────────────────
function populateReview() {
  const predicted = parseFloat(dom.inputPredPeriod.value);
  const realT = engine.period;
  const isP = engine.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM;
  const Tteo = engine.getTheoreticalPeriod();

  dom.tablePredPeriod.textContent = `${predicted.toFixed(2)} s`;
  dom.tableRealPeriod.textContent = realT > 0 ? `${realT.toFixed(2)} s` : `—`;

  const error = realT > 0 ? Math.abs((predicted - realT) / realT) * 100 : 0;
  dom.badgePeriodError.textContent = `${error.toFixed(1)}%`;
  dom.badgePeriodError.className = 'error-badge ' + (error < 10 ? 'low' : error < 30 ? 'medium' : 'high');

  let feedback = '';
  if (realT <= 0) {
    feedback = engine.isOverdamped()
      ? `Con ζ = ${engine.getDampingRatio().toFixed(2)} ≥ 1 el sistema está sobreamortiguado: regresa al equilibrio sin oscilar, por eso no hay período que medir. Reduce b para ver oscilaciones. `
      : 'Aún no se completó ningún ciclo, por lo que no hay período medido. ';
  } else if (error < 10) {
    feedback = `¡Excelente predicción! (${error.toFixed(1)}% de error). `;
  } else {
    feedback = `Predicción alejada (${error.toFixed(1)}% de error). La fórmula de libro da T = ${Tteo.toFixed(2)} s. `;
  }

  // Explicar por qué el período real puede apartarse de la fórmula de libro
  if (realT > 0 && Math.abs(realT - Tteo) / Tteo > 0.03) {
    if (isP && Math.abs(engine.theta0) > 0.26 && engine.b === 0) {
      feedback += `Ojo: con θ₀ = ${(engine.theta0 * 180 / Math.PI).toFixed(0)}° el período real (${realT.toFixed(2)} s) es mayor que 2π√(L/g) porque esa fórmula solo vale para ángulos pequeños (< 15°). `;
    } else if (engine.b > 0) {
      feedback += `El amortiguamiento alarga el período: T_d = T/√(1−ζ²) con ζ = ${engine.getDampingRatio().toFixed(2)}. `;
    }
  }

  if (engine.b > 0) {
    feedback += `Notarás que con amortiguamiento b=${engine.b}, la amplitud y energía (suma de cinética + potencial) decrecen con el tiempo debido a la disipación.`;
  } else {
    feedback += `Sin fricción (b=0), la energía mecánica total se conserva, transformándose cíclicamente entre cinética y potencial.`;
  }

  dom.tutorFeedback.textContent = feedback;
}

// ─── Listeners ────────────────────────────────────────────────────────────────

dom.btnSysPendulum.addEventListener('click', () => switchSystem(PhysicsEngineOscilaciones.SYSTEMS.PENDULUM));
dom.btnSysSpring.addEventListener('click', () => switchSystem(PhysicsEngineOscilaciones.SYSTEMS.SPRING));

// Bindear Sliders
const binds = [
  [dom.inputPL, dom.valPL, v => `${v} m`], [dom.inputPm, dom.valPm, v => `${v} kg`],
  [dom.inputPTh, dom.valPTh, v => `${v}°`], [dom.inputPb, dom.valPb, v => `${v}`],
  [dom.inputSk, dom.valSk, v => `${v} N/m`], [dom.inputSm, dom.valSm, v => `${v} kg`],
  [dom.inputSx, dom.valSx, v => `${v} m`], [dom.inputSb, dom.valSb, v => `${v}`]
];
binds.forEach(([inp, disp, fmt]) => {
  if (!inp) return;
  inp.addEventListener('input', () => { disp.textContent = fmt(inp.value); applyParameters(); });
});

dom.inputPredPeriod.addEventListener('input', () => {
  dom.valPredPeriod.textContent = `${dom.inputPredPeriod.value} s`;
});

// Quiz
dom.quizOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.quizOptions.forEach(b => b.classList.remove('selected', 'correct', 'incorrect'));
    const correct = btn.dataset.correct === 'true';
    btn.classList.add(correct ? 'correct' : 'incorrect');
    dom.btnNextToPhase2.disabled = !correct;

    if (currentSystem === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      dom.phase1Feedback.textContent = correct
        ? '¡Correcto! El período del péndulo T = 2π√(L/g) no depende de la masa, solo de su longitud L y gravedad.'
        : 'Incorrecto. Revisa la fórmula del período del péndulo.';
    } else {
      dom.phase1Feedback.textContent = correct
        ? '¡Correcto! Un resorte más rígido (mayor k) acelera la masa más rápido, reduciendo el período y aumentando la frecuencia (f = 1/T).'
        : 'Incorrecto. Revisa la fórmula T = 2π√(m/k).';
    }
    dom.phase1Feedback.style.color = correct ? 'var(--blue)' : 'var(--red)';
  });
});

// Navegación
dom.btnNextToPhase2.addEventListener('click', () => showPhase(2));
dom.btnBackToPhase1.addEventListener('click', () => showPhase(1));
dom.btnNextToPhase3.addEventListener('click', () => { applyParameters(); showPhase(3); resetSimulation(); });
dom.btnBackToPhase2.addEventListener('click', () => { engine.isRunning = false; showPhase(2); });
dom.btnNextToPhase4.addEventListener('click', () => { engine.isRunning = false; populateReview(); showPhase(4); });
dom.btnRestartLab.addEventListener('click', () => { resetSimulation(); showPhase(1); });

dom.btnSimPlay.addEventListener('click', startSimulation);
dom.btnSimReset.addEventListener('click', resetSimulation);

window.addEventListener('resize', () => {
  renderer._resize();
  renderer.draw(engine.getState(), engine);
});

// Init
switchSystem(PhysicsEngineOscilaciones.SYSTEMS.PENDULUM);
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
  getSystem: () => currentSystem,
};
