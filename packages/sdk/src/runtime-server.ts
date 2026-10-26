/**
 * UI plugins loaded at run time, on the server: the folder a deployment mounts, one subfolder
 * per plugin as `buildUiPlugin` wrote it. The apps read it once at start, load the server
 * entries for their own render, publish an index to their pages and serve the files.
 *
 * Plugins are the operator's code, trusted as the provider's Python plugins are: nothing is
 * fetched from anywhere else, and only files inside the folder are ever served.
 *
 * The folder must sit inside the app's directory (`/app/ui-plugins` in the images): a plugin's
 * imports of the shared modules then resolve from the app's `node_modules`, to the same copies
 * the app runs.
 *
 * @module
 */
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IdpUiPlugin } from './plugins.js';
import type { UiPluginManifest } from './plugin-build.js';
import type { UiPluginIndex } from './runtime.js';
import { SHARED_MODULES } from './shared.js';

/** A plugin found in the mounted folder. */
export interface MountedUiPlugin {
  /** Its subfolder's name, which orders the plugins and addresses its files. */
  folder: string;
  manifest: UiPluginManifest;
}

const ID = /^[a-z][a-z0-9-]*$/;

/**
 * Whether `entry` is a script inside the plugin's `half` folder: relative, no `.` or `..`
 * segment, no backslash. The server entry is imported as code and the browser entry addresses
 * a file, so neither may name anything outside its folder.
 */
function entryIn(half: 'browser' | 'server', entry: unknown): boolean {
  if (typeof entry !== 'string' || entry.includes('\\') || !/\.m?js$/.test(entry)) return false;
  const parts = entry.split('/');
  return parts[0] === half && parts.length > 1 && parts.every((p) => p !== '' && p !== '.' && p !== '..');
}

/**
 * The plugins mounted in `dir`, ordered by folder name (`10-acme` before `20-other`). A missing
 * folder means none.
 *
 * @throws Error On a manifest that is unreadable or incomplete, two plugins with one id, or a
 *   plugin needing a shared module this SDK does not expose (built against a newer one).
 */
export async function readUiPlugins(dir: string): Promise<MountedUiPlugin[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const found: MountedUiPlugin[] = [];
  for (const entry of entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name))) {
    const where = join(dir, entry.name, 'manifest.json');
    let manifest: UiPluginManifest;
    try {
      manifest = JSON.parse(await readFile(where, 'utf8')) as UiPluginManifest;
    } catch {
      throw new Error(`[buntubi] ${where} is missing or not JSON: build the plugin with buildUiPlugin.`);
    }
    if (!ID.test(String(manifest.id))) throw new Error(`[buntubi] ${where} lacks an id.`);
    if (!entryIn('browser', manifest.browser) || !entryIn('server', manifest.server)) {
      throw new Error(`[buntubi] ${where} needs a browser entry under browser/ and a server entry under server/.`);
    }
    if (found.some((p) => p.manifest.id === manifest.id)) throw new Error(`[buntubi] two mounted plugins have the id "${manifest.id}".`);
    const missing = (manifest.shared ?? []).filter((id) => !(SHARED_MODULES as readonly string[]).includes(id));
    if (missing.length) {
      throw new Error(`[buntubi] the plugin "${manifest.id}" needs ${missing.join(', ')}, which this app does not share: update the image.`);
    }
    found.push({ folder: entry.name, manifest });
  }
  return found;
}

/**
 * Import each plugin's server entry, for the app's own render.
 *
 * @throws Error When an entry cannot load, with the likely cause when a shared module is not
 *   found (the folder mounted outside the app).
 */
export async function loadServerUiPlugins(dir: string, mounted: MountedUiPlugin[]): Promise<IdpUiPlugin[]> {
  return Promise.all(
    mounted.map(async ({ folder, manifest }) => {
      const file = join(dir, folder, manifest.server);
      let mod: { plugin?: IdpUiPlugin };
      try {
        mod = (await import(pathToFileURL(file).href)) as { plugin?: IdpUiPlugin };
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ERR_MODULE_NOT_FOUND') {
          throw new Error(`[buntubi] ${file} cannot find a shared module: mount the plugins inside the app's folder, where its node_modules are.`, { cause: error });
        }
        throw error;
      }
      if (mod.plugin?.id !== manifest.id) throw new Error(`[buntubi] ${file} does not export the plugin "${manifest.id}".`);
      return mod.plugin;
    }),
  );
}

/** The index the app's pages load the plugins from: `base` is where it serves the folder. */
export function uiPluginIndex(mounted: MountedUiPlugin[], base: string): UiPluginIndex {
  const root = base.endsWith('/') ? base : `${base}/`;
  return {
    plugins: mounted.map(({ folder, manifest }) => ({
      id: manifest.id,
      version: manifest.version,
      browser: `${root}${encodeURIComponent(folder)}/${manifest.browser}`,
    })),
  };
}

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/**
 * A file of the browser half of a mounted plugin, or null when `path` names none: outside the
 * folder, outside a plugin's `browser/`, a hidden file or an unknown type. Hashed chunks and
 * assets are cached for good; an entry is revalidated, since it keeps its name across versions.
 *
 * @param path - The request's path below where the app serves the folder, still URL-encoded.
 */
export async function serveUiPluginFile(dir: string, mounted: MountedUiPlugin[], path: string): Promise<Response | null> {
  let parts: string[];
  try {
    parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  const [folder, half, ...rest] = parts;
  if (!folder || half !== 'browser' || !rest.length || parts.some((p) => p.startsWith('.') || p.includes('\\'))) return null;
  if (!mounted.some((p) => p.folder === folder)) return null;
  // Compared once links are resolved: a link inside the folder may point anywhere.
  const base = await realpath(resolve(dir, folder, 'browser')).catch(() => null);
  const file = base && (await realpath(resolve(base, ...rest)).catch(() => null));
  if (!base || !file || !file.startsWith(base + sep)) return null;
  const type = TYPES[extname(file)];
  if (!type) return null;
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return null;
  const hashed = rest.length > 1;
  return new Response(await readFile(file), {
    headers: {
      'content-type': type,
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** An app's mounted plugins: loaded once, and their browser files served under `base`. */
export interface UiPluginHost {
  /** The plugins, imported for the server render, and the index the pages load them from. */
  load(): Promise<{ plugins: IdpUiPlugin[]; index: UiPluginIndex }>;
  /** A request under `base` for a plugin file, answered; null for any other request or file. */
  serve(request: Request): Promise<Response | null>;
}

/**
 * The plugins mounted in `dir`, published under `base` (the path the app routes to `serve`).
 * With `mount: false` (an app's development server) none is loaded or served: a mounted plugin
 * resolves the shared modules through the production build's import map, which a development
 * server does not write, and plugins come in at build time there (`IDP_UI_PLUGINS`). A folder
 * holding plugins then says so once in the log.
 *
 * @example
 * ```ts
 * export const uiPluginHost = createUiPluginHost({ dir: '/app/ui-plugins', base: '/api/ui-plugins' });
 * // in the route answering GET /api/ui-plugins/*:
 * export const GET = async (request: Request) => (await uiPluginHost.serve(request)) ?? new Response(null, { status: 404 });
 * ```
 */
export function createUiPluginHost(options: { dir: string; base: string; mount?: boolean }): UiPluginHost {
  const dir = resolve(options.dir);
  const base = options.base.replace(/\/$/, '');
  if (options.mount === false) {
    let told = false;
    return {
      async load() {
        const found = await readUiPlugins(dir).catch(() => []);
        if (found.length && !told) {
          told = true;
          console.warn(
            `[buntubi] ${dir} holds mounted UI plugins (${found.map((p) => p.manifest.id).join(', ')}), which load only in a production build (build, then start). In development, compose them with IDP_UI_PLUGINS.`,
          );
        }
        return { plugins: [], index: { plugins: [] } };
      },
      serve: async () => null,
    };
  }
  let mounted: Promise<MountedUiPlugin[]> | null = null;
  let loaded: Promise<{ plugins: IdpUiPlugin[]; index: UiPluginIndex }> | null = null;
  const read = () => (mounted ??= readUiPlugins(dir));
  return {
    load: () =>
      (loaded ??= read().then(async (found) => ({ plugins: await loadServerUiPlugins(dir, found), index: uiPluginIndex(found, base) }))),
    async serve(request) {
      const pathname = new URL(request.url).pathname;
      if (!pathname.startsWith(`${base}/`)) return null;
      // Still encoded: serveUiPluginFile decodes each segment and confines the result.
      return serveUiPluginFile(dir, await read(), pathname.slice(base.length + 1));
    },
  };
}
