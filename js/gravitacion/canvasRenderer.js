/**
 * @fileoverview Renderizador Canvas para la simulación de Gravitación universal.
 * Dibuja el sistema estrella-planeta: trayectoria orbital, vectores de fuerza
 * y velocidad, panel de energía, y tabla de Kepler III en tiempo real.
 */

export class CanvasRendererGravitacion {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Colores
    this.COLOR_STAR = '#fbbf24'; // Amarillo dorado → estrella
    this.COLOR_PLANET = '#60a5fa'; // Azul            → planeta
    this.COLOR_ORBIT = '#1e3a5f'; // Azul oscuro     → trayectoria
    this.COLOR_FORCE = '#ef4444'; // Rojo            → fuerza gravitacional
    this.COLOR_VELOCITY = '#10b981'; // Verde           → velocidad
    this.COLOR_ENERGY = '#a855f7'; // Púrpura         → energía total

    this._resize();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    // Centro del sistema en el canvas
    this.cx = this.W * 0.47;
    this.cy = this.H * 0.50;
    // Factor de escala: 1 unidad de mundo = scale px
    this.scale = Math.min(this.W, this.H) / 500;
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
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    this._drawBackground();
    this._drawOrbitPath(engine.getOrbitPath());
    this._drawStar();
    this._drawPlanet(state);
    this._drawVectors(state);
    this._drawInfoPanel(state, engine);
    this._drawKeplerPanel(engine.getKeplerLog());
  }

  // ─── Fondo espacial ──────────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, W, H } = this;

    // Gradiente de fondo
    const grad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, Math.max(W, H));
    grad.addColorStop(0, '#0d1b2a');
    grad.addColorStop(0.5, '#090f1a');
    grad.addColorStop(1, '#060b14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Estrellas de fondo (pseudo-random fijo por semilla)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const stars = [[42, 87], [185, 34], [320, 210], [90, 450], [700, 120], [550, 380],
    [130, 300], [450, 80], [670, 500], [230, 500], [370, 430], [610, 220],
    [80, 180], [480, 310], [730, 70], [290, 140], [620, 440], [160, 390],
    [510, 160], [350, 490], [75, 520], [430, 250], [680, 340], [200, 60]];
    stars.forEach(([sx, sy]) => {
      const r = 0.8 + ((sx * sy) % 7) * 0.2;
      ctx.beginPath();
      ctx.arc(sx % W, sy % H, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ─── Trayectoria orbital ─────────────────────────────────────────────────────

  _drawOrbitPath(path) {
    if (path.length < 2) return;
    const { ctx } = this;

    ctx.beginPath();
    path.forEach((pt, i) => {
      const { x, y } = this.w2c(pt.x, pt.y);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(59,130,246,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ─── Estrella central ────────────────────────────────────────────────────────

  _drawStar() {
    const { ctx, cx, cy } = this;
    const r = 22;

    // Halo exterior
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3);
    halo.addColorStop(0, 'rgba(251,191,36,0.3)');
    halo.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo de la estrella
    const grad = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, r);
    grad.addColorStop(0, '#fff7ed');
    grad.addColorStop(0.4, '#fbbf24');
    grad.addColorStop(1, '#d97706');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ─── Planeta ─────────────────────────────────────────────────────────────────

  _drawPlanet(state) {
    const { ctx } = this;
    const { x, y } = this.w2c(state.x, state.y);
    const r = 9;

    const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r);
    grad.addColorStop(0, '#bfdbfe');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(1, '#1e40af');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Velocímetro encima del planeta
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${state.v.toFixed(1)} u/s`, x, y - r - 3);
  }

  // ─── Vectores de fuerza y velocidad ─────────────────────────────────────────

  _drawVectors(state) {
    const { ctx } = this;
    const pCanvas = this.w2c(state.x, state.y);

    // Velocidad (verde) — tangente a la órbita
    const vScale = 3;
    const vLen = Math.min(state.v * vScale, 80);
    const vAngle = Math.atan2(-state.vy, state.vx); // invertir Y para canvas
    this._arrow(pCanvas.x, pCanvas.y, vLen, vAngle, this.COLOR_VELOCITY, `v`);

    // Fuerza gravitacional (rojo) — apunta al centro
    const fAngle = Math.atan2(-(-state.y), -state.x); // hacia (0,0) en canvas
    const fLen = Math.min(state.F * 0.4, 70);
    this._arrow(pCanvas.x, pCanvas.y, fLen, fAngle, this.COLOR_FORCE, `F_g`);
  }

  _arrow(x, y, len, angle, color, label) {
    const { ctx } = this;
    if (len < 3) return;
    const ex = x + len * Math.cos(angle);
    const ey = y + len * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
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

    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex + 14 * Math.cos(angle), ey + 14 * Math.sin(angle));
  }

  // ─── Panel de estado orbital ─────────────────────────────────────────────────

  _drawInfoPanel(state, engine) {
    const { ctx, H } = this;
    const panelX = 20, panelY = H - 185;
    const panelW = 210, panelH = 165;

    ctx.fillStyle = 'rgba(9,15,26,0.90)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(100,116,139,1)';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('ESTADO ORBITAL', panelX + 12, panelY + 10);

    const rows = [
      { label: 'r (dist)', value: `${state.r.toFixed(1)} u`, color: '#cbd5e1' },
      { label: 'v (vel)', value: `${state.v.toFixed(2)} u/s`, color: this.COLOR_VELOCITY },
      { label: 'F_g (fuerza)', value: `${state.F.toFixed(2)} u`, color: this.COLOR_FORCE },
      { label: 'KE', value: `${state.KE.toFixed(1)} J`, color: '#10b981' },
      { label: 'PE', value: `${state.PE.toFixed(1)} J`, color: '#3b82f6' },
      { label: 'E_total', value: `${state.E.toFixed(1)} J`, color: this.COLOR_ENERGY },
    ];

    rows.forEach((row, i) => {
      const y = panelY + 26 + i * 22;
      ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '10px Outfit, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(row.label, panelX + 12, y);
      ctx.fillStyle = row.color; ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(row.value, panelX + panelW - 10, y);
    });
  }

  // ─── Panel de Kepler III ─────────────────────────────────────────────────────

  _drawKeplerPanel(keplerLog) {
    if (keplerLog.length === 0) return;
    const { ctx, W } = this;

    const panelW = 220, panelH = 90 + keplerLog.length * 18;
    const panelX = W - panelW - 20, panelY = 20;

    ctx.fillStyle = 'rgba(9,15,26,0.90)';
    ctx.strokeStyle = 'rgba(168,85,247,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#a855f7'; ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('VERIFICACIÓN KEPLER III', panelX + 10, panelY + 10);

    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '9px Outfit, sans-serif';
    ctx.fillText('Órbita   |   T (s)   |  a³/T² (cte.)', panelX + 10, panelY + 26);

    ctx.strokeStyle = 'rgba(168,85,247,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(panelX + 10, panelY + 38); ctx.lineTo(panelX + panelW - 10, panelY + 38); ctx.stroke();

    keplerLog.slice(-5).forEach((entry, i) => {
      const y = panelY + 46 + i * 18;
      ctx.fillStyle = '#e9d5ff'; ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`#${entry.orbit}`, panelX + 12, y);
      ctx.fillText(`${entry.T.toFixed(1)}`, panelX + 55, y);
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`${entry.ratio.toFixed(1)}`, panelX + 130, y);
    });

    // Constante promedio
    if (keplerLog.length > 0) {
      const avgRatio = keplerLog.reduce((s, e) => s + e.ratio, 0) / keplerLog.length;
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.fillText(`Promedio a³/T² = ${avgRatio.toFixed(1)}`, panelX + 12, panelY + 46 + Math.min(keplerLog.length, 5) * 18 + 6);
    }
  }
}
