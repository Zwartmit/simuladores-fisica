/**
 * @fileoverview Pruebas estáticas de interfaz (sin navegador ni dependencias): comprueban que
 * el HTML, el CSS y los controladores sean coherentes entre sí y con las convenciones del
 * proyecto (docs/conventions.md). Detectan IDs que main.js busca y no existen, enlaces o
 * imágenes rotos, estilos en línea, emojis, LaTeX crudo, colores fijos en los canvas, etc.
 * No sustituyen a la verificación visual en el navegador (docs/verification.md).
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIMULATORS = ['cinematica', 'newton', 'energia', 'rotacion', 'gravitacion', 'oscilaciones'];

const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf-8');

/** Símbolos decorativos y emojis que el diseño no usa (la flecha → y similares sí son tipografía). */
const DECORATIVE = /[\u2300-\u23FF\u2600-\u27BF\u2B00-\u2BFF\u25A0-\u25FF\uFE0F\u{1F000}-\u{1FFFF}]/u;

/** Extrae los valores de un atributo (id, href, src...) de todas las etiquetas de un HTML. */
const attrValues = (html, attr) => [...html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))].map(m => m[1]);

/** Etiquetas con atributo style cuyo valor no es ni la variable de entrada (--i) ni display:none. */
function forbiddenInlineStyles(html) {
  return attrValues(html, 'style').filter(v => !/^--i:\s*\d+;?$/.test(v.trim()) && !/^display:\s*none;?$/.test(v.trim()));
}

/** Reglas comunes a cualquier página HTML del sitio. */
function checkCommon(relPath, html) {
  const where = relPath;

  // Enlaces y recursos locales deben existir
  const dir = dirname(join(ROOT, relPath));
  for (const ref of [...attrValues(html, 'href'), ...attrValues(html, 'src')]) {
    if (/^(https?:|mailto:|#|data:)/.test(ref) || ref === '') continue;
    const target = resolve(dir, ref.split('#')[0].split('?')[0]);
    assert.ok(existsSync(target), `${where}: recurso local inexistente "${ref}"`);
  }

  assert.deepStrictEqual(forbiddenInlineStyles(html), [], `${where}: estilos en línea no permitidos`);
  assert.ok(!/\sonclick=/.test(html), `${where}: usa onclick en línea (usa enlaces <a>)`);
  assert.ok(!/<style[\s>]/.test(html), `${where}: bloque <style> propio (los estilos van en css/)`);
  assert.ok(!DECORATIVE.test(html), `${where}: contiene emojis o símbolos decorativos`);
  assert.ok(!/\$[^$\s][^$]*\$/.test(html), `${where}: contiene LaTeX crudo ($...$)`);
  assert.ok(!/\*\*[^*]+\*\*/.test(html), `${where}: contiene Markdown crudo (**...**)`);
  assert.ok(!/[A-Za-z]:\\|file:\/\/\//.test(html), `${where}: contiene rutas absolutas locales`);
  assert.ok(/<html lang="es">/.test(html), `${where}: falta <html lang="es">`);
  assert.ok(/<meta name="viewport"/.test(html), `${where}: falta meta viewport`);
  assert.ok(/<title>[^<]+<\/title>/.test(html), `${where}: falta <title>`);

  // Metadatos sociales: absolutos y específicos de la página
  const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
  assert.ok(ogImage && ogImage.startsWith('https://'), `${where}: og:image debe ser absoluta`);
  const ogUrl = html.match(/property="og:url"\s+content="([^"]+)"/)?.[1];
  assert.ok(ogUrl && ogUrl.startsWith('https://'), `${where}: og:url debe ser absoluta`);
  const expectedTail = relPath === 'index.html' ? '/' : `/${relPath}`;
  assert.ok(ogUrl.endsWith(expectedTail), `${where}: og:url ("${ogUrl}") debe terminar en "${expectedTail}"`);
}

export function runUiTests() {
  console.log("⚡ Iniciando pruebas estáticas de interfaz...");

  // PRUEBA 1: Cada ID que main.js busca existe en su página, sin IDs duplicados
  try {
    for (const sim of SIMULATORS) {
      const html = read(`pages/${sim}.html`);
      const ids = attrValues(html, 'id');
      assert.strictEqual(new Set(ids).size, ids.length, `${sim}.html: IDs duplicados`);

      const js = read(`js/${sim}/main.js`);
      const wanted = [...js.matchAll(/getElementById\(\s*['"`]([^'"`$]+)['"`]\s*\)/g)].map(m => m[1]);
      const missing = [...new Set(wanted)].filter(id => !ids.includes(id));
      assert.deepStrictEqual(missing, [], `${sim}: main.js busca IDs que no existen en el HTML`);
    }
    console.log("  ✅ Prueba 1: IDs de main.js presentes y únicos en cada simulador.");
  } catch (err) {
    console.error("  ❌ Prueba 1 fallida:", err.message);
    throw err;
  }

  // PRUEBA 2: Estructura de la plantilla de simulador (escenario + hoja de Pólya)
  try {
    const required = [
      'app-layout', 'simulation-area', 'physics-canvas', 'vector-telemetry', 'tutor-panel', 'polya-steps-bar',
      'tab-phase1', 'tab-phase2', 'tab-phase3', 'tab-phase4',
      'phase1-container', 'phase2-container', 'phase3-container', 'phase4-container',
      'btn-next-to-phase2', 'btn-next-to-phase3', 'btn-next-to-phase4', 'btn-sim-play', 'btn-sim-reset',
      'btn-restart-lab', 'tutor-feedback-text',
    ];
    for (const sim of SIMULATORS) {
      const html = read(`pages/${sim}.html`);
      const ids = attrValues(html, 'id');
      const missing = required.filter(id => !ids.includes(id));
      assert.deepStrictEqual(missing, [], `${sim}.html: faltan IDs de la plantilla`);
      assert.ok(html.includes('class="canvas-wrap'), `${sim}.html: falta el contenedor .canvas-wrap`);
      assert.ok(html.includes('class="masthead'), `${sim}.html: falta la cabecera .masthead`);
      assert.ok(/<link rel="stylesheet" href="\.\.\/css\/style\.css">/.test(html), `${sim}.html: falta style.css`);
      assert.ok(new RegExp(`src="\\.\\./js/${sim}/main\\.js"`).test(html), `${sim}.html: falta su main.js`);
    }
    console.log("  ✅ Prueba 2: Los 6 simuladores siguen la plantilla común.");
  } catch (err) {
    console.error("  ❌ Prueba 2 fallida:", err.message);
    throw err;
  }

  // PRUEBA 3: Reglas comunes (enlaces, estilos en línea, emojis, LaTeX, metadatos) en todas las páginas
  try {
    const pages = ['index.html', ...readdirSync(join(ROOT, 'pages')).filter(f => f.endsWith('.html')).map(f => `pages/${f}`)];
    assert.strictEqual(pages.length, 1 + SIMULATORS.length * 2, 'Se esperaban portada + 6 simuladores + 6 guías');
    pages.forEach(page => checkCommon(page, read(page)));
    console.log(`  ✅ Prueba 3: ${pages.length} páginas sin enlaces rotos, estilos en línea, emojis ni LaTeX crudo.`);
  } catch (err) {
    console.error("  ❌ Prueba 3 fallida:", err.message);
    throw err;
  }

  // PRUEBA 4: Controles accesibles — cada slider tiene su <label for>
  try {
    for (const sim of SIMULATORS) {
      const html = read(`pages/${sim}.html`);
      const labelled = new Set(attrValues(html, 'for'));
      const unlabeled = [...html.matchAll(/<input[^>]*type="range"[^>]*\sid="([^"]+)"/g)]
        .map(m => m[1]).filter(id => !labelled.has(id));
      assert.deepStrictEqual(unlabeled, [], `${sim}.html: sliders sin <label for>`);
    }
    console.log("  ✅ Prueba 4: Todos los sliders tienen etiqueta asociada.");
  } catch (err) {
    console.error("  ❌ Prueba 4 fallida:", err.message);
    throw err;
  }

  // PRUEBA 5: Diagnóstico expuesto (docs/conventions.md) y sin colores fijos en los canvas
  try {
    for (const sim of SIMULATORS) {
      const js = read(`js/${sim}/main.js`);
      assert.ok(/window\.currentSimulation\s*=/.test(js), `${sim}/main.js: no expone window.currentSimulation`);

      const renderer = read(`js/${sim}/canvasRenderer.js`);
      assert.ok(/inkPalette\.js/.test(renderer), `${sim}/canvasRenderer.js: no usa la paleta compartida`);
      const hard = renderer.match(/#[0-9a-fA-F]{3,8}\b|hsla?\(/g);
      assert.strictEqual(hard, null, `${sim}/canvasRenderer.js: colores fijos (${hard}); usa readInkPalette()`);
    }
    console.log("  ✅ Prueba 5: window.currentSimulation expuesto y canvas sin colores fijos.");
  } catch (err) {
    console.error("  ❌ Prueba 5 fallida:", err.message);
    throw err;
  }

  // PRUEBA 6: Guías — imágenes existentes con texto alternativo, hojas y enlace al simulador
  try {
    for (const sim of SIMULATORS) {
      const html = read(`pages/guide_${sim}.html`);
      const imgs = [...html.matchAll(/<img\s[^>]*>/g)].map(m => m[0]);
      assert.ok(imgs.length >= 3, `guide_${sim}.html: se esperaban al menos 3 capturas`);
      imgs.forEach(tag => {
        assert.ok(/\salt="[^"]{10,}"/.test(tag), `guide_${sim}.html: imagen sin alt descriptivo`);
        assert.ok(new RegExp(`assets/guides/${sim}_fase[1-4]\\.jpg`).test(tag), `guide_${sim}.html: nombre de captura no estándar`);
      });
      for (const n of [1, 2, 3, 4]) assert.ok(html.includes(`id="fase${n}"`), `guide_${sim}.html: falta la fase ${n}`);
      assert.ok(html.includes(`href="${sim}.html"`), `guide_${sim}.html: falta el enlace al simulador`);
      assert.ok(html.includes('href="../css/guide.css"'), `guide_${sim}.html: falta guide.css`);
    }
    console.log("  ✅ Prueba 6: Las 6 guías tienen capturas válidas, las 4 fases y enlace al simulador.");
  } catch (err) {
    console.error("  ❌ Prueba 6 fallida:", err.message);
    throw err;
  }

  // PRUEBA 7: CSS — responsive, sin fuentes descartadas ni efectos de "vidrio"
  try {
    for (const file of ['tokens.css', 'style.css', 'index.css', 'guide.css']) {
      const css = read(`css/${file}`);
      assert.ok(!/\bOutfit\b|\bInter\b|JetBrains/.test(css), `${file}: usa una fuente descartada`);
      assert.ok(!/backdrop-filter/.test(css), `${file}: usa backdrop-filter (efecto vidrio)`);
      assert.ok(!/text-shadow|filter:\s*drop-shadow/.test(css), `${file}: usa sombras de brillo`);
    }
    for (const file of ['style.css', 'index.css', 'guide.css']) {
      assert.ok(/@media\s*\(max-width/.test(read(`css/${file}`)), `${file}: sin @media responsive`);
    }
    assert.ok(/prefers-reduced-motion/.test(read('css/tokens.css')), 'tokens.css: falta prefers-reduced-motion');
    console.log("  ✅ Prueba 7: CSS responsive, accesible y sin restos del diseño anterior.");
  } catch (err) {
    console.error("  ❌ Prueba 7 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas estáticas de interfaz han pasado exitosamente!");
}
