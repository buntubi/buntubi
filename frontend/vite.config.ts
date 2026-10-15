import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import fluixiCss from '@fluixi-css/vite';
import { fluixi, share } from '@fluixi/vite-plugin';
import { idpUiPlugins } from '@buntubi/sdk/vite';
import { SHARED_MODULES } from '@buntubi/sdk/shared';

// One script and one stylesheet, written where the provider serves its static files, under
// fixed names the page shell links directly. Fonts stay files: the CSP allows no data: URLs.
// The deployment's UI plugins (IDP_UI_PLUGINS, see @buntubi/sdk/vite): their looks for these pages.
export default defineConfig(({ mode }) => ({
  // fluixi-css compiles the shared elements' and shell's scoped styles (`:deep` included), as in
  // the portal and the console; colours come from @idp/theme.
  plugins: [
    fluixi(),
    fluixiCss({ theme: false, emitUiTokens: false }),
    idpUiPlugins(loadEnv(mode, process.cwd(), '').IDP_UI_PLUGINS),
    // UI plugins the provider mounts load at run time and import these through share.json's map.
    share({ modules: SHARED_MODULES }),
  ],
  // fluixi-ui is linked from its own checkout, whose node_modules hold a published runtime; one
  // copy only, the one this app links, or two builds of @fluixi/reactive drive one graph.
  resolve: {
    dedupe: ['@fluixi/core', '@fluixi/reactive', '@fluixi/jsx', '@fluixi/dom', '@fluixi/web-components', '@fluixi/start', '@buntubi/sdk'],
  },
  base: '/static/idp/',
  build: {
    outDir: fileURLToPath(new URL('../idp/src/buntubi/static/idp', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('src/boot.ts', import.meta.url)),
      output: {
        // The page's entry under the fixed name; the shared modules are entries too, hashed.
        entryFileNames: (chunk) => (chunk.name.startsWith('share/') ? 'assets/[name]-[hash].js' : 'idp.js'),
        assetFileNames: (asset) => (asset.names.some((n) => n.endsWith('.css')) ? 'idp.css' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
}));
