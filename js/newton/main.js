/**
 * @fileoverview Controlador del laboratorio de Leyes de Newton y Plano Inclinado.
 * Coordina las fases didácticas de George Polya, el DCL interactivo paramétrico,
 * el loop de simulación del bloque deslizante y los diagnósticos en pantalla.
 */

import { PhysicsEngineNewton } from './physicsEngine.js';
import { CanvasRendererNewton } from './canvasRenderer.js';
import { initPhaseTabs } from '../shared/phaseTabs.js';

// Instanciar motores principales
const engine = new PhysicsEngineNewton();
let renderer;

// Control de animación
let animationFrameId = null;
let lastTime = 0;
let isPlaying = false;

// Estado del DCL interactivo del alumno
let userForces = {
  W: { angle: 180, magnitude: 25 },
  N: { angle: 45, magnitude: 25 },
  Ff: { angle: 0, magnitude: 25 }
};

// Elementos del DOM
const canvas = document.getElementById('physics-canvas');
const telemetryG = document.getElementById('telemetry-g');
const telemetryW = document.getElementById('telemetry-w');
const telemetryN = document.getElementById('telemetry-n');
const telemetryFf = document.getElementById('telemetry-ff');
const telemetryA = document.getElementById('telemetry-a');
const telemetryV = document.getElementById('telemetry-v');
const telemetryStatus = document.getElementById('telemetry-status');

// Sliders de Fase 1 (Plano Inclinado)
const inputAngle = document.getElementById('input-angle');
const inputMass = document.getElementById('input-mass');
const inputMus = document.getElementById('input-mus');
const inputMuk = document.getElementById('input-muk');
const inputGravity = document.getElementById('input-gravity');
const valAngle = document.getElementById('val-angle');
const valMass = document.getElementById('val-mass');
const valMus = document.getElementById('val-mus');
const valMuk = document.getElementById('val-muk');
const valGravity = document.getElementById('val-gravity');

// Elementos del Cuestionario F1
const optionButtons = document.querySelectorAll('.option-btn');
const phase1Feedback = document.getElementById('phase1-feedback');
const btnNextToPhase2 = document.getElementById('btn-next-to-phase2');

// Sliders del DCL (Fase 2)
const dclWAng = document.getElementById('dcl-w-ang');
const dclWMag = document.getElementById('dcl-w-mag');
const valDclWAng = document.getElementById('val-dcl-w-ang');
const valDclWMag = document.getElementById('val-dcl-w-mag');

const dclNAng = document.getElementById('dcl-n-ang');
const dclNMag = document.getElementById('dcl-n-mag');
const valDclNAng = document.getElementById('val-dcl-n-ang');
const valDclNMag = document.getElementById('val-dcl-n-mag');

const dclFFAng = document.getElementById('dcl-ff-ang');
const dclFFMag = document.getElementById('dcl-ff-mag');
const valDclFFAng = document.getElementById('val-dcl-ff-ang');
const valDclFFMag = document.getElementById('val-dcl-ff-mag');

const btnNextToPhase3 = document.getElementById('btn-next-to-phase3');
const btnBackToPhase1 = document.getElementById('btn-back-to-phase1');

// Botones de Fase 3
const btnSimPlay = document.getElementById('btn-sim-play');
const btnSimReset = document.getElementById('btn-sim-reset');
const btnNextToPhase4 = document.getElementById('btn-next-to-phase4');
const btnBackToPhase2 = document.getElementById('btn-back-to-phase2');

// Elementos de Fase 4 (Revisión)
const resWAng = document.getElementById('res-w-ang');
const resWAngTeo = document.getElementById('res-w-ang-teo');
const resWMagErr = document.getElementById('res-w-mag-err');

const resNAng = document.getElementById('res-n-ang');
const resNAngTeo = document.getElementById('res-n-ang-teo');
const resNMagErr = document.getElementById('res-n-mag-err');

const resFFAng = document.getElementById('res-ff-ang');
const resFFAngTeo = document.getElementById('res-ff-ang-teo');
const resFFMagErr = document.getElementById('res-ff-mag-err');

const valDclScore = document.getElementById('val-dcl-score');
const tutorFeedbackText = document.getElementById('tutor-feedback-text');
const btnRestartLab = document.getElementById('btn-restart-lab');

// Pestañas
const stepTabs = document.querySelectorAll('.step-tab');
const phaseContainers = document.querySelectorAll('.polya-phase-container');

/**
 * Inicializa el simulador y los eventos.
 */
function init() {
  renderer = new CanvasRendererNewton(canvas);

  window.addEventListener('resize', () => {
    renderer.resize();
    renderScene();
  });

  setupEventsF1();
  setupEventsF2();
  setupEventsF3();
  setupEventsF4();
  setupTabs();

  // Forzar sincronización inicial
  syncEngineParameters();
  syncDCLSliders();
  renderScene();

  // Exponer estado global para testing de la IA
  window.newtonSimulation = {
    engine,
    renderer,
    isPlaying: () => isPlaying,
    isRunning: () => isPlaying,
    getPhase: () => getCurrentPhase(),
    getUserForces: () => userForces
  };
  // Nombre común a todos los simuladores (ver docs/conventions.md)
  window.currentSimulation = window.newtonSimulation;
}

/**
 * Redibuja el lienzo.
 */
function renderScene() {
  renderer.fitView(engine.angleDeg, engine.maxRampLength);
  renderer.clear();
  renderer.drawGrid();
  renderer.drawRamp(engine.angleDeg, engine.maxRampLength);

  // Dibujar bloque en su posición actual y obtener el centro de masa
  const centerOfMass = renderer.drawBlock(engine.distance, engine.angleDeg, engine.maxRampLength);

  const currentPhase = getCurrentPhase();

  // Fase 2: Mostrar el DCL que está dibujando el estudiante en color morado neón
  if (currentPhase === 2) {
    renderer.drawForceArrow(centerOfMass.x, centerOfMass.y, userForces.W.angle, userForces.W.magnitude, renderer.palette.ochre, 'W?');
    renderer.drawForceArrow(centerOfMass.x, centerOfMass.y, userForces.N.angle, userForces.N.magnitude, renderer.palette.ochre, 'N?');
    renderer.drawForceArrow(centerOfMass.x, centerOfMass.y, userForces.Ff.angle, userForces.Ff.magnitude, renderer.palette.ochre, 'Ff?');
  }

  // Fases 3 y 4: Graficar los vectores de fuerzas físicas reales
  if (currentPhase >= 3) {
    renderer.drawTheoreticalForces(centerOfMass.x, centerOfMass.y, engine.W, engine.N, engine.Ff_real, engine.angleDeg);
  }

  renderer.drawGround();
}

/**
 * Sincroniza sliders de Fase 1 con el motor de física.
 */
function syncEngineParameters() {
  const mass = parseFloat(inputMass.value);
  const angle = parseFloat(inputAngle.value);
  let mus = parseFloat(inputMus.value);
  let muk = parseFloat(inputMuk.value);
  const gravity = parseFloat(inputGravity.value);

  // Regla física: Fricción cinética no puede superar a la fricción estática
  if (muk > mus) {
    muk = mus;
    inputMuk.value = muk;
  }

  valMass.textContent = `${mass.toFixed(1)} kg`;
  valAngle.textContent = `${angle}°`;
  valMus.textContent = mus.toFixed(2);
  valMuk.textContent = muk.toFixed(2);
  valGravity.textContent = `${gravity.toFixed(2)} m/s²`;

  engine.setParameters(mass, angle, mus, muk, gravity);

  // Sincronizar telemetría estática
  updateTelemetryDisplay();
}

/**
 * Sincroniza sliders de DCL de la Fase 2 y dibuja en vivo.
 */
function syncDCLSliders() {
  userForces.W.angle = parseInt(dclWAng.value);
  userForces.W.magnitude = parseInt(dclWMag.value);
  valDclWAng.textContent = `${userForces.W.angle}°`;
  valDclWMag.textContent = `${userForces.W.magnitude} N`;

  userForces.N.angle = parseInt(dclNAng.value);
  userForces.N.magnitude = parseInt(dclNMag.value);
  valDclNAng.textContent = `${userForces.N.angle}°`;
  valDclNMag.textContent = `${userForces.N.magnitude} N`;

  userForces.Ff.angle = parseInt(dclFFAng.value);
  userForces.Ff.magnitude = parseInt(dclFFMag.value);
  valDclFFAng.textContent = `${userForces.Ff.angle}°`;
  valDclFFMag.textContent = `${userForces.Ff.magnitude} N`;

  renderScene();
}

/**
 * Actualiza la información de telemetría de fuerzas en pantalla.
 */
function updateTelemetryDisplay() {
  telemetryG.textContent = `${engine.gravity.toFixed(2)} m/s²`;
  telemetryW.textContent = `${engine.W.toFixed(2)} N`;
  telemetryN.textContent = `${engine.N.toFixed(2)} N`;
  telemetryFf.textContent = `${engine.Ff_real.toFixed(2)} N`;
  telemetryA.textContent = `${engine.acceleration.toFixed(2)} m/s²`;
  // Velocidad instantánea; al llegar al final se muestra la velocidad de llegada
  telemetryV.textContent = engine.isAtBottom
    ? `${engine.arrivalVelocity.toFixed(2)} m/s (llegada)`
    : `${engine.velocity.toFixed(2)} m/s`;

  // El estado refleja la física del escenario, no solo si la simulación ya arrancó
  if (!engine.isMoving) {
    telemetryStatus.textContent = 'Equilibrio estático';
    telemetryStatus.style.color = 'var(--ochre)'; // Tinta ocre: la fricción estática basta
  } else if (engine.isAtBottom) {
    telemetryStatus.textContent = 'Llegó al final';
    telemetryStatus.style.color = 'var(--ink)';
  } else if (engine.t > 0) {
    telemetryStatus.textContent = 'Deslizando';
    telemetryStatus.style.color = 'var(--blue)'; // Tinta azul: en movimiento
  } else {
    telemetryStatus.textContent = 'Se deslizará';
    telemetryStatus.style.color = 'var(--red)'; // Tinta roja: el peso vence a la fricción
  }
}

function getCurrentPhase() {
  const activeTab = document.querySelector('.step-tab.active');
  if (activeTab.id === 'tab-phase1') return 1;
  if (activeTab.id === 'tab-phase2') return 2;
  if (activeTab.id === 'tab-phase3') return 3;
  return 4;
}

function switchPhase(phaseNum) {
  const tabId = `tab-phase${phaseNum}`;
  const containerId = `phase${phaseNum}-container`;

  // Activa = fase actual; completada = fases anteriores (se puede volver a ellas, no saltar hacia adelante).
  // Antes la pestaña 1 nunca se marcaba como completada y no se podía volver a ella.
  stepTabs.forEach((tab, i) => {
    tab.classList.toggle('active', tab.id === tabId);
    tab.classList.toggle('completed', i + 1 < phaseNum);
  });

  phaseContainers.forEach(container => {
    container.classList.remove('active');
    if (container.id === containerId) {
      container.classList.add('active');
    }
  });

  if (phaseNum === 3) {
    // Bloquear cambios de plano inclinado durante simulación
    [inputMass, inputAngle, inputMus, inputMuk, inputGravity].forEach(input => input.disabled = true);
  } else {
    [inputMass, inputAngle, inputMus, inputMuk, inputGravity].forEach(input => input.disabled = false);
  }

  renderScene();
}

function setupTabs() {
  initPhaseTabs({
    tabs: stepTabs,
    panels: phaseContainers,
    // Al volver a una fase anterior se detiene la animación en curso (igual que los botones «Regresar»)
    goTo: (phase) => {
      if (isPlaying) pauseSimulation();
      switchPhase(phase);
    },
  });
}

/**
 * FASE 1: COMPRENDER EL PROBLEMA
 */
function setupEventsF1() {
  [inputMass, inputAngle, inputMus, inputMuk, inputGravity].forEach(input => {
    input.addEventListener('input', () => {
      syncEngineParameters();
      engine.reset();
      renderScene();
    });
  });

  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      optionButtons.forEach(btn => btn.classList.remove('selected', 'correct', 'incorrect'));
      button.classList.add('selected');
      const isCorrect = button.getAttribute('data-correct') === 'true';

      if (isCorrect) {
        button.classList.add('correct');
        phase1Feedback.innerHTML = `<span style="color: var(--speed-color); font-weight: 600;">¡Extraordinario!</span> La Normal (N) es la fuerza de reacción de la superficie, por tanto, siempre es perpendicular al plano inclinado y no vertical hacia arriba.`;
        btnNextToPhase2.disabled = false;
      } else {
        button.classList.add('incorrect');
        phase1Feedback.innerHTML = `<span style="color: var(--accel-color); font-weight: 600;">Intenta de nuevo.</span> Si fuera vertical hacia arriba, se opondría directamente al peso y no a la inclinación de la rampa. Analiza qué dirección tiene la Normal respecto a la superficie de contacto.`;
        btnNextToPhase2.disabled = true;
      }
    });
  });

  btnNextToPhase2.addEventListener('click', () => {
    switchPhase(2);
  });
}

/**
 * FASE 2: PLANEAR LA SOLUCIÓN (DCL INTERACTIVO)
 */
function setupEventsF2() {
  [dclWAng, dclWMag, dclNAng, dclNMag, dclFFAng, dclFFMag].forEach(slider => {
    slider.addEventListener('input', () => {
      syncDCLSliders();
    });
  });

  btnNextToPhase3.addEventListener('click', () => {
    switchPhase(3);
  });

  btnBackToPhase1.addEventListener('click', () => {
    switchPhase(1);
  });
}

/**
 * FASE 3: EJECUTAR LA SIMULACIÓN
 */
function setupEventsF3() {
  btnSimPlay.addEventListener('click', () => {
    if (isPlaying) {
      pauseSimulation();
    } else {
      startSimulation();
    }
  });

  btnSimReset.addEventListener('click', () => {
    resetSimulation();
  });

  btnNextToPhase4.addEventListener('click', () => {
    switchPhase(4);
    populateF4Results();
  });

  btnBackToPhase2.addEventListener('click', () => {
    switchPhase(2);
  });
}

function animationLoop(timestamp) {
  if (!isPlaying) return;

  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  dt = Math.min(0.05, dt);

  engine.update(dt);
  renderScene();
  updateTelemetryDisplay();

  if (engine.isAtBottom || !engine.isMoving) {
    pauseSimulation();
    btnNextToPhase4.disabled = false;
    btnSimPlay.disabled = true; // Exigir reset
  } else {
    animationFrameId = requestAnimationFrame(animationLoop);
  }
}

function startSimulation() {
  isPlaying = true;
  lastTime = performance.now();
  btnSimPlay.textContent = 'Pausar';
  btnSimPlay.className = 'btn-action warning';

  // Si no hay deslizamiento (estático), simular un breve instante para asentar telemetría
  if (!engine.isMoving) {
    engine.t = 0.01; // Tiempo simbólico
    renderScene();
    updateTelemetryDisplay();
    pauseSimulation();
    btnNextToPhase4.disabled = false;
    btnSimPlay.disabled = true;
    return;
  }

  animationFrameId = requestAnimationFrame(animationLoop);
}

function pauseSimulation() {
  isPlaying = false;
  btnSimPlay.textContent = 'Reanudar';
  btnSimPlay.className = 'btn-action success';
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function resetSimulation() {
  pauseSimulation();
  engine.reset();
  renderScene();
  updateTelemetryDisplay();

  btnSimPlay.disabled = false;
  btnSimPlay.textContent = 'Iniciar simulación';
  btnSimPlay.className = 'btn-action success';
  btnNextToPhase4.disabled = true;
}

/**
 * FASE 4: EXAMINAR LA SOLUCIÓN
 */
function setupEventsF4() {
  btnRestartLab.addEventListener('click', () => {
    resetSimulation();

    // Limpiar DCL
    userForces = {
      W: { angle: 180, magnitude: 25 },
      N: { angle: 45, magnitude: 25 },
      Ff: { angle: 0, magnitude: 25 }
    };
    dclWAng.value = 180; dclWMag.value = 25;
    dclNAng.value = 45; dclNMag.value = 25;
    dclFFAng.value = 0; dclFFMag.value = 25;
    syncDCLSliders();

    // Limpiar cuestionario F1
    optionButtons.forEach(btn => btn.classList.remove('selected', 'correct', 'incorrect'));
    phase1Feedback.textContent = '';
    btnNextToPhase2.disabled = true;

    // Resetear pestañas
    stepTabs.forEach((tab, index) => {
      if (index > 0) tab.classList.remove('completed');
    });

    switchPhase(1);
  });
}

function populateF4Results() {
  const report = engine.evaluateDCL(userForces);

  // Escribir en la tabla
  resWAng.textContent = `${userForces.W.angle}°`;
  resWAngTeo.textContent = `${report.W.teoAng}°`;
  resWMagErr.textContent = `${report.W.errorMagPercent}%`;

  resNAng.textContent = `${userForces.N.angle}°`;
  resNAngTeo.textContent = `${report.N.teoAng}°`;
  resNMagErr.textContent = `${report.N.errorMagPercent}%`;

  resFFAng.textContent = `${userForces.Ff.angle}°`;
  resFFAngTeo.textContent = `${report.Ff.teoAng}°`;
  resFFMagErr.textContent = `${report.Ff.errorMagPercent}%`;

  // Asignar puntuación
  valDclScore.textContent = `${report.score} / 100`;

  // Retroalimentación didáctica del Tutor Polya
  if (report.score >= 90) {
    tutorFeedbackText.innerHTML = `<strong>Tutor Polya: ¡Impecable!</strong>
    Has obtenido una calificación sobresaliente en tu Diagrama de cuerpo libre. Tus fuerzas Normal, Peso y Fricción coinciden perfectamente con los vectores físicos teóricos. Comprendes cómo interactúan las fuerzas en el espacio bidimensional de un plano inclinado.`;
  } else if (report.score >= 70) {
    tutorFeedbackText.innerHTML = `<strong>Tutor Polya: Aceptable</strong>
    Tu Diagrama de cuerpo libre es en general correcto, pero presenta pequeñas desviaciones de ángulo o magnitud (calificación: <strong>${report.score}/100</strong>). 
    Recuerda: la Normal siempre debe ser perfectamente perpendicular al plano inclinado y el peso apuntar verticalmente hacia abajo. Intenta reajustar los deslizadores polares.`;
  } else {
    tutorFeedbackText.innerHTML = `<strong>Tutor Polya: Análisis requerido</strong>
    Tu Diagrama de cuerpo libre presenta errores considerables (calificación: <strong>${report.score}/100</strong>). 
    Asegúrate de:
    1. Dirigir el Peso verticalmente hacia abajo (ángulo polar exacto: 270°).
    2. Apuntar la Normal en dirección perpendicular a la rampa (ángulo: θ + 90°).
    3. Posicionar la Fricción paralela al plano (ángulo: θ) para oponerse al deslizamiento.
    Reinicia el laboratorio e inténtalo de nuevo para asentar el concepto.`;
  }
}

window.addEventListener('DOMContentLoaded', init);
