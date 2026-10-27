/**
 * @fileoverview Renderizador Canvas para la simulación de Dinámica rotacional (estilo "cuaderno").
 * Dibuja el cuerpo rígido girando como un esquema técnico, los vectores de torque (ocre),
 * velocidad angular (azul), aceleración angular (rojo) y momento angular (verde), y debajo
 * la gráfica de ω(t) y L(t). Los valores numéricos viven en la tira de datos de la página.
 */

import { PhysicsEngineRotacion } from './physicsEngine.js';
import { readScreenPalette, FONTS, drawArrowHead, drawCrossMarks } from '../shared/inkPalette.js';

export class CanvasRendererRotacion {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = readScreenPalette();

    // Tintas por magnitud
    this.COLOR_TORQUE = this.palette.ochre;
    this.COLOR_OMEGA = this.palette.blue;
    this.COLOR_ALPHA = this.palette.red;
    this.COLOR_ANGULAR_M = this.palette.green;

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

    // Gráfica abajo; el cuerpo ocupa la zona superior
    this.chartH = Math.min(150, Math.max(100, this.H * 0.28));
    this.chartY = this.H - this.chartH;
    const bodyAreaH = this.chartY - 16;
    this.cx = this.W * 0.40;
    this.cy = bodyAreaH * 0.52;
    // Radio visual: deja sitio al arco del torque y a las flechas de la derecha
    this.R = Math.max(40, Math.min(this.W * 0.2, bodyAreaH * 0.3));
  }

  /**
   * Frame completo.
   * @param {Object} state  Estado del motor físico
   * @param {Object} engine Instancia del motor
   */
  draw(state, engine) {
    this._resize();
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    this._drawBackground();
    this._drawBody(state, engine);
    this._drawVectors(state);
    this._drawChart(engine.getHistory());
  }

  // ─── Fondo ──────────────────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, W, H, palette } = this;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, W, H);

    // Cruces «+» cada 72 px (en lugar de una cuadrícula)
    const bottom = this.chartY - 8;
    drawCrossMarks(ctx, palette, 0, 0, W, bottom, 36, bottom - 24, 72, 72);
  }

  // ─── Cuerpo rígido ──────────────────────────────────────────────────────────

  _drawBody(state, engine) {
    const { ctx, cx, cy, palette } = this;
    const theta = state.theta;

    switch (engine.bodyType) {
      case PhysicsEngineRotacion.BODIES.DISK:
        this._drawDisk(theta);
        break;
      case PhysicsEngineRotacion.BODIES.RING:
        this._drawRing(theta);
        break;
      case PhysicsEngineRotacion.BODIES.ROD:
        this._drawRod(theta);
        break;
    }

    // Eje central
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = palette.ink;
    ctx.fill();
  }

  _drawDisk(theta) {
    const { ctx, cx, cy, R, palette } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = palette.shade;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Radios cada 60°: el primero, en rojo, marca la orientación
    for (let i = 0; i < 6; i++) {
      const a = theta + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
      ctx.strokeStyle = i === 0 ? palette.red : palette.rule;
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.stroke();
    }
  }

  _drawRing(theta) {
    const { ctx, cx, cy, R, palette } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(8, R * 0.18);
    ctx.stroke();

    // Rayos estructurales (4) y marca de orientación en rojo
    for (let i = 0; i < 4; i++) {
      const ang = theta + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      ctx.strokeStyle = i === 0 ? palette.red : palette.rule;
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.stroke();
    }
  }

  _drawRod(theta) {
    const { ctx, cx, cy, R, palette } = this;
    const dx = Math.cos(theta) * R;
    const dy = Math.sin(theta) * R;

    // Barra
    ctx.beginPath();
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 10;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // Extremo de referencia en rojo y masas en los extremos
    [[cx + dx, cy + dy, palette.red], [cx - dx, cy - dy, palette.ink]].forEach(([ex, ey, color]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, 9, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // ─── Vectores de torque, ω, α y L ───────────────────────────────────────────

  _drawVectors(state) {
    const { ctx, cx, cy, R } = this;
    const { omega, alpha, tau, L } = state;

    // Torque τ: arco alrededor del cuerpo
    if (Math.abs(tau) > 0.01) {
      this._drawCurvedArrow(cx, cy, R + 24, tau > 0 ? 1 : -1, this.COLOR_TORQUE, `τ = ${tau.toFixed(1)} N·m`);
    }

    // Velocidad angular ω (flecha a la derecha del cuerpo)
    const arrowX = cx + R + 36;
    const room = Math.max(30, this.W - arrowX - 24);
    const omegaLen = Math.min(Math.abs(omega) * 14, room * 0.7);
    if (omegaLen > 2) {
      this._drawStraightArrow(arrowX, cy - 8, omegaLen, this.COLOR_OMEGA, 'ω');
    }

    // Aceleración angular α
    const alphaLen = Math.min(Math.abs(alpha) * 12, room * 0.7);
    if (alphaLen > 2) {
      this._drawStraightArrow(arrowX, cy + 22, alphaLen, this.COLOR_ALPHA, 'α');
    }

    // Momento angular L: rótulo sobre el cuerpo
    ctx.fillStyle = this.COLOR_ANGULAR_M;
    ctx.font = `500 12px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`L = ${L.toFixed(2)} kg·m²/s`, cx, cy + R + 30);
  }

  /** Flecha curva (arco) para representar el torque */
  _drawCurvedArrow(cx, cy, r, direction, color, label) {
    const { ctx } = this;
    const startAngle = direction > 0 ? Math.PI * 0.55 : Math.PI * 0.45;
    const endAngle = direction > 0 ? Math.PI * 0.05 : Math.PI * 0.95;

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle, direction < 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Punta de flecha en el extremo del arco
    const tx = cx + Math.cos(endAngle) * r;
    const ty = cy + Math.sin(endAngle) * r;
    const arrowDir = endAngle + direction * Math.PI * 0.5;
    ctx.fillStyle = color;
    drawArrowHead(ctx, tx, ty, arrowDir + Math.PI, 11);

    ctx.font = `500 12px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, cx, cy - r - 8);
  }

  /** Flecha recta horizontal para ω y α, rotulada con la letra de la magnitud */
  _drawStraightArrow(x, y, len, color, label) {
    const { ctx } = this;
    const ex = x + len;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, y);
    ctx.stroke();
    drawArrowHead(ctx, ex, y, 0, 11);

    ctx.font = `600 17px ${FONTS.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex + 9, y);
  }

  // ─── Gráfica temporal ω(t) y L(t) ───────────────────────────────────────────

  _drawChart(history) {
    const { ctx, W, palette } = this;
    const x = 18;
    const y = this.chartY;
    const w = W - 36;
    const h = this.chartH - 14;

    // Recuadro con filete de tinta
    ctx.fillStyle = palette.paper;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    ctx.fillStyle = palette.muted;
    ctx.font = `500 12px ${FONTS.mono}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ω(t) Y L(t), NORMALIZADAS', x, y + 8);

    if (history.length < 2) return;

    const iX = x + 4;
    const iY = y + 26;
    const iW = w - 8;
    const iH = h - 40;
    const maxT = Math.max(history[history.length - 1].t, 0.1);
    const maxOmega = Math.max(...history.map(p => Math.abs(p.omega)), 0.1);
    const maxL = Math.max(...history.map(p => Math.abs(p.L)), 0.1);

    // Ejes
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(iX, iY);
    ctx.lineTo(iX, iY + iH);
    ctx.lineTo(iX + iW, iY + iH);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(iX, iY, iW, iH);
    ctx.clip();

    // ω continua
    ctx.beginPath();
    ctx.strokeStyle = this.COLOR_OMEGA;
    ctx.lineWidth = 2;
    history.forEach((pt, i) => {
      const px = iX + (pt.t / maxT) * iW;
      const py = iY + iH - (Math.abs(pt.omega) / maxOmega) * iH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // L discontinua
    ctx.beginPath();
    ctx.strokeStyle = this.COLOR_ANGULAR_M;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    history.forEach((pt, i) => {
      const px = iX + (pt.t / maxT) * iW;
      const py = iY + iH - (Math.abs(pt.L) / maxL) * iH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Leyenda
    ctx.font = `600 14px ${FONTS.display}`;
    ctx.textBaseline = 'middle';
    [[this.COLOR_OMEGA, '— ω'], [this.COLOR_ANGULAR_M, '- - L']].forEach(([color, label], i) => {
      ctx.fillStyle = color;
      ctx.fillText(label, x + w - 100 + i * 52, y + 14);
    });
  }
}
