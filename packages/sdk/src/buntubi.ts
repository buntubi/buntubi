#!/usr/bin/env node
/**
 * `buntubi <command>`, run in a Buntubi project's folder (one made by `npm create buntubi`):
 *
 *   setup                 the database, a signing key, the first admin, the apps in platform.toml
 *                         (setup, up and down take --dev: compose.dev.yaml, Buntubi's local images)
 *   build                 build the plugins' pages into ui-plugins/
 *   up | down             start it, stop it
 *   add plugin <id>       a plugin of the project's own in plugins/<id>, both halves
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addPlugin } from './project/add-plugin.js';
import { runBuild, runDown, runSetup, runUp } from './project/compose.js';

const USAGE = 'usage: buntubi setup | build | up | down | add plugin <id> [--label <name>]';
const here = dirname(fileURLToPath(import.meta.url));
const own = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string; peerDependencies?: Record<string, string> };

function main(args: string[]): number {
  const [command, ...rest] = args;
  const dir = process.cwd();
  const dev = rest.includes('--dev');
  if (command === 'setup') return runSetup(dir, process.stdin.isTTY === true, { dev });
  if (command === 'build') return runBuild(dir);
  if (command === 'up') return runUp(dir, { dev });
  if (command === 'down') return runDown(dir, { dev });
  if (command === 'add' && rest[0] === 'plugin' && rest[1]) {
    const id = rest[1];
    if (existsSync(join(dir, 'plugins', id))) throw new Error(`plugins/${id} already exists`);
    const label = rest.includes('--label') ? rest[rest.indexOf('--label') + 1] ?? id : id;
    const envPaths = ['identity.env', 'identity.env.example'].filter((path) => existsSync(join(dir, path)));
    const envFiles = new Map(envPaths.map((path) => [path, readFileSync(join(dir, path), 'utf8')]));
    const versions = { sdk: `^${own.version}`, fluixi: own.peerDependencies?.['@fluixi/vite-plugin'] ?? '^1.0.0-alpha.100' };
    const added = addPlugin({ id, label }, envFiles, versions, join(here, '..', 'templates', 'plugin'));
    for (const [path, text] of [...added.files, ...added.env]) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    console.log(`added plugins/${id}. Next: pnpm install, pnpm build, then buntubi up (it rebuilds the provider with the plugin)`);
    return 0;
  }
  console.error(USAGE);
  return command ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`buntubi: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
