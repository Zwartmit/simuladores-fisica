/**
 * @fileoverview Renderizador Canvas premium para el laboratorio de Leyes de Newton.
 * Dibuja geométricamente el plano inclinado, el bloque deslizante rotado y los vectores del DCL.
 */

export class CanvasRendererNewton {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Escala y márgenes
    this.scale = 22;         // Píxeles por cada metro
    this.paddingBottom = 50; // Margen inferior para el suelo
    this.paddingLeft = 70;   // Margen izquierdo

    this.resize();
  }

  /**
   * Ajusta el tamaño interno del Canvas para evitar pixelación en pantallas de alta densidad.
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;

    // Calcular el origen de la rampa (esquina inferior izquierda de la hipotenusa)
    this.originX = this.paddingLeft;
    this.originY = this.logicalHeight - this.paddingBottom;
  }

  /**
   * Limpia el lienzo con un azul noche translúcido.
   */
  clear() {
    this.ctx.fillStyle = '#0b0f19';
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  /**
   * Dibuja la rejilla métrica de fondo.
   */
  drawGrid() {
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.font = '10px "Outfit", sans-serif';
    this.ctx.fillStyle = '#475569';

    const metersWidth = this.logicalWidth / this.scale;
    const metersHeight = this.logicalHeight / this.scale;

    for (let x = 0; x < metersWidth; x += 5) {
      const pxX = this.originX + x * this.scale;
      this.ctx.strokeStyle = x % 10 === 0 ? 'rgba(71, 85, 105, 0.25)' : 'rgba(71, 85, 105, 0.08)';
      this.ctx.beginPath();
      this.ctx.moveTo(pxX, 0);
      this.ctx.lineTo(pxX, this.originY);
      this.ctx.stroke();

      if (x > 0) this.ctx.fillText(`${x}m`, pxX - 10, this.originY + 18);
    }

    for (let y = 0; y < metersHeight; y += 5) {
      const pxY = this.originY - y * this.scale;
      this.ctx.strokeStyle = y % 10 === 0 ? 'rgba(71, 85, 105, 0.25)' : 'rgba(71, 85, 105, 0.08)';
      this.ctx.beginPath();
      this.ctx.moveTo(this.originX, pxY);
      this.ctx.lineTo(this.logicalWidth, pxY);
      this.ctx.stroke();

      if (y > 0) this.ctx.fillText(`${y}m`, this.originX - 30, pxY + 4);
    }

    this.ctx.restore();
  }

  /**
   * Dibuja la rampa del plano inclinado con su inclinación variable θ.
   * @param {number} angleDeg Ángulo de inclinación en grados
   * @param {number} maxRampLength Longitud de la hipotenusa en metros
   */
  drawRamp(angleDeg, maxRampLength) {
    const alpha = (angleDeg * Math.PI) / 180;
    const pxLength = maxRampLength * this.scale;

    // Coordenadas del triángulo del plano inclinado
    // Punto A: Base inferior izquierda de la rampa (Origen)
    const ax = this.originX;
    const ay = this.originY;

    // Punto B: Esquina inferior derecha (cateto base)
    const bx = this.originX + pxLength * Math.cos(alpha);
    const by = this.originY;

    // Punto C: Cúspide superior derecha (vértice vertical)
    const cx = bx;
    const cy = this.originY - pxLength * Math.sin(alpha);

    this.ctx.save();

    // Relleno degradado del plano inclinado
    const gradFill = this.ctx.createLinearGradient(ax, ay, bx, cy);
    gradFill.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
    gradFill.addColorStop(1, 'rgba(30, 41, 59, 0.85)');
    
    this.ctx.fillStyle = gradFill;
    this.ctx.beginPath();
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(bx, by);
    this.ctx.lineTo(cx, cy);
    this.ctx.closePath();
    this.ctx.fill();

    // Contorno luminiscente azul neón
    this.ctx.strokeStyle = 'hsl(217.2, 91.2%, 59.8%)';
    this.ctx.lineWidth = 2.5;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = 'hsl(217.2, 91.2%, 59.8%)';
    this.ctx.beginPath();
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(cx, cy); // Solo la rampa (hipotenusa) brilla
    this.ctx.stroke();

    // Contorno de la base e inclinación sutiles
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(bx, by);
    this.ctx.lineTo(cx, cy);
    this.ctx.stroke();

    // Dibujar transportador o marcador de ángulo sutil en el origen
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(ax, ay, 30, 0, -alpha, true);
    this.ctx.stroke();

    this.ctx.fillStyle = '#93c5fd';
    this.ctx.font = '11px var(--font-sans)';
    this.ctx.fillText(`${angleDeg}°`, ax + 35, ay - 12);

    this.ctx.restore();
  }

  /**
   * Obtiene la posición física en el Canvas (px) de un punto de la rampa.
   * @param {number} distance Distancia desde la cúspide (m)
   * @param {number} angleDeg Ángulo de la rampa
   * @param {number} maxRampLength Longitud total rampa
   */
  getBlockCanvasCoords(distance, angleDeg, maxRampLength) {
    const alpha = (angleDeg * Math.PI) / 180;
    // Distancia medida desde la base de la rampa
    const distFromBase = maxRampLength - distance;
    const pxDistFromBase = distFromBase * this.scale;

    const pxX = this.originX + pxDistFromBase * Math.cos(alpha);
    const pxY = this.originY - pxDistFromBase * Math.sin(alpha);

    return { x: pxX, y: pxY };
  }

  /**
   * Dibuja el bloque apoyado y alineado (rotado) sobre la pendiente del plano inclinado.
   * @param {number} distance Distancia recorrida desde el tope (m)
   * @param {number} angleDeg Ángulo de la rampa (grados)
   * @param {number} maxRampLength Longitud total rampa (m)
   */
  drawBlock(distance, angleDeg, maxRampLength) {
    const coords = this.getBlockCanvasCoords(distance, angleDeg, maxRampLength);
    const alpha = (angleDeg * Math.PI) / 180;
    
    // Dimensiones en px del bloque
    const width = 45;
    const height = 30;

    this.ctx.save();
    
    // Mover el origen de coordenadas al centro del bloque
    this.ctx.translate(coords.x, coords.y);
    // Rotar para alinear con la pendiente
    this.ctx.rotate(-alpha);

    // Dibujar el bloque como un rectángulo premium (sombra y centro con glow)
    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#cbd5e1';

    // Rectángulo centrado (desplazado la mitad de su tamaño y elevado sobre la rampa)
    this.ctx.beginPath();
    this.ctx.roundRect(-width / 2, -height, width, height, 4);
    this.ctx.fill();
    this.ctx.stroke();

    // Dibujar el centro de masa del bloque (punto neón)
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#f43f5e';
    this.ctx.fillStyle = '#f43f5e';
    this.ctx.beginPath();
    this.ctx.arc(0, -height / 2, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    // Retorna las coordenadas de píxeles del centro de masa para posicionar los vectores
    const localCenterY = -height / 2;
    // Traducir coordenadas locales rotadas a globales
    const globalCenterX = coords.x + localCenterY * Math.sin(alpha);
    const globalCenterY = coords.y + localCenterY * Math.cos(alpha);

    return { x: globalCenterX, y: globalCenterY };
  }

  /**
   * Dibuja un vector de fuerza estilizado y rotulado en el lienzo.
   * @param {number} fromX Origen en X (px)
   * @param {number} fromY Origen en Y (px)
   * @param {number} angleDeg Dirección en grados polares estándar
   * @param {number} magnitude Magnitud física (fuerza N)
   * @param {string} color Color neón de la fuerza
   * @param {string} label Etiqueta rotulada (N, W, Ff)
   */
  drawForceArrow(fromX, fromY, angleDeg, magnitude, color, label) {
    if (magnitude <= 0.05) return;

    // Escala visual para que las flechas se adapten al Canvas (1 Newton = 0.5 píxeles)
    const pxLen = Math.min(100, Math.max(30, magnitude * 0.45));
    
    // Ángulo en radianes invertido verticalmente en Canvas (Y crece hacia abajo)
    const radians = -(angleDeg * Math.PI) / 180;
    
    const toX = fromX + pxLen * Math.cos(radians);
    const toY = fromY + pxLen * Math.sin(radians);

    const headLength = 9;
    const arrowAngle = Math.atan2(toY - fromY, toX - fromX);

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = color;

    // Cuerpo de la flecha
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Punta de la flecha
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(arrowAngle - Math.PI / 6),
      toY - headLength * Math.sin(arrowAngle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(arrowAngle + Math.PI / 6),
      toY - headLength * Math.sin(arrowAngle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();

    // Rótulo / Etiqueta del Vector
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px var(--font-sans)';
    
    // Desplazamiento sutil del texto para que no solape la punta de la flecha
    const textX = toX + 10 * Math.cos(arrowAngle);
    const textY = toY + 10 * Math.sin(arrowAngle) + 4;
    this.ctx.fillText(label, textX - 4, textY);

    this.ctx.restore();
  }

  /**
   * Dibuja los vectores de fuerzas físicas calculadas teóricas.
   */
  drawTheoreticalForces(fromX, fromY, W, N, Ff, angleDeg) {
    // 1. Peso (W): Siempre verticalmente hacia abajo (270°)
    this.drawForceArrow(fromX, fromY, 270, W, '#ef4444', 'W');

    // 2. Normal (N): Perpendicular a la rampa (theta + 90°)
    this.drawForceArrow(fromX, fromY, angleDeg + 90, N, '#3b82f6', 'N');

    // 3. Fricción (Ff): Paralela a la rampa opuesta al deslizamiento (theta)
    this.drawForceArrow(fromX, fromY, angleDeg, Ff, '#f59e0b', 'Ff');
  }

  /**
   * Dibuja el suelo físico del escenario de simulación.
   */
  drawGround() {
    this.ctx.save();
    
    // Suelo sólido oscuro
    this.ctx.fillStyle = '#070a12';
    this.ctx.fillRect(0, this.originY, this.logicalWidth, this.paddingBottom);

    // Línea neón
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.originX, this.originY);
    this.ctx.lineTo(this.logicalWidth, this.originY);
    this.ctx.stroke();

    this.ctx.restore();
  }
}
