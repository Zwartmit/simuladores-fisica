/**
 * @fileoverview Portada: el libro. Controla el paso entre «cerrado» (se ve la tapa) y «abierto»
 * (dos páginas: el método y el índice de laboratorios).
 *
 * Animación con Motion (js/vendor/motion.min.js): la tapa gira sobre el lomo con un resorte y se
 * puede interrumpir a mitad (cerrar mientras se abre) sin saltos. Si Motion no carga, el libro
 * sigue funcionando sin animaciones. Con prefers-reduced-motion se cambia de estado al instante.
 *
 * Accesibilidad: la tapa es un botón con aria-expanded; mientras el libro está cerrado las páginas
 * son inertes (no entran en el orden de tabulación); Esc cierra el libro; al abrirlo con teclado el
 * foco pasa al primer experimento.
 *
 * Estado: se recuerda en sessionStorage para que, al volver desde un simulador, el libro siga abierto.
 */

const STORAGE_KEY = 'libro-abierto';
const SPREAD_CLOSED_SCALE = 0.52; // ancho de la sombra con el libro cerrado (relativo al abierto)
const HINGE_OPEN_SPREAD = -180;   // grados que gira la tapa en pantalla ancha
const HINGE_OPEN_STACK = -100;    // grados en pantalla estrecha (la tapa se aparta y desaparece)

const HINT_CLOSED = 'Haz clic en la portada para abrir el libro.';
const HINT_OPEN = 'Elige un experimento del índice. Pulsa Esc para cerrar el libro.';

/** Sustituto sin animaciones: aplica el valor final al instante (si Motion no se pudo cargar). */
function createInstantMotion() {
  const state = new WeakMap();
  const last = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
  const animate = (targets, props) => {
    const list = targets instanceof Element ? [targets] : [...targets];
    list.forEach((el) => {
      const t = state.get(el) ?? { x: 0, y: 0, rotateY: 0 };
      for (const [key, raw] of Object.entries(props)) {
        const value = last(raw);
        if (key === 'opacity') el.style.opacity = String(value);
        else if (key in t) t[key] = value;
        else if (key === 'scaleX') t.scaleX = value;
      }
      state.set(el, t);
      el.style.transform =
        `translate(${t.x}px, ${t.y}px) scaleX(${t.scaleX ?? 1}) rotateY(${t.rotateY}deg)`;
    });
    return { stop() {}, then: (fn) => Promise.resolve().then(fn) };
  };
  return { animate, stagger: () => 0 };
}

async function loadMotion() {
  try {
    return await import('../vendor/motion.min.js');
  } catch (error) {
    console.warn('Motion no se pudo cargar; el libro funcionará sin animaciones.', error);
    return createInstantMotion();
  }
}

const { animate, stagger } = await loadMotion();

// ─── Elementos ──────────────────────────────────────────────────────────────

const root = document.documentElement;
const book = document.getElementById('book');
const hinge = document.getElementById('hinge');
const coverButton = document.getElementById('cover-open');
const closeButton = document.getElementById('close-book');
const hint = document.getElementById('hint');
const shadow = document.getElementById('shadow');
const shadeFront = document.getElementById('shade-front');
const shadeBack = document.getElementById('shade-back');
const pageLeft = book.querySelector('.page-left');
const pageRight = book.querySelector('.page-right');
const leftReveals = [...pageLeft.querySelectorAll('[data-reveal]')];
const rightReveals = [...pageRight.querySelectorAll('[data-reveal]')];
const allReveals = [...leftReveals, ...rightReveals];

const narrow = window.matchMedia('(max-width: 900px)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ─── Animaciones ────────────────────────────────────────────────────────────

// Sin rebote al volver a 0°: un rebote cruzaría la vertical y la tapa se metería detrás de la página
// derecha, dejando ver un destello de papel blanco.
const SPRING_HINGE = { type: 'spring', visualDuration: 1.15, bounce: 0.14 };
const SPRING_HINGE_CLOSE = { type: 'spring', visualDuration: 1.0, bounce: 0 };
const SPRING_BOOK = { type: 'spring', visualDuration: 1.05, bounce: 0.04 };
const SPRING_LIFT = { type: 'spring', visualDuration: 0.35, bounce: 0 };
const EASE_OUT = [0.2, 0.7, 0.2, 1];

let isOpen = false;
let sequence = 0;       // identifica la última orden; las anteriores dejan de tener efecto
let running = [];       // controles de las animaciones en curso

const track = (controls) => { running.push(controls); return controls; };
const stopAll = () => { running.forEach((c) => c.stop?.()); running = []; };
const set = (targets, props) => animate(targets, props, { duration: 0 });

/** Espera a que terminen las animaciones, sin quedarse colgado si alguna se interrumpe. */
const settle = () => Promise.race([
  Promise.all(running.map((c) => c)),
  new Promise((resolve) => setTimeout(resolve, 2600)),
]);

// Cerrado, solo se ve la mitad derecha del libro (la tapa), que sobresale 0.55em por la derecha
// (--board): se compensa media tapa para que el conjunto quede centrado de verdad.
const BOARD_EM = 0.55;
const closedOffset = () => {
  if (narrow.matches) return 0;
  const em = parseFloat(getComputedStyle(book).fontSize);
  return -book.offsetWidth / 4 - (BOARD_EM * em) / 2;
};

// ─── Estado visible (accesibilidad y textos) ────────────────────────────────

function syncAccessibility(open) {
  coverButton.setAttribute('aria-expanded', String(open));
  coverButton.tabIndex = open ? -1 : 0;
  coverButton.disabled = open;
  pageLeft.inert = !open;
  pageRight.inert = !open;
  closeButton.hidden = !open;
  hint.textContent = open ? HINT_OPEN : HINT_CLOSED;
}

function remember(open) {
  try {
    if (open) sessionStorage.setItem(STORAGE_KEY, '1');
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) { /* sin almacenamiento: no pasa nada */ }
}

// ─── Estado final instantáneo (arranque, redimensionado, movimiento reducido) ─

function applyInstant(open) {
  stopAll();
  const stack = narrow.matches;
  book.dataset.state = open ? 'open' : 'closed';
  book.dataset.cover = stack && open ? 'gone' : 'on';

  set(hinge, { rotateY: open ? (stack ? HINGE_OPEN_STACK : HINGE_OPEN_SPREAD) : 0, opacity: stack && open ? 0 : 1 });
  set(book, { x: open ? 0 : closedOffset(), y: 0, opacity: 1 });
  set(shadow, { scaleX: open || stack ? 1 : SPREAD_CLOSED_SCALE, opacity: open ? 1 : 0.85 });
  set(shadeFront, { opacity: open ? 0.55 : 0 });
  set(shadeBack, { opacity: open ? 0 : 0.55 });
  set(pageLeft, { opacity: open ? 1 : 0 });
  set(allReveals, { opacity: open ? 1 : 0, y: open ? 0 : 12 });
  syncAccessibility(open);
}

// ─── Abrir ──────────────────────────────────────────────────────────────────

async function open({ focusEntry = false } = {}) {
  if (isOpen) return;
  const mine = ++sequence;
  isOpen = true;
  remember(true);
  syncAccessibility(true);

  if (reduceMotion.matches) {
    applyInstant(true);
    if (focusEntry) focusFirstEntry();
    return;
  }

  stopAll();
  book.dataset.state = 'open';
  const stack = narrow.matches;

  if (stack) {
    // Las páginas quedan debajo de la tapa, que se aparta girando y se desvanece
    track(animate(hinge, { rotateY: HINGE_OPEN_STACK, opacity: 0 }, { ...SPRING_HINGE, visualDuration: 0.8 }));
  } else {
    track(animate(hinge, { rotateY: HINGE_OPEN_SPREAD }, SPRING_HINGE));
    track(animate(book, { x: 0 }, SPRING_BOOK));
    // Iluminación: la cara delantera se oscurece al girar y el dorso se aclara al posarse
    track(animate(shadeFront, { opacity: 0.55 }, { duration: 0.5, ease: 'easeIn' }));
    track(animate(shadeBack, { opacity: 0 }, { duration: 0.6, delay: 0.45, ease: 'easeOut' }));
  }
  track(animate(shadow, { scaleX: 1, opacity: 1 }, { duration: 0.9, ease: EASE_OUT }));

  // La página izquierda aparece cuando la tapa ya ha pasado la vertical; luego, el contenido en cascada
  track(animate(pageLeft, { opacity: 1 }, { duration: 0.25, delay: stack ? 0.2 : 0.4 }));
  const base = stack ? 0.3 : 0.55;
  track(animate(leftReveals, { opacity: 1, y: 0 },
    { duration: 0.6, ease: EASE_OUT, delay: stagger(0.07, { startDelay: base }) }));
  track(animate(rightReveals, { opacity: 1, y: 0 },
    { duration: 0.6, ease: EASE_OUT, delay: stagger(0.07, { startDelay: base + 0.25 }) }));

  await settle();
  if (mine !== sequence) return; // se dio otra orden mientras tanto
  if (stack) book.dataset.cover = 'gone';
  if (focusEntry) focusFirstEntry();
}

// ─── Cerrar ─────────────────────────────────────────────────────────────────

async function close({ focusCover = false } = {}) {
  if (!isOpen) return;
  const mine = ++sequence;
  isOpen = false;
  remember(false);
  syncAccessibility(false);

  if (reduceMotion.matches) {
    applyInstant(false);
    if (focusCover) coverButton.focus({ preventScroll: true });
    return;
  }

  stopAll();
  const stack = narrow.matches;
  book.dataset.cover = 'on';

  // Primero se retira el contenido; después la tapa vuelve a su sitio
  track(animate(allReveals, { opacity: 0, y: 12 }, { duration: 0.18 }));
  track(animate(pageLeft, { opacity: 0 }, { duration: 0.2, delay: 0.1 }));

  if (stack) {
    // Apilado: se sube hasta el libro, se quitan las páginas y solo entonces vuelve la tapa,
    // para que nunca se vea sobre un libro «alto» (se estiraba y luego saltaba a su sitio)
    window.scrollTo({ top: Math.max(0, book.getBoundingClientRect().top + window.scrollY - 16), behavior: 'smooth' });
    await Promise.race([Promise.all(running), new Promise((resolve) => setTimeout(resolve, 450))]);
    if (mine !== sequence) return;
    book.dataset.state = 'closed';
    track(animate(hinge, { rotateY: 0, opacity: 1 }, { ...SPRING_HINGE_CLOSE, visualDuration: 0.8 }));
  } else {
    track(animate(hinge, { rotateY: 0 }, { ...SPRING_HINGE_CLOSE, delay: 0.12 }));
    track(animate(book, { x: closedOffset() }, { ...SPRING_BOOK, delay: 0.12 }));
    track(animate(shadeBack, { opacity: 0.55 }, { duration: 0.4, delay: 0.12 }));
    track(animate(shadeFront, { opacity: 0 }, { duration: 0.5, delay: 0.5, ease: 'easeOut' }));
    track(animate(shadow, { scaleX: SPREAD_CLOSED_SCALE, opacity: 0.85 }, { duration: 0.9, delay: 0.12, ease: EASE_OUT }));
  }

  await settle();
  if (mine !== sequence) return;
  book.dataset.state = 'closed';
  if (focusCover) coverButton.focus({ preventScroll: true });
}

function focusFirstEntry() {
  pageRight.querySelector('a.entry')?.focus({ preventScroll: true });
}

// ─── La tapa se levanta un poco al acercarse (invita a abrir) ──────────────

let liftControls = null;

function lift(angle) {
  if (isOpen || narrow.matches || reduceMotion.matches) return;
  liftControls?.stop?.(); // solo la elevación anterior: no se corta la entrada del libro ni otras órdenes
  liftControls = track(animate(hinge, { rotateY: angle }, SPRING_LIFT));
}

coverButton.addEventListener('pointerenter', () => lift(-9));
coverButton.addEventListener('pointerleave', () => lift(0));
coverButton.addEventListener('focus', () => lift(-9));
coverButton.addEventListener('blur', () => lift(0));

// ─── Entradas del usuario ───────────────────────────────────────────────────

// event.detail === 0 indica que el clic vino del teclado (Enter o Espacio)
coverButton.addEventListener('click', (event) => open({ focusEntry: event.detail === 0 }));
closeButton.addEventListener('click', () => close({ focusCover: true }));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isOpen) {
    event.preventDefault();
    close({ focusCover: true });
  }
});

// ─── Entrar a un experimento: la vista se acerca al libro y se «cae» dentro ─
// La página de destino (css/style.css, «Inmersión») recoge el punto de partida y se abre desde ahí.

const stage = document.getElementById('escritorio');
let entering = false;

async function enterExperiment(link) {
  entering = true;
  const rect = link.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  try {
    sessionStorage.setItem('inmersion', JSON.stringify({
      x: Math.round((cx / window.innerWidth) * 100),
      y: Math.round((cy / window.innerHeight) * 100),
      t: Date.now(),
    }));
  } catch (error) { /* sin almacenamiento: se entra sin animación de llegada */ }

  window.dispatchEvent(new CustomEvent('fondo:impulso', { detail: { fuerza: 7 } }));
  stage.style.transformOrigin = `${cx}px ${cy + window.scrollY}px`;
  const zoom = animate(stage, { scale: 2.4, opacity: 0 }, { duration: 0.55, ease: [0.5, 0, 0.9, 0.4] });
  await Promise.race([zoom, new Promise((resolve) => setTimeout(resolve, 900))]);
  window.location.href = link.href;
}

pageRight.addEventListener('click', (event) => {
  const link = event.target.closest('a.entry');
  const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  if (!link || !plain || entering || reduceMotion.matches) return;
  event.preventDefault();
  enterExperiment(link);
});

// Al volver con «atrás» el navegador puede restaurar la página tal como quedó al salir
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  entering = false;
  stage.style.removeProperty('transform');
  stage.style.removeProperty('opacity');
  stage.style.removeProperty('scale');
  stage.style.removeProperty('transform-origin');
});

// Al cambiar de tamaño o de disposición (apilada ↔ doble página) se recoloca todo sin animar
const reflow = () => applyInstant(isOpen);
narrow.addEventListener('change', reflow);
window.addEventListener('resize', () => { if (!isOpen && !narrow.matches) set(book, { x: closedOffset() }); });

// ─── Arranque ───────────────────────────────────────────────────────────────

const startOpen = root.classList.contains('start-open');
isOpen = startOpen;
applyInstant(startOpen);
root.classList.remove('start-open'); // desde aquí manda el estado (data-state y estilos en línea)

if (!startOpen && !reduceMotion.matches) {
  // Primera visita: el libro aparece sobre el escritorio
  set(book, { y: 26, opacity: 0 });
  track(animate(book, { y: 0, opacity: 1 }, { duration: 0.9, ease: EASE_OUT }));
}

// Para pruebas y depuración desde la consola del navegador
window.libro = {
  abrir: () => open(),
  cerrar: () => close(),
  get abierto() { return isOpen; },
};
