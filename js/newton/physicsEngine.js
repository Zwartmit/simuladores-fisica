/**
 * @fileoverview Motor de física clásico para simulación de Leyes de Newton en un Plano Inclinado.
 * Computa fuerzas vectoriales (Peso, Normal, Fricción) y evalúa el Diagrama de cuerpo libre (DCL).
 */

export class PhysicsEngineNewton {
  constructor() {
    // Parámetros iniciales del plano
    this.mass = 5.0;       // Masa del bloque (kg)
    this.angleDeg = 30;    // Inclinación del plano (grados)
    this.muS = 0.5;        // Coeficiente de fricción estática
    this.muK = 0.35;       // Coeficiente de fricción cinética
    this.gravity = 9.81;   // Gravedad (m/s^2)

    // Estado dinámico
    this.t = 0;            // Tiempo transcurrido
    this.distance = 0;     // Distancia recorrida rampa abajo (m)
    this.velocity = 0;     // Velocidad lineal rampa abajo (m/s)
    this.arrivalVelocity = 0; // Velocidad con la que llega al final de la rampa (m/s); 0 hasta que llega
    this.arrivalTime = 0;     // Instante exacto de llegada al final de la rampa (s); 0 hasta que llega
    this.acceleration = 0; // Aceleración lineal (m/s^2)

    // Variables de control de simulación
    this.isMoving = false;
    this.isAtBottom = false;
    this.maxRampLength = 20; // Longitud máxima de la rampa en la pantalla (m)

    this.calculateForces();
  }

  /**
   * Calcula de forma exacta todas las fuerzas que actúan en el plano inclinado.
   */
  calculateForces() {
    const alpha = (this.angleDeg * Math.PI) / 180;

    // Magnitud del Peso: W = m * g
    this.W = this.mass * this.gravity;

    // Componentes del peso respecto a los ejes del plano inclinado:
    // Wx es paralela al plano inclinado (fuerza que arrastra el bloque rampa abajo)
    // Wy es perpendicular al plano inclinado
    this.Wx = this.W * Math.sin(alpha);
    this.Wy = this.W * Math.cos(alpha);

    // Fuerza Normal: N = Wy = W * cos(theta) (por equilibrio en el eje perpendicular)
    this.N = this.Wy;

    // Fuerza de Fricción Estática Máxima (Límite antes de romper el reposo):
    // Ffs_max = mu_s * N
    this.Ffs_max = this.muS * this.N;

    // Fuerza de Fricción Cinética (Fricción constante durante el deslizamiento):
    // Ffk = mu_k * N
    this.Ffk = this.muK * this.N;

    // Determinar si hay deslizamiento o equilibrio estático
    if (this.Wx > this.Ffs_max) {
      // Dinámica: Hay movimiento acelerado
      // Fuerza neta: F_neta = Wx - Ffk
      // Aceleración: a = (Wx - Ffk) / m = g * (sin(theta) - mu_k * cos(theta))
      this.isMoving = true;
      this.Ff_real = this.Ffk;
      this.acceleration = (this.Wx - this.Ffk) / this.mass;
    } else {
      // Estática: El bloque permanece en perfecto equilibrio
      // Fuerza de fricción estática real es exactamente igual a la fuerza impulsora: Ff = Wx
      this.isMoving = false;
      this.Ff_real = this.Wx;
      this.acceleration = 0;
    }

    this.reset();
  }

  /**
   * Configura las condiciones del plano inclinado.
   */
  setParameters(mass, angleDeg, muS, muK, gravity) {
    this.mass = isNaN(parseFloat(mass)) ? 5.0 : Math.max(0.1, parseFloat(mass));
    this.angleDeg = isNaN(parseFloat(angleDeg)) ? 30 : Math.min(89, Math.max(1, parseFloat(angleDeg)));
    this.muS = isNaN(parseFloat(muS)) ? 0.5 : Math.max(0, parseFloat(muS));
    // Coeficiente cinético no puede ser mayor que el estático
    const rawMuK = isNaN(parseFloat(muK)) ? 0.35 : Math.max(0, parseFloat(muK));
    this.muK = Math.min(this.muS, rawMuK);
    this.gravity = isNaN(parseFloat(gravity)) ? 9.81 : Math.max(0.1, parseFloat(gravity));

    this.calculateForces();
  }

  /**
   * Reinicia el estado de la animación.
   */
  reset() {
    this.t = 0;
    this.distance = 0;
    this.velocity = 0;
    this.arrivalVelocity = 0;
    this.arrivalTime = 0;
    this.isAtBottom = false;
  }

  /**
   * Avanza la dinámica del plano inclinado un paso temporal.
   */
  update(dt) {
    if (this.isAtBottom || !this.isMoving) return;

    dt = Math.min(0.1, Math.max(0, parseFloat(dt) || 0));
    if (dt === 0) return;

    this.t += dt;

    // Ecuaciones dinámicas del MRUV bajo aceleración neta constante:
    // v(t) = a * t
    // d(t) = 0.5 * a * t^2
    this.velocity = this.acceleration * this.t;
    this.distance = 0.5 * this.acceleration * Math.pow(this.t, 2);

    // Detener al bloque si llega al final de la rampa
    if (this.distance >= this.maxRampLength) {
      // Llegada exacta (no al final del paso, que se pasa de largo): d = ½·a·t² → t = √(2L/a),
      // v = a·t = √(2·a·L). El bloque se detiene al topar con el suelo, pero se conserva la
      // velocidad de llegada para mostrarla.
      this.arrivalTime = Math.sqrt((2 * this.maxRampLength) / this.acceleration);
      this.arrivalVelocity = this.acceleration * this.arrivalTime;
      this.t = this.arrivalTime;
      this.distance = this.maxRampLength;
      this.velocity = 0;
      this.isAtBottom = true;
    }
  }

  /**
   * Evalúa el Diagrama de cuerpo libre (DCL) interactivo dibujado por el estudiante.
   * Compara los ángulos y magnitudes de las fuerzas Normal, Peso y Fricción.
   * 
   * @param {Object} userForces Vectores del DCL del usuario { W: {angle, mag}, N: {angle, mag}, Ff: {angle, mag} }
   * @returns {Object} Informe detallado de desviaciones y porcentajes de error
   */
  evaluateDCL(userForces) {
    // Definición teórica exacta de los ángulos del DCL en coordenadas de pantalla:
    // (0° es a la derecha, 90° hacia arriba, 180° a la izquierda, 270° hacia abajo)

    // 1. Peso (W): Siempre verticalmente hacia abajo (270°)
    const angleW_Teo = 270;
    const magW_Teo = this.W;

    // 2. Normal (N): Perpendicular a la rampa hacia arriba.
    // Si la rampa sube hacia la derecha con ángulo theta, la normal apunta hacia arriba e izquierda
    // Angulo teo = theta + 90 grados
    const angleN_Teo = this.angleDeg + 90;
    const magN_Teo = this.N;

    // 3. Fricción (Ff): Paralela a la rampa opuesta al deslizamiento.
    // Como el bloque desliza hacia abajo y a la izquierda (angulo theta + 180),
    // la fricción apunta hacia arriba y a la derecha (paralela a la rampa): ángulo theta
    const angleFf_Teo = this.angleDeg;
    const magFf_Teo = this.Ff_real;

    const report = {
      W: { teoAng: angleW_Teo, teoMag: magW_Teo, errorAng: 0, errorMagPercent: 0, status: 'correct' },
      N: { teoAng: angleN_Teo, teoMag: magN_Teo, errorAng: 0, errorMagPercent: 0, status: 'correct' },
      Ff: { teoAng: angleFf_Teo, teoMag: magFf_Teo, errorAng: 0, errorMagPercent: 0, status: 'correct' },
      score: 100 // Puntuación didáctica
    };

    // Auxiliar para calcular error angular cíclico (-180 a 180)
    const getAngularDiff = (ang1, ang2) => {
      let diff = (ang1 - ang2) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return Math.abs(diff);
    };

    // Validar cada fuerza provista
    const forcesKeys = ['W', 'N', 'Ff'];
    forcesKeys.forEach(key => {
      const uForce = userForces[key];
      const teoMag = key === 'W' ? magW_Teo : (key === 'N' ? magN_Teo : magFf_Teo);
      const teoAng = key === 'W' ? angleW_Teo : (key === 'N' ? angleN_Teo : angleFf_Teo);

      if (!uForce) {
        report[key].status = 'missing';
        report.score -= 33;
        return;
      }

      // Desviación angular
      const errorAng = getAngularDiff(uForce.angle, teoAng);
      report[key].errorAng = parseFloat(errorAng.toFixed(1));

      // Desviación de magnitud
      const errorMagAbs = Math.abs(uForce.magnitude - teoMag);
      const errorMagPercent = teoMag > 0 ? (errorMagAbs / teoMag) * 100 : 0;
      report[key].errorMagPercent = parseFloat(errorMagPercent.toFixed(1));

      // Calificar estatus
      if (errorAng > 10 || errorMagPercent > 20) {
        report[key].status = 'incorrect';
        report.score -= 20;
      } else if (errorAng > 5 || errorMagPercent > 10) {
        report[key].status = 'warning';
        report.score -= 10;
      }
    });

    report.score = Math.max(0, Math.round(report.score));
    return report;
  }
}
