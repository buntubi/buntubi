/**
 * `buntubi add plugin <id>`: a plugin of the project's own in `plugins/<id>`, both halves. The
 * provider half is a Python package (the provider runs on Flask), installed into the provider's
 * image; the UI half is TypeScript with one console page, built by `buntubi build` into
 * `ui-plugins/<id>`, the folder compose mounts. The id joins IDP_PLUGINS.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Buntubi's rule for a plugin id: a lowercase slug of at most 40 characters. */
export const PLUGIN_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export interface NewPlugin {
  id: string;
  label: string;
}

export interface AddedPlugin {
  /** Every new file, from the project's folder. */
  files: Map<string, string>;
  /** The provider's env files with the id in IDP_PLUGINS, by path. */
  env: Map<string, string>;
}

export interface PluginVersions {
  sdk: string;
  fluixi: string;
}

export function addPlugin(plugin: NewPlugin, envFiles: Map<string, string>, versions: PluginVersions, templates: string): AddedPlugin {
  if (!PLUGIN_ID.test(plugin.id) || plugin.id.length > 40) {
    throw new Error(`"${plugin.id}" must be lowercase letters, digits and hyphens, at most 40`);
  }
  const module = `${plugin.id.replaceAll('-', '_')}_idp`;
  const className = `${plugin.id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Plugin`;
  const fill = (text: string) =>
    text.replaceAll('{{id}}', plugin.id).replaceAll('{{label}}', plugin.label).replaceAll('{{module}}', module).replaceAll('{{className}}', className);

  const files = new Map<string, string>();
  for (const file of walk(templates)) {
    const path = join('plugins', plugin.id, relative(templates, file).replace('__module__', module));
    files.set(path, fill(readFileSync(file, 'utf8')));
  }
  files.set(
    join('plugins', plugin.id, 'ui', 'package.json'),
    `${JSON.stringify(
      {
        name: `${plugin.id}-ui`,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: { build: 'buntubi-ui-plugin build src/index.ts', typecheck: 'tsc --noEmit' },
        dependencies: { '@buntubi/sdk': versions.sdk },
        devDependencies: { '@fluixi/vite-plugin': versions.fluixi, typescript: '^7.0.2', vite: '^8.3.2' },
      },
      null,
      2,
    )}\n`,
  );

  const env = new Map<string, string>();
  for (const [path, text] of envFiles) env.set(path, withPlugin(text, plugin.id));
  return { files, env };
}

/** An env file with `id` in its IDP_PLUGINS list, added when the file has none. */
export function withPlugin(text: string, id: string): string {
  const line = /^IDP_PLUGINS=(.*)$/m.exec(text);
  if (!line) return `${text.trimEnd()}\nIDP_PLUGINS=${JSON.stringify([id])}\n`;
  let listed: unknown;
  try {
    listed = JSON.parse(line[1]!.trim() || '[]');
  } catch {
    throw new Error(`IDP_PLUGINS is not a JSON list: ${line[1]}`);
  }
  if (!Array.isArray(listed)) throw new Error(`IDP_PLUGINS is not a JSON list: ${line[1]}`);
  if (listed.includes(id)) return text;
  return text.replace(line[0], `IDP_PLUGINS=${JSON.stringify([...listed, id])}`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
