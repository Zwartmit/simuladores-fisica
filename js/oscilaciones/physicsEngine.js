/**
 * @fileoverview Motor de física para Oscilaciones mecánicas (Movimiento Armónico Simple y Amortiguado).
 * Soporta dos sistemas: Péndulo simple y Masa-Resorte.
 * Utiliza integración RK4 para máxima estabilidad, permitiendo grandes amplitudes en el péndulo.
 */

const MAX_SUBSTEP = 1 / 240; // s — paso interno del integrador

const toFinite = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Media aritmético-geométrica (para el período exacto del péndulo a gran amplitud). */
function agm(a, b) {
  while (Math.abs(a - b) > 1e-14) {
    [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  }
  return a;
}

export class PhysicsEngineOscilaciones {
  static SYSTEMS = {
    PENDULUM: 'pendulum',
    SPRING: 'spring'
  };

  constructor() {
    // ─── Parámetros Generales ───────────────────────────────────────────────
    this.systemType = PhysicsEngineOscilaciones.SYSTEMS.PENDULUM;
    this.g = 9.81;       // Gravedad (m/s²)
    this.b = 0.0;        // Coeficiente de amortiguamiento viscoso

    // ─── Péndulo simple ─────────────────────────────────────────────────────
    this.L = 2.0;        // Longitud de la cuerda (m)
    this.m_pend = 1.0;   // Masa del péndulo (kg)
    this.theta0 = 0.5;   // Ángulo inicial (rad)

    // ─── Masa-Resorte ───────────────────────────────────────────────────────
    this.k = 50.0;       // Constante del resorte (N/m)
    this.m_spring = 2.0; // Masa del bloque (kg)
    this.x0 = 1.0;       // Desplazamiento inicial (m)

    // ─── Estado Dinámico ────────────────────────────────────────────────────
    this.t = 0;          // Tiempo (s)

    // Variables universales de oscilación (para unificar cálculos)
    // q = coordenada generalizada (theta para péndulo, x para resorte)
    // v = velocidad generalizada (omega para péndulo, v para resorte)
    this.q = 0;
    this.v = 0;

    this.isRunning = false;

    // ─── Seguimiento de Período y Gráficas ──────────────────────────────────
    this.period = 0;
    this.lastCrossTime = null;
    this.lastQ = null;
    this.completedCycles = 0;
    this.history = []; // Array de {t, q, v, KE, PE}
    this.maxHistory = 300;

    this.reset();
  }

  setPendulumParams(L, m, theta0_deg, b) {
    this.systemType = PhysicsEngineOscilaciones.SYSTEMS.PENDULUM;
    this.L = Math.max(0.1, toFinite(L, 2.0));
    this.m_pend = Math.max(0.1, toFinite(m, 1.0));
    this.theta0 = toFinite(theta0_deg, 30) * Math.PI / 180;
    this.b = Math.max(0, toFinite(b, 0));
    this.reset();
  }

  setSpringParams(k, m, x0, b) {
    this.systemType = PhysicsEngineOscilaciones.SYSTEMS.SPRING;
    this.k = Math.max(1, toFinite(k, 50));
    this.m_spring = Math.max(0.1, toFinite(m, 2.0));
    this.x0 = toFinite(x0, 1.0);
    this.b = Math.max(0, toFinite(b, 0));
    this.reset();
  }

  reset() {
    this.t = 0;
    this.v = 0;
    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      this.q = this.theta0;
    } else {
      this.q = this.x0;
    }
    this.isRunning = false;
    this.period = 0;
    this.lastCrossTime = null;
    this.lastQ = this.q;
    this.completedCycles = 0;
    this.history = [];
    this._recordState();
  }

  /**
   * Derivadas del sistema: devuelve { dq, dv }
   * q = posición (ángulo theta o desplazamiento x)
   * v = velocidad (angular omega o lineal v)
   */
  _derivatives(q, v) {
    let accel = 0;
    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      // Ecuación péndulo: θ'' = -(g/L) * sin(θ) - (b/m) * θ'
      accel = -(this.g / this.L) * Math.sin(q) - (this.b / this.m_pend) * v;
    } else {
      // Ecuación resorte: x'' = -(k/m) * x - (b/m) * x'
      accel = -(this.k / this.m_spring) * q - (this.b / this.m_spring) * v;
    }
    return { dq: v, dv: accel };
  }

  /** Un paso RK4 de duración h; detecta cruces por cero con interpolación lineal. */
  _rk4Step(h) {
    const f = (q, v) => this._derivatives(q, v);
    const prevQ = this.q;
    const prevT = this.t;

    const k1 = f(this.q, this.v);
    const k2 = f(this.q + 0.5 * h * k1.dq, this.v + 0.5 * h * k1.dv);
    const k3 = f(this.q + 0.5 * h * k2.dq, this.v + 0.5 * h * k2.dv);
    const k4 = f(this.q + h * k3.dq, this.v + h * k3.dv);

    this.q += (h / 6) * (k1.dq + 2 * k2.dq + 2 * k3.dq + k4.dq);
    this.v += (h / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv);
    this.t += h;

    // Período = tiempo entre cruces consecutivos por cero de positivo a negativo.
    // El instante exacto se interpola dentro del paso (error de T << h).
    if (prevQ > 0 && this.q <= 0) {
      const tCross = prevT + (prevQ / (prevQ - this.q)) * h;
      if (this.lastCrossTime !== null) {
        this.period = tCross - this.lastCrossTime;
        this.completedCycles++;
      }
      this.lastCrossTime = tCross;
    }
    this.lastQ = this.q;
  }

  update(dt) {
    if (!this.isRunning) return;
    // Límite de dt: evita saltos enormes al volver de una pestaña en segundo plano
    dt = Math.min(0.1, Math.max(0, toFinite(dt, 0)));
    if (dt === 0) return;

    const steps = Math.ceil(dt / MAX_SUBSTEP);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this._rk4Step(h);

    // Guardar historial para gráficas (aprox 30 FPS)
    if (this.history.length === 0 || (this.t - this.history[this.history.length - 1].t > 0.033)) {
      this._recordState();
    }
  }

  _recordState() {
    const s = this.getState();
    this.history.push({
      t: s.t,
      q: s.q,
      v: s.v,
      KE: s.KE,
      PE: s.PE
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getState() {
    let KE = 0, PE = 0;

    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      // v = omega (rad/s)
      // v_lineal = omega * L
      const v_lin = this.v * this.L;
      KE = 0.5 * this.m_pend * v_lin * v_lin;
      // h = L - L*cos(theta) = L*(1 - cos(theta))
      const h = this.L * (1 - Math.cos(this.q));
      PE = this.m_pend * this.g * h;
    } else {
      KE = 0.5 * this.m_spring * this.v * this.v;
      PE = 0.5 * this.k * this.q * this.q;
    }

    return {
      type: this.systemType,
      t: this.t,
      q: this.q,      // theta o x
      v: this.v,      // omega o v
      KE, PE,
      E: KE + PE,
      period: this.period,
      cycles: this.completedCycles
    };
  }

  /**
   * Período "de libro": sin amortiguamiento y, en el péndulo, para ángulos pequeños.
   */
  getTheoreticalPeriod() {
    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      // Para ángulos pequeños, T = 2π√(L/g)
      return 2 * Math.PI * Math.sqrt(this.L / this.g);
    } else {
      // T = 2π√(m/k)
      return 2 * Math.PI * Math.sqrt(this.m_spring / this.k);
    }
  }

  /**
   * Razón de amortiguamiento ζ = γ / (2·ω₀) (con el péndulo linealizado para ángulos pequeños).
   * ζ < 1 oscila (subamortiguado), ζ ≥ 1 no completa ni un ciclo.
   */
  getDampingRatio() {
    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      return (this.b / this.m_pend) / (2 * Math.sqrt(this.g / this.L));
    }
    return this.b / (2 * Math.sqrt(this.k * this.m_spring));
  }

  /** ¿El sistema está críticamente o sobreamortiguado (no oscila)? */
  isOverdamped() {
    return this.getDampingRatio() >= 1;
  }

  /**
   * Período esperado teniendo en cuenta lo que la fórmula de libro ignora:
   *  - Péndulo: la amplitud finita (exacto con la media aritmético-geométrica,
   *    T = T₀ / AGM(1, cos(θ₀/2)), de T = 4√(L/g)·K(sin(θ₀/2)))).
   *  - Con amortiguamiento (ζ < 1): T_d = T / √(1 − ζ²) (exacto en el resorte,
   *    aproximado en el péndulo). Con ζ ≥ 1 devuelve Infinity.
   * @returns {number} Período esperado (s)
   */
  getExpectedPeriod() {
    let T = this.getTheoreticalPeriod();
    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      const amplitude = Math.min(Math.abs(this.theta0), Math.PI - 1e-6);
      T /= agm(1, Math.cos(amplitude / 2));
    }
    const zeta = this.getDampingRatio();
    if (zeta >= 1) return Infinity;
    return T / Math.sqrt(1 - zeta * zeta);
  }

  getHistory() {
    return this.history;
  }
}
