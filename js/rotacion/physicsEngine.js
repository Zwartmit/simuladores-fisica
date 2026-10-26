/**
 * @fileoverview Motor de física para la simulación de Dinámica rotacional.
 * Implementa la Segunda Ley de Newton para rotación: τ = I·α
 * Soporta disco sólido, aro y barra, con torque aplicado y fricción angular.
 * Integrador Runge-Kutta de 4° orden para máxima precisión.
 */

export class PhysicsEngineRotacion {
  /**
   * Tipos de cuerpo rígido disponibles con sus momentos de inercia.
   * @enum {string}
   */
  static BODIES = {
    DISK: 'disk',   // Disco sólido:  I = ½·m·r²
    RING: 'ring',   // Aro:           I = m·r²
    ROD: 'rod',    // Barra (centro): I = (1/12)·m·L²
  };

  constructor() {
    // Parámetros configurables
    this.mass = 5.0;    // Masa (kg)
    this.radius = 1.0;    // Radio / semilongitud (m)
    this.torque = 10.0;   // Torque aplicado (N·m)
    this.friction = 0.0;    // Coeficiente de fricción angular (N·m·s/rad)
    this.bodyType = PhysicsEngineRotacion.BODIES.DISK;

    // Estado dinámico
    this.theta = 0;    // Ángulo (rad)
    this.omega = 0;    // Velocidad angular (rad/s)
    this.t = 0;    // Tiempo (s)
    this.alpha = 0;    // Aceleración angular instantánea (rad/s²)

    // Estado de ejecución
    this.isRunning = false;
    this.torqueActive = true; // El torque se puede activar/desactivar

    // Historial para gráficas
    this.history = [];

    // Predicción del estudiante
    this.predictedOmega = null;

    this._computeInertia();
    this.reset();
  }

  /**
   * Calcula el momento de inercia según el tipo de cuerpo.
   * @private
   */
  _computeInertia() {
    const m = this.mass;
    const r = this.radius;
    switch (this.bodyType) {
      case PhysicsEngineRotacion.BODIES.DISK:
        this.I = 0.5 * m * r * r;           // ½·m·r²
        break;
      case PhysicsEngineRotacion.BODIES.RING:
        this.I = m * r * r;                  // m·r²
        break;
      case PhysicsEngineRotacion.BODIES.ROD:
        this.I = (1 / 12) * m * (2 * r) * (2 * r); // (1/12)·m·L², L = 2r
        break;
      default:
        this.I = 0.5 * m * r * r;
    }
    this.I = Math.max(this.I, 0.001); // Evitar división por cero
  }

  /**
   * Configura los parámetros del cuerpo rígido.
   * @param {number} mass     Masa (kg)
   * @param {number} radius   Radio o semilongitud (m)
   * @param {number} torque   Torque aplicado (N·m)
   * @param {number} friction Fricción angular (N·m·s/rad)
   * @param {string} bodyType Tipo de cuerpo (BODIES enum)
   */
  setParameters(mass, radius, torque, friction, bodyType) {
    // Number.isFinite (y no "|| default") para que un torque o fricción de 0 sea válido
    const toFinite = (value, fallback) => {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };
    this.mass = Math.max(0.1, toFinite(mass, 5.0));
    this.radius = Math.max(0.1, toFinite(radius, 1.0));
    this.torque = toFinite(torque, 10.0);
    this.friction = Math.max(0, toFinite(friction, 0.0));
    this.bodyType = bodyType || PhysicsEngineRotacion.BODIES.DISK;
    this._computeInertia();
    this.reset();
  }

  /** Reinicia la simulación al estado inicial (reposo). */
  reset() {
    this.theta = 0;
    this.omega = 0;
    this.t = 0;
    this.alpha = 0;
    this.isRunning = false;
    this.history = [];
    this.history.push(this._snapshot());
  }

  /**
   * Aceleración angular neta: α = (τ_ext - τ_friccion) / I
   * La fricción viscosa se opone al movimiento: τ_f = -friction · ω
   * @param {number} omega Velocidad angular actual (rad/s)
   * @returns {number} Aceleración angular (rad/s²)
   */
  _alpha_fn(omega) {
    const tau_ext = this.torqueActive ? this.torque : 0;
    const tau_fric = -this.friction * omega;
    return (tau_ext + tau_fric) / this.I;
  }

  /**
   * Avanza la simulación un paso de tiempo con integrador RK4.
   * @param {number} dt Paso de tiempo (s)
   */
  update(dt) {
    if (!this.isRunning) return;
    dt = Math.min(0.033, Math.max(0, parseFloat(dt) || 0));
    if (dt === 0) return;

    // Con fricción viscosa la ecuación ω' = (τ − b·ω)/I tiene rigidez λ = b/I. Con masas y radios
    // pequeños (I ≈ 0.002 kg·m²) y b alto, λ·dt supera 60 y el RK4 explícito diverge a NaN (RK4
    // exige λ·h ≲ 2.8). Se subdivide el paso para mantener λ·h ≤ 0.5.
    const stiffness = this.friction / this.I;
    const steps = Math.min(5000, Math.max(1, Math.ceil((dt * stiffness) / 0.5)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this._rk4Step(h);

    // Calcular alpha instantánea para telemetría
    this.alpha = this._alpha_fn(this.omega);

    // Historial sub-muestreado
    const last = this.history[this.history.length - 1];
    if (!last || this.t - last.t >= 0.033) {
      this.history.push(this._snapshot());
    }
  }

  /** Un paso RK4 de duración h sobre [theta, omega]. */
  _rk4Step(h) {
    const k1_theta = this.omega;
    const k1_omega = this._alpha_fn(this.omega);

    const k2_theta = this.omega + 0.5 * h * k1_omega;
    const k2_omega = this._alpha_fn(this.omega + 0.5 * h * k1_omega);

    const k3_theta = this.omega + 0.5 * h * k2_omega;
    const k3_omega = this._alpha_fn(this.omega + 0.5 * h * k2_omega);

    const k4_theta = this.omega + h * k3_omega;
    const k4_omega = this._alpha_fn(this.omega + h * k3_omega);

    this.theta += (h / 6) * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta);
    this.omega += (h / 6) * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega);
    this.t += h;
  }

  /** Retorna un snapshot del estado actual. */
  _snapshot() {
    const tau_ext = this.torqueActive ? this.torque : 0;
    const tau_fric = -this.friction * this.omega;
    const L = this.I * this.omega;  // Momento angular
    const KE = 0.5 * this.I * this.omega * this.omega; // Energía cinética rotacional
    return {
      t: this.t,
      theta: this.theta,
      omega: this.omega,
      alpha: this._alpha_fn(this.omega),
      L,
      KE,
      I: this.I,
      tau: tau_ext + tau_fric,
      tau_ext,
      tau_fric,
    };
  }

  /** Estado actual completo. */
  getState() { return this._snapshot(); }

  /**
   * Valor teórico de ω en un tiempo t (sin fricción: ω = α₀·t).
   * @param {number} time Tiempo (s)
   * @returns {number} Velocidad angular teórica (rad/s)
   */
  getTheoreticalOmega(time) {
    if (this.friction === 0) {
      return (this.torque / this.I) * time;
    }
    // Con fricción viscosa: ω(t) = (τ/b)·(1 - e^(-b/I · t))
    const b = this.friction;
    return (this.torque / b) * (1 - Math.exp(-(b / this.I) * time));
  }

  /**
   * Velocidad angular de estado estacionario (cuando la fricción equilibra el torque).
   * ω_ss = τ / friction  (solo aplica si friction > 0)
   * @returns {number|null}
   */
  getSteadyStateOmega() {
    return this.friction > 0 ? this.torque / this.friction : null;
  }

  /**
   * Impulso angular ∫τ_neto·dt desde t = 0 hasta ahora (regla del trapecio sobre el historial).
   * Por el teorema impulso–momento angular debe igualar ΔL = I·ω (el cuerpo parte del reposo).
   * @returns {number} Impulso angular (N·m·s)
   */
  getAngularImpulse() {
    const points = [...this.history];
    const now = this._snapshot();
    if (now.t > points[points.length - 1].t) points.push(now);
    let impulse = 0;
    for (let i = 1; i < points.length; i++) {
      impulse += 0.5 * (points[i].tau + points[i - 1].tau) * (points[i].t - points[i - 1].t);
    }
    return impulse;
  }

  /** Evalúa la predicción del estudiante contra el valor real actual. */
  evaluatePrediction(predictedOmega) {
    const realOmega = this.omega;
    const absError = Math.abs(predictedOmega - realOmega);
    const relError = realOmega !== 0
      ? (absError / Math.abs(realOmega)) * 100
      : 0;
    return { predictedOmega, realOmega, absError, relErrorPercent: parseFloat(relError.toFixed(2)) };
  }

  /** Historial para la gráfica temporal. */
  getHistory() { return this.history; }
}
