/**
 * @fileoverview Renderizador Canvas del laboratorio de Conservación de la Energía
 * (estilo "cuaderno"). Arriba, la pista y el bloque sobre papel milimetrado; abajo, dos
 * recuadros de datos: barras de energía K, U, Q y E, y su evolución en el tiempo.
 * Cinética en verde, potencial en azul, térmica en rojo y total en tinta negra.
 */

import { readInkPalette, FONTS, drawArrowHead, drawHatchedGround } from '../shared/inkPalette.js';

export class CanvasRendererEnergia {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = readInkPalette();

    // Colores de energía (tintas)
    this.COLOR_KE = this.palette.green;
    this.COLOR_PE = this.palette.blue;
    this.COLOR_THERMAL = this.palette.red;
    this.COLOR_TOTAL = this.palette.ink;

    this.scale = 30;  // px por metro (se recalcula en _resize)
    this.W = 0;
    this.H = 0;
    this._dpr = 0;

    this._resize();
  }

  /** Ajusta el canvas al tamaño real del contenedor y recalcula la geometría de la escena. */
  _resize(engine) {
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

    // Zona inferior para los recuadros de datos y zona superior para la pista
    this.panelH = Math.min(170, Math.max(112, this.H * 0.3));
    this.panelY = this.H - this.panelH;
    this.groundY = this.panelY - 24;
    this.originX = this.W / 2;
    this.originY = this.groundY;

    const A = engine?.rampAmplitude ?? 4;
    const halfWidth = engine?.rampWidth ?? 10;
    const scaleX = (this.W - 56) / (2 * halfWidth);
    const scaleY = (this.groundY - 48) / (2 * A + 1);
    this.scale = Math.max(8, Math.min(scaleX, scaleY, 44));
  }

  /** Convierte coordenadas del mundo (m) a píxeles del canvas */
  worldToCanvas(wx, wy) {
    return {
      cx: this.originX + wx * this.scale,
      cy: this.originY - wy * this.scale,
    };
  }

  /**
   * Dibuja el frame completo.
   * @param {Object} state   Estado del motor físico (getState())
   * @param {Object} engine  Instancia del PhysicsEngineEnergia
   */
  draw(state, engine) {
    this._resize(engine);
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    this._drawBackground();
    this._drawRamp(engine);
    this._drawHeightReference(state);
    if (state.v > 0.1) this._drawVelocityArrow(state, engine);
    this._drawBlock(state);

    // Recuadros de datos (parte inferior)
    const gap = 14;
    const panelW = (W - 3 * gap) / 2;
    this._drawEnergyBars(state, engine._E0, gap, this.panelY, panelW, this.panelH - gap);
    this._drawEnergyChart(engine.getEnergyHistory(), engine._E0, 2 * gap + panelW, this.panelY, panelW, this.panelH - gap);
  }

  // ─── Helpers de dibujo ──────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, W, H, palette } = this;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, W, H);

    // Papel milimetrado alineado con los metros, solo sobre la zona de la pista
    ctx.lineWidth = 1;
    const step = this.scale;
    for (let x = this.originX % step, i = 0; x < W; x += step, i++) {
      ctx.strokeStyle = palette.graphMinor;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.groundY);
      ctx.stroke();
    }
    for (let y = this.originY; y > 0; y -= step) {
      ctx.strokeStyle = palette.graphMinor;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  _drawRamp(engine) {
    const { ctx, palette } = this;
    const N = 120; // puntos de la curva

    // Curva de la pista: θ de −π a π (x = W·θ/π, y = A·(1 − cos θ))
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const angle = -Math.PI + (2 * Math.PI * i) / N;
      const { cx, cy } = this.worldToCanvas(engine.getRampX(angle), engine.getRampHeight(angle));
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }

    // Cuerpo de la pista hacia abajo: la curva termina en el borde derecho
    const { cx: rightX } = this.worldToCanvas(engine.getRampX(Math.PI), 0);
    const { cx: leftX } = this.worldToCanvas(engine.getRampX(-Math.PI), 0);
    ctx.lineTo(rightX, this.groundY + 8);
    ctx.lineTo(leftX, this.groundY + 8);
    ctx.closePath();

    ctx.fillStyle = 'rgba(27, 26, 23, 0.06)';
    ctx.fill();

    // Superficie en tinta (solo la curva)
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const angle = -Math.PI + (2 * Math.PI * i) / N;
      const { cx, cy } = this.worldToCanvas(engine.getRampX(angle), engine.getRampHeight(angle));
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Suelo con rayado
    drawHatchedGround(ctx, palette, 0, this.W, this.groundY);
  }

  _drawBlock(state) {
    const { ctx, palette } = this;
    const { cx, cy } = this.worldToCanvas(state.x, state.h);
    const r = 12;

    ctx.fillStyle = palette.paper;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();

    // Velocidad dentro del bloque
    ctx.fillStyle = palette.ink;
    ctx.font = `500 10px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.v.toFixed(1), cx, cy);
  }

  _drawVelocityArrow(state, engine) {
    const { ctx, palette } = this;
    const { cx, cy } = this.worldToCanvas(state.x, state.h);

    // Dirección tangencial a la pista: (1, dy/dx) normalizada, en el sentido del movimiento
    const slope = engine.getSlope(state.x);
    const len = Math.sqrt(1 + slope * slope);
    const sign = engine.vx < 0 ? -1 : 1;

    const arrowLen = Math.min(state.v * 8, 80);
    const ex = cx + sign * (1 / len) * arrowLen;
    const ey = cy - sign * (slope / len) * arrowLen;

    ctx.strokeStyle = palette.blue;
    ctx.fillStyle = palette.blue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    drawArrowHead(ctx, ex, ey, Math.atan2(ey - cy, ex - cx), 11);

    ctx.font = `italic 600 17px ${FONTS.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('v', ex + 8, ey - 6);
  }

  _drawHeightReference(state) {
    const { ctx, palette } = this;
    const { cx, cy } = this.worldToCanvas(state.x, state.h);

    // Línea vertical punteada hasta el suelo y cota de altura
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 12);
    ctx.lineTo(cx, this.groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.muted;
    ctx.font = `11px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`h = ${state.h.toFixed(2)} m`, cx, cy - 16);
  }

  /** Recuadro de datos: título con filete de tinta */
  _drawPanelFrame(x, y, w, h, title) {
    const { ctx, palette } = this;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();

    ctx.fillStyle = palette.muted;
    ctx.font = `500 10px ${FONTS.mono}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x, y + 8);
  }

  /** Barras de energía en tiempo real (K, U, Q y total) */
  _drawEnergyBars(state, E0, x, y, w, h) {
    const { ctx, palette } = this;
    this._drawPanelFrame(x, y, w, h, 'ENERGÍA EN TIEMPO REAL');
    if (E0 === 0) return;

    const bars = [
      { label: 'K', value: state.KE, color: this.COLOR_KE },
      { label: 'U', value: state.PE, color: this.COLOR_PE },
      { label: 'Q', value: state.Q, color: this.COLOR_THERMAL },
      { label: 'E', value: state.E, color: this.COLOR_TOTAL },
    ];

    const top = y + 26;
    const rowH = Math.min(22, (h - 30) / bars.length);
    const labelW = 18;
    const valueW = 64;
    const trackX = x + labelW;
    const trackW = Math.max(20, w - labelW - valueW);
    const barH = Math.max(6, rowH - 8);

    bars.forEach((bar, i) => {
      const by = top + i * rowH;
      const fraction = Math.max(0, Math.min(1, bar.value / E0));

      ctx.fillStyle = bar.color;
      ctx.font = `italic 600 14px ${FONTS.display}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(bar.label, x, by + barH / 2);

      ctx.strokeStyle = palette.rule;
      ctx.lineWidth = 1;
      ctx.strokeRect(trackX + 0.5, by + 0.5, trackW, barH);

      ctx.fillStyle = bar.color;
      ctx.fillRect(trackX + 1, by + 1, Math.max(0, fraction * trackW - 1), barH - 1);

      ctx.fillStyle = bar.color;
      ctx.font = `500 11px ${FONTS.mono}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${bar.value.toFixed(1)} J`, x + w, by + barH / 2);
    });
  }

  /** Evolución temporal de K, U y Q (relativa a E₀) */
  _drawEnergyChart(history, E0, x, y, w, h) {
    const { ctx, palette } = this;
    this._drawPanelFrame(x, y, w, h, 'ENERGÍA vs TIEMPO');
    if (history.length < 2 || E0 === 0) return;

    const innerX = x + 4;
    const innerY = y + 26;
    const innerW = w - 8;
    const innerH = h - 44;
    const maxT = Math.max(history[history.length - 1].t, 0.1);

    // Ejes
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(innerX, innerY + innerH);
    ctx.lineTo(innerX + innerW, innerY + innerH);
    ctx.stroke();

    const series = [
      { key: 'KE', color: this.COLOR_KE },
      { key: 'PE', color: this.COLOR_PE },
      { key: 'Q', color: this.COLOR_THERMAL },
    ];

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerW, innerH);
    ctx.clip();
    series.forEach(s => {
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.8;
      history.forEach((pt, i) => {
        const px = innerX + (pt.t / maxT) * innerW;
        const py = innerY + innerH - (pt[s.key] / E0) * innerH;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
    ctx.restore();

    // Leyenda
    ctx.font = `italic 600 13px ${FONTS.display}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    [['K', this.COLOR_KE], ['U', this.COLOR_PE], ['Q', this.COLOR_THERMAL]].forEach(([label, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(`— ${label}`, innerX + innerW - 118 + i * 40, y + 14);
    });
  }
}
