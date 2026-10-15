#!/usr/bin/env node
/**
 * `buntubi-ui-plugin build <entry> [--out <dir>]`: a UI plugin built for the published images
 * (see `buildUiPlugin`), from the plugin package's folder. A plugin that needs more Vite
 * plugins calls `buildUiPlugin` from a script instead.
 */
import { buildUiPlugin } from './plugin-build.js';

const USAGE = 'usage: buntubi-ui-plugin build <entry> [--out <dir>]';
const [command, entry, ...rest] = process.argv.slice(2);
const at = rest.indexOf('--out');
const outDir = at === -1 ? undefined : rest[at + 1];

if (command !== 'build' || !entry || (at !== -1 && !outDir)) {
  console.error(USAGE);
  process.exit(command === '--help' || command === '-h' ? 0 : 1);
}
try {
  const manifest = await buildUiPlugin({ entry, outDir });
  console.log(`built ${manifest.id} ${manifest.version} -> ${outDir ?? 'dist/ui-plugin'}`);
  console.log(`shares ${manifest.shared.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
