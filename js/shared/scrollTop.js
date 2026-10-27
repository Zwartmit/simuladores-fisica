/**
 * @fileoverview Botón «Arriba» de las guías didácticas: aparece al bajar un trecho y devuelve al
 * inicio con desplazamiento suave (instantáneo con prefers-reduced-motion). Se crea desde
 * JavaScript, así que sin JS no queda un botón muerto. Estilos en css/guide.css (.to-top).
 */

const SHOW_AFTER_PX = 480; // distancia a partir de la cual aparece el botón

function createScrollTop() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'to-top';
  button.setAttribute('aria-label', 'Volver al inicio de la guía');
  button.innerHTML = '<span aria-hidden="true">↑</span> Arriba';
  document.body.appendChild(button);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let ticking = false;

  function update() {
    ticking = false;
    const shouldShow = window.scrollY > SHOW_AFTER_PX;
    if (shouldShow === visible) return;
    visible = shouldShow;
    button.classList.toggle('is-visible', visible);
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  update();
}

if (document.body) createScrollTop();
else document.addEventListener('DOMContentLoaded', createScrollTop, { once: true });
