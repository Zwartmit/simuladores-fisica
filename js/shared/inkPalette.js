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
};

export const FONTS = {
  display: '"Fraunces", Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

/** @returns {Object} Colores de tinta listos para usar en ctx.fillStyle / strokeStyle */
export function readInkPalette() {
  const css = getComputedStyle(document.documentElement);
  const palette = {};
  for (const [key, token] of Object.entries(TOKENS)) {
    palette[key] = css.getPropertyValue(token).trim() || FALLBACK[key];
  }
  return palette;
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
