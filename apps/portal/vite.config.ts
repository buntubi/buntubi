import fluixiCss from '@fluixi-css/vite';
import { defineConfig } from 'vite';

// `fluixi dev|build` supplies routing, JSX and SSR; this adds the CSS engine, which compiles the
// elements' scoped styles. Colours come from @idp/theme, so no theme file and no UI token bridge.
export default defineConfig({
  plugins: [fluixiCss({ theme: false, emitUiTokens: false })],
  resolve: {
    dedupe: ['@fluixi/core', '@fluixi/reactive', '@fluixi/jsx', '@fluixi/dom', '@fluixi/start', '@fluixi/web-components'],
  },
});
