import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

// One script and one stylesheet, written where the provider serves its static files, under
// fixed names the page shell links directly. Fonts stay files: the CSP allows no data: URLs.
export default defineConfig({
  plugins: [fluixi()],
  // fluixi-ui is linked from its own checkout, whose node_modules hold a published runtime; one
  // copy only, the one this app links, or two builds of @fluixi/reactive drive one graph.
  resolve: {
    dedupe: ['@fluixi/core', '@fluixi/reactive', '@fluixi/jsx', '@fluixi/dom', '@fluixi/web-components'],
  },
  base: '/static/idp/',
  build: {
    outDir: fileURLToPath(new URL('../idp/src/idp/static/idp', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('src/main.tsx', import.meta.url)),
      output: {
        entryFileNames: 'idp.js',
        assetFileNames: (asset) => (asset.names.some((n) => n.endsWith('.css')) ? 'idp.css' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
});
