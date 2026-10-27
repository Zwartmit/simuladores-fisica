/**
 * @fileoverview Visor de la «pantalla de instrumento»: una capa transparente sobre el lienzo del
 * simulador con esquinas de visor, rótulo de estado (tiempo y si corre o está en pausa), un
 * barrido de arranque y, si el renderizador sabe convertir píxeles a metros, una cruz que sigue al
 * puntero con la lectura de sus coordenadas.
 *
 * Lee el estado de window.currentSimulation ({ engine.t, isRunning(), renderer }). El renderizador
 * puede ofrecer, opcionalmente:
 *   - getPlotRect() → { left, top, right, bottom } (px) del área con escala
 *   - canvasToWorld(px, py) → { x, y } (m)
 * Es solo decoración y lectura: no captura el puntero ni modifica la simulación.
 */

import { readScreenPalette, FONTS } from './inkPalette.js';

const SWEEP_MS = 1500;
const BRACKET_INSET = 9;
const BRACKET_ARM = 16;

/**
 * @param {HTMLCanvasElement} canvas Lienzo del simulador (su padre es .canvas-wrap)
 * @param {string} title Rótulo de la esquina superior izquierda, p. ej. «CINEMÁTICA»
 */
export function attachInstrument(canvas, title) {
  const wrap = canvas.parentElement;
  if (!wrap) return;

  const hud = document.createElement('canvas');
  hud.className = 'hud';
  hud.setAttribute('aria-hidden', 'true');
  wrap.appendChild(hud);
  const ctx = hud.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = readScreenPalette();
  const start = performance.now();
  let width = 0;
  let height = 0;
  let pointer = null;
  let raf = 0;

  function fit() {
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    hud.width = width * dpr;
    hud.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function brackets() {
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const corners = [
      [BRACKET_INSET, BRACKET_INSET, 1, 1],
      [width - BRACKET_INSET, BRACKET_INSET, -1, 1],
      [BRACKET_INSET, height - BRACKET_INSET, 1, -1],
      [width - BRACKET_INSET, height - BRACKET_INSET, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.moveTo(cx, cy + sy * BRACKET_ARM);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * BRACKET_ARM, cy);
    }
    ctx.stroke();
  }

  function labels(sim, plot) {
    ctx.font = `500 12px ${FONTS.mono}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = palette.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`SIM · ${title}`, (plot?.left ?? 28) + 16, 14);

    const running = sim.isRunning();
    const text = `t = ${sim.engine.t.toFixed(2)} s   ·   ${running ? 'EN CURSO' : 'EN PAUSA'}`;
    ctx.textAlign = 'right';
    ctx.fillText(text, width - 28, 14);
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = running ? palette.red : palette.rule;
    ctx.beginPath();
    ctx.arc(width - 28 - textWidth - 12, 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function sweep(now) {
    const progress = (now - start) / SWEEP_MS;
    if (progress >= 1 || reduceMotion.matches) return;
    const x = progress * (width + 160) - 80;
    const gradient = ctx.createLinearGradient(x - 140, 0, x, 0);
    gradient.addColorStop(0, 'rgba(134, 168, 234, 0)');
    gradient.addColorStop(1, 'rgba(134, 168, 234, 0.22)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 140, 0, 140, height);
    ctx.fillStyle = palette.blue;
    ctx.fillRect(x, 0, 1, height);
  }

  function crosshair(renderer) {
    const plot = renderer.getPlotRect?.();
    if (!pointer || !plot || !renderer.canvasToWorld) return;
    const inside = pointer.x >= plot.left && pointer.x <= plot.right &&
      pointer.y >= plot.top && pointer.y <= plot.bottom;
    if (!inside) return;

    ctx.save();
    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(plot.left, pointer.y); ctx.lineTo(plot.right, pointer.y);
    ctx.moveTo(pointer.x, plot.top); ctx.lineTo(pointer.x, plot.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marcas del puntero sobre los ejes
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.moveTo(plot.left, pointer.y); ctx.lineTo(plot.left + 7, pointer.y - 4); ctx.lineTo(plot.left + 7, pointer.y + 4);
    ctx.moveTo(pointer.x, plot.bottom); ctx.lineTo(pointer.x - 4, plot.bottom - 7); ctx.lineTo(pointer.x + 4, plot.bottom - 7);
    ctx.fill();

    // Etiqueta con las coordenadas en metros
    const world = renderer.canvasToWorld(pointer.x, pointer.y);
    const text = `x ${world.x.toFixed(1)} m · y ${world.y.toFixed(1)} m`;
    ctx.font = `500 12px ${FONTS.mono}`;
    const tagWidth = ctx.measureText(text).width + 16;
    let tx = pointer.x + 14;
    let ty = pointer.y - 30;
    if (tx + tagWidth > width - 8) tx = pointer.x - 14 - tagWidth;
    if (ty < 30) ty = pointer.y + 14;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(tx, ty, tagWidth, 21);
    ctx.fillStyle = palette.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + 8, ty + 11);
    ctx.restore();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, width, height);
    const sim = window.currentSimulation;
    if (!sim) return;
    brackets();
    labels(sim, sim.renderer.getPlotRect?.());
    crosshair(sim.renderer);
    sweep(now);
  }

  function run() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  new ResizeObserver(fit).observe(wrap);
  fit();
  wrap.addEventListener('pointermove', (event) => {
    const rect = wrap.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  wrap.addEventListener('pointerleave', () => { pointer = null; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else run();
  });
  run();
}
