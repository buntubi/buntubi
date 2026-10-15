import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';
import { SHARED_MODULES } from '@buntubi/sdk/shared';

// The owner console: signs in through the identity provider (tokens held on this server)
// and calls its admin API as the signed-in owner, who must have signed in with a second factor.
export default defineConfig({
  port: 3420,
  env: { public: ['IDP_URL', 'APP_URL', 'PORTAL_URL'] },
  // fluixi-ui components import their own stylesheets, which Node cannot load: bundle them.
  ssrNoExternal: [/^@fluixi-ui\//],
  adapter: nodeAdapter,
  // UI plugins mounted into the image load at run time and must use this console's copies.
  share: [...SHARED_MODULES],
});
