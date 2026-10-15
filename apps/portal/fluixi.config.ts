import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';
import { SHARED_MODULES } from '@buntubi/sdk/shared';

// The developer portal: signs in through the identity provider (tokens held on this server)
// and calls its developer API as the signed-in developer.
export default defineConfig({
  port: 3410,
  env: { public: ['IDP_URL', 'APP_URL'] },
  // fluixi-ui components import their own stylesheets, which Node cannot load: bundle them.
  ssrNoExternal: [/^@fluixi-ui\//],
  adapter: nodeAdapter,
  // UI plugins mounted into the image load at run time and must use this portal's copies.
  share: [...SHARED_MODULES],
});
