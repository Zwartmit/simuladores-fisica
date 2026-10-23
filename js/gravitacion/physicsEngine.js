/**
 * @fileoverview Motor de física para simulación de Gravitación universal y Órbitas.
 * Implementa la Ley de Gravitación de Newton: F = G·M·m/r²
 * Integración numérica RK4 sobre las ecuaciones de movimiento en 2D.
 * Permite modificar la masa central M y la constante G para explorar órbitas.
 * Verifica la Tercera Ley de Kepler: T² ∝ a³
 */

const toFinite = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

export class PhysicsEngineGravitacion {
  // Constante gravitacional real (m³·kg⁻¹·s⁻²) — se escala para la sim
  static G_REAL = 6.674e-11;

  constructor() {
    // ─── Parámetros configurables ───────────────────────────────────────────
    this.G = 1000;        // Constante G escalada para la simulación
    this.M = 1000;        // Masa del cuerpo central (unidades sim)
    this.m = 1;           // Masa del planeta (unidades sim, no afecta órbita)
    this.a = 150;         // Semieje mayor de la órbita (unidades mundo)
    this.ecc = 0;         // Excentricidad (0 = circular)

    // Condiciones iniciales del planeta (siempre en el periapsis, sobre el eje +X)
    this.x0 = 150;
    this.y0 = 0;
    this.vx0 = 0;
    this.vy0 = 0;

    // ─── Estado dinámico ────────────────────────────────────────────────────
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.t = 0;
    this.isRunning = false;

    // ─── Historial de trayectoria (puntos de la órbita) ─────────────────────
    this.orbitPath = [];       // Array de {x, y} para dibujar la elipse
    this.maxPathLen = 2000;     // Máximo de puntos almacenados

    // ─── Datos de la órbita para Kepler III ─────────────────────────────────
    this.period = 0;           // Último período orbital T medido (s)
    this.periodStart = 0;      // Instante (interpolado) del último cruce del eje +X
    this.prevY = 0;            // y del paso anterior (detección de cruce)
    this.prevT = 0;            // t del paso anterior
    this.completedOrbits = 0;
    this.apoapsis = 0;         // Punto más lejano medido (unidades mundo)
    this.periapsis = Infinity; // Punto más cercano medido (unidades mundo)
    this.orbitMaxR = 0;        // Extremos de la órbita en curso (para a por órbita)
    this.orbitMinR = Infinity;

    // ─── Historia para Kepler III ────────────────────────────────────────────
    this.keplerLog = [];       // [{orbit, a, T, T2, a3, ratio}]

    this.setParameters(this.G, this.M, this.a, this.ecc);
  }

  /**
   * Configura el escenario orbital. El semieje mayor a (y no el radio inicial) es el
   * parámetro de entrada porque, según Kepler III, T solo depende de a, G y M:
   * cambiar la excentricidad con a fijo NO cambia el período.
   * @param {number} G        Constante gravitacional (escalada)
   * @param {number} M        Masa del cuerpo central
   * @param {number} a        Semieje mayor (unidades mundo)
   * @param {number} ecc      Excentricidad 0=circular, 0<e<1=elíptica
   */
  setParameters(G, M, a, ecc) {
    this.G = Math.max(1, toFinite(G, 1000));
    this.M = Math.max(1, toFinite(M, 1000));
    this.a = Math.max(50, toFinite(a, 150));
    this.ecc = Math.max(0, Math.min(0.95, toFinite(ecc, 0)));

    // Se inicia en el periapsis r_p = a·(1 − e), sobre el eje +X.
    const rPeri = this.a * (1 - this.ecc);

    // Ecuación vis-viva: v² = G·M·(2/r − 1/a). En r = r_p = a(1−e):
    //   v_p = √( G·M/a · (1+e)/(1−e) )
    // (equivale a v_circular(r_p)·√(1+e); la fórmula anterior usaba √((1+e)/(1−e)),
    //  que supera la velocidad de escape para e ≥ 1/3 y rompía la órbita).
    const vPeri = Math.sqrt((this.G * this.M / this.a) * (1 + this.ecc) / (1 - this.ecc));

    this.x0 = rPeri;
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
    this.periodStart = 0;      // la primera vuelta cuenta desde t = 0 (el planeta parte del eje +X)
    this.prevY = this.y;
    this.prevT = 0;
    this.completedOrbits = 0;
    this.apoapsis = 0;
    this.periapsis = Infinity;
    this.orbitMaxR = 0;
    this.orbitMinR = Infinity;
    this.keplerLog = [];
  }

  /** Semieje mayor teórico, periapsis y apoapsis (para escalar la vista). */
  getTheoreticalApoapsis() { return this.a * (1 + this.ecc); }
  getTheoreticalPeriapsis() { return this.a * (1 - this.ecc); }

  /**
   * Función de aceleración gravitatoria en 2D.
   * a = −G·M · r_vec / r³   (el planeta nunca llega a r = 0 con a ≥ 50 y e ≤ 0.95)
   */
  _accel(x, y) {
    const r2 = x * x + y * y;
    const r3 = Math.max(r2 * Math.sqrt(r2), 1e-12);
    const k = -this.G * this.M / r3;
    return { ax: k * x, ay: k * y };
  }

  /** Un paso RK4 de duración h para [x, y, vx, vy]. */
  _rk4Step(h) {
    const f = (x, y, vx, vy) => {
      const { ax, ay } = this._accel(x, y);
      return { dx: vx, dy: vy, dvx: ax, dvy: ay };
    };

    const s = { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
    const k1 = f(s.x, s.y, s.vx, s.vy);
    const k2 = f(s.x + 0.5 * h * k1.dx, s.y + 0.5 * h * k1.dy, s.vx + 0.5 * h * k1.dvx, s.vy + 0.5 * h * k1.dvy);
    const k3 = f(s.x + 0.5 * h * k2.dx, s.y + 0.5 * h * k2.dy, s.vx + 0.5 * h * k2.dvx, s.vy + 0.5 * h * k2.dvy);
    const k4 = f(s.x + h * k3.dx, s.y + h * k3.dy, s.vx + h * k3.dvx, s.vy + h * k3.dvy);

    this.x += (h / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    this.y += (h / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
    this.vx += (h / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx);
    this.vy += (h / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy);
    this.t += h;
  }

  /**
   * Avanza la simulación dt (unidades de simulación). El paso se subdivide para que
   * cada sub-paso sea una pequeña fracción del tiempo dinámico local √(r³/GM): así
   * la precisión se mantiene incluso en el periapsis de órbitas muy excéntricas.
   */
  update(dt) {
    if (!this.isRunning) return;
    dt = Math.min(0.5, Math.max(0, toFinite(dt, 0)));
    if (dt === 0) return;

    const r = Math.sqrt(this.x * this.x + this.y * this.y);
    const tDyn = Math.sqrt((r * r * r) / (this.G * this.M));
    const steps = Math.max(1, Math.ceil(dt / (0.02 * tDyn)));
    const h = dt / steps;

    for (let i = 0; i < steps; i++) {
      this._rk4Step(h);
      this._trackOrbit();
    }

    // Guardar punto de trayectoria
    const last = this.orbitPath[this.orbitPath.length - 1];
    const dx = this.x - last.x, dy = this.y - last.y;
    if (dx * dx + dy * dy > 4) { // solo guardar si se movió > 2 unidades
      this.orbitPath.push({ x: this.x, y: this.y });
      if (this.orbitPath.length > this.maxPathLen) this.orbitPath.shift();
    }
  }

  /** Actualiza apsides y detecta cada vuelta completa (cruce ascendente del eje +X). */
  _trackOrbit() {
    const r = Math.sqrt(this.x * this.x + this.y * this.y);
    if (r > this.apoapsis) this.apoapsis = r;
    if (r < this.periapsis) this.periapsis = r;
    if (r > this.orbitMaxR) this.orbitMaxR = r;
    if (r < this.orbitMinR) this.orbitMinR = r;

    if (this.prevY < 0 && this.y >= 0 && this.x > 0) {
      // Interpolación lineal del instante exacto de cruce (evita error de ±dt en T)
      const frac = -this.prevY / (this.y - this.prevY);
      const tCross = this.prevT + frac * (this.t - this.prevT);

      this.period = tCross - this.periodStart;
      this.completedOrbits++;
      const a = (this.orbitMaxR + this.orbitMinR) / 2; // semieje mayor medido de esta órbita
      this.keplerLog.push({
        orbit: this.completedOrbits,
        a, T: this.period,
        T2: this.period * this.period,
        a3: a * a * a,
        ratio: (a * a * a) / (this.period * this.period),
      });
      this.periodStart = tCross;
      this.orbitMaxR = r;
      this.orbitMinR = r;
    }

    this.prevY = this.y;
    this.prevT = this.t;
  }

  /** Estado actual completo. */
  getState() {
    const r = Math.sqrt(this.x * this.x + this.y * this.y);
    const v = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const { ax, ay } = this._accel(this.x, this.y);
    const F = this.G * this.M * this.m / (r * r);
    const KE = 0.5 * this.m * v * v;
    const PE = -this.G * this.M * this.m / r;
    const peri = this.periapsis < Infinity ? this.periapsis : r;
    const apo = Math.max(this.apoapsis, r);
    return {
      x: this.x, y: this.y, vx: this.vx, vy: this.vy, r, v, ax, ay, F, KE, PE, E: KE + PE,
      t: this.t, period: this.period, apoapsis: apo,
      periapsis: peri, a: (apo + peri) / 2
    };
  }

  /**
   * Período teórico según Kepler III: T = 2π · √(a³ / (G·M))
   * @param {number} a Semieje mayor (unidades mundo)
   */
  getTheoreticalPeriod(a = this.a) {
    return 2 * Math.PI * Math.sqrt((a * a * a) / (this.G * this.M));
  }

  /** Constante teórica de Kepler III: a³/T² = G·M / 4π². */
  getTheoreticalKeplerConstant() {
    return (this.G * this.M) / (4 * Math.PI * Math.PI);
  }

  getOrbitPath() { return this.orbitPath; }
  getKeplerLog() { return this.keplerLog; }
}
