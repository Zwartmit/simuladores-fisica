/**
 * @fileoverview Renderizador Canvas para la simulación de Gravitación universal (estilo "cuaderno").
 * Esquema orbital sobre papel polar: la estrella (ocre) en el foco, la elipse teórica
 * punteada, la trayectoria recorrida a lápiz, el planeta en tinta, la velocidad en azul y
 * la fuerza gravitatoria en rojo. Arriba a la derecha, la tabla de verificación de Kepler III.
 */

import { readScreenPalette, FONTS, drawArrowHead } from '../shared/inkPalette.js';

export class CanvasRendererGravitacion {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = readScreenPalette();

    // Tintas
    this.COLOR_STAR = this.palette.ochre;
    this.COLOR_PLANET = this.palette.ink;
    this.COLOR_ORBIT = this.palette.blue;
    this.COLOR_FORCE = this.palette.red;
    this.COLOR_VELOCITY = this.palette.blue;
    this.COLOR_KEPLER = this.palette.green;

    this.scale = 1;
    this.W = 0;
    this.H = 0;
    this._dpr = 0;
    this._resize();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || 800;
    const h = rect.height || 600;

    if (w !== this.W || h !== this.H || dpr !== this._dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this._dpr = dpr;
    }
    this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this.W = w;
    this.H = h;
    // Centro del sistema (la estrella): algo a la izquierda para dejar sitio a la tabla
    this.cx = this.W * 0.47;
    this.cy = this.H * 0.5;
  }

  /** Convierte coordenadas de mundo a píxeles del canvas */
  w2c(wx, wy) {
    return {
      x: this.cx + wx * this.scale,
      y: this.cy - wy * this.scale,
    };
  }

  /**
   * Dibuja el frame completo.
   * @param {Object} state  Estado del motor (getState())
   * @param {Object} engine Instancia PhysicsEngineGravitacion
   */
  draw(state, engine) {
    this._resize();
    // Escala para que toda la elipse quepa (el foco/estrella está a la izquierda del centro)
    const halfExtent = Math.min(this.W * 0.47, this.H * 0.5) * 0.85;
    this.scale = halfExtent / Math.max(engine.getTheoreticalApoapsis(), 100);

    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    this._drawBackground();
    this._drawTheoreticalOrbit(engine);
    this._drawOrbitPath(engine.getOrbitPath());
    this._drawStar();
    this._drawPlanet(state);
    this._drawVectors(state);
    this._drawKeplerPanel(engine.getKeplerLog(), engine);
  }

  // ─── Fondo: papel polar ──────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, W, H, palette, cx, cy } = this;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.graphMinor;

    // Circunferencias concéntricas cada 50 unidades (cada 100 algo más marcadas)
    const maxR = Math.hypot(W, H);
    for (let r = 50; r * this.scale < maxR; r += 50) {
      ctx.strokeStyle = r % 100 === 0 ? palette.graphMajor : palette.graphMinor;
      ctx.beginPath();
      ctx.arc(cx, cy, r * this.scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ejes que pasan por la estrella
    ctx.strokeStyle = palette.graphMajor;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  }

  // ─── Elipse teórica (referencia punteada) ────────────────────────────────────

  _drawTheoreticalOrbit(engine) {
    const { ctx, palette } = this;
    const a = engine.a;
    const e = engine.ecc;
    const b = a * Math.sqrt(1 - e * e);
    const center = this.w2c(-a * e, 0); // el centro de la elipse queda opuesto al periapsis

    ctx.save();
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, a * this.scale, b * this.scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ─── Trayectoria orbital recorrida ───────────────────────────────────────────

  _drawOrbitPath(path) {
    if (path.length < 2) return;
    const { ctx } = this;

    ctx.beginPath();
    path.forEach((pt, i) => {
      const { x, y } = this.w2c(pt.x, pt.y);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = this.COLOR_ORBIT;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ─── Estrella central ────────────────────────────────────────────────────────

  _drawStar() {
    const { ctx, cx, cy } = this;
    const r = 11;

    // Rayos cortos alrededor (símbolo de Sol de esquema técnico)
    ctx.strokeStyle = this.COLOR_STAR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
      ctx.lineTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = this.COLOR_STAR;
    ctx.fill();
  }

  // ─── Planeta ─────────────────────────────────────────────────────────────────

  _drawPlanet(state) {
    const { ctx, palette } = this;
    const { x, y } = this.w2c(state.x, state.y);

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.COLOR_PLANET;
    ctx.fill();

    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Vectores de fuerza y velocidad ─────────────────────────────────────────

  _drawVectors(state) {
    const pCanvas = this.w2c(state.x, state.y);

    // Velocidad: tangente a la órbita
    const vLen = Math.min(state.v * 0.6, 80);
    const vAngle = Math.atan2(-state.vy, state.vx); // invertir Y para canvas
    this._arrow(pCanvas.x, pCanvas.y, vLen, vAngle, this.COLOR_VELOCITY, 'v');

    // Fuerza gravitacional: apunta al centro
    const fAngle = Math.atan2(state.y, -state.x);
    const fLen = Math.min(state.F * 0.8, 70);
    this._arrow(pCanvas.x, pCanvas.y, fLen, fAngle, this.COLOR_FORCE, 'F');
  }

  _arrow(x, y, len, angle, color, label) {
    if (len < 3) return;
    const { ctx } = this;
    const ex = x + len * Math.cos(angle);
    const ey = y + len * Math.sin(angle);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    drawArrowHead(ctx, ex, ey, angle, 10);

    ctx.font = `600 17px ${FONTS.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex + 14 * Math.cos(angle), ey + 14 * Math.sin(angle));
  }

  // ─── Tabla de Kepler III ─────────────────────────────────────────────────────

  _drawKeplerPanel(keplerLog, engine) {
    if (keplerLog.length === 0) return;
    const { ctx, W, palette } = this;

    const rows = keplerLog.slice(-4);
    const panelW = Math.min(200, W * 0.46);
    const panelH = 70 + rows.length * 18;
    const x = W - panelW - 16;
    const y = 40; // por debajo del rótulo de estado del visor (js/shared/instrument.js)

    ctx.fillStyle = palette.paper;
    ctx.fillRect(x, y, panelW, panelH);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + panelW, y);
    ctx.stroke();

    ctx.fillStyle = palette.muted;
    ctx.font = `500 12px ${FONTS.mono}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('KEPLER III', x, y + 8);
    ctx.fillText('ÓRBITA  T (s)   a³/T²', x, y + 24);

    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 38);
    ctx.lineTo(x + panelW, y + 38);
    ctx.stroke();

    rows.forEach((entry, i) => {
      const ry = y + 46 + i * 18;
      ctx.fillStyle = palette.ink;
      ctx.font = `400 12px ${FONTS.mono}`;
      ctx.fillText(`#${entry.orbit}`, x, ry);
      ctx.fillText(entry.T.toFixed(1), x + 56, ry);
      ctx.fillStyle = this.COLOR_KEPLER;
      ctx.fillText(entry.ratio.toFixed(0), x + 118, ry);
    });

    ctx.fillStyle = palette.muted;
    ctx.font = `400 12px ${FONTS.mono}`;
    ctx.fillText(`GM/4π² = ${engine.getTheoreticalKeplerConstant().toFixed(0)}`, x, y + 48 + rows.length * 18);
  }
}
