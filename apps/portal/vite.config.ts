import fluixiCss from '@fluixi-css/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

// `fluixi dev|build` supplies routing, JSX and SSR; this adds the CSS engine, which compiles the
// elements' scoped styles. Colours come from @idp/theme, so no theme file and no UI token bridge.
export default defineConfig({
  plugins: [fluixiCss({ theme: false, emitUiTokens: false })],
  // The repo's packages are linked from outside the app, and the skin's fonts live in their
  // node_modules: served only if allowed.
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../../packages'] } },
  resolve: {
    dedupe: ['@fluixi/core', '@fluixi/reactive', '@fluixi/jsx', '@fluixi/dom', '@fluixi/start', '@fluixi/web-components'],
  },
});
