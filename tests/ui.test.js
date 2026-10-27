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
import { execFileSync } from 'child_process';
import { initPhaseTabs } from '../js/shared/phaseTabs.js';

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


/** Elemento mínimo con la parte de la API del DOM que usa phaseTabs.js (sin dependencias). */
function fakeElement(id) {
  const attrs = {};
  const listeners = {};
  const classes = new Set();
  return {
    id, attrs, tabIndex: -1, parentElement: null, focused: false,
    classList: { contains: (c) => classes.has(c), add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
    setAttribute(name, value) { attrs[name] = String(value); },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    focus() { this.focused = true; },
    fire(type, event = {}) { (listeners[type] || []).forEach(fn => fn({ preventDefault() {}, ...event })); },
  };
}

function checkPhaseTabsBehavior() {
  globalThis.MutationObserver = class { observe() {} };
  const list = fakeElement('lista');
  const tabs = [1, 2, 3, 4].map(n => Object.assign(fakeElement(`tab-phase${n}`), { parentElement: list }));
  const panels = [1, 2, 3, 4].map(n => fakeElement(`phase${n}-container`));
  const visited = [];
  const { sync } = initPhaseTabs({ tabs, panels, goTo: (phase) => visited.push(phase) });

  // Roles y relaciones ARIA
  assert.strictEqual(list.attrs.role, 'tablist');
  tabs.forEach((tab, i) => {
    assert.strictEqual(tab.attrs.role, 'tab');
    assert.strictEqual(tab.attrs['aria-controls'], panels[i].id);
    assert.strictEqual(panels[i].attrs.role, 'tabpanel');
    assert.strictEqual(panels[i].attrs['aria-labelledby'], tab.id);
  });

  // Estado: el jugador está en la fase 3 (1 y 2 completadas, 3 activa, 4 futura)
  tabs[0].classList.add('completed');
  tabs[1].classList.add('completed');
  tabs[2].classList.add('active');
  sync();
  assert.deepStrictEqual(tabs.map(t => t.attrs['aria-selected']), ['false', 'false', 'true', 'false']);
  assert.deepStrictEqual(tabs.map(t => t.attrs['aria-disabled']), ['false', 'false', 'false', 'true']);
  assert.deepStrictEqual(tabs.map(t => t.tabIndex), [-1, -1, 0, -1], 'Solo la pestaña activa entra en el orden de tabulación');

  // Clic: una fase futura no navega; una completada sí; la activa no hace nada
  tabs[3].fire('click');
  tabs[2].fire('click');
  assert.deepStrictEqual(visited, []);
  tabs[0].fire('click');
  assert.deepStrictEqual(visited, [1]);

  // Teclado: las flechas mueven el foco entre pestañas habilitadas sin salirse (no hay vuelta)
  tabs[2].fire('keydown', { key: 'ArrowRight' });
  assert.strictEqual(tabs[3].focused, false, 'No debe enfocar una fase futura');
  tabs[2].fire('keydown', { key: 'ArrowLeft' });
  assert.strictEqual(tabs[1].focused, true);
  tabs[2].fire('keydown', { key: 'Home' });
  assert.strictEqual(tabs[0].focused, true);

  // Enter y Espacio activan; en la pestaña activa no hacen nada
  tabs[1].fire('keydown', { key: 'Enter' });
  tabs[0].fire('keydown', { key: ' ' });
  tabs[2].fire('keydown', { key: 'Enter' });
  assert.deepStrictEqual(visited, [1, 2, 1]);
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

  // PRUEBA 8: Todos los simuladores usan las pestañas accesibles y la lectura de velocidad de Newton existe
  try {
    for (const sim of SIMULATORS) {
      const js = read(`js/${sim}/main.js`);
      assert.ok(/from '\.\.\/shared\/phaseTabs\.js'/.test(js), `${sim}/main.js: no importa phaseTabs.js`);
      assert.ok(/initPhaseTabs\(\{/.test(js), `${sim}/main.js: no llama a initPhaseTabs`);
    }
    assert.ok(attrValues(read('pages/newton.html'), 'id').includes('telemetry-v'), 'newton.html: falta la lectura de velocidad');
    console.log("  ✅ Prueba 8: Los 6 simuladores usan las pestañas de fase accesibles.");
  } catch (err) {
    console.error("  ❌ Prueba 8 fallida:", err.message);
    throw err;
  }

  // PRUEBA 9: Comportamiento de las pestañas (roles ARIA, teclado, fases futuras deshabilitadas)
  try {
    checkPhaseTabsBehavior();
    console.log("  ✅ Prueba 9: Pestañas de fase — ARIA, teclado y fases futuras bloqueadas.");
  } catch (err) {
    console.error("  ❌ Prueba 9 fallida:", err.message);
    throw err;
  }

  // PRUEBA 10: Portada-libro — portada, método, índice de los 6 laboratorios y Motion incluido en el repositorio
  try {
    const html = read('index.html');
    assert.ok(/<h1 class="cover-title">\s*Seis <em>experimentos,<\/em> un método\.\s*<\/h1>/.test(html), 'index.html: falta el título de la portada');
    assert.ok(/Secuencias didácticas e interactivas guiadas por el método heurístico de George\s+Pólya, para razonar la física antes de calcularla\./.test(html),
      'index.html: falta el subtítulo de la portada');

    // Página izquierda: las cuatro fases; página derecha: los seis experimentos enlazados
    const left = html.match(/<article class="page page-left"[\s\S]*?<\/article>/)?.[0] ?? '';
    for (const fase of ['Comprender', 'Planear', 'Ejecutar', 'Revisar']) {
      assert.ok(left.includes(`<h3>${fase}</h3>`), `página izquierda: falta la fase ${fase}`);
    }
    const right = html.match(/<section class="page page-right"[\s\S]*?<\/section>/)?.[0] ?? '';
    const links = [...right.matchAll(/<a class="entry" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepStrictEqual(links, SIMULATORS.map(sim => `pages/${sim}.html`), 'el índice debe enlazar los 6 simuladores en orden');

    // Funciona sin JavaScript (se muestra abierto) y con accesibilidad básica
    assert.ok(/classList\.add\('js'\)/.test(html), 'index.html: falta la marca html.js');
    assert.ok(/id="cover-open"[^>]*aria-expanded="false"/.test(html), 'la tapa debe ser un botón con aria-expanded');
    assert.ok(/id="close-book"[^>]*hidden/.test(html), 'el botón de cerrar debe empezar oculto');
    // El botón invisible de la tapa debe quedar por encima de los textos (si no, pulsar el título no abre el libro)
    assert.ok(/\.cover-open\s*\{[^}]*z-index:\s*[2-9]/.test(read('css/index.css')), 'index.css: .cover-open debe tener z-index por encima de los textos de la tapa');
    // Sin marco dorado en la tapa: ni borde decorativo ni anillo de foco dibujado hacia dentro
    const coverCss = read('css/index.css');
    assert.ok(!/\.cover-front::before/.test(coverCss), 'index.css: la tapa no debe llevar marco decorativo');
    assert.ok(!/\.cover-open:focus-visible\s*\{[^}]*outline:\s*\d/.test(coverCss), 'index.css: el foco de la tapa no debe dibujar un marco');

    // Motion vendido: archivo, licencia y uso desde book.js
    assert.ok(existsSync(join(ROOT, 'js/vendor/motion.min.js')), 'falta js/vendor/motion.min.js');
    assert.ok(existsSync(join(ROOT, 'js/vendor/motion.LICENSE.md')), 'falta la licencia de Motion');
    assert.ok(/^\/\*! motion \d+\.\d+\.\d+/.test(read('js/vendor/motion.min.js')), 'motion.min.js sin banner de versión');
    const book = read('js/home/book.js');
    assert.ok(/import\('\.\.\/vendor\/motion\.min\.js'\)/.test(book), 'book.js no importa Motion desde js/vendor');
    assert.ok(/prefers-reduced-motion/.test(book), 'book.js debe respetar prefers-reduced-motion');
    assert.ok(/Escape/.test(book) && /aria-expanded/.test(book), 'book.js: falta cerrar con Esc o aria-expanded');
    console.log("  ✅ Prueba 10: Portada-libro — textos, índice de 6 laboratorios, accesibilidad y Motion vendido.");
  } catch (err) {
    console.error("  ❌ Prueba 10 fallida:", err.message);
    throw err;
  }

  // PRUEBA 11: Fondo de física compartido, sin cuadrícula ni cursiva, e inmersión al entrar a un simulador
  try {
    // Todos los módulos propios compilan (un paréntesis suelto en un renderizador deja el lienzo en blanco
    // y las pruebas de física no lo ven)
    const sourceFiles = [
      ...readdirSync(join(ROOT, 'js/shared')).map(f => `js/shared/${f}`),
      'js/home/book.js',
      ...SIMULATORS.flatMap(sim => readdirSync(join(ROOT, `js/${sim}`)).map(f => `js/${sim}/${f}`)),
    ].filter(f => f.endsWith('.js'));
    for (const file of sourceFiles) {
      try {
        execFileSync(process.execPath, ['--check', join(ROOT, file)], { stdio: 'pipe' });
      } catch (err) {
        assert.fail(`${file}: error de sintaxis ${String(err.stderr ?? '').split(String.fromCharCode(10)).slice(0, 4).join(' | ')}`);
      }
    }

    // Sin cursiva en ningún CSS ni en los canvas (el énfasis va con color y peso)
    const sources = ['css/tokens.css', 'css/style.css', 'css/index.css', 'css/guide.css',
      ...SIMULATORS.map(sim => `js/${sim}/canvasRenderer.js`)];
    for (const file of sources) {
      assert.ok(!/italic/i.test(read(file).replace(/\/\*[\s\S]*?\*\//g, '')), `${file}: no debe usar cursiva`);
    }
    assert.ok(/em,\s*i,[\s\S]*?\{\s*font-style:\s*normal/.test(read('css/tokens.css')), 'tokens.css: falta el reinicio global de em/i');

    // La cuadrícula del fondo ya no existe en la portada ni en las guías
    for (const file of ['css/index.css', 'css/guide.css']) {
      assert.ok(!/background-size:\s*24px 24px/.test(read(file)), `${file}: quedó la cuadrícula de fondo`);
    }

    // Las 13 páginas cargan el mismo fondo animado; los simuladores dejan ver el escenario
    const pages = ['index.html', ...SIMULATORS.flatMap(sim => [`pages/${sim}.html`, `pages/guide_${sim}.html`])];
    for (const page of pages) {
      assert.ok(/js\/shared\/physicsBackdrop\.js"/.test(read(page)), `${page}: no carga physicsBackdrop.js`);
    }
    assert.ok(/#simulation-area\s*\{[^}]*background:\s*transparent/.test(read('css/style.css')),
      'style.css: #simulation-area debe ser transparente para mostrar el fondo');

    // El fondo usa la paleta de tinta, respeta el movimiento reducido y no captura el puntero
    const backdrop = read('js/shared/physicsBackdrop.js');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|hsla?\(|rgba?\(/.test(backdrop.replace(/\/\*[\s\S]*?\*\//g, '')), 'physicsBackdrop.js: colores fijos');
    assert.ok(/prefers-reduced-motion/.test(backdrop) && /visibilitychange/.test(backdrop), 'physicsBackdrop.js: movimiento reducido o pausa en segundo plano');
    assert.ok(/\.physics-backdrop\s*\{[^}]*pointer-events:\s*none/.test(read('css/tokens.css')), 'tokens.css: el fondo no debe capturar el puntero');

    // Inmersión: la portada guarda el origen, los simuladores lo consumen antes del primer pintado
    assert.ok(/sessionStorage\.setItem\('inmersion'/.test(read('js/home/book.js')), 'book.js: no guarda el punto de entrada');
    for (const sim of SIMULATORS) {
      assert.ok(/<script src="\.\.\/js\/shared\/arrival\.js"><\/script>/.test(read(`pages/${sim}.html`)), `${sim}.html: falta arrival.js en el <head>`);
    }
    assert.ok(/html\.immersing #app-layout/.test(read('css/style.css')) && /@keyframes immerse-in/.test(read('css/style.css')), 'style.css: falta la animación de inmersión');

    // Imagen de la portada: existe y es ligera
    const pizarra = join(ROOT, 'assets/pizarra.jpg');
    assert.ok(existsSync(pizarra) && readFileSync(pizarra).length < 150 * 1024, 'assets/pizarra.jpg falta o pesa más de 150 KB');
    assert.ok(/assets\/pizarra\.jpg/.test(read('css/index.css')), 'index.css no usa la pizarra');
    console.log("  ✅ Prueba 11: Sin cursiva ni cuadrícula; fondo de física y animación de inmersión en las 13 páginas.");
  } catch (err) {
    console.error("  ❌ Prueba 11 fallida:", err.message);
    throw err;
  }

  console.log("🎉 Todas las pruebas estáticas de interfaz han pasado exitosamente!");
}
