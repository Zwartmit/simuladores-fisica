# js/vendor

Código de terceros, incluido en el repositorio tal cual para que el sitio siga funcionando sin
bundler, sin `node_modules` y sin depender de un CDN.

## motion.min.js

[Motion](https://motion.dev) 14.7.1 (licencia MIT, ver `motion.LICENSE.md`). Solo se exportan
`animate` y `stagger` (≈ 25 KB comprimidos con gzip). Lo usa la portada (`js/home/book.js`)
para abrir y cerrar el libro con animaciones de resorte interrumpibles.

Por qué Motion y no otra cosa:

- Funciona en JavaScript puro (sin React), con `animate()` para resortes, secuencias y escalonados.
- Las animaciones se pueden interrumpir a mitad (cerrar el libro mientras se abre) conservando la
  velocidad, algo que con transiciones CSS no se consigue.
- `react-flip-toolkit` exige React; `flip-toolkit` (su núcleo sin React) resuelve transiciones de
  *layout* que aquí no existen; `page-flip` impone su propio contenedor y estilos para pasar muchas
  páginas, y el libro tiene solo una portada y un par de páginas.

### Regenerarlo

```bash
mkdir motion-build && cd motion-build
npm init -y && npm install motion@14.7.1
echo "export { animate, stagger } from 'motion';" > entry.js
npx esbuild@0.25.0 entry.js --bundle --minify --format=esm --target=es2020 --legal-comments=none \
  --banner:js="/*! motion 14.7.1 (animate, stagger) - MIT License - Copyright (c) 2024 Motion B.V. - https://motion.dev - Ver js/vendor/README.md */" \
  --outfile=motion.min.js
```

Copia `motion.min.js` aquí y la licencia de `node_modules/motion/LICENSE.md` a
`motion.LICENSE.md`. Al actualizar la versión, cambia el número en el banner y en este archivo.
