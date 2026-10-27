/**
 * Llegada con inmersión. Script clásico y mínimo, cargado en el <head> de cada simulador para que
 * la marca exista antes del primer pintado (si no, se vería la página entera y luego se reiniciaría
 * la animación). La portada deja en sessionStorage el punto donde se pulsó el experimento; aquí se
 * consume una sola vez y caduca a los pocos segundos, para que recargar o volver con «atrás» no
 * repita la animación. El CSS (css/style.css, «Inmersión») hace el resto.
 */
(function () {
  try {
    var raw = sessionStorage.getItem('inmersion');
    if (!raw) return;
    sessionStorage.removeItem('inmersion');
    var from = JSON.parse(raw);
    if (Date.now() - from.t > 6000) return;
    var root = document.documentElement;
    root.style.setProperty('--ox', from.x + '%');
    root.style.setProperty('--oy', from.y + '%');
    root.classList.add('immersing');
    setTimeout(function () { root.classList.remove('immersing'); }, 1800);
  } catch (e) { /* sin almacenamiento: se llega sin animación */ }
})();
