/**
 * @fileoverview Fondo animado de física, compartido por la portada, los simuladores y las guías.
 * Reemplaza al papel cuadriculado: tres fenómenos dibujados a lápiz, muy tenues y en lento
 * movimiento, que no compiten con el contenido.
 *
 *   · Kepler  — órbitas elípticas con el planeta resolviendo la ecuación de Kepler (más rápido
 *               en el periapsis) y el área barrida por el radio vector (segunda ley).
 *   · Péndulo — oscilación armónica con estela estroboscópica.
 *   · Tiro    — parábola con puntos a intervalos iguales y el vector de velocidad.
 *   · Onda    — onda viajera en el borde inferior.
 *
 * Se auto-inicializa al importarse. Con prefers-reduced-motion dibuja un único fotograma fijo.
 * En los simuladores ocupa solo el escenario (#simulation-area), que es lo que queda a la vista.
 * El evento 'fondo:impulso' acelera el tiempo un instante (lo usa la portada al entrar a un
 * simulador y la página de destino al llegar, para dar sensación de inmersión).
 */

import { readInkPalette, drawArrowHead } from './inkPalette.js';

const TAU = Math.PI * 2;
const FRAME_MS = 1000 / 30;     // 30 fps bastan para un fondo lento y ahorran batería
const MAX_DPR = 1.5;
const STILL_TIME = 9.5;         // s: instante que se muestra fijo con movimiento reducido
const BOOST_DECAY = 0.65;       // s: cuánto tarda en calmarse un impulso

const ORBITS = [
  { a: 0.27, e: 0.55, rot: -0.55, phase: 0.6 },
  { a: 0.41, e: 0.38, rot: -0.2, phase: 2.4 },
  { a: 0.56, e: 0.24, rot: 0.15, phase: 4.1 },
];
const ORBIT_BASE_PERIOD = 30;   // s, para a = 0.27
const PENDULUM_PERIOD = 5.4;    // s
const PENDULUM_AMPLITUDE = 0.5; // rad
const SHOT_PERIOD = 7.5;        // s por ciclo (vuelo + pausa)
const SHOT_FLIGHT = 4.6;        // s de vuelo

/** Resuelve E − e·sin E = M (ecuación de Kepler) con Newton. */
function solveKepler(M, e) {
  let E = ((M + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const m = E;
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  return E;
}

/** Punto de la órbita (foco en el origen, eje mayor sobre x) para una anomalía excéntrica E. */
function orbitPoint(a, e, E, rot) {
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
}

function createBackdrop() {
  const canvas = document.createElement('canvas');
  canvas.className = 'physics-backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const regionEl = document.getElementById('simulation-area');

  let palette = readInkPalette();
  let width = 0;
  let height = 0;
  let region = { x: 0, y: 0, w: 0, h: 0 };
  let simTime = 0;          // tiempo de la simulación (s); avanza más rápido durante un impulso
  let boost = 0;            // exceso de velocidad que se apaga solo
  let lastFrame = 0;
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    palette = readInkPalette();
    if (regionEl) {
      const r = regionEl.getBoundingClientRect();
      region = { x: r.left, y: 0, w: Math.max(r.width, 1), h: height };
    } else {
      region = { x: 0, y: 0, w: width, h: height };
    }
    if (reduceMotion.matches) draw(STILL_TIME);
  }

  // ─── Fenómenos ────────────────────────────────────────────────────────────

  function drawOrbits(t, u) {
    const fx = region.x + region.w * 0.1;
    const fy = region.y + region.h * 0.93;
    ctx.lineWidth = 1.1;

    ORBITS.forEach((orbit, index) => {
      const a = orbit.a * u;
      const e = orbit.e;
      const period = ORBIT_BASE_PERIOD * Math.pow(orbit.a / ORBITS[0].a, 1.5); // tercera ley de Kepler
      const meanAnomaly = (TAU * t) / period + orbit.phase;
      const E = solveKepler(meanAnomaly, e);

      // Elipse: el centro queda a a·e del foco, hacia el lado opuesto al periapsis
      ctx.globalAlpha = 0.23;
      ctx.strokeStyle = palette.blue;
      ctx.beginPath();
      ctx.ellipse(fx - a * e * Math.cos(orbit.rot), fy - a * e * Math.sin(orbit.rot),
        a, a * Math.sqrt(1 - e * e), orbit.rot, 0, TAU);
      ctx.stroke();

      // Área barrida en el último tramo (segunda ley): solo en la órbita media
      if (index === 1) {
        ctx.globalAlpha = 0.09;
        ctx.fillStyle = palette.blue;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        for (let k = 0; k <= 16; k++) {
          const Ek = solveKepler(meanAnomaly - ((TAU * 3.2) / period) * (1 - k / 16), e);
          const [px, py] = orbitPoint(a, e, Ek, orbit.rot);
          ctx.lineTo(fx + px, fy + py);
        }
        ctx.closePath();
        ctx.fill();
      }

      const [bx, by] = orbitPoint(a, e, E, orbit.rot);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = index === 0 ? palette.red : palette.blue;
      ctx.beginPath();
      ctx.arc(fx + bx, fy + by, Math.max(3, u * 0.007), 0, TAU);
      ctx.fill();
    });

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = palette.ochre;
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(4, u * 0.01), 0, TAU);
    ctx.fill();
  }

  function drawPendulum(t, u) {
    const px = region.x + region.w * 0.9;
    const py = region.y - 4;
    const length = 0.34 * u;
    const omega = TAU / PENDULUM_PERIOD;
    const bobR = Math.max(5, u * 0.013);
    const at = (angle) => [px + length * Math.sin(angle), py + length * Math.cos(angle)];

    // Arco por el que se mueve
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(px, py, length, Math.PI / 2 - PENDULUM_AMPLITUDE, Math.PI / 2 + PENDULUM_AMPLITUDE);
    ctx.stroke();
    ctx.setLineDash([]);

    // Estela estroboscópica
    for (let k = 5; k >= 1; k--) {
      const [gx, gy] = at(PENDULUM_AMPLITUDE * Math.cos(omega * (t - k * 0.09)));
      ctx.globalAlpha = 0.04 * (6 - k);
      ctx.fillStyle = palette.blue;
      ctx.beginPath();
      ctx.arc(gx, gy, bobR, 0, TAU);
      ctx.fill();
    }

    const [bx, by] = at(PENDULUM_AMPLITUDE * Math.cos(omega * t));
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = palette.blue;
    ctx.beginPath();
    ctx.arc(bx, by, bobR, 0, TAU);
    ctx.fill();
  }

  function drawShot(t, u) {
    const x0 = region.x + region.w * 0.58;
    const y0 = region.y + region.h * 0.95;
    const range = Math.min(region.w * 0.36, u * 0.7);
    const apex = u * 0.2;
    const at = (s) => [x0 + range * s, y0 - 4 * apex * s * (1 - s)]; // s = t / T_vuelo, en [0, 1]

    // Trayectoria completa, punteada
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = palette.red;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const [x, y] = at(k / 40);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const flight = (t % SHOT_PERIOD) / SHOT_FLIGHT;
    const s = Math.min(flight, 1);

    // Posiciones a intervalos iguales de tiempo (la separación muestra la velocidad horizontal constante)
    const steps = Math.floor(s * 18);
    for (let k = 0; k <= steps; k++) {
      const [x, y] = at(k / 18);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = palette.red;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fill();
    }

    if (flight <= 1.15) {
      const fade = flight <= 1 ? 1 : 1 - (flight - 1) / 0.15;
      const [x, y] = at(s);
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = palette.red;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(4, u * 0.009), 0, TAU);
      ctx.fill();

      // Vector velocidad: tangente a la trayectoria
      const vx = range;
      const vy = -4 * apex * (1 - 2 * s);
      const norm = Math.hypot(vx, vy) || 1;
      const len = u * 0.07;
      const ex = x + (vx / norm) * len;
      const ey = y + (vy / norm) * len;
      ctx.globalAlpha = 0.4 * fade;
      ctx.strokeStyle = palette.blue;
      ctx.fillStyle = palette.blue;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      drawArrowHead(ctx, ex, ey, Math.atan2(vy, vx), 7);
    }
  }

  function drawWave(t, u) {
    const baseY = region.y + region.h - Math.max(10, u * 0.018);
    const amp = u * 0.011;
    const k = TAU / (u * 0.26);
    const x0 = region.x + region.w * 0.2;
    const x1 = region.x + region.w;
    const segments = 90;
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = palette.green;
    for (let i = 0; i < segments; i++) {
      const xa = x0 + ((x1 - x0) * i) / segments;
      const xb = x0 + ((x1 - x0) * (i + 1)) / segments;
      const envelope = Math.sin((Math.PI * (i + 0.5)) / segments); // se desvanece en los extremos
      ctx.globalAlpha = 0.28 * envelope;
      ctx.beginPath();
      ctx.moveTo(xa, baseY + amp * Math.sin(k * xa - 1.6 * t));
      ctx.lineTo(xb, baseY + amp * Math.sin(k * xb - 1.6 * t));
      ctx.stroke();
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    const u = Math.min(region.w, region.h);
    drawOrbits(t, u);
    drawPendulum(t, u);
    drawShot(t, u);
    drawWave(t, u);
    ctx.globalAlpha = 1;
  }

  // ─── Bucle ────────────────────────────────────────────────────────────────

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < FRAME_MS) return;
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    boost *= Math.exp(-dt / BOOST_DECAY);
    simTime += dt * (1 + boost);
    draw(simTime);
  }

  function start() {
    if (raf || reduceMotion.matches || document.hidden) return;
    lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', resize);
  if (regionEl && 'ResizeObserver' in window) new ResizeObserver(resize).observe(regionEl);
  window.addEventListener('fondo:impulso', (event) => {
    if (reduceMotion.matches) return;
    boost = Math.max(boost, event.detail?.fuerza ?? 8);
  });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) { stop(); draw(STILL_TIME); } else start();
  });

  // Al llegar desde otra página con la animación de inmersión, el fondo arranca acelerado
  if (document.documentElement.classList.contains('immersing') && !reduceMotion.matches) boost = 9;

  resize();
  if (reduceMotion.matches) draw(STILL_TIME); else start();
}

if (document.body) createBackdrop();
else document.addEventListener('DOMContentLoaded', createBackdrop, { once: true });
