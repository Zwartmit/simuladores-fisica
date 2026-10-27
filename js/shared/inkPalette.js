/**
 * @fileoverview Paleta de tinta compartida por los renderizadores de Canvas.
 * Lee los tokens de css/tokens.css para que lienzo y hoja usen exactamente los mismos
 * colores, con valores de respaldo por si el CSS no cargó.
 */

const FALLBACK = {
  paper: '#FBF8EF',
  paperDeep: '#F2ECDF',
  ink: '#1B1A17',
  inkSoft: '#4A463E',
  muted: '#6B6455',
  rule: 'rgba(27, 26, 23, 0.16)',
  blue: '#2B4C8C',
  red: '#B83A26',
  ochre: '#8A5E0E',
  green: '#2F6B4F',
  graphMinor: 'rgba(43, 76, 140, 0.08)',
  graphMajor: 'rgba(43, 76, 140, 0.20)',
  shade: 'rgba(27, 26, 23, 0.06)',
};

const TOKENS = {
  paper: '--paper-2',
  paperDeep: '--paper',
  ink: '--ink',
  inkSoft: '--ink-soft',
  muted: '--muted',
  rule: '--rule',
  blue: '--blue',
  red: '--red',
  ochre: '--ochre',
  green: '--green',
  graphMinor: '--graph-minor',
  graphMajor: '--graph-major',
  shade: '--ink-shade',
};

// Pantalla de instrumento: mismas claves, tinta clara sobre fondo oscuro
const SCREEN_FALLBACK = {
  paper: '#14171C',
  paperDeep: '#14171C',
  ink: '#E9E3D3',
  inkSoft: '#C9C3B3',
  muted: '#9A9BA0',
  rule: 'rgba(233, 227, 211, 0.2)',
  blue: '#86A8EA',
  red: '#F27D66',
  ochre: '#E6B350',
  green: '#72C59E',
  graphMinor: 'rgba(233, 227, 211, 0.07)',
  graphMajor: 'rgba(233, 227, 211, 0.2)',
  shade: 'rgba(233, 227, 211, 0.07)',
};

const SCREEN_TOKENS = {
  paper: '--screen',
  paperDeep: '--screen',
  ink: '--screen-ink',
  inkSoft: '--screen-ink-soft',
  muted: '--screen-muted',
  rule: '--screen-rule',
  blue: '--screen-blue',
  red: '--screen-red',
  ochre: '--screen-ochre',
  green: '--screen-green',
  graphMinor: '--screen-grid-minor',
  graphMajor: '--screen-grid-major',
  shade: '--screen-shade',
};

export const FONTS = {
  display: '"Fraunces", Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

function readTokens(tokens, fallback) {
  const css = getComputedStyle(document.documentElement);
  const palette = {};
  for (const [key, token] of Object.entries(tokens)) {
    palette[key] = css.getPropertyValue(token).trim() || fallback[key];
  }
  return palette;
}

/** @returns {Object} Colores de tinta sobre papel, listos para ctx.fillStyle / strokeStyle */
export function readInkPalette() {
  return readTokens(TOKENS, FALLBACK);
}

/**
 * @returns {Object} Mismas claves que readInkPalette(), pero con tinta clara sobre el fondo oscuro de
 * la «pantalla de instrumento» que usan los lienzos de los simuladores.
 */
export function readScreenPalette() {
  return readTokens(SCREEN_TOKENS, SCREEN_FALLBACK);
}

/**
 * Cruces «+» en los cruces de una retícula imaginaria (sustituyen a la cuadrícula de líneas).
 * @param {number} x0 Origen de la retícula (px)  @param {number} y0 Origen (px)
 * @param {number} dx Paso horizontal (px)  @param {number} dy Paso vertical (px)
 */
export function drawCrossMarks(ctx, palette, left, top, right, bottom, x0, y0, dx, dy, size = 4) {
  ctx.save();
  ctx.strokeStyle = palette.muted;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0; x <= right; x += dx) {
    for (let y = y0; y >= top; y -= dy) {
      if (x < left || y > bottom) continue;
      ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja una punta de flecha rellena en (x, y) apuntando en la dirección `angle` (rad).
 */
export function drawArrowHead(ctx, x, y, angle, size = 10) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - Math.PI / 7), y - size * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x - size * Math.cos(angle + Math.PI / 7), y - size * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

/**
 * Dibuja el suelo como línea de tinta con rayado diagonal (símbolo técnico de apoyo).
 */
export function drawHatchedGround(ctx, palette, x0, x1, y, hatchDepth = 8) {
  ctx.save();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.muted;
  ctx.beginPath();
  for (let x = x0; x < x1; x += 9) {
    ctx.moveTo(x, y);
    ctx.lineTo(x - hatchDepth + 1, y + hatchDepth);
  }
  ctx.stroke();
  ctx.restore();
}
