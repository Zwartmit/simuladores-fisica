/**
 * @fileoverview Renderizador Canvas para la simulación de Dinámica rotacional.
 * Dibuja el cuerpo rígido rotando, los vectores de torque, velocidad angular
 * y momento angular, junto con gráficas de ω(t) y L(t) en tiempo real.
 */

import { PhysicsEngineRotacion } from './physicsEngine.js';

export class CanvasRendererRotacion {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Paleta de colores
    this.COLOR_TORQUE = '#f59e0b'; // Naranja ámbar → torque τ
    this.COLOR_OMEGA = '#10b981'; // Verde          → velocidad angular ω
    this.COLOR_ALPHA = '#ef4444'; // Rojo           → aceleración angular α
    this.COLOR_ANGULAR_M = '#a855f7'; // Púrpura        → momento angular L
    this.COLOR_BODY = '#3b82f6'; // Azul           → cuerpo
    this.COLOR_SPOKE = '#60a5fa'; // Azul claro     → radio/radio indicador

    this._resize();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    // Centro del cuerpo en el canvas
    this.cx = this.W * 0.42;
    this.cy = this.H * 0.50;
    // Radio visual del cuerpo (px)
    this.R = Math.min(this.W, this.H) * 0.22;
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
    this._drawOmegaChart(engine.getHistory());
    this._drawInfoPanel(state, engine);
  }

  // ─── Fondo ──────────────────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, W, H } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#090f1a');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid sutil
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  // ─── Cuerpo rígido ──────────────────────────────────────────────────────────

  _drawBody(state, engine) {
    const { ctx, cx, cy, R } = this;
    const theta = state.theta;

    // Eje de rotación (punto central)
    ctx.shadowColor = 'rgba(59,130,246,0.6)';
    ctx.shadowBlur = 20;

    switch (engine.bodyType) {
      case PhysicsEngineRotacion.BODIES.DISK:
        this._drawDisk(theta, engine.radius);
        break;
      case PhysicsEngineRotacion.BODIES.RING:
        this._drawRing(theta, engine.radius);
        break;
      case PhysicsEngineRotacion.BODIES.ROD:
        this._drawRod(theta, engine.radius);
        break;
    }

    ctx.shadowBlur = 0;

    // Eje central
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  _drawDisk(theta, radius) {
    const { ctx, cx, cy, R } = this;
    // Disco sólido con gradiente
    const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    grad.addColorStop(0, '#60a5fa');
    grad.addColorStop(1, '#1d4ed8');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Radios indicadores de rotación (cada 60°)
    for (let i = 0; i < 6; i++) {
      const a = theta + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
      ctx.strokeStyle = i === 0 ? '#fbbf24' : 'rgba(147,197,253,0.35)';
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.stroke();
    }
    // Círculo interior hueco
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  }

  _drawRing(theta, radius) {
    const { ctx, cx, cy, R } = this;
    // Aro
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = R * 0.25;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Radio indicador
    const a = theta;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Radios estructurales (4 rayos)
    for (let i = 0; i < 4; i++) {
      const ang = theta + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      ctx.strokeStyle = 'rgba(96,165,250,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  _drawRod(theta, radius) {
    const { ctx, cx, cy, R } = this;
    const dx = Math.cos(theta) * R;
    const dy = Math.sin(theta) * R;

    // Barra
    ctx.beginPath();
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.5, '#60a5fa');
    grad.addColorStop(1, '#1d4ed8');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Borde luminoso
    ctx.beginPath();
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.strokeStyle = 'rgba(147,197,253,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Masas en los extremos
    [[-1, 1]].forEach(_ => {
      [[cx - dx, cy - dy], [cx + dx, cy + dy]].forEach(([ex, ey]) => {
        ctx.beginPath();
        ctx.arc(ex, ey, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });
  }

  // ─── Vectores de torque, ω, L ───────────────────────────────────────────────

  _drawVectors(state) {
    const { ctx, cx, cy, R, W, H } = this;
    const { omega, alpha, tau, L } = state;

    // Vector de torque τ (arco curvado alrededor del cuerpo)
    if (Math.abs(tau) > 0.01) {
      this._drawCurvedArrow(cx, cy, R + 30, tau > 0 ? 1 : -1, this.COLOR_TORQUE, `τ = ${tau.toFixed(1)} N·m`);
    }

    // Vector de velocidad angular ω (flecha derecha fuera del cuerpo)
    const omegaLen = Math.min(Math.abs(omega) * 20, 140);
    if (omegaLen > 2) {
      this._drawStraightArrow(cx + R + 40, cy, omegaLen, 0, this.COLOR_OMEGA, `ω = ${omega.toFixed(2)} rad/s`);
    }

    // Vector de aceleración angular α (abajo)
    const alphaLen = Math.min(Math.abs(alpha) * 15, 100);
    if (alphaLen > 2) {
      this._drawStraightArrow(cx + R + 40, cy + 50, alphaLen, 0, this.COLOR_ALPHA, `α = ${alpha.toFixed(2)} rad/s²`);
    }

    // Momento angular L (icono del eje z, arriba del centro)
    ctx.fillStyle = this.COLOR_ANGULAR_M;
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`L = ${L.toFixed(2)} kg·m²/s`, cx, cy - R - 30);
  }

  /** Flecha curva (arco) para representar el torque */
  _drawCurvedArrow(cx, cy, r, direction, color, label) {
    const { ctx } = this;
    const startAngle = direction > 0 ? Math.PI * 0.55 : Math.PI * 0.45;
    const endAngle = direction > 0 ? Math.PI * 0.05 : Math.PI * 0.95;

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle, direction < 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Punta de flecha en el extremo del arco
    const tipAngle = direction > 0 ? endAngle : endAngle;
    const tx = cx + Math.cos(tipAngle) * r;
    const ty = cy + Math.sin(tipAngle) * r;
    const arrowDir = (tipAngle + direction * Math.PI * 0.5);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + 10 * Math.cos(arrowDir - 0.4), ty + 10 * Math.sin(arrowDir - 0.4));
    ctx.lineTo(tx + 10 * Math.cos(arrowDir + 0.4), ty + 10 * Math.sin(arrowDir + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Etiqueta
    ctx.fillStyle = color;
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.textAlign = direction > 0 ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, cx, cy - r - 8);
  }

  /** Flecha recta horizontal para ω y α */
  _drawStraightArrow(x, y, len, angle, color, label) {
    const { ctx } = this;
    const ex = x + len * Math.cos(angle);
    const ey = y + len * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Punta
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 10 * Math.cos(angle - 0.4), ey - 10 * Math.sin(angle - 0.4));
    ctx.lineTo(ex - 10 * Math.cos(angle + 0.4), ey - 10 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Etiqueta
    ctx.fillStyle = color;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex + 8, ey);
  }

  // ─── Gráfica temporal ω(t) ──────────────────────────────────────────────────

  _drawOmegaChart(history) {
    if (history.length < 2) return;
    const { ctx, W, H } = this;

    const chartW = 210;
    const chartH = 110;
    const chartX = W - chartW - 20;
    const chartY = 20;

    // Fondo del panel
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(chartX, chartY, chartW, chartH, 12);
    ctx.fill();
    ctx.stroke();

    // Título
    ctx.fillStyle = 'rgba(100,116,139,1)';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ω(t)  y  L(t)', chartX + 10, chartY + 8);

    const iX = chartX + 10;
    const iY = chartY + 24;
    const iW = chartW - 20;
    const iH = chartH - 34;

    const maxT = Math.max(history[history.length - 1].t, 0.1);
    const maxOmega = Math.max(...history.map(p => Math.abs(p.omega)), 0.1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(iX, iY, iW, iH);
    ctx.clip();

    // Línea ω
    ctx.beginPath();
    ctx.strokeStyle = this.COLOR_OMEGA;
    ctx.lineWidth = 2;
    history.forEach((pt, i) => {
      const px = iX + (pt.t / maxT) * iW;
      const py = iY + iH - (Math.abs(pt.omega) / maxOmega) * iH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Línea L (normalizada al mismo espacio)
    const maxL = Math.max(...history.map(p => Math.abs(p.L)), 0.1);
    ctx.beginPath();
    ctx.strokeStyle = this.COLOR_ANGULAR_M;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    history.forEach((pt, i) => {
      const px = iX + (pt.t / maxT) * iW;
      const py = iY + iH - (Math.abs(pt.L) / maxL) * iH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Leyenda
    [[this.COLOR_OMEGA, '— ω'], [this.COLOR_ANGULAR_M, '-- L']].forEach(([c, label], i) => {
      ctx.fillStyle = c;
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, iX + i * 60, chartY + chartH - 6);
    });
  }

  // ─── Panel de datos (esquina inferior izquierda) ─────────────────────────────

  _drawInfoPanel(state, engine) {
    const { ctx, H } = this;

    const panelX = 20;
    const panelY = H - 175;
    const panelW = 200;
    const panelH = 155;

    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(100,116,139,1)';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MAGNITUDES INSTANTÁNEAS', panelX + 10, panelY + 10);

    const rows = [
      { label: 'I (inercia)', value: `${state.I.toFixed(3)} kg·m²`, color: this.COLOR_BODY },
      { label: 'τ (torque)', value: `${state.tau.toFixed(2)} N·m`, color: this.COLOR_TORQUE },
      { label: 'α (aceler.)', value: `${state.alpha.toFixed(3)} rad/s²`, color: this.COLOR_ALPHA },
      { label: 'ω (angular)', value: `${state.omega.toFixed(3)} rad/s`, color: this.COLOR_OMEGA },
      { label: 'L (moment.)', value: `${state.L.toFixed(3)} kg·m²/s`, color: this.COLOR_ANGULAR_M },
    ];

    rows.forEach((row, i) => {
      const y = panelY + 26 + i * 24;
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.font = '10px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(row.label, panelX + 10, y);

      ctx.fillStyle = row.color;
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(row.value, panelX + panelW - 10, y);
    });
  }
}
