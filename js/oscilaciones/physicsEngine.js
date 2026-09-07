/**
 * @fileoverview Motor de física para Oscilaciones mecánicas (Movimiento Armónico Simple y Amortiguado).
 * Soporta dos sistemas: Péndulo simple y Masa-Resorte.
 * Utiliza integración RK4 para máxima estabilidad, permitiendo grandes amplitudes en el péndulo.
 */

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
    this.L = Math.max(0.1, parseFloat(L) || 2.0);
    this.m_pend = Math.max(0.1, parseFloat(m) || 1.0);
    this.theta0 = (parseFloat(theta0_deg) || 30) * Math.PI / 180;
    this.b = Math.max(0, parseFloat(b) || 0);
    this.reset();
  }

  setSpringParams(k, m, x0, b) {
    this.systemType = PhysicsEngineOscilaciones.SYSTEMS.SPRING;
    this.k = Math.max(1, parseFloat(k) || 50);
    this.m_spring = Math.max(0.1, parseFloat(m) || 2.0);
    this.x0 = parseFloat(x0) || 1.0;
    this.b = Math.max(0, parseFloat(b) || 0);
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

  update(dt) {
    if (!this.isRunning) return;
    if (dt <= 0) return;

    // RK4 integration
    const f = (q, v) => this._derivatives(q, v);

    const k1 = f(this.q, this.v);
    const k2 = f(this.q + 0.5 * dt * k1.dq, this.v + 0.5 * dt * k1.dv);
    const k3 = f(this.q + 0.5 * dt * k2.dq, this.v + 0.5 * dt * k2.dv);
    const k4 = f(this.q + dt * k3.dq, this.v + dt * k3.dv);

    this.q += (dt / 6) * (k1.dq + 2 * k2.dq + 2 * k3.dq + k4.dq);
    this.v += (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv);
    this.t += dt;

    // ─── Detección de período (cruces por cero desde positivo hacia negativo)
    if (this.lastQ > 0 && this.q <= 0) {
      if (this.lastCrossTime !== null) {
        this.period = this.t - this.lastCrossTime;
        this.completedCycles++;
      }
      this.lastCrossTime = this.t;
    }
    this.lastQ = this.q;

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

  getTheoreticalPeriod() {
    if (this.systemType === PhysicsEngineOscilaciones.SYSTEMS.PENDULUM) {
      // Para ángulos pequeños, T = 2π√(L/g)
      return 2 * Math.PI * Math.sqrt(this.L / this.g);
    } else {
      // T = 2π√(m/k)
      return 2 * Math.PI * Math.sqrt(this.m_spring / this.k);
    }
  }

  getHistory() {
    return this.history;
  }
}
