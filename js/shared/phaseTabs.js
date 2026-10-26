/**
 * @fileoverview Pestañas de las fases de Pólya accesibles por teclado y por lector de pantalla.
 * Convierte la barra de fases en un patrón WAI-ARIA "tabs" (activación manual):
 *   - roles tablist / tab / tabpanel, aria-selected, aria-controls y aria-labelledby;
 *   - tabulación en cursor móvil (solo la pestaña activa está en el orden de tabulación);
 *   - ← → Inicio Fin mueven el foco entre pestañas habilitadas; Enter o Espacio la activan.
 * Solo se puede volver a fases ya alcanzadas (clase "active" o "completed"): el método de
 * Pólya se recorre en secuencia, así que las fases futuras quedan deshabilitadas.
 * El controlador de cada simulador sigue siendo quien cambia de fase (callback goTo).
 */

/**
 * @param {Object} options
 * @param {NodeListOf<HTMLElement>|HTMLElement[]} options.tabs Pestañas, en orden de fase
 * @param {NodeListOf<HTMLElement>|HTMLElement[]} options.panels Paneles de fase, en el mismo orden
 * @param {(phase: number) => void} options.goTo Cambia a la fase indicada (1 a 4)
 * @returns {{sync: () => void}} sync() relee las clases de las pestañas y actualiza los atributos ARIA
 */
export function initPhaseTabs({ tabs, panels, goTo }) {
  const tabList = [...tabs];
  const panelList = [...panels];
  if (tabList.length === 0) return { sync() {} };

  tabList[0].parentElement?.setAttribute('role', 'tablist');

  tabList.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    if (panelList[i]) {
      tab.setAttribute('aria-controls', panelList[i].id);
      panelList[i].setAttribute('role', 'tabpanel');
      panelList[i].setAttribute('aria-labelledby', tab.id);
    }
  });

  const isActive = (tab) => tab.classList.contains('active');
  const isEnabled = (tab) => isActive(tab) || tab.classList.contains('completed');

  function sync() {
    tabList.forEach(tab => {
      tab.setAttribute('aria-selected', String(isActive(tab)));
      tab.setAttribute('aria-disabled', String(!isEnabled(tab)));
      tab.tabIndex = isActive(tab) ? 0 : -1;
    });
  }

  function activate(index) {
    const tab = tabList[index];
    if (tab && isEnabled(tab) && !isActive(tab)) goTo(index + 1);
  }

  /** Índice de la siguiente pestaña habilitada desde `from` en la dirección dada (±1), sin dar la vuelta. */
  function nextEnabled(from, step) {
    for (let i = from + step; i >= 0 && i < tabList.length; i += step) {
      if (isEnabled(tabList[i])) return i;
    }
    return from;
  }

  tabList.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));

    tab.addEventListener('keydown', (event) => {
      let target = null;
      switch (event.key) {
        case 'ArrowRight': target = nextEnabled(index, 1); break;
        case 'ArrowLeft': target = nextEnabled(index, -1); break;
        case 'Home': target = nextEnabled(-1, 1); break;
        case 'End': target = nextEnabled(tabList.length, -1); break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          activate(index);
          return;
        default:
          return;
      }
      event.preventDefault();
      if (target !== null && tabList[target]) {
        tabList[target].tabIndex = 0; // el foco puede llegar aunque no sea la pestaña activa
        tabList[target].focus();
      }
    });
  });

  // Los controladores marcan la fase con clases; se observan para mantener ARIA al día.
  const observer = new MutationObserver(sync);
  tabList.forEach(tab => observer.observe(tab, { attributes: true, attributeFilter: ['class'] }));

  sync();
  return { sync };
}
