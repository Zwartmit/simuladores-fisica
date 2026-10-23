/**
 * @fileoverview Renderizador Canvas para Oscilaciones mecánicas (estilo "cuaderno").
 * Dibuja el péndulo simple o el sistema masa-resorte como esquema técnico y, debajo,
 * dos gráficas en tiempo real: posición vs tiempo y energía (K verde, U azul) vs tiempo.
 */

import { PhysicsEngineOscilaciones } from './physicsEngine.js';
import { readInkPalette, FONTS, drawArrowHead, drawHatchedGround } from '../shared/inkPalette.js';

export class CanvasRendererOscilaciones {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = readInkPalette();

    // Escala visual (px por metro); se recalcula en cada frame según el sistema
    this.pixelsPerMeter = 100;
    this.pivotX = 0;
    this.pivotY = 0;

    // Tintas
    this.COLOR_POSITION = this.palette.ink;
    this.COLOR_VELOCITY = this.palette.blue;
    this.COLOR_KE = this.palette.green;
    this.COLOR_PE = this.palette.blue;

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

    // Las gráficas ocupan la parte inferior; el sistema físico, la superior
    this.graphH = Math.min(150, Math.max(104, this.H * 0.28));
    this.graphY = this.H - this.graphH;
    this.stageH = this.graphY - 14;

    this.pivotX = this.W * 0.5;
    this.pivotY = 36;
  }

  draw(state, engine) {
    this._resize();
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this._drawBackground();

    if (state.type === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      this._drawPendulum(state, engine);
    } else {
      this._drawSpring(state, engine);
    }

    this._drawGraphs(state, engine);
  }

  _drawBackground() {
    const { ctx, W, H, palette } = this;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, W, H);

    // Papel milimetrado sobre la zona del esquema
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.graphMinor;
    const step = 24;
    for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.stageH); ctx.stroke(); }
    for (let y = 0; y < this.stageH; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  // ─── Péndulo ────────────────────────────────────────────────────────────────
  _drawPendulum(state, engine) {
    const { ctx, palette } = this;
    // La cuerda completa (L) y la masa deben caber en la zona del esquema
    this.pixelsPerMeter = Math.min(100, (this.stageH - this.pivotY - 40) / engine.L);
    const L_px = engine.L * this.pixelsPerMeter;
    const theta = state.q;

    const mx = this.pivotX + L_px * Math.sin(theta);
    const my = this.pivotY + L_px * Math.cos(theta);

    // Posición de equilibrio (vertical) punteada
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.pivotX, this.pivotY);
    ctx.lineTo(this.pivotX, this.pivotY + L_px + 24);
    ctx.stroke();
    ctx.setLineDash([]);

    // Soporte (techo) con rayado hacia arriba
    const ceilY = this.pivotY - 8;
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = this.pivotX - 44; x < this.pivotX + 44; x += 9) {
      ctx.moveTo(x, ceilY);
      ctx.lineTo(x + 7, ceilY - 8);
    }
    ctx.stroke();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.pivotX - 44, ceilY);
    ctx.lineTo(this.pivotX + 44, ceilY);
    ctx.stroke();

    // Cuerda
    ctx.beginPath();
    ctx.moveTo(this.pivotX, this.pivotY);
    ctx.lineTo(mx, my);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pivote
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = palette.ink;
    ctx.fill();

    // Arco del ángulo y rótulo θ
    if (Math.abs(theta) > 0.03) {
      ctx.strokeStyle = palette.red;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const arcR = Math.min(46, L_px * 0.4);
      ctx.arc(this.pivotX, this.pivotY, arcR, Math.PI / 2, Math.PI / 2 - theta, theta > 0);
      ctx.stroke();
      ctx.fillStyle = palette.red;
      ctx.font = `italic 600 16px ${FONTS.display}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('θ', this.pivotX + Math.sin(theta / 2) * (arcR + 14), this.pivotY + Math.cos(theta / 2) * (arcR + 14));
    }

    // Masa (radio según la masa)
    const r = Math.min(24, 10 + engine.m_pend * 4);
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = palette.paper;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.fillStyle = palette.ink;
    ctx.fill();

    // Velocidad tangencial
    const vLen = state.v * 30;
    if (Math.abs(vLen) > 1) {
      this._drawArrow(mx, my, mx + vLen * Math.cos(theta), my - vLen * Math.sin(theta), this.COLOR_VELOCITY, 'v');
    }
  }

  // ─── Resorte ────────────────────────────────────────────────────────────────
  _drawSpring(state, engine) {
    const { ctx, palette } = this;
    const originY = this.stageH * 0.5;

    const wallX = 36;
    const blockWidth = 44 + engine.m_spring * 3;
    const blockHeight = 40;

    // Equilibrio en el centro; la escala deja sitio a la amplitud inicial en ambos sentidos
    const originX = this.W * 0.52;
    const maxAmp = Math.max(Math.abs(engine.x0), 0.3);
    const room = Math.min(originX - wallX - blockWidth - 20, this.W - originX - blockWidth / 2 - 24);
    this.pixelsPerMeter = Math.max(20, Math.min(100, room / (maxAmp * 1.1)));

    const blockX = originX + state.q * this.pixelsPerMeter;
    const blockY = originY;
    const blockLeft = blockX - blockWidth / 2;

    // Suelo con rayado
    drawHatchedGround(ctx, palette, wallX, this.W - 20, originY + blockHeight / 2 + 2);

    // Resorte en zig-zag (entre la pared y el bloque)
    const numCoils = 10;
    const springLen = blockLeft - wallX;
    const coilWidth = springLen / numCoils;
    ctx.beginPath();
    ctx.moveTo(wallX, originY);
    for (let i = 0; i < numCoils; i++) {
      const cx = wallX + i * coilWidth;
      const nextCx = wallX + (i + 1) * coilWidth;
      ctx.lineTo((cx + nextCx) / 2, originY - 14);
      ctx.lineTo(nextCx, originY + 14);
    }
    ctx.lineTo(blockLeft, originY);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Pared
    ctx.fillStyle = palette.ink;
    ctx.fillRect(wallX - 6, originY - 50, 6, 100);

    // Línea de equilibrio
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX, originY - 62);
    ctx.lineTo(originX, originY + 62);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = palette.muted;
    ctx.font = `11px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x = 0', originX, originY + 66);

    // Bloque
    ctx.fillStyle = palette.paper;
    ctx.fillRect(blockLeft, blockY - blockHeight / 2, blockWidth, blockHeight);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(blockLeft, blockY - blockHeight / 2, blockWidth, blockHeight);

    // Vector velocidad
    const vLen = state.v * 20;
    if (Math.abs(vLen) > 1) {
      const ay = blockY - blockHeight / 2 - 12;
      this._drawArrow(blockX, ay, blockX + vLen, ay, this.COLOR_VELOCITY, 'v');
    }
  }

  _drawArrow(x1, y1, x2, y2, color, label) {
    const ctx = this.ctx;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    drawArrowHead(ctx, x2, y2, angle, 10);

    if (label) {
      ctx.font = `italic 600 17px ${FONTS.display}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x2 + 14 * Math.cos(angle), y2 + 14 * Math.sin(angle));
    }
  }

  // ─── Gráficas (posición y energía) ──────────────────────────────────────────

  /** Recuadro con filete de tinta y título en mono */
  _drawGraphFrame(x, y, w, h, title) {
    const { ctx, palette } = this;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.fillStyle = palette.muted;
    ctx.font = `500 10px ${FONTS.mono}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x, y + 8);
  }

  _drawGraphs(state, engine) {
    const history = engine.getHistory();
    const { ctx, W, palette } = this;

    const gap = 14;
    const panelW = (W - 3 * gap) / 2;
    const panelH = this.graphH - gap;
    const x1 = gap;
    const x2 = 2 * gap + panelW;
    const y = this.graphY;

    const isPendulum = state.type === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM;
    this._drawGraphFrame(x1, y, panelW, panelH, isPendulum ? 'ÁNGULO (RAD) VS T' : 'POSICIÓN (M) VS T');
    this._drawGraphFrame(x2, y, panelW, panelH, 'ENERGÍA VS T');

    if (history.length < 2) return;

    const tMin = history[0].t;
    const tSpan = Math.max(history[history.length - 1].t - tMin, 1);

    // Área útil de cada gráfica
    const inner = (x) => ({ x: x + 4, y: y + 26, w: panelW - 8, h: panelH - 34 });
    const g1 = inner(x1);
    const g2 = inner(x2);

    // ─── Posición (q) vs t, con eje cero
    const zeroY = g1.y + g1.h / 2;
    let maxAbsQ = Math.max(0.1, ...history.map(h => Math.abs(h.q)));
    const qScale = (g1.h / 2) / (maxAbsQ * 1.2);

    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g1.x, zeroY);
    ctx.lineTo(g1.x + g1.w, zeroY);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(g1.x, g1.y, g1.w, g1.h);
    ctx.clip();
    ctx.beginPath();
    history.forEach((h, i) => {
      const px = g1.x + ((h.t - tMin) / tSpan) * g1.w;
      const py = zeroY - h.q * qScale;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = this.COLOR_POSITION;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // ─── Energía vs t: base en cero (siempre positiva)
    const baseY = g2.y + g2.h;
    const maxE = Math.max(1, ...history.map(h => h.KE + h.PE));
    const eScale = g2.h / (maxE * 1.1);

    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g2.x, g2.y);
    ctx.lineTo(g2.x, baseY);
    ctx.lineTo(g2.x + g2.w, baseY);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(g2.x, g2.y, g2.w, g2.h);
    ctx.clip();
    [['KE', this.COLOR_KE], ['PE', this.COLOR_PE]].forEach(([key, color]) => {
      ctx.beginPath();
      history.forEach((h, i) => {
        const px = g2.x + ((h.t - tMin) / tSpan) * g2.w;
        const py = baseY - h[key] * eScale;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    });
    ctx.restore();

    // Leyenda
    ctx.font = `italic 600 13px ${FONTS.display}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    [['K', this.COLOR_KE], ['U', this.COLOR_PE]].forEach(([label, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(`— ${label}`, x2 + panelW - 80 + i * 40, y + 14);
    });
  }
}
