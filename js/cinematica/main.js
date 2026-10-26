/**
 * @fileoverview Controlador principal del Simulador de Física.
 * Coordina las fases de George Polya, el bucle requestAnimationFrame,
 * la interactividad táctil/ratón del canvas, y actualiza la telemetría en tiempo real.
 */

import { PhysicsEngine } from './physicsEngine.js';
import { CanvasRenderer } from './canvasRenderer.js';
import { initPhaseTabs } from '../shared/phaseTabs.js';

// Instanciar motores principales
const engine = new PhysicsEngine();
let renderer;

// Variables de estado del loop y animación
let animationFrameId = null;
let lastTime = 0;
let isPlaying = false;

// Variables para el trazado de hipótesis (Fase 2)
let isDrawing = false;
let userDrawPath = []; // Almacena puntos de píxeles lógicos del dibujo del usuario
let userDrawWorldPoints = []; // Almacena coordenadas físicas del dibujo del usuario

// Estado de la predicción
let predictedRange = 50;

// Elementos del DOM
const canvas = document.getElementById('physics-canvas');
const telemetryV = document.getElementById('telemetry-v');
const telemetryA = document.getElementById('telemetry-a');
const telemetryX = document.getElementById('telemetry-x');
const telemetryY = document.getElementById('telemetry-y');
const telemetryT = document.getElementById('telemetry-t');

// Sliders de Fase 1
const inputY0 = document.getElementById('input-y0');
const inputV0 = document.getElementById('input-v0');
const inputAngle = document.getElementById('input-angle');
const inputGravity = document.getElementById('input-gravity');
const valY0 = document.getElementById('val-y0');
const valV0 = document.getElementById('val-v0');
const valAngle = document.getElementById('val-angle');
const valGravity = document.getElementById('val-gravity');

// Elementos de Cuestionario (Fase 1)
const optionButtons = document.querySelectorAll('.option-btn');
const phase1Feedback = document.getElementById('phase1-feedback');
const btnNextToPhase2 = document.getElementById('btn-next-to-phase2');

// Sliders de Fase 2
const inputPredictedRange = document.getElementById('input-predicted-range');
const valPredictedRange = document.getElementById('val-predicted-range');
const btnNextToPhase3 = document.getElementById('btn-next-to-phase3');
const btnBackToPhase1 = document.getElementById('btn-back-to-phase1');

// Botones de Fase 3
const btnSimPlay = document.getElementById('btn-sim-play');
const btnSimReset = document.getElementById('btn-sim-reset');
const btnNextToPhase4 = document.getElementById('btn-next-to-phase4');
const btnBackToPhase2 = document.getElementById('btn-back-to-phase2');

// Elementos de Fase 4
const tablePredRange = document.getElementById('table-pred-range');
const tableRealRange = document.getElementById('table-real-range');
const badgeRangeError = document.getElementById('badge-range-error');
const tableRealTime = document.getElementById('table-real-time');
const tutorFeedbackText = document.getElementById('tutor-feedback-text');
const btnRestartLab = document.getElementById('btn-restart-lab');

// Pestañas e interfaces de fase
const stepTabs = document.querySelectorAll('.step-tab');
const phaseContainers = document.querySelectorAll('.polya-phase-container');

/**
 * Inicializa el simulador y configura event listeners.
 */
function init() {
  renderer = new CanvasRenderer(canvas);
  
  // Escuchar redimensionamientos de pantalla de forma responsiva
  window.addEventListener('resize', () => {
    renderer.resize();
    fitScene();
    renderScene();
  });

  setupEventsF1();
  setupEventsF2();
  setupEventsF3();
  setupEventsF4();
  setupTabs();

  // Forzar sincronización y renderizado inicial
  syncEngineParameters();
  fitScene();
  renderScene();

  // Exponer estado global para testing y auditoría de la IA
  window.currentSimulation = {
    engine,
    renderer,
    isRunning: () => isPlaying,
    getPhase: () => getCurrentPhase(),
    getDrawPath: () => userDrawPath,
    getPredictedRange: () => predictedRange
  };
}

/**
 * Redibuja estáticamente el escenario actual según la fase y simulación.
 */
function renderScene() {
  renderer.clear();
  renderer.drawGrid();
  
  // Rastro e hipótesis (se reconvierte desde metros por si cambió la escala de la vista)
  if (userDrawWorldPoints.length > 0) {
    userDrawPath = userDrawWorldPoints.map(p => renderer.worldToCanvas(p.x, p.y));
  }
  if (userDrawPath.length > 0) {
    renderer.drawUserPredictionPath(userDrawPath);
  }
  
  // Dibujar bandera de predicción del alumno si estamos en fase 2 o posterior
  if (getCurrentPhase() >= 2) {
    renderer.drawPredictionFlag(predictedRange);
  }

  // Dibujar rastro físico recorrido
  const points = engine.getTrajectoryData();
  renderer.drawTrajectory(points);

  // Dibujar proyectil actual
  renderer.drawProjectile(engine.x, engine.y);

  // Dibujar vectores si está en vuelo y no ha aterrizado
  if (engine.t > 0 && !engine.isLanded) {
    renderer.drawVectors(engine.x, engine.y, engine.vx, engine.vy, engine.gravity);
  }

  renderer.drawGround();
}

/**
 * Ajusta la escala del lienzo para que toda la trayectoria (y la predicción) quede a la vista.
 */
function fitScene() {
  const range = engine.getTheoreticalMaxRange();
  const apex = engine.y0 + (engine.vy0 > 0 ? (engine.vy0 * engine.vy0) / (2 * engine.gravity) : 0);
  // La predicción solo amplía la vista hasta 2.5 veces el alcance real, para no aplastar la trayectoria
  const maxX = Math.max(range, Math.min(predictedRange, range * 2.5)) * 1.06;
  renderer.fitView(maxX, apex * 1.15);
}

/**
 * Sincroniza parámetros físicos desde los sliders hacia el motor.
 */
function syncEngineParameters() {
  const y0 = parseFloat(inputY0.value);
  const v0 = parseFloat(inputV0.value);
  const angle = parseFloat(inputAngle.value);
  const gravity = parseFloat(inputGravity.value);

  // Mostrar en etiquetas
  valY0.textContent = `${y0} m`;
  valV0.textContent = `${v0} m/s`;
  valAngle.textContent = `${angle}°`;
  valGravity.textContent = `${gravity} m/s²`;

  engine.setParameters(y0, v0, angle, gravity);
  
  // Sincronizar telemetría estática
  updateTelemetryDisplay();
}

/**
 * Actualiza la información numérica de la telemetría en pantalla.
 */
function updateTelemetryDisplay() {
  const magnitudeV = Math.sqrt(Math.pow(engine.vx, 2) + Math.pow(engine.vy, 2));
  telemetryV.textContent = `${magnitudeV.toFixed(2)} m/s`;
  telemetryA.textContent = `${engine.gravity.toFixed(2)} m/s²`;
  telemetryX.textContent = `${engine.x.toFixed(2)} m`;
  telemetryY.textContent = `${engine.y.toFixed(2)} m`;
  telemetryT.textContent = `${engine.t.toFixed(2)} s`;
}

/**
 * Obtiene el índice de la fase activa actual (1 a 4).
 */
function getCurrentPhase() {
  const activeTab = document.querySelector('.step-tab.active');
  if (activeTab.id === 'tab-phase1') return 1;
  if (activeTab.id === 'tab-phase2') return 2;
  if (activeTab.id === 'tab-phase3') return 3;
  return 4;
}

/**
 * Cambia dinámicamente de fase en la UI respetando la metodología de Polya.
 * @param {number} phaseNum Número de fase (1 a 4)
 */
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

  // Acciones secundarias según cambio de fase
  if (phaseNum === 2) {
    // Inicializar predicción
    predictedRange = parseFloat(inputPredictedRange.value);
    fitScene();
    renderScene();
  }

  if (phaseNum === 3) {
    // Bloquear controles de Fase 1 para evitar manipulaciones a mitad del experimento
    inputY0.disabled = true;
    inputV0.disabled = true;
    inputAngle.disabled = true;
    inputGravity.disabled = true;
  } else {
    // Si regresa a fases previas, permitir edición
    inputY0.disabled = false;
    inputV0.disabled = false;
    inputAngle.disabled = false;
    inputGravity.disabled = false;
  }

  renderScene();
}

/**
 * Configura las pestañas de Polya para retroceder a fases ya completadas.
 */
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
 * CONFIGURACIÓN DE FASE 1: COMPRENDER EL PROBLEMA
 */
function setupEventsF1() {
  // Eventos de Sliders
  [inputY0, inputV0, inputAngle, inputGravity].forEach(input => {
    input.addEventListener('input', () => {
      syncEngineParameters();
      engine.reset();
      fitScene();
      renderScene();
    });
  });

  // Evento de Cuestionario Interactivo
  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Limpiar estados previos
      optionButtons.forEach(btn => {
        btn.classList.remove('selected', 'correct', 'incorrect');
      });

      button.classList.add('selected');
      const isCorrect = button.getAttribute('data-correct') === 'true';

      if (isCorrect) {
        button.classList.add('correct');
        phase1Feedback.innerHTML = `<span style="color: var(--speed-color); font-weight: 600;">¡Excelente!</span> La aceleración (g) permanece constante debido a la fuerza gravitatoria invariante del campo terrestre. Has comprendido las variables fundamentales del problema.`;
        btnNextToPhase2.disabled = false;
      } else {
        button.classList.add('incorrect');
        phase1Feedback.innerHTML = `<span style="color: var(--accel-color); font-weight: 600;">Incorrecto.</span> Recuerda que en caída libre el proyectil varía su velocidad (debido a la gravedad) y su altura en cada instante de tiempo. Analiza cuál variable vectorial no cambia.`;
        btnNextToPhase2.disabled = true;
      }
    });
  });

  btnNextToPhase2.addEventListener('click', () => {
    switchPhase(2);
  });
}

/**
 * CONFIGURACIÓN DE FASE 2: CONCEBIR UN PLAN (HIPÓTESIS DE PREDICCIÓN)
 */
function setupEventsF2() {
  // Slider de Alcance Predicho
  inputPredictedRange.addEventListener('input', () => {
    predictedRange = parseFloat(inputPredictedRange.value);
    valPredictedRange.textContent = `${predictedRange} m`;
    fitScene();
    renderScene();
  });

  // DIBUJO DE HIPÓTESIS EN CANVAS
  const getCanvasMousePos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (getCurrentPhase() !== 2) return;
    isDrawing = true;
    userDrawPath = [];
    userDrawWorldPoints = [];
    const pos = getCanvasMousePos(e);
    userDrawPath.push(pos);
    userDrawWorldPoints.push(renderer.canvasToWorld(pos.x, pos.y));
  };

  const drawMove = (e) => {
    if (!isDrawing || getCurrentPhase() !== 2) return;
    e.preventDefault(); // Evitar scroll táctil
    const pos = getCanvasMousePos(e);
    userDrawPath.push(pos);
    userDrawWorldPoints.push(renderer.canvasToWorld(pos.x, pos.y));
    renderScene();
  };

  const stopDrawing = () => {
    isDrawing = false;
  };

  // Eventos de ratón
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', drawMove);
  window.addEventListener('mouseup', stopDrawing);

  // Eventos táctiles para móviles/tablets
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', drawMove, { passive: false });
  window.addEventListener('touchend', stopDrawing);

  btnNextToPhase3.addEventListener('click', () => {
    switchPhase(3);
  });

  btnBackToPhase1.addEventListener('click', () => {
    switchPhase(1);
  });
}

/**
 * CONFIGURACIÓN DE FASE 3: EJECUTAR EL PLAN (SIMULACIÓN Y CONTROLES)
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

/**
 * Bucle de animación física clásica e interactiva.
 */
function animationLoop(timestamp) {
  if (!isPlaying) return;

  // Evitar saltos de tiempo excesivos en primer cuadro
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000; // Segundos transcurridos
  lastTime = timestamp;

  // Limitar paso temporal máximo para evitar inestabilidad en pausas/fichas
  dt = Math.min(0.05, dt);

  // Actualizar motor físico
  engine.update(dt);
  
  // Renderizar escena y actualizar telemetría
  renderScene();
  updateTelemetryDisplay();

  if (engine.isLanded) {
    pauseSimulation();
    btnNextToPhase4.disabled = false;
    btnSimPlay.disabled = true; // Forzar reinicio para repetir
    btnSimPlay.textContent = 'Lanzamiento completo';
  } else {
    animationFrameId = requestAnimationFrame(animationLoop);
  }
}

function startSimulation() {
  if (engine.isLanded) return;
  isPlaying = true;
  lastTime = performance.now();
  btnSimPlay.textContent = 'Pausar Simulación';
  btnSimPlay.classList.remove('success');
  btnSimPlay.classList.add('warning'); // Amarillo pausa
  animationFrameId = requestAnimationFrame(animationLoop);
}

function pauseSimulation() {
  isPlaying = false;
  btnSimPlay.textContent = 'Reanudar';
  btnSimPlay.classList.remove('warning');
  btnSimPlay.classList.add('success');
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}

function resetSimulation() {
  pauseSimulation();
  engine.reset();
  renderScene();
  updateTelemetryDisplay();
  
  btnSimPlay.disabled = false;
  btnSimPlay.textContent = 'Iniciar Lanzamiento';
  btnSimPlay.classList.remove('warning');
  btnSimPlay.classList.add('success');
  btnNextToPhase4.disabled = true;
}

/**
 * CONFIGURACIÓN DE FASE 4: EXAMINAR LA SOLUCIÓN
 */
function setupEventsF4() {
  btnRestartLab.addEventListener('click', () => {
    // Resetear cuestionarios, dibujos y simulaciones
    resetSimulation();
    
    userDrawPath = [];
    userDrawWorldPoints = [];
    predictedRange = 50;
    inputPredictedRange.value = 50;
    valPredictedRange.textContent = '50 m';
    fitScene();
    
    // Limpiar cuestionario Fase 1
    optionButtons.forEach(btn => {
      btn.classList.remove('selected', 'correct', 'incorrect');
    });
    phase1Feedback.textContent = '';
    btnNextToPhase2.disabled = true;

    // Quitar marcas de completado de pestañas
    stepTabs.forEach((tab, index) => {
      if (index > 0) {
        tab.classList.remove('completed');
      }
    });

    switchPhase(1);
  });
}

/**
 * Rellena y evalúa los datos comparativos en la Fase 4 de Polya.
 */
function populateF4Results() {
  const evaluation = engine.evaluatePrediction(predictedRange);
  const flightTime = engine.getTheoreticalFlightTime();

  // Escribir en tabla
  tablePredRange.textContent = `${predictedRange.toFixed(2)} m`;
  tableRealRange.textContent = `${evaluation.realRange.toFixed(2)} m`;
  tableRealTime.textContent = `${flightTime.toFixed(2)} s`;

  // Configurar badge de error
  badgeRangeError.textContent = `${evaluation.relativeErrorPercent}%`;
  badgeRangeError.className = 'error-badge'; // Limpiar

  if (evaluation.relativeErrorPercent <= 5) {
    badgeRangeError.classList.add('low');
    tutorFeedbackText.innerHTML = `<strong>Tutor Polya: ¡Extraordinario!</strong>
    Tu predicción horizontal de <strong>${predictedRange} m</strong> estuvo extremadamente cerca del alcance real de <strong>${evaluation.realRange.toFixed(2)} m</strong> (error del ${evaluation.relativeErrorPercent}%). 
    Has demostrado una comprensión excelente del movimiento cinemático parabólico.`;
  } else if (evaluation.relativeErrorPercent <= 15) {
    badgeRangeError.classList.add('medium');
    tutorFeedbackText.innerHTML = `<strong>Tutor Polya: Buen intento</strong>
    Tu predicción horizontal de <strong>${predictedRange} m</strong> tuvo una desviación aceptable respecto al alcance analítico real de <strong>${evaluation.realRange.toFixed(2)} m</strong> (error del ${evaluation.relativeErrorPercent}%). 
    ¿Dibujaste una trayectoria visual similar a la curva real? Regresa a la Fase 1 y analiza el efecto del ángulo de disparo o la altura sobre el alcance máximo.`;
  } else {
    badgeRangeError.classList.add('high');
    tutorFeedbackText.innerHTML = `<strong>Tutor Polya: Análisis requerido</strong>
    Tu predicción horizontal de <strong>${predictedRange} m</strong> tuvo una desviación considerable respecto al alcance físico real de <strong>${evaluation.realRange.toFixed(2)} m</strong> (error del ${evaluation.relativeErrorPercent}%). 
    Esto suele ocurrir al estimar la trayectoria como una recta en lugar de una parábola: con gravedad constante, la altura cae con t² mientras que x crece linealmente con t. Te sugiero reiniciar el experimento, trazar una nueva curva y repasar las ecuaciones x(t) e y(t).`;
  }
}

// Iniciar al cargar el script
window.addEventListener('DOMContentLoaded', init);
