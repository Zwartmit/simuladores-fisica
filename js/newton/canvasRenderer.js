/**
 * @fileoverview Renderizador Canvas del laboratorio de Leyes de Newton (estilo "cuaderno").
 * Dibuja sobre una pantalla de instrumento el plano inclinado, el bloque rotado sobre la pendiente
 * y los vectores del DCL en tinta (peso en rojo, normal en azul, fricción en ocre).
 */

import { readScreenPalette, FONTS, drawArrowHead, drawHatchedGround, drawCrossMarks } from '../shared/inkPalette.js';

export class CanvasRendererNewton {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = readScreenPalette();

    // Escala (px por metro) y márgenes; la escala se recalcula con fitView()
    this.scale = 22;
    this.paddingBottom = 50; // Margen inferior para el suelo
    this.paddingLeft = 56;   // Margen izquierdo

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
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;

    // Origen de la rampa (esquina inferior izquierda de la hipotenusa)
    this.originX = this.paddingLeft;
    this.originY = this.logicalHeight - this.paddingBottom;
  }

  /**
   * Elige la escala para que quepa la rampa completa (base y altura) en el lienzo.
   * @param {number} angleDeg Ángulo de inclinación (grados)
   * @param {number} rampLength Longitud de la hipotenusa (m)
   */
  fitView(angleDeg, rampLength) {
    const alpha = (angleDeg * Math.PI) / 180;
    const availableW = this.logicalWidth - this.paddingLeft - 36;
    const availableH = this.originY - 56; // deja sitio a los vectores sobre el bloque
    if (availableW <= 0 || availableH <= 0) return;

    const scaleX = availableW / (rampLength * Math.cos(alpha));
    const scaleY = availableH / (rampLength * Math.sin(alpha));
    this.scale = Math.max(4, Math.min(scaleX, scaleY, 26));
  }

  /**
   * Limpia el lienzo con el color de la pantalla.
   */
  clear() {
    this.ctx.fillStyle = this.palette.paper;
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  /** Área con escala (px): de ella depende la cruz del visor (js/shared/instrument.js). */
  getPlotRect() {
    return { left: this.originX, top: 20, right: this.logicalWidth - 12, bottom: this.originY };
  }

  /** Convierte píxeles del lienzo a metros (origen en la esquina inferior izquierda de la rampa). */
  canvasToWorld(pxX, pxY) {
    return {
      x: Math.max(0, (pxX - this.originX) / this.scale),
      y: Math.max(0, (this.originY - pxY) / this.scale),
    };
  }

  /**
   * Dibuja los ejes graduados (marcas cada metro, números cada 5 m) y cruces «+» en los cruces
   * mayores, en lugar de una cuadrícula.
   */
  drawGrid() {
    const { ctx, palette } = this;
    const metersWidth = (this.logicalWidth - this.originX) / this.scale;
    const metersHeight = this.originY / this.scale;
    const stepPx = 5 * this.scale;

    drawCrossMarks(ctx, palette, this.originX, 0, this.logicalWidth, this.originY,
      this.originX + stepPx, this.originY - stepPx, stepPx, stepPx);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = `12px ${FONTS.mono}`;
    ctx.fillStyle = palette.muted;
    ctx.strokeStyle = palette.muted;

    ctx.beginPath();
    for (let x = 0; x <= metersWidth; x += 1) {
      const pxX = this.originX + x * this.scale;
      const major = x % 5 === 0;
      ctx.moveTo(pxX, this.originY);
      ctx.lineTo(pxX, this.originY - (major ? 9 : 4));
      if (major && x > 0) {
        ctx.textAlign = 'center';
        ctx.fillText(`${x} m`, pxX, this.originY + 34);
      }
    }
    for (let y = 0; y <= metersHeight; y += 1) {
      const pxY = this.originY - y * this.scale;
      const major = y % 5 === 0;
      ctx.moveTo(this.originX, pxY);
      ctx.lineTo(this.originX + (major ? 9 : 4), pxY);
      if (major && y > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(`${y} m`, this.originX - 12, pxY + 4);
      }
    }
    ctx.stroke();

    // Eje vertical en tinta
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.originX, 0);
    ctx.lineTo(this.originX, this.originY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dibuja la rampa del plano inclinado con su inclinación variable θ.
   * @param {number} angleDeg Ángulo de inclinación en grados
   * @param {number} maxRampLength Longitud de la hipotenusa en metros
   */
  drawRamp(angleDeg, maxRampLength) {
    const { ctx, palette } = this;
    const alpha = (angleDeg * Math.PI) / 180;
    const pxLength = maxRampLength * this.scale;

    const ax = this.originX;
    const ay = this.originY;
    const bx = this.originX + pxLength * Math.cos(alpha); // esquina inferior derecha
    const by = this.originY;
    const cx = bx;                                          // cúspide
    const cy = this.originY - pxLength * Math.sin(alpha);

    ctx.save();

    // Cuerpo del plano, relleno plano de sombreado a lápiz
    ctx.fillStyle = palette.shade;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Contorno en tinta; la hipotenusa (superficie) más gruesa
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Marcador de ángulo en el origen
    ctx.strokeStyle = palette.red;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, -alpha, true);
    ctx.stroke();

    ctx.fillStyle = palette.red;
    ctx.font = `600 16px ${FONTS.display}`;
    ctx.textAlign = 'left';
    ctx.fillText(`θ = ${angleDeg}°`, ax + 42, ay - 8);

    ctx.restore();
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
   * @returns {{x:number, y:number}} Centro de masa en píxeles (origen de los vectores)
   */
  drawBlock(distance, angleDeg, maxRampLength) {
    const { ctx, palette } = this;
    const coords = this.getBlockCanvasCoords(distance, angleDeg, maxRampLength);
    const alpha = (angleDeg * Math.PI) / 180;

    const width = 45;
    const height = 30;

    ctx.save();
    ctx.translate(coords.x, coords.y);
    ctx.rotate(-alpha);

    // Bloque: papel con contorno de tinta, sin sombras
    ctx.fillStyle = palette.paper;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-width / 2, -height, width, height);
    ctx.fill();
    ctx.stroke();

    // Centro de masa
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(0, -height / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Traducir el centro de masa local (rotado) a coordenadas globales
    const localCenterY = -height / 2;
    return {
      x: coords.x + localCenterY * Math.sin(alpha),
      y: coords.y + localCenterY * Math.cos(alpha),
    };
  }

  /**
   * Dibuja un vector de fuerza en tinta, con su rótulo en cursiva.
   * @param {number} fromX Origen en X (px)
   * @param {number} fromY Origen en Y (px)
   * @param {number} angleDeg Dirección en grados polares estándar
   * @param {number} magnitude Magnitud física (N)
   * @param {string} color Color de la tinta
   * @param {string} label Rótulo (N, W, Ff)
   */
  drawForceArrow(fromX, fromY, angleDeg, magnitude, color, label) {
    if (magnitude <= 0.05) return;

    const { ctx } = this;
    // Ángulo invertido verticalmente (en Canvas Y crece hacia abajo)
    const radians = -(angleDeg * Math.PI) / 180;
    const dirX = Math.cos(radians);
    const dirY = Math.sin(radians);

    // Longitud visual acotada: proporcional a la magnitud, pero sin salirse del lienzo. Se deja
    // un margen para que la punta y el rótulo (que va después de la punta) se vean enteros.
    let pxLen = Math.min(100, Math.max(30, magnitude * 0.45));
    const marginX = 30;
    const marginY = 22;
    const roomX = dirX > 0 ? (this.logicalWidth - marginX - fromX) / dirX
      : dirX < 0 ? (fromX - marginX) / -dirX : Infinity;
    const roomY = dirY > 0 ? (this.logicalHeight - marginY - fromY) / dirY
      : dirY < 0 ? (fromY - marginY) / -dirY : Infinity;
    pxLen = Math.max(14, Math.min(pxLen, roomX, roomY));

    const toX = fromX + pxLen * dirX;
    const toY = fromY + pxLen * dirY;
    const arrowAngle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    drawArrowHead(ctx, toX, toY, arrowAngle, 11);

    // Rótulo desplazado para no solapar la punta
    ctx.font = `600 17px ${FONTS.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, toX + 10 * Math.cos(arrowAngle) + 3, toY + 10 * Math.sin(arrowAngle));

    ctx.restore();
  }

  /**
   * Dibuja los vectores de las fuerzas físicas calculadas (teóricas).
   */
  drawTheoreticalForces(fromX, fromY, W, N, Ff, angleDeg) {
    const { palette } = this;
    // Peso (W): siempre verticalmente hacia abajo (270°)
    this.drawForceArrow(fromX, fromY, 270, W, palette.red, 'W');
    // Normal (N): perpendicular a la rampa (θ + 90°)
    this.drawForceArrow(fromX, fromY, angleDeg + 90, N, palette.blue, 'N');
    // Fricción (Ff): paralela a la rampa y opuesta al deslizamiento (θ)
    this.drawForceArrow(fromX, fromY, angleDeg, Ff, palette.ochre, 'Ff');
  }

  /**
   * Dibuja el suelo con su rayado técnico.
   */
  drawGround() {
    drawHatchedGround(this.ctx, this.palette, this.originX, this.logicalWidth - 8, this.originY);
  }
}
