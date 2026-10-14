/**
 * `virtual:idp-ui-plugins`: the deployment's UI plugins, from `IDP_UI_PLUGINS` (comma-separated
 * package names, or paths to a module), each module exporting `plugin`. Empty when unset.
 *
 * Imported by the apps' vite.config, which Node loads without TypeScript: built to `dist` by
 * `pnpm build` (tsconfig.build.json), and the package exports the built file.
 */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const ID = 'virtual:idp-ui-plugins';

/**
 * What a plugin must share with the app it runs in: one copy each, the app's. A plugin installed
 * from npm, or given as a path, would otherwise resolve its own copies, and DI tokens, the
 * navigation and the views the app sets up would be different objects in the plugin's code.
 */
export const SHARED_WITH_PLUGINS = [
  '@buntu/sdk',
  '@fluixi/start',
  '@fluixi/core',
  '@fluixi/di',
  '@fluixi/dom',
  '@fluixi/reactive',
  '@fluixi/web-components',
];
const RESOLVED = `\0${ID}`;

/**
 * The Vite plugin, typed by its own shape rather than Vite's `Plugin`: each app has its own
 * copy of Vite, and one copy's `Plugin` type is not another's. This shape fits them all.
 */
export interface IdpUiPluginsPlugin {
  name: string;
  config: () => { server: { fs: { allow: string[] } }; resolve: { dedupe: string[] } };
  resolveId: (id: string) => string | undefined;
  load: (id: string) => string | undefined;
}

export function idpUiPlugins(list = process.env.IDP_UI_PLUGINS ?? ''): IdpUiPluginsPlugin {
  const specifiers = list
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return {
    name: 'idp-ui-plugins',
    // A plugin given as a path lives outside this repo: its package may be served.
    config: () => ({
      server: { fs: { allow: specifiers.filter((s) => isAbsolute(s)).map(packageRoot) } },
      resolve: { dedupe: SHARED_WITH_PLUGINS },
    }),
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return undefined;
      const imports = specifiers.map((specifier, i) => `import { plugin as p${i} } from ${JSON.stringify(specifier)};`);
      return `${imports.join('\n')}\nexport default [${specifiers.map((_, i) => `p${i}`).join(', ')}];\n`;
    },
  };
}

/** The nearest folder above `file` holding a package.json. */
function packageRoot(file: string): string {
  let dir = dirname(file);
  while (!existsSync(join(dir, 'package.json')) && dirname(dir) !== dir) dir = dirname(dir);
  return dir;
}
