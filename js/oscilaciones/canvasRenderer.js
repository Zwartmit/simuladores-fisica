/**
 * @fileoverview Renderizador Canvas para Oscilaciones mecánicas.
 * Dibuja el Péndulo simple o el sistema Masa-Resorte.
 * Muestra gráficos en tiempo real de posición vs tiempo y energía.
 */

import { PhysicsEngineOscilaciones } from './physicsEngine.js';

export class CanvasRendererOscilaciones {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Configuración de visualización
    this.pixelsPerMeter = 100;
    this.pivotX = 0;
    this.pivotY = 0;

    // Colores
    this.COLOR_PENDULUM = '#3b82f6';
    this.COLOR_SPRING = '#10b981';
    this.COLOR_KE = '#fbbf24';
    this.COLOR_PE = '#a855f7';
    this.COLOR_E = '#ef4444';
    this.COLOR_GRAPH_BG = 'rgba(15,23,42,0.8)';

    this._resize();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
    this.W = this.canvas.width;
    this.H = this.canvas.height;

    // Centro superior para péndulo, centro-centro para resorte
    this.pivotX = this.W * 0.5;
    this.pivotY = this.H * 0.2;
  }

  draw(state, engine) {
    this._resize();
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // Fondo espacial/laboratorio
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d1b2a');
    grad.addColorStop(1, '#1b263b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (state.type === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      this._drawPendulum(state, engine);
    } else {
      this._drawSpring(state, engine);
    }

    this._drawGraphs(state, engine);
  }

  // ─── Péndulo ────────────────────────────────────────────────────────────────
  _drawPendulum(state, engine) {
    const { ctx } = this;
    const L_px = engine.L * this.pixelsPerMeter;
    const theta = state.q;

    // Calcular posición de la masa
    const mx = this.pivotX + L_px * Math.sin(theta);
    const my = this.pivotY + L_px * Math.cos(theta);

    // Soporte
    ctx.fillStyle = '#64748b';
    ctx.fillRect(this.pivotX - 40, this.pivotY - 10, 80, 10);
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    // Cuerda
    ctx.beginPath();
    ctx.moveTo(this.pivotX, this.pivotY);
    ctx.lineTo(mx, my);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Masa
    const r = Math.min(25, 10 + engine.m_pend * 5); // Radio basado en masa
    const mGrad = ctx.createRadialGradient(mx - 5, my - 5, 2, mx, my, r);
    mGrad.addColorStop(0, '#bfdbfe');
    mGrad.addColorStop(0.5, this.COLOR_PENDULUM);
    mGrad.addColorStop(1, '#1e3a8a');

    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = mGrad;
    ctx.shadowColor = this.COLOR_PENDULUM;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Vector de velocidad (tangencial)
    const vLen = state.v * 30; // Escalar para visualización
    if (Math.abs(vLen) > 1) {
      const vx = vLen * Math.cos(theta);
      const vy = -vLen * Math.sin(theta);
      this._drawArrow(mx, my, mx + vx, my + vy, '#ef4444', 'v');
    }
  }

  // ─── Resorte ────────────────────────────────────────────────────────────────
  _drawSpring(state, engine) {
    const { ctx } = this;

    // Para resorte, el origen (equilibrio) está en el centro
    const originX = this.W * 0.5;
    const originY = this.H * 0.4;

    // Desplazamiento
    const x_px = state.q * this.pixelsPerMeter;
    const blockX = originX + x_px;
    const blockY = originY;

    const blockWidth = 50 + engine.m_spring * 5;
    const blockHeight = 40;

    // Pared izquierda (soporte del resorte)
    const wallX = originX - 150;

    // Dibujar resorte (zig-zag)
    ctx.beginPath();
    ctx.moveTo(wallX, originY);

    const numCoils = 10;
    const springLen = (blockX - blockWidth / 2) - wallX;
    const coilWidth = springLen / numCoils;

    for (let i = 0; i < numCoils; i++) {
      const cx = wallX + i * coilWidth;
      const nextCx = wallX + (i + 1) * coilWidth;
      const midX = (cx + nextCx) / 2;

      // Arriba y abajo
      ctx.lineTo(midX, originY - 15);
      ctx.lineTo(nextCx, originY + 15);
    }
    ctx.lineTo(blockX - blockWidth / 2, originY);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Pared dibujada sobre el resorte
    ctx.fillStyle = '#475569';
    ctx.fillRect(wallX - 20, originY - 60, 20, 120);

    // Suelo
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wallX - 20, originY + blockHeight / 2 + 2);
    ctx.lineTo(this.W - 50, originY + blockHeight / 2 + 2);
    ctx.stroke();

    // Bloque
    const mGrad = ctx.createLinearGradient(blockX - blockWidth / 2, blockY - blockHeight / 2, blockX + blockWidth / 2, blockY + blockHeight / 2);
    mGrad.addColorStop(0, '#6ee7b7');
    mGrad.addColorStop(1, this.COLOR_SPRING);

    ctx.fillStyle = mGrad;
    ctx.shadowColor = this.COLOR_SPRING;
    ctx.shadowBlur = 10;
    ctx.fillRect(blockX - blockWidth / 2, blockY - blockHeight / 2, blockWidth, blockHeight);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.strokeRect(blockX - blockWidth / 2, blockY - blockHeight / 2, blockWidth, blockHeight);

    // Línea de equilibrio
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(originX, originY - 80);
    ctx.lineTo(originX, originY + 80);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.fillText('x = 0', originX - 10, originY + 95);

    // Vector velocidad
    const vLen = state.v * 20;
    if (Math.abs(vLen) > 1) {
      this._drawArrow(blockX, blockY - blockHeight / 2 - 5, blockX + vLen, blockY - blockHeight / 2 - 5, '#ef4444', 'v');
    }
  }

  _drawArrow(x1, y1, x2, y2, color, label) {
    const ctx = this.ctx;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headlen = 10;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    if (label) {
      ctx.fillStyle = color;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(label, x2 + 5 * Math.cos(angle), y2 + 5 * Math.sin(angle));
    }
  }

  // ─── Gráficas (Posición y Energía) ──────────────────────────────────────────
  _drawGraphs(state, engine) {
    const history = engine.getHistory();
    if (history.length < 2) return;

    const { ctx, W, H } = this;

    const panelW = W * 0.8;
    const panelH = 120;
    const panelX = (W - panelW) / 2;
    const panelY = H - panelH - 20;

    // Fondo del panel
    ctx.fillStyle = this.COLOR_GRAPH_BG;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.stroke();

    // Dividir en dos gráficas: Posición (Izquierda) y Energía (Derecha)
    const midX = panelX + panelW / 2;
    ctx.beginPath();
    ctx.moveTo(midX, panelY + 10);
    ctx.lineTo(midX, panelY + panelH - 10);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Encontrar min/max de tiempo
    const tMin = history[0].t;
    const tMax = history[history.length - 1].t;
    const tSpan = Math.max(tMax - tMin, 1); // Al menos 1s de span

    // ─── Gráfica Izquierda: Posición (q) vs t
    const g1X = panelX + 10;
    const g1Y = panelY + 20;
    const g1W = (panelW / 2) - 20;
    const g1H = panelH - 40;

    // Eje cero para posición
    const q0_y = g1Y + g1H / 2;

    // Determinar escala vertical para Q
    let maxAbsQ = 0;
    history.forEach(h => maxAbsQ = Math.max(maxAbsQ, Math.abs(h.q)));
    maxAbsQ = Math.max(maxAbsQ, 0.1); // Evitar división por 0
    const qScale = (g1H / 2) / (maxAbsQ * 1.2);

    // Dibujar línea cero
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(g1X, q0_y); ctx.lineTo(g1X + g1W, q0_y); ctx.stroke();

    // Dibujar curva Q
    ctx.beginPath();
    history.forEach((h, i) => {
      const px = g1X + ((h.t - tMin) / tSpan) * g1W;
      const py = q0_y - h.q * qScale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = state.type === 'pendulum' ? this.COLOR_PENDULUM : this.COLOR_SPRING;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiquetas Q
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.type === 'pendulum' ? 'Ángulo (rad) vs t' : 'Posición (m) vs t', g1X, g1Y - 5);

    // ─── Gráfica Derecha: Energía vs t
    const g2X = midX + 10;
    const g2Y = panelY + 20;
    const g2W = (panelW / 2) - 20;
    const g2H = panelH - 40;

    // Base cero para energía (siempre positiva)
    const e0_y = g2Y + g2H;

    // Escala vertical E
    let maxE = 0;
    history.forEach(h => maxE = Math.max(maxE, h.KE + h.PE));
    maxE = Math.max(maxE, 1);
    const eScale = g2H / (maxE * 1.1);

    // Dibujar KE (Cinetica)
    ctx.beginPath();
    history.forEach((h, i) => {
      const px = g2X + ((h.t - tMin) / tSpan) * g2W;
      const py = e0_y - h.KE * eScale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = this.COLOR_KE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dibujar PE (Potencial)
    ctx.beginPath();
    history.forEach((h, i) => {
      const px = g2X + ((h.t - tMin) / tSpan) * g2W;
      const py = e0_y - h.PE * eScale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = this.COLOR_PE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Etiquetas Energía
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Energía vs t', g2X, g2Y - 5);

    // Leyenda de energía dentro del panel
    ctx.fillStyle = this.COLOR_KE; ctx.fillText('■ Cinética', g2X + g2W - 120, g2Y - 5);
    ctx.fillStyle = this.COLOR_PE; ctx.fillText('■ Potencial', g2X + g2W - 60, g2Y - 5);
  }
}
