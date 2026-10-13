import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

// The owner console: signs in through the identity provider (tokens held on this server)
// and calls its admin API as the signed-in owner, who must have signed in with a second factor.
export default defineConfig({
  port: 3420,
  env: { public: ['IDP_URL', 'APP_URL', 'PORTAL_URL'] },
  // fluixi-ui components import their own stylesheets, which Node cannot load: bundle them.
  ssrNoExternal: [/^@fluixi-ui\//],
  adapter: nodeAdapter,
});
