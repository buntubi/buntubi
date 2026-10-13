import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

// The developer portal: signs in through the identity provider (tokens held on this server)
// and calls its developer API as the signed-in developer.
export default defineConfig({
  port: 3410,
  env: { public: ['IDP_URL', 'APP_URL'] },
  // fluixi-ui components import their own stylesheets, which Node cannot load: bundle them.
  ssrNoExternal: [/^@fluixi-ui\//],
  adapter: nodeAdapter,
});
