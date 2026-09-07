/**
 * @fileoverview Motor de física desacoplado del DOM para simulación de
 * Conservación de la Energía en una rampa de perfil senoidal (skatepark).
 * Implementa integración numérica Runge-Kutta de 4° orden para máxima precisión.
 */

export class PhysicsEngineEnergia {
  constructor() {
    // Parámetros configurables por el usuario
    this.mass     = 5.0;    // Masa del bloque (kg)
    this.gravity  = 9.81;   // Aceleración gravitacional (m/s²)
    this.friction = 0.0;    // Coeficiente de fricción cinética (μk)
    this.startAngle = Math.PI * 0.25; // Posición inicial en la rampa (rad)

    // Geometría de la rampa senoidal
    this.rampAmplitude = 4.0;   // Semialtura de la rampa (m)
    this.rampWidth     = 10.0;  // Semianchura de la rampa (m)

    // Estado dinámico
    this.angle   = this.startAngle;
    this.omega   = 0;
    this.t       = 0;
    this._thermalEnergy = 0;
    this._E0     = 0;
    this.isRunning = false;
    this.energyHistory = [];

    this.reset();
  }

  /**
   * Configura los parámetros del escenario.
   */
  setParameters(mass, friction, gravity, startAngle) {
    this.mass       = Math.max(0.1, parseFloat(mass)       || 5.0);
    this.friction   = Math.max(0,   parseFloat(friction)   || 0.0);
    this.gravity    = Math.max(0.1, parseFloat(gravity)    || 9.81);
    this.startAngle = parseFloat(startAngle) !== undefined
      ? parseFloat(startAngle) : Math.PI * 0.25;
    this.reset();
  }

  /**
   * Altura de la rampa: y = A*(1 + cos(θ)), rango [0, 2A].
   * θ=0 → cima derecha (y=2A), θ=π → fondo (y=0), θ=-π → fondo.
   */
  getRampHeight(angle) {
    return this.rampAmplitude * (1 + Math.cos(angle));
  }

  /** Posición horizontal sobre la rampa. */
  getRampX(angle) {
    return this.rampWidth * Math.sin(angle);
  }

  /** Reinicia la simulación. */
  reset() {
    this.angle  = this.startAngle;
    this.omega  = 0;
    this.t      = 0;
    this.isRunning      = false;
    this._thermalEnergy = 0;
    this.energyHistory  = [];

    const h0 = this.getRampHeight(this.angle);
    this._E0  = this.mass * this.gravity * h0;

    this.energyHistory.push(this._snapshot());
  }

  /** Estado energético y cinemático instantáneo. */
  _snapshot() {
    const h   = this.getRampHeight(this.angle);
    const x   = this.getRampX(this.angle);
    const dxda = this.rampWidth     * Math.cos(this.angle);
    const dyda = -this.rampAmplitude * Math.sin(this.angle);
    const Reff = Math.sqrt(dxda * dxda + dyda * dyda);
    const v    = Math.abs(this.omega) * Reff;
    const KE   = 0.5 * this.mass * v * v;
    const PE   = this.mass * this.gravity * h;
    const Q    = this._thermalEnergy;
    const E    = KE + PE + Q;
    return { t: this.t, angle: this.angle, x, h, v, KE, PE, Q, E };
  }

  /** Aceleración angular según la ecuación de Lagrange sobre la rampa curva. */
  _alpha(angle, omega) {
    const A  = this.rampAmplitude;
    const W  = this.rampWidth;
    const g  = this.gravity;
    const mu = this.friction;

    const dxda  = W  * Math.cos(angle);
    const dyda  = -A * Math.sin(angle);
    const Reff2 = dxda * dxda + dyda * dyda;

    // Componente gravitacional proyectada sobre la tangente
    const gravTerm = -g * dyda;

    // Fricción: fuerza normal ≈ m*g*cos(pendiente)
    const slope        = Math.atan2(Math.abs(dyda), Math.abs(dxda));
    const normalFactor = Math.cos(slope);
    const sign         = omega !== 0 ? -Math.sign(omega) : 0;
    const frictionTerm = mu * g * normalFactor * sign * Math.sqrt(Reff2);

    return (gravTerm + frictionTerm) / Reff2;
  }

  /** Paso de integración RK4. */
  update(dt) {
    if (!this.isRunning) return;
    dt = Math.min(0.033, Math.max(0, parseFloat(dt) || 0));
    if (dt === 0) return;

    // RK4
    const f = (a, w) => ({ da: w, dw: this._alpha(a, w) });

    const s  = { a: this.angle, w: this.omega };
    const k1 = f(s.a,                   s.w);
    const k2 = f(s.a + 0.5*dt*k1.da,   s.w + 0.5*dt*k1.dw);
    const k3 = f(s.a + 0.5*dt*k2.da,   s.w + 0.5*dt*k2.dw);
    const k4 = f(s.a +    dt*k3.da,    s.w +    dt*k3.dw);

    this.angle += (dt/6)*(k1.da + 2*k2.da + 2*k3.da + k4.da);
    this.omega += (dt/6)*(k1.dw + 2*k2.dw + 2*k3.dw + k4.dw);
    this.t     += dt;

    // Contener el bloque dentro de los extremos de la rampa
    const LIMIT = Math.PI * 0.98;
    if (this.angle >  LIMIT) { this.angle =  LIMIT; this.omega = 0; }
    if (this.angle < -LIMIT) { this.angle = -LIMIT; this.omega = 0; }

    // Energía térmica acumulada
    const snap = this._snapshot();
    this._thermalEnergy = Math.max(0, this._E0 - (snap.KE + snap.PE));

    // Historial sub-muestreado (~30 fps)
    const last = this.energyHistory[this.energyHistory.length - 1];
    if (!last || this.t - last.t >= 0.033) {
      this.energyHistory.push(this._snapshot());
    }
  }

  /** Estado actual completo. */
  getState() { return this._snapshot(); }

  /** ¿La energía mecánica se conserva (error < 2%)? */
  isEnergyConserved() {
    if (this._E0 === 0) return true;
    const { KE, PE, Q } = this._snapshot();
    return Math.abs((KE + PE + Q) - this._E0) / this._E0 < 0.02;
  }

  /** Historial de energía para la gráfica temporal. */
  getEnergyHistory() { return this.energyHistory; }
}
