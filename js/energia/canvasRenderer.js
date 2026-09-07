/**
 * @fileoverview Renderizador Canvas para la simulación de Conservación de la Energía.
 * Dibuja la rampa senoidal, el bloque deslizante, los vectores de energía y las gráficas
 * de barras en tiempo real.
 */

export class CanvasRendererEnergia {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Colores de energía
    this.COLOR_KE      = '#10b981'; // Verde esmeralda → cinética
    this.COLOR_PE      = '#3b82f6'; // Azul accent     → potencial
    this.COLOR_THERMAL = '#ef4444'; // Rojo            → térmica/disipada
    this.COLOR_TOTAL   = '#a855f7'; // Púrpura         → total
    this.COLOR_RAMP    = '#334155'; // Gris azulado    → rampa

    // Área de las gráficas de barras (píxeles desde la izquierda)
    this.BAR_AREA_WIDTH = 200;

    // Parámetros de zoom y panorama de la rampa
    this.scale = 40; // px por metro

    this._resize();
  }

  /** Ajusta el canvas al tamaño real del contenedor */
  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  || 800;
    this.canvas.height = rect.height || 600;
    this.W = this.canvas.width;
    this.H = this.canvas.height;

    // Punto de origen del mundo en el canvas (centro-inferior)
    this.originX = this.W * 0.5;
    this.originY = this.H * 0.80;
  }

  /** Convierte coordenadas del mundo (m) a píxeles del canvas */
  worldToCanvas(wx, wy) {
    return {
      cx: this.originX + wx * this.scale,
      cy: this.originY - wy * this.scale
    };
  }

  /**
   * Dibuja el frame completo.
   * @param {Object} state   Estado del motor físico (getState())
   * @param {Object} engine  Instancia del PhysicsEngineEnergia
   * @param {boolean} showPrediction Si se muestra la flecha de predicción
   * @param {number|null} predictedKE Predicción del alumno (J)
   */
  draw(state, engine, showPrediction = false, predictedKE = null) {
    this._resize();
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // Fondo
    this._drawBackground();

    // Rampa
    this._drawRamp(engine);

    // Bloque deslizante
    this._drawBlock(state);

    // Vectores de velocidad
    if (state.v > 0.1) this._drawVelocityArrow(state, engine);

    // Gráficas de barras energéticas (esquina inferior-izquierda)
    this._drawEnergyBars(state, engine._E0);

    // Línea de referencia de altura
    this._drawHeightReference(state);

    // Historial de energía (mini-gráfica temporal) - esquina superior-derecha
    this._drawEnergyChart(engine.getEnergyHistory(), engine._E0);
  }

  // ─── Helpers de dibujo ──────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, W, H } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   '#090f1a');
    grad.addColorStop(1,   '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid sutil
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = 1;
    const step = this.scale;
    for (let x = this.originX % step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = this.originY % step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  _drawRamp(engine) {
    const { ctx } = this;
    const N = 120; // puntos de la curva

    // Superficie de la rampa
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const angle = -Math.PI + (2 * Math.PI * i) / N;
      const wx = engine.getRampX(angle);
      const wy = engine.getRampHeight(angle);
      const { cx, cy } = this.worldToCanvas(wx, wy);
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }

    // Rellenar la pared interior de la rampa hacia abajo
    const { cx: rightX, cy: rightY } = this.worldToCanvas(engine.getRampX(-Math.PI), 0);
    const { cx: leftX,  cy: leftY  } = this.worldToCanvas(engine.getRampX( Math.PI), 0);
    ctx.lineTo(rightX, this.originY + 20);
    ctx.lineTo(leftX,  this.originY + 20);
    ctx.closePath();

    const rampGrad = ctx.createLinearGradient(0, this.originY - engine.rampAmplitude * 2 * this.scale, 0, this.originY);
    rampGrad.addColorStop(0, '#1e293b');
    rampGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle   = rampGrad;
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Suelo
    ctx.strokeStyle = '#334155';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.originY);
    ctx.lineTo(this.W, this.originY);
    ctx.stroke();
  }

  _drawBlock(state) {
    const { ctx } = this;
    const { cx, cy } = this.worldToCanvas(state.x, state.h);
    const r = 14;

    // Sombra del bloque
    ctx.shadowColor = 'rgba(59,130,246,0.5)';
    ctx.shadowBlur  = 18;

    // Bloque (cuadrado redondeado)
    ctx.beginPath();
    ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 5);
    const blockGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r * 1.4);
    blockGrad.addColorStop(0, '#60a5fa');
    blockGrad.addColorStop(1, '#2563eb');
    ctx.fillStyle = blockGrad;
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Velocímetro interno en el bloque
    ctx.fillStyle   = 'rgba(255,255,255,0.9)';
    ctx.font        = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.v.toFixed(1), cx, cy);
  }

  _drawVelocityArrow(state, engine) {
    const { ctx } = this;
    const { cx, cy } = this.worldToCanvas(state.x, state.h);

    // Dirección tangencial a la rampa (dX/dθ, dY/dθ) normalizados
    const dxda = engine.rampWidth      * Math.cos(state.angle);
    const dyda = -engine.rampAmplitude * Math.sin(state.angle);
    const len  = Math.sqrt(dxda*dxda + dyda*dyda);
    const sign = engine.omega < 0 ? -1 : 1;

    const arrowLen = Math.min(state.v * 8, 80);
    const ex = cx + sign * (dxda / len) * arrowLen;
    const ey = cy - sign * (dyda / len) * arrowLen;

    ctx.strokeStyle = this.COLOR_KE;
    ctx.lineWidth   = 3;
    ctx.shadowColor = this.COLOR_KE;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Punta de flecha
    const angle = Math.atan2(ey - cy, ex - cx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 12*Math.cos(angle-0.4), ey - 12*Math.sin(angle-0.4));
    ctx.lineTo(ex - 12*Math.cos(angle+0.4), ey - 12*Math.sin(angle+0.4));
    ctx.closePath();
    ctx.fillStyle = this.COLOR_KE;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  _drawHeightReference(state) {
    const { ctx } = this;
    const { cx, cy } = this.worldToCanvas(state.x, state.h);

    // Línea vertical hasta el suelo
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 14);
    ctx.lineTo(cx, this.originY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Etiqueta de altura
    ctx.fillStyle    = 'rgba(148,163,184,0.8)';
    ctx.font         = '11px Outfit, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`h = ${state.h.toFixed(2)} m`, cx, cy - 16);
  }

  /** Gráficas de barras de energía en tiempo real */
  _drawEnergyBars(state, E0) {
    const { ctx, H } = this;
    const panelX = 20;
    const panelY = H - 190;
    const panelW = 190;
    const panelH = 170;

    // Panel de fondo glassmorphism
    ctx.fillStyle   = 'rgba(15,23,42,0.85)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // Título
    ctx.fillStyle    = 'rgba(100,116,139,1)';
    ctx.font         = 'bold 10px Outfit, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ENERGÍA EN TIEMPO REAL', panelX + 12, panelY + 10);

    if (E0 === 0) return;

    const bars = [
      { label: 'Cinética (K)',   value: state.KE, color: this.COLOR_KE },
      { label: 'Potencial (U)', value: state.PE, color: this.COLOR_PE },
      { label: 'Térmica (Q)',   value: state.Q,  color: this.COLOR_THERMAL },
      { label: 'Total (E)',     value: state.E,  color: this.COLOR_TOTAL },
    ];

    const barStartY = panelY + 28;
    const barH      = 20;
    const barGap    = 10;
    const barMaxW   = panelW - 24;
    const labelW    = 90;

    bars.forEach((bar, i) => {
      const y       = barStartY + i * (barH + barGap);
      const fraction = Math.max(0, Math.min(1, bar.value / E0));
      const bw       = fraction * (barMaxW - labelW);

      // Label
      ctx.fillStyle    = 'rgba(203,213,225,0.9)';
      ctx.font         = '10px Outfit, sans-serif';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(bar.label, panelX + 12, y + barH / 2);

      // Barra de fondo
      ctx.fillStyle = 'rgba(30,41,59,0.6)';
      ctx.beginPath();
      ctx.roundRect(panelX + 12 + labelW, y, barMaxW - labelW, barH, 4);
      ctx.fill();

      // Barra de valor
      if (bw > 2) {
        const barGrad = ctx.createLinearGradient(panelX + 12 + labelW, y, panelX + 12 + labelW + bw, y);
        barGrad.addColorStop(0, bar.color);
        barGrad.addColorStop(1, bar.color + '99');
        ctx.fillStyle = barGrad;
        ctx.shadowColor = bar.color;
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.roundRect(panelX + 12 + labelW, y, bw, barH, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Valor numérico
      ctx.fillStyle    = bar.color;
      ctx.font         = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign    = 'right';
      ctx.fillText(`${bar.value.toFixed(1)}J`, panelX + 12 + barMaxW, y + barH / 2);
    });
  }

  /** Mini-gráfica temporal de energía (esquina superior derecha) */
  _drawEnergyChart(history, E0) {
    if (history.length < 2 || E0 === 0) return;
    const { ctx, W } = this;

    const chartW = 200;
    const chartH = 100;
    const chartX = W - chartW - 20;
    const chartY = 20;

    // Panel
    ctx.fillStyle   = 'rgba(15,23,42,0.85)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(chartX, chartY, chartW, chartH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle    = 'rgba(100,116,139,1)';
    ctx.font         = 'bold 10px Outfit, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('GRÁFICA DE ENERGÍA (t)', chartX + 10, chartY + 8);

    const innerX = chartX + 10;
    const innerY = chartY + 22;
    const innerW = chartW - 20;
    const innerH = chartH - 30;

    const maxT = Math.max(history[history.length - 1].t, 0.1);

    const series = [
      { key: 'KE', color: this.COLOR_KE },
      { key: 'PE', color: this.COLOR_PE },
      { key: 'Q',  color: this.COLOR_THERMAL },
    ];

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerW, innerH);
    ctx.clip();

    series.forEach(s => {
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = 1.5;
      history.forEach((pt, i) => {
        const px = innerX + (pt.t / maxT) * innerW;
        const py = innerY + innerH - (pt[s.key] / E0) * innerH;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    });

    ctx.restore();

    // Leyenda
    const legendItems = [
      { label: 'K', color: this.COLOR_KE },
      { label: 'U', color: this.COLOR_PE },
      { label: 'Q', color: this.COLOR_THERMAL },
    ];
    legendItems.forEach((item, i) => {
      const lx = innerX + i * 40;
      const ly = chartY + chartH - 10;
      ctx.fillStyle    = item.color;
      ctx.font         = 'bold 10px Outfit, sans-serif';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`— ${item.label}`, lx, ly);
    });
  }
}
