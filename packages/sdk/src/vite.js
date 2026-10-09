// Plain JavaScript: Vite loads its config's imports through Node, which runs no TypeScript.
/**
 * `virtual:idp-ui-plugins`: the deployment's UI plugins, from `IDP_UI_PLUGINS` (comma-separated
 * package names, or paths to a module), each module exporting `plugin`. Empty when unset.
 */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const ID = 'virtual:idp-ui-plugins';
const RESOLVED = `\0${ID}`;

/** @param {string} [list] */
export function idpUiPlugins(list = process.env.IDP_UI_PLUGINS ?? '') {
  const specifiers = list
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return {
    name: 'idp-ui-plugins',
    // A plugin given as a path lives outside this repo: its package may be served.
    config: () => ({ server: { fs: { allow: specifiers.filter(isAbsolute).map(packageRoot) } } }),
    /** @param {string} id */
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    /** @param {string} id */
    load(id) {
      if (id !== RESOLVED) return undefined;
      const imports = specifiers.map((specifier, i) => `import { plugin as p${i} } from ${JSON.stringify(specifier)};`);
      return `${imports.join('\n')}\nexport default [${specifiers.map((_, i) => `p${i}`).join(', ')}];\n`;
    },
  };
}

/** The nearest folder above `file` holding a package.json. @param {string} file */
function packageRoot(file) {
  let dir = dirname(file);
  while (!existsSync(join(dir, 'package.json')) && dirname(dir) !== dir) dir = dirname(dir);
  return dir;
}
