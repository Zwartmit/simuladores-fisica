/**
 * @fileoverview Renderizador premium dedicado para Canvas de HTML5.
 * Traduce coordenadas físicas a coordenadas de píxeles y dibuja
 * proyectiles, rejillas métricas, vectores luminiscentes y trazas de predicción.
 */

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas Elemento Canvas del DOM
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Factores de escala y márgenes
    this.scale = 15;        // Píxeles por cada metro
    this.paddingBottom = 40; // Margen inferior en píxeles para el suelo
    this.paddingLeft = 60;   // Margen izquierdo para el origen

    this.resize();
  }

  /**
   * Ajusta el tamaño interno del Canvas para evitar pixelación en pantallas Retina/DPI.
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    // Dimensiones en coordenadas css lógicas
    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;
  }

  /**
   * Convierte coordenadas del mundo físico (m) a coordenadas lógicas del Canvas (px).
   * @param {number} x Posición horizontal física (m)
   * @param {number} y Posición vertical física (m)
   * @returns {Object} Coordenadas px {x, y}
   */
  worldToCanvas(x, y) {
    const pxX = this.paddingLeft + x * this.scale;
    const pxY = this.logicalHeight - this.paddingBottom - y * this.scale;
    return { x: pxX, y: pxY };
  }

  /**
   * Convierte coordenadas lógicas del Canvas (px) a coordenadas físicas del mundo (m).
   * Útil para capturar predicciones de dibujo manual del estudiante.
   * @param {number} pxX Píxeles en X
   * @param {number} pxY Píxeles en Y
   * @returns {Object} Coordenadas en metros {x, y}
   */
  canvasToWorld(pxX, pxY) {
    const x = (pxX - this.paddingLeft) / this.scale;
    const y = (this.logicalHeight - this.paddingBottom - pxY) / this.scale;
    return { x: Math.max(0, x), y: Math.max(0, y) };
  }

  /**
   * Limpia el lienzo con un fondo translúcido premium azul noche.
   */
  clear() {
    this.ctx.fillStyle = '#0b0f19';
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  /**
   * Dibuja la rejilla de fondo en metros con etiquetas de dimensiones sutiles.
   */
  drawGrid() {
    this.ctx.save();
    
    const metersWidth = this.logicalWidth / this.scale;
    const metersHeight = this.logicalHeight / this.scale;
    
    this.ctx.lineWidth = 1;
    this.ctx.font = '10px "Outfit", sans-serif';
    this.ctx.fillStyle = '#475569';
    
    // Dibujar líneas verticales cada 5 metros
    for (let x = 0; x < metersWidth; x += 5) {
      const pos = this.worldToCanvas(x, 0);
      
      this.ctx.strokeStyle = x % 10 === 0 ? 'rgba(71, 85, 105, 0.25)' : 'rgba(71, 85, 105, 0.1)';
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, 0);
      this.ctx.lineTo(pos.x, this.logicalHeight - this.paddingBottom);
      this.ctx.stroke();

      // Etiqueta numérica
      if (x > 0) {
        this.ctx.fillText(`${x}m`, pos.x - 10, this.logicalHeight - this.paddingBottom + 18);
      }
    }

    // Dibujar líneas horizontales cada 5 metros
    for (let y = 0; y < metersHeight; y += 5) {
      const pos = this.worldToCanvas(0, y);
      
      this.ctx.strokeStyle = y % 10 === 0 ? 'rgba(71, 85, 105, 0.25)' : 'rgba(71, 85, 105, 0.1)';
      this.ctx.beginPath();
      this.ctx.moveTo(this.paddingLeft, pos.y);
      this.ctx.lineTo(this.logicalWidth, pos.y);
      this.ctx.stroke();

      // Etiqueta numérica
      if (y > 0) {
        this.ctx.fillText(`${y}m`, this.paddingLeft - 30, pos.y + 4);
      }
    }

    this.ctx.restore();
  }

  /**
   * Dibuja el suelo físico del escenario como una línea de luz degradada.
   */
  drawGround() {
    this.ctx.save();
    
    // Suelo sólido oscuro
    this.ctx.fillStyle = '#070a12';
    this.ctx.fillRect(0, this.logicalHeight - this.paddingBottom, this.logicalWidth, this.paddingBottom);

    // Línea luminiscente del suelo
    const grad = this.ctx.createLinearGradient(this.paddingLeft, 0, this.logicalWidth, 0);
    grad.addColorStop(0, 'hsl(217.2, 91.2%, 59.8%)');
    grad.addColorStop(0.5, 'hsl(250, 91.2%, 59.8%)');
    grad.addColorStop(1, 'hsl(217.2, 91.2%, 59.8%)');

    this.ctx.strokeStyle = grad;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.paddingLeft, this.logicalHeight - this.paddingBottom);
    this.ctx.lineTo(this.logicalWidth, this.logicalHeight - this.paddingBottom);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  /**
   * Dibuja la trayectoria real recorrida por el proyectil.
   * @param {Array} points Lista de coordenadas de la trayectoria {x, y}
   */
  drawTrajectory(points) {
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'hsla(217.2, 91.2%, 59.8%, 0.55)';
    this.ctx.lineWidth = 2.5;
    this.ctx.setLineDash([4, 4]); // Estilo de rastro sutil
    
    this.ctx.beginPath();
    const start = this.worldToCanvas(points[0].x, points[0].y);
    this.ctx.moveTo(start.x, start.y);

    for (let i = 1; i < points.length; i++) {
      const pos = this.worldToCanvas(points[i].x, points[i].y);
      this.ctx.lineTo(pos.x, pos.y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Dibuja la partícula/proyectil en su posición actual.
   * @param {number} x Posición X física (m)
   * @param {number} y Posición Y física (m)
   */
  drawProjectile(x, y) {
    const pos = this.worldToCanvas(x, y);
    const radius = 8;

    this.ctx.save();
    
    // Brillo difuso exterior
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = 'hsl(217.2, 91.2%, 59.8%)';
    
    // Degradado radial premium para simular volumen
    const grad = this.ctx.createRadialGradient(pos.x - 2, pos.y - 2, 1, pos.x, pos.y, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, 'hsl(217.2, 91.2%, 70%)');
    grad.addColorStop(1, 'hsl(217.2, 91.2%, 50%)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Dibuja una flecha estilizada en el lienzo representando un vector físico.
   * @param {number} fromX Origen en X (m)
   * @param {number} fromY Origen en Y (m)
   * @param {number} vecX Componente vectorial X
   * @param {number} vecY Componente vectorial Y
   * @param {string} color Código de color HSL o hexadecimal
   * @param {number} scaleMultiplier Multiplicador de escala visual para hacer la flecha visible
   */
  drawVectorArrow(fromX, fromY, vecX, vecY, color, scaleMultiplier = 2) {
    // Evitar dibujo si el vector es prácticamente nulo
    const magnitude = Math.sqrt(Math.pow(vecX, 2) + Math.pow(vecY, 2));
    if (magnitude < 0.05) return;

    const start = this.worldToCanvas(fromX, fromY);
    // Extremo de la flecha
    const end = this.worldToCanvas(fromX + vecX * scaleMultiplier, fromY + vecY * scaleMultiplier);
    
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLength = 10; // Longitud de la punta de la flecha en píxeles

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = color;

    // Dibujar línea principal (cuerpo de la flecha)
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Dibujar punta de la flecha (triángulo)
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Dibuja los vectores de velocidad (verde) y aceleración (rojo) en tiempo real.
   * @param {number} x Posición X física (m)
   * @param {number} y Posición Y física (m)
   * @param {number} vx Componente X de la velocidad (m/s)
   * @param {number} vy Componente Y de la velocidad (m/s)
   * @param {number} gravity Valor de aceleración gravitatoria (m/s^2)
   */
  drawVectors(x, y, vx, vy, gravity) {
    // Vector de velocidad (escala visual: 1 m/s = 0.5 unidades del mundo)
    this.drawVectorArrow(x, y, vx, vy, '#10b981', 0.5);

    // Vector de aceleración (siempre verticalmente hacia abajo, aceleración = gravity)
    this.drawVectorArrow(x, y, 0, -gravity, '#ef4444', 0.5);
  }

  /**
   * Dibuja la trayectoria de hipótesis que el estudiante trazó de forma libre.
   * @param {Array} path Puntos capturados de la predicción en píxeles [{x, y}]
   */
  drawUserPredictionPath(path) {
    if (path.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#a855f7'; // Púrpura neón
    this.ctx.lineWidth = 2.5;
    this.ctx.setLineDash([6, 6]);
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#a855f7';

    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(path[i].x, path[i].y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Dibuja una bandera de meta estilizada en la posición donde el alumno predijo el impacto.
   * @param {number} predictedRange Alcance predicho por el alumno en metros
   */
  drawPredictionFlag(predictedRange) {
    if (predictedRange === null || predictedRange === undefined || predictedRange <= 0) return;

    const pos = this.worldToCanvas(predictedRange, 0);

    this.ctx.save();
    this.ctx.strokeStyle = '#f59e0b'; // Amarillo ambar
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#f59e0b';

    // Asta de la bandera
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.ctx.lineTo(pos.x, pos.y - 25);
    this.ctx.stroke();

    // Banderín
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - 25);
    this.ctx.lineTo(pos.x + 15, pos.y - 18);
    this.ctx.lineTo(pos.x, pos.y - 12);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}
