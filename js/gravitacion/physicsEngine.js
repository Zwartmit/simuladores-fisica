/**
 * @fileoverview Motor de física para simulación de Gravitación universal y Órbitas.
 * Implementa la Ley de Gravitación de Newton: F = G·M·m/r²
 * Integración numérica RK4 sobre las ecuaciones de movimiento en 2D.
 * Permite modificar la masa central M y la constante G para explorar órbitas.
 * Verifica la Tercera Ley de Kepler: T² ∝ a³
 */

export class PhysicsEngineGravitacion {
  // Constante gravitacional real (m³·kg⁻¹·s⁻²) — se escala para la sim
  static G_REAL = 6.674e-11;

  constructor() {
    // ─── Parámetros configurables ───────────────────────────────────────────
    this.G = 1000;        // Constante G escalada para la simulación
    this.M = 1000;        // Masa del cuerpo central (unidades sim)
    this.m = 1;           // Masa del planeta (unidades sim, no afecta órbita)

    // Condiciones iniciales del planeta
    this.x0 = 150;         // Posición inicial X (píxeles de mundo)
    this.y0 = 0;           // Posición inicial Y
    this.vx0 = 0;           // Velocidad inicial X
    this.vy0 = 0;           // Se calcula para órbita circular inicial

    // ─── Estado dinámico ────────────────────────────────────────────────────
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.t = 0;
    this.isRunning = false;

    // ─── Historial de trayectoria (puntos de la órbita) ─────────────────────
    this.orbitPath = [];       // Array de {x, y} para dibujar la elipse
    this.maxPathLen = 2000;     // Máximo de puntos almacenados

    // ─── Datos de la órbita para Kepler III ─────────────────────────────────
    this.period = 0;        // Período orbital T medido (s)
    this.periodStart = null;     // Tiempo en el que empieza a medir T
    this.lastQuadrant = null;    // Para detectar vuelta completa
    this.completedOrbits = 0;
    this.apoapsis = 0;        // Punto más lejano (m)
    this.periapsis = Infinity; // Punto más cercano (m)

    // ─── Historia para Kepler III ────────────────────────────────────────────
    this.keplerLog = [];       // [{a, T, T2, a3, ratio}]

    this.reset();
  }

  /**
   * Configura el escenario orbital.
   * @param {number} G        Constante gravitacional (escalada)
   * @param {number} M        Masa del cuerpo central
   * @param {number} r0       Radio inicial de la órbita (unidades mundo)
   * @param {number} ecc      Excentricidad 0=circular, 0<e<1=elíptica
   */
  setParameters(G, M, r0, ecc) {
    this.G = Math.max(1, parseFloat(G) || 1000);
    this.M = Math.max(1, parseFloat(M) || 1000);
    r0 = Math.max(50, parseFloat(r0) || 150);
    ecc = Math.max(0, Math.min(0.95, parseFloat(ecc) || 0));

    // Velocidad orbital circular: v_c = √(G·M/r)
    const vc = Math.sqrt(this.G * this.M / r0);

    // Con excentricidad: en el periapsis, v_peri > v_c
    // v_peri = v_c · √((1+e)/(1-e)) ... para órbita elíptica
    const vPeri = ecc > 0
      ? vc * Math.sqrt((1 + ecc) / (1 - ecc))
      : vc;

    // Posición inicial: en el periapsis (lado derecho del estrella)
    this.x0 = r0;
    this.y0 = 0;
    this.vx0 = 0;
    this.vy0 = vPeri; // velocidad tangencial (positiva = anti-horario)

    this.reset();
  }

  /** Reinicia al estado inicial. */
  reset() {
    this.x = this.x0;
    this.y = this.y0;
    this.vx = this.vx0;
    this.vy = this.vy0;
    this.t = 0;
    this.isRunning = false;
    this.orbitPath = [{ x: this.x, y: this.y }];
    this.period = 0;
    this.periodStart = null;
    this.lastQuadrant = null;
    this.completedOrbits = 0;
    this.apoapsis = 0;
    this.periapsis = Infinity;
    this.keplerLog = [];
  }

  /**
   * Función de aceleración gravitatoria en 2D.
   * F/m = -G·M / r³ · r_vec
   */
  _accel(x, y) {
    const r2 = x * x + y * y;
    const r = Math.sqrt(r2);
    const mag = this.G * this.M / (r2 + 0.01); // +0.01 evita singularidad
    return {
      ax: -mag * x / (r + 0.001),
      ay: -mag * y / (r + 0.001),
    };
  }

  /**
   * Integrador RK4 para [x, y, vx, vy].
   * @param {number} dt Paso de tiempo (unidades de simulación)
   */
  update(dt) {
    if (!this.isRunning) return;
    dt = Math.min(0.5, Math.max(0, parseFloat(dt) || 0));
    if (dt === 0) return;

    const f = (x, y, vx, vy) => {
      const { ax, ay } = this._accel(x, y);
      return { dx: vx, dy: vy, dvx: ax, dvy: ay };
    };

    const s = { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
    const k1 = f(s.x, s.y, s.vx, s.vy);
    const k2 = f(s.x + 0.5 * dt * k1.dx, s.y + 0.5 * dt * k1.dy, s.vx + 0.5 * dt * k1.dvx, s.vy + 0.5 * dt * k1.dvy);
    const k3 = f(s.x + 0.5 * dt * k2.dx, s.y + 0.5 * dt * k2.dy, s.vx + 0.5 * dt * k2.dvx, s.vy + 0.5 * dt * k2.dvy);
    const k4 = f(s.x + dt * k3.dx, s.y + dt * k3.dy, s.vx + dt * k3.dvx, s.vy + dt * k3.dvy);

    this.x += (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    this.y += (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
    this.vx += (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx);
    this.vy += (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy);
    this.t += dt;

    // ─── Tracking de órbita ─────────────────────────────────────────────────
    const r = Math.sqrt(this.x * this.x + this.y * this.y);
    if (r > this.apoapsis) this.apoapsis = r;
    if (r < this.periapsis) this.periapsis = r;

    // Guardar punto de trayectoria
    const last = this.orbitPath[this.orbitPath.length - 1];
    const dx = this.x - last.x, dy = this.y - last.y;
    if (dx * dx + dy * dy > 4) { // solo guardar si se movió > 2 px
      this.orbitPath.push({ x: this.x, y: this.y });
      if (this.orbitPath.length > this.maxPathLen) this.orbitPath.shift();
    }

    // ─── Detección de período orbital ───────────────────────────────────────
    const quad = this._quadrant(this.x, this.y);
    if (this.lastQuadrant !== null && this.lastQuadrant !== quad) {
      // Cruce de eje positivo X: cuadrante 4 → 1 (vuelta completa)
      if (this.lastQuadrant === 4 && quad === 1) {
        if (this.periodStart !== null) {
          this.period = this.t - this.periodStart;
          this.completedOrbits++;
          // Calcular semileje mayor a = (apoapsis + periapsis) / 2
          const a = (this.apoapsis + this.periapsis) / 2;
          this.keplerLog.push({
            orbit: this.completedOrbits,
            a, T: this.period,
            T2: this.period * this.period,
            a3: a * a * a,
            ratio: (a * a * a) / (this.period * this.period),
          });
        }
        this.periodStart = this.t;
      }
    }
    this.lastQuadrant = quad;
  }

  _quadrant(x, y) {
    if (x >= 0 && y >= 0) return 1;
    if (x < 0 && y >= 0) return 2;
    if (x < 0 && y < 0) return 3;
    return 4;
  }

  /** Estado actual completo. */
  getState() {
    const r = Math.sqrt(this.x * this.x + this.y * this.y);
    const v = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const { ax, ay } = this._accel(this.x, this.y);
    const F = this.G * this.M * this.m / (r * r + 0.01);
    const KE = 0.5 * this.m * v * v;
    const PE = -this.G * this.M * this.m / (r + 0.001);
    const a = (this.apoapsis + (this.periapsis < Infinity ? this.periapsis : r)) / 2;
    return {
      x: this.x, y: this.y, vx: this.vx, vy: this.vy, r, v, ax, ay, F, KE, PE, E: KE + PE,
      t: this.t, period: this.period, apoapsis: this.apoapsis,
      periapsis: this.periapsis < Infinity ? this.periapsis : r, a
    };
  }

  /**
   * Período teórico según Kepler III: T = 2π · √(a³ / (G·M))
   * @param {number} a Semileje mayor (unidades mundo)
   */
  getTheoreticalPeriod(a) {
    return 2 * Math.PI * Math.sqrt((a * a * a) / (this.G * this.M));
  }

  getOrbitPath() { return this.orbitPath; }
  getKeplerLog() { return this.keplerLog; }
}
