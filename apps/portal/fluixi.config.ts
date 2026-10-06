import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';
import { fileURLToPath } from 'node:url';
import { searchForWorkspaceRoot } from 'vite';

// The developer portal: signs in through the identity provider (tokens held on this server)
// and calls its developer API as the signed-in developer.
export default defineConfig({
  port: 3410,
  env: { public: ['IDP_URL', 'APP_URL'] },
  // fluixi-ui components import their own stylesheets, which Node cannot load: bundle them.
  ssrNoExternal: [/^@fluixi-ui\//],
  plugins: [
    {
      // fluixi-ui is linked from its own checkout; dev serving must be allowed to read it.
      name: 'portal:linked-fluixi-ui',
      config: () => ({
        server: {
          fs: {
            allow: [
              searchForWorkspaceRoot(process.cwd()),
              fileURLToPath(new URL('../../../../fluixi-ui', import.meta.url)),
            ],
          },
        },
      }),
    },
  ],
  adapter: nodeAdapter,
});
