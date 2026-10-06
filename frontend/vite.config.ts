import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

// One script and one stylesheet, written where the provider serves its static files, under
// fixed names the page shell links directly. Fonts stay files: the CSP allows no data: URLs.
export default defineConfig({
  plugins: [fluixi()],
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
