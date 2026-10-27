/**
 * Cambia el dominio público del sitio en todos los archivos que lo repiten (canonical, Open Graph,
 * Twitter, JSON-LD, sitemap.xml y robots.txt).
 *
 *   node scripts/set-site-url.mjs https://mi-dominio.com
 *
 * Sin argumentos muestra el dominio actual. No toca nada más.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'index.html', 'sitemap.xml', 'robots.txt',
  ...readdirSync(join(ROOT, 'pages')).filter((f) => f.endsWith('.html')).map((f) => `pages/${f}`),
];

const current = readFileSync(join(ROOT, 'sitemap.xml'), 'utf-8').match(/<loc>(https?:\/\/[^/<]+)\//)?.[1];
const next = process.argv[2]?.replace(/\/+$/, '');

if (!next) {
  console.log(`Dominio actual: ${current}`);
  process.exit(0);
}
if (!/^https?:\/\/[^/\s]+$/.test(next)) {
  console.error('Uso: node scripts/set-site-url.mjs https://mi-dominio.com (sin ruta final)');
  process.exit(1);
}

let total = 0;
for (const file of files) {
  const path = join(ROOT, file);
  const text = readFileSync(path, 'utf-8');
  const count = text.split(current).length - 1;
  if (count) {
    writeFileSync(path, text.split(current).join(next));
    total += count;
  }
}
console.log(`${current} → ${next}: ${total} sustituciones en ${files.length} archivos.`);
