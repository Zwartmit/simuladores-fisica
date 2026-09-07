/**
 * @fileoverview Motor de física clásico desacoplado del DOM para simulación de cinemática en 2D.
 * Implementa ecuaciones cinemáticas exactas para tiro parabólico y caída libre.
 */

export class PhysicsEngine {
  constructor() {
    // Parámetros iniciales por defecto
    this.y0 = 10;          // Altura inicial (metros)
    this.x0 = 0;           // Posición horizontal inicial (metros)
    this.v0 = 15;          // Velocidad inicial (m/s)
    this.angleDeg = 45;    // Ángulo de disparo (grados)
    this.gravity = 9.81;   // Aceleración de la gravedad (m/s^2)

    // Estado actual de la simulación
    this.t = 0;            // Tiempo transcurrido (segundos)
    this.x = 0;
    this.y = 10;
    this.vx = 0;
    this.vy = 0;
    
    // Historial de trayectoria simulada
    this.trajectory = [];
    this.isLanded = false;

    this.calculateInitialComponents();
  }

  /**
   * Calcula las componentes vectoriales iniciales a partir de la velocidad y el ángulo.
   */
  calculateInitialComponents() {
    // Conversión de grados a radianes
    const alpha = (this.angleDeg * Math.PI) / 180;
    
    // Componentes de velocidad inicial
    this.vx0 = this.v0 * Math.cos(alpha);
    this.vy0 = this.v0 * Math.sin(alpha);
    
    this.reset();
  }

  /**
   * Configura las condiciones iniciales del escenario físico.
   * @param {number} y0 Altura inicial (m)
   * @param {number} v0 Velocidad inicial (m/s)
   * @param {number} angleDeg Ángulo inicial (grados)
   * @param {number} gravity Aceleración gravitacional (m/s^2)
   */
  setParameters(y0, v0, angleDeg, gravity) {
    this.y0 = Math.max(0, parseFloat(y0) || 0);
    this.v0 = Math.max(0, parseFloat(v0) || 0);
    this.angleDeg = parseFloat(angleDeg) || 0;
    this.gravity = Math.max(0.1, parseFloat(gravity) || 9.81);
    
    this.calculateInitialComponents();
  }

  /**
   * Reinicia la simulación al estado inicial de reposo (t = 0).
   */
  reset() {
    this.t = 0;
    this.x = this.x0;
    this.y = this.y0;
    this.vx = this.vx0;
    this.vy = this.vy0;
    this.isLanded = false;
    this.trajectory = [{ t: 0, x: this.x, y: this.y, vx: this.vx, vy: this.vy }];
  }

  /**
   * Avanza la simulación física en un paso temporal diferencial.
   * @param {number} dt Paso de tiempo (segundos)
   */
  update(dt) {
    if (this.isLanded) return;

    // Validación y sanitización del delta time
    dt = Math.min(0.1, Math.max(0, parseFloat(dt) || 0));
    if (dt === 0) return;

    this.t += dt;

    /* 
     * ECUACIONES CINEMÁTICAS ANALÍTICAS DE MOVIMIENTO EN DOS DIMENSIONES:
     * 
     * Eje X (Movimiento Rectilíneo Uniforme):
     * x(t) = x0 + vx0 * t
     * vx(t) = vx0
     * 
     * Eje Y (Movimiento Rectilíneo Uniformemente Variado bajo gravedad constante):
     * y(t) = y0 + vy0 * t - 0.5 * g * t^2
     * vy(t) = vy0 - g * t
     */
    this.x = this.x0 + this.vx0 * this.t;
    this.y = this.y0 + this.vy0 * this.t - 0.5 * this.gravity * Math.pow(this.t, 2);
    this.vx = this.vx0;
    this.vy = this.vy0 - this.gravity * this.t;

    // Control de impacto contra el suelo (y <= 0)
    if (this.y <= 0) {
      this.y = 0;
      this.vy = 0;
      this.vx = 0;
      this.isLanded = true;
      
      // Cálculo preciso del tiempo de aterrizaje mediante fórmula cuadrática
      // 0 = y0 + vy0 * t_land - 0.5 * g * t_land^2
      // Resuelto analíticamente para mayor precisión en la Fase de Revisión
      const a = -0.5 * this.gravity;
      const b = this.vy0;
      const c = this.y0;
      const discriminant = Math.pow(b, 2) - 4 * a * c;
      if (discriminant >= 0) {
        const tLanding = (-b - Math.sqrt(discriminant)) / (2 * a);
        this.t = tLanding;
        this.x = this.x0 + this.vx0 * this.t;
      }
    }

    // Registrar coordenadas en la trayectoria
    this.trajectory.push({
      t: this.t,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy
    });
  }

  /**
   * Devuelve las posiciones y velocidades teóricas exactas en cualquier instante.
   * Utilizado para evaluar el error de simulación (Fase 4 - Examinar la solución).
   * @param {number} time Instante de tiempo (segundos)
   * @returns {Object} Coordenadas teóricas x, y y componentes de velocidad vx, vy
   */
  getTheoreticalValue(time) {
    time = Math.max(0, time);
    
    // Ecuación analítica clásica
    const xTeo = this.x0 + this.vx0 * time;
    let yTeo = this.y0 + this.vy0 * time - 0.5 * this.gravity * Math.pow(time, 2);
    let vyTeo = this.vy0 - this.gravity * time;
    let vxTeo = this.vx0;

    if (yTeo < 0) {
      yTeo = 0;
      vyTeo = 0;
      vxTeo = 0;
    }

    return { x: xTeo, y: yTeo, vx: vxTeo, vy: vyTeo };
  }

  /**
   * Obtiene la distancia teórica exacta de impacto.
   * @returns {number} Distancia máxima en metros
   */
  getTheoreticalMaxRange() {
    const a = -0.5 * this.gravity;
    const b = this.vy0;
    const c = this.y0;
    const discriminant = Math.pow(b, 2) - 4 * a * c;
    if (discriminant < 0) return 0;
    const tLanding = (-b - Math.sqrt(discriminant)) / (2 * a);
    return this.x0 + this.vx0 * tLanding;
  }

  /**
   * Obtiene el tiempo total de vuelo teórico exacto.
   * @returns {number} Tiempo de vuelo en segundos
   */
  getTheoreticalFlightTime() {
    const a = -0.5 * this.gravity;
    const b = this.vy0;
    const c = this.y0;
    const discriminant = Math.pow(b, 2) - 4 * a * c;
    if (discriminant < 0) return 0;
    return (-b - Math.sqrt(discriminant)) / (2 * a);
  }

  /**
   * Obtiene el histórico de la trayectoria computada.
   * @returns {Array} Puntos de la trayectoria
   */
  getTrajectoryData() {
    return this.trajectory;
  }

  /**
   * Compara una predicción del estudiante contra el resultado físico final.
   * Calcula error absoluto y porcentual relativo.
   * @param {number} predictedRange Predicción de alcance horizontal del alumno
   * @returns {Object} Diferencias y errores relativos
   */
  evaluatePrediction(predictedRange) {
    const realRange = this.getTheoreticalMaxRange();
    const absoluteError = Math.abs(predictedRange - realRange);
    const relativeErrorPercent = realRange > 0 ? (absoluteError / realRange) * 100 : 0;
    
    return {
      predictedRange,
      realRange,
      absoluteError,
      relativeErrorPercent: parseFloat(relativeErrorPercent.toFixed(2))
    };
  }
}
