# CHECKPOINTS — Evaluación del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino.
> Estos son los checkpoints objetivos que un juez (humano o IA) puede usar
> para decidir si el proyecto está sano.

## C1 — El arnés está completo

- [ ] Existen los 4 archivos base: `AGENTS.md`, `feature_list.json`, `progress/current.md`, `progress/history.md`.
- [ ] Existen los 3 docs: `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`.

## C2 — El estado es coherente

- [ ] Como mucho una feature en `in_progress` en `feature_list.json`.
- [ ] Toda feature `done` tiene tests asociados que pasan y ha sido comprobada visualmente en el navegador.
- [ ] `progress/current.md` está vacío o describe la sesión activa (no contiene basura de sesiones anteriores).

## C3 — El código respeta la arquitectura y estética web

- [ ] La estructura del proyecto respeta el desacoplamiento en tres capas (Motor Físico, Renderizador de Canvas, e Interfaz/Controlador). El motor no contiene referencias al DOM (`document`, `window`).
- [ ] La interfaz gráfica es responsive, responsiva y estéticamente premium: emplea variables CSS, paleta de colores HSL armoniosa, modo oscuro por defecto y micro-animaciones fluidas.
- [ ] Cada feature en `done` cuenta con su guía didáctica interactiva en formato HTML, con imágenes copiadas físicamente a la raíz del proyecto y enlazadas con rutas relativas portables para evitar enlaces rotos.
- [ ] No hay dependencias de Node.js externas no discutidas previamente en `package.json`.
- [ ] No hay `console.log()` sueltos de depuración, ni TODOs sin contexto.

## C4 — La verificación es real

- [ ] `tests/` tiene al menos una suite de pruebas para la lógica matemática y física en `js/<simulador>/physicsEngine.js`.
- [ ] La ejecución de pruebas (`node tests/run-all.js` o equivalente) reporta el 100% de tests en verde.
- [ ] Al ejecutar la simulación en el navegador, la consola JS permanece 100% limpia de advertencias o errores (no hay errores numéricos `NaN`, ni referencias a recursos fallidos `404`).

## C5 — La sesión se cerró bien

- [ ] No hay archivos sin trackear sospechosos (`node_modules/` o carpetas temporales fuera del `.gitignore`).
- [ ] `progress/history.md` tiene una entrada clara de lo que se realizó en la última sesión.
- [ ] La última feature trabajada está reflejada en su estado correcto en `feature_list.json`.

---

**Cómo usar este archivo:** un agente revisor (`.gemini/agents/reviewer.md`) recorre cada checkbox, marca `[x]` o `[ ]`, y rechaza el cierre de sesión si quedan casillas vacías en C1-C5.

