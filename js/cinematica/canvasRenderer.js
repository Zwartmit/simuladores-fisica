/**
 * @fileoverview Renderizador dedicado para Canvas de HTML5 (estilo "cuaderno de laboratorio").
 * Traduce coordenadas físicas a coordenadas de píxeles y dibuja sobre papel milimetrado:
 * ejes con marcas, trayectoria a lápiz, vectores en tinta y la hipótesis del estudiante.
 * Los colores se leen de los tokens CSS (css/tokens.css) mediante js/shared/inkPalette.js.
 */

import { readInkPalette } from '../shared/inkPalette.js';

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas Elemento Canvas del DOM
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Escala (px por metro) y márgenes; la escala se recalcula con fitView()
    this.scale = 15;
    this.paddingBottom = 44;  // Margen inferior en píxeles para el suelo y sus marcas
    this.paddingLeft = 56;    // Margen izquierdo para el eje vertical
    this.paddingTop = 24;
    this.paddingRight = 28;

    this.palette = readInkPalette();
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

    // setTransform evita acumular escalas en redimensionamientos sucesivos
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dimensiones en coordenadas css lógicas
    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;
  }

  /**
   * Elige la escala para que quepa toda la escena (alcance y altura máximos) en el lienzo.
   * @param {number} maxX Mayor distancia horizontal a mostrar (m)
   * @param {number} maxY Mayor altura a mostrar (m)
   */
  fitView(maxX, maxY) {
    const availableW = this.logicalWidth - this.paddingLeft - this.paddingRight;
    const availableH = this.logicalHeight - this.paddingBottom - this.paddingTop;
    if (availableW <= 0 || availableH <= 0) return;

    const scaleX = availableW / Math.max(maxX, 10);
    const scaleY = availableH / Math.max(maxY, 10);
    this.scale = Math.max(2, Math.min(scaleX, scaleY));
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
   * Limpia el lienzo con el color del papel.
   */
  clear() {
    this.ctx.fillStyle = this.palette.paper;
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  /**
   * Paso de rejilla en metros que mantiene las líneas separadas al menos ~12 px.
   */
  _gridStep() {
    const steps = [1, 2, 5, 10, 20, 50];
    return steps.find(s => s * this.scale >= 12) ?? 50;
  }

  /**
   * Dibuja el papel milimetrado alineado con los metros, con ejes graduados.
   */
  drawGrid() {
    const { ctx, palette } = this;
    const groundY = this.logicalHeight - this.paddingBottom;
    const metersWidth = (this.logicalWidth - this.paddingLeft) / this.scale;
    const metersHeight = (groundY - this.paddingTop) / this.scale;
    const minor = this._gridStep();
    const major = minor * 5;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = palette.muted;

    // Líneas verticales (distancia)
    for (let x = 0; x <= metersWidth; x += minor) {
      const px = this.worldToCanvas(x, 0).x;
      const isMajor = x % major === 0;
      ctx.strokeStyle = isMajor ? palette.graphMajor : palette.graphMinor;
      ctx.beginPath();
      ctx.moveTo(px, this.paddingTop);
      ctx.lineTo(px, groundY);
      ctx.stroke();

      if (isMajor && x > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(`${x} m`, px, groundY + 36);
      }
    }

    // Líneas horizontales (altura)
    for (let y = 0; y <= metersHeight; y += minor) {
      const py = this.worldToCanvas(0, y).y;
      const isMajor = y % major === 0;
      ctx.strokeStyle = isMajor ? palette.graphMajor : palette.graphMinor;
      ctx.beginPath();
      ctx.moveTo(this.paddingLeft, py);
      ctx.lineTo(this.logicalWidth - this.paddingRight / 2, py);
      ctx.stroke();

      if (isMajor && y > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(`${y} m`, this.paddingLeft - 10, py + 4);
      }
    }

    // Eje vertical en tinta
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, this.paddingTop);
    ctx.lineTo(this.paddingLeft, groundY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dibuja el suelo como línea de tinta con rayado diagonal (símbolo técnico de apoyo).
   */
  drawGround() {
    const { ctx, palette } = this;
    const groundY = this.logicalHeight - this.paddingBottom;

    ctx.save();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, groundY);
    ctx.lineTo(this.logicalWidth - this.paddingRight / 2, groundY);
    ctx.stroke();

    // Rayado bajo el suelo
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.muted;
    ctx.beginPath();
    for (let x = this.paddingLeft; x < this.logicalWidth - this.paddingRight / 2; x += 9) {
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - 7, groundY + 8);
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dibuja la trayectoria real recorrida por el proyectil, a lápiz (trazo discontinuo).
   * @param {Array} points Lista de coordenadas de la trayectoria {x, y}
   */
  drawTrajectory(points) {
    if (points.length < 2) return;

    const { ctx, palette } = this;
    ctx.save();
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);

    ctx.beginPath();
    const start = this.worldToCanvas(points[0].x, points[0].y);
    ctx.moveTo(start.x, start.y);

    for (let i = 1; i < points.length; i++) {
      const pos = this.worldToCanvas(points[i].x, points[i].y);
      ctx.lineTo(pos.x, pos.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja el proyectil: punto de tinta con aro (sin brillos).
   * @param {number} x Posición X física (m)
   * @param {number} y Posición Y física (m)
   */
  drawProjectile(x, y) {
    const { ctx, palette } = this;
    const pos = this.worldToCanvas(x, y);

    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja una flecha en tinta que representa un vector físico, con su rótulo en cursiva.
   * @param {number} fromX Origen en X (m)
   * @param {number} fromY Origen en Y (m)
   * @param {number} vecX Componente vectorial X
   * @param {number} vecY Componente vectorial Y
   * @param {string} color Color de la tinta
   * @param {number} scaleMultiplier Multiplicador de escala visual para hacer la flecha visible
   * @param {string} label Rótulo junto a la punta (opcional)
   */
  drawVectorArrow(fromX, fromY, vecX, vecY, color, scaleMultiplier = 2, label = '') {
    // Evitar dibujo si el vector es prácticamente nulo
    const magnitude = Math.hypot(vecX, vecY);
    if (magnitude < 0.05) return;

    const start = this.worldToCanvas(fromX, fromY);
    const end = this.worldToCanvas(fromX + vecX * scaleMultiplier, fromY + vecY * scaleMultiplier);

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLength = 11;
    const { ctx } = this;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;

    // Cuerpo de la flecha
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Punta de la flecha
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 7),
      end.y - headLength * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 7),
      end.y - headLength * Math.sin(angle + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = '600 17px "Fraunces", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, end.x + 9 * Math.cos(angle) + 4, end.y + 9 * Math.sin(angle));
    }

    ctx.restore();
  }

  /**
   * Dibuja los vectores de velocidad (azul) y aceleración (rojo) en tiempo real.
   * @param {number} x Posición X física (m)
   * @param {number} y Posición Y física (m)
   * @param {number} vx Componente X de la velocidad (m/s)
   * @param {number} vy Componente Y de la velocidad (m/s)
   * @param {number} gravity Valor de aceleración gravitatoria (m/s^2)
   */
  drawVectors(x, y, vx, vy, gravity) {
    // Escala visual: la flecha mide ~0.5 m de pantalla por cada m/s (o m/s²)
    this.drawVectorArrow(x, y, vx, vy, this.palette.blue, 0.5, 'v');

    // Vector de aceleración (siempre verticalmente hacia abajo, aceleración = gravity)
    this.drawVectorArrow(x, y, 0, -gravity, this.palette.red, 0.5, 'g');
  }

  /**
   * Dibuja la trayectoria de hipótesis que el estudiante trazó de forma libre.
   * @param {Array} path Puntos capturados de la predicción en píxeles [{x, y}]
   */
  drawUserPredictionPath(path) {
    if (path.length < 2) return;

    const { ctx, palette } = this;
    ctx.save();
    ctx.strokeStyle = palette.ochre;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([2, 6]);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja una banderola en la posición donde el alumno predijo el impacto.
   * @param {number} predictedRange Alcance predicho por el alumno en metros
   */
  drawPredictionFlag(predictedRange) {
    if (predictedRange === null || predictedRange === undefined || predictedRange <= 0) return;

    const { ctx, palette } = this;
    const pos = this.worldToCanvas(predictedRange, 0);

    ctx.save();
    ctx.strokeStyle = palette.ochre;
    ctx.fillStyle = palette.ochre;

    // Asta
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y - 28);
    ctx.stroke();

    // Banderín
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - 28);
    ctx.lineTo(pos.x + 16, pos.y - 21);
    ctx.lineTo(pos.x, pos.y - 14);
    ctx.closePath();
    ctx.fill();

    // Rótulo
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${predictedRange} m`, pos.x, pos.y - 34);

    ctx.restore();
  }
}
