/**
 * @fileoverview Motor de física desacoplado del DOM para simulación de
 * Conservación de la Energía sobre una pista curva tipo "skatepark" (cuenco cosenoidal).
 * Integra con Runge-Kutta de 4° orden y calcula la energía térmica integrando el
 * trabajo real de la fricción, de modo que K + U + Q = E₀ se verifica de forma
 * independiente (no se fuerza por construcción).
 */

const MAX_SUBSTEP = 1 / 240; // s — paso interno del integrador (estabilidad y precisión)
const REST_VELOCITY = 1e-3;  // m/s — umbral para considerar al bloque detenido

const toFinite = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

export class PhysicsEngineEnergia {
  constructor() {
    // Parámetros configurables por el usuario
    this.mass = 5.0;           // Masa del bloque (kg)
    this.gravity = 9.81;       // Aceleración gravitacional (m/s²)
    this.friction = 0.0;       // Coeficiente de fricción cinética (μk)
    this.heightFraction = 0.8; // Altura inicial como fracción de la altura máxima (0-1)

    // Geometría de la pista: y(x) = A·(1 − cos(π·x/W)), fondo en x = 0 (y = 0)
    this.rampAmplitude = 4.0;  // Semialtura A (m); la altura máxima es 2A
    this.rampWidth = 10.0;     // Semianchura W (m)

    // Estado dinámico
    this.x = 0;                // Posición horizontal (m)
    this.vx = 0;               // Velocidad horizontal (m/s)
    this.angle = 0;            // Parámetro de la curva θ = π·x/W (rad), usado por el renderizador
    this.t = 0;
    this._thermalEnergy = 0;
    this._E0 = 0;
    this.isRunning = false;
    this.isAtRest = false;
    this.energyHistory = [];

    this.reset();
  }

  /**
   * Configura los parámetros del escenario.
   * @param {number} mass Masa (kg)
   * @param {number} friction Coeficiente de fricción cinética μk
   * @param {number} gravity Gravedad (m/s²)
   * @param {number} heightFraction Altura inicial como fracción de 2A (0.05-1)
   */
  setParameters(mass, friction, gravity, heightFraction) {
    this.mass = Math.max(0.1, toFinite(mass, 5.0));
    this.friction = Math.max(0, toFinite(friction, 0.0));
    this.gravity = Math.max(0.1, toFinite(gravity, 9.81));
    this.heightFraction = Math.min(1, Math.max(0.05, toFinite(heightFraction, 0.8)));
    this.reset();
  }

  /** Altura de la pista para el parámetro θ: y = A·(1 − cos θ), rango [0, 2A]. */
  getRampHeight(angle) {
    return this.rampAmplitude * (1 - Math.cos(angle));
  }

  /** Posición horizontal para el parámetro θ: x = W·θ/π. */
  getRampX(angle) {
    return (this.rampWidth * angle) / Math.PI;
  }

  /** Pendiente dy/dx de la pista en la posición x. */
  getSlope(x) {
    const k = Math.PI / this.rampWidth;
    return this.rampAmplitude * k * Math.sin(k * x);
  }

  /** Altura inicial del bloque (m). */
  getInitialHeight() {
    return this.heightFraction * 2 * this.rampAmplitude;
  }

  /** Reinicia la simulación al estado de reposo en la altura inicial (lado derecho). */
  reset() {
    const A = this.rampAmplitude;
    const cosTheta0 = Math.min(1, Math.max(-1, 1 - this.getInitialHeight() / A));
    const theta0 = Math.acos(cosTheta0);

    this.x = this.getRampX(theta0);
    this.vx = 0;
    this.angle = theta0;
    this.t = 0;
    this.isRunning = false;
    this._thermalEnergy = 0;
    this.energyHistory = [];

    this._E0 = this.mass * this.gravity * this.getRampHeight(theta0);

    // Si la pendiente inicial no supera la fricción, el bloque no arranca.
    this.isAtRest = this.friction > 0 && Math.abs(this.getSlope(this.x)) <= this.friction;

    this.energyHistory.push(this._snapshot());
  }

  /** Estado energético y cinemático instantáneo. */
  _snapshot() {
    const slope = this.getSlope(this.x);
    const h = this.getRampHeight(this.angle);
    const v = Math.abs(this.vx) * Math.sqrt(1 + slope * slope); // velocidad a lo largo de la pista
    const KE = 0.5 * this.mass * v * v;
    const PE = this.mass * this.gravity * h;
    const Q = this._thermalEnergy;
    return { t: this.t, angle: this.angle, x: this.x, h, v, KE, PE, Q, E: KE + PE + Q };
  }

  /**
   * Derivadas del sistema [x, vx, Q] para una partícula restringida a y(x).
   *
   * Lagrange para una cuenta sobre la curva y(x), con g_ef = g + y''·ẋ²:
   *   (1 + y'²)·ẍ = −g_ef·(y' + μ·sgn(ẋ))
   * El término y''·ẋ² (que la versión anterior omitía) es lo que hace que K + U
   * se conserve cuando μ = 0. La normal es N = m·g_ef/√(1+y'²), y la potencia
   * disipada por fricción μ·N·|v_pista| = μ·m·g_ef·|ẋ| alimenta Q.
   */
  _derivatives(x, vx) {
    const k = Math.PI / this.rampWidth;
    const A = this.rampAmplitude;
    const slope = A * k * Math.sin(k * x);
    const curvature = A * k * k * Math.cos(k * x);
    const gEff = this.gravity + curvature * vx * vx;
    const normalFactor = Math.max(0, gEff);

    // Sentido en que la fricción se opone: al movimiento (o al movimiento inminente)
    let dir = 0;
    if (vx !== 0) dir = Math.sign(vx);
    else if (slope !== 0) dir = -Math.sign(slope);

    const ax = -(gEff * slope + this.friction * dir * normalFactor) / (1 + slope * slope);
    const dQ = this.friction * this.mass * normalFactor * Math.abs(vx);
    return { ax, dQ };
  }

  /** Un paso RK4 de duración h (s). */
  _rk4Step(h) {
    const f = (x, vx) => this._derivatives(x, vx);
    const x0 = this.x, v0 = this.vx;

    const k1 = f(x0, v0);
    const k2 = f(x0 + 0.5 * h * v0, v0 + 0.5 * h * k1.ax);
    const k3 = f(x0 + 0.5 * h * (v0 + 0.5 * h * k1.ax), v0 + 0.5 * h * k2.ax);
    const k4 = f(x0 + h * (v0 + 0.5 * h * k2.ax), v0 + h * k3.ax);

    const vMid1 = v0;
    const vMid2 = v0 + 0.5 * h * k1.ax;
    const vMid3 = v0 + 0.5 * h * k2.ax;
    const vMid4 = v0 + h * k3.ax;

    this.x += (h / 6) * (vMid1 + 2 * vMid2 + 2 * vMid3 + vMid4);
    this.vx += (h / 6) * (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax);
    this._thermalEnergy += (h / 6) * (k1.dQ + 2 * k2.dQ + 2 * k3.dQ + k4.dQ);
    this.t += h;
    this.angle = (Math.PI * this.x) / this.rampWidth;

    // Contener el bloque dentro de los extremos de la pista (no ocurre con E ≤ E₀)
    if (Math.abs(this.x) > this.rampWidth) {
      this.x = Math.sign(this.x) * this.rampWidth;
      this.angle = Math.sign(this.x) * Math.PI;
      this.vx = 0;
    }

    // Fricción de Coulomb: si el bloque invierte su velocidad en un punto donde la
    // pendiente no vence a la fricción, queda en reposo (no oscila indefinidamente).
    if (this.friction > 0) {
      const crossed = v0 * this.vx < 0 || Math.abs(this.vx) < REST_VELOCITY;
      if (crossed && Math.abs(this.getSlope(this.x)) <= this.friction) {
        this.vx = 0;
        this.isAtRest = true;
      }
    }
  }

  /** Avanza la simulación dt segundos (subdividido en pasos internos pequeños). */
  update(dt) {
    if (!this.isRunning || this.isAtRest) return;
    dt = Math.min(0.1, Math.max(0, toFinite(dt, 0)));
    if (dt === 0) return;

    const steps = Math.ceil(dt / MAX_SUBSTEP);
    const h = dt / steps;
    for (let i = 0; i < steps && !this.isAtRest; i++) this._rk4Step(h);

    // Historial sub-muestreado (~30 fps)
    const last = this.energyHistory[this.energyHistory.length - 1];
    if (!last || this.t - last.t >= 0.033) {
      this.energyHistory.push(this._snapshot());
    }
  }

  /** Estado actual completo. */
  getState() { return this._snapshot(); }

  /**
   * ¿Se cumple K + U + Q = E₀ (error < 2%)? Q proviene del trabajo de la fricción,
   * por lo que esta comprobación es una verificación real del integrador.
   */
  isEnergyConserved() {
    if (this._E0 === 0) return true;
    const { E } = this._snapshot();
    return Math.abs(E - this._E0) / this._E0 < 0.02;
  }

  /** Historial de energía para la gráfica temporal. */
  getEnergyHistory() { return this.energyHistory; }
}
