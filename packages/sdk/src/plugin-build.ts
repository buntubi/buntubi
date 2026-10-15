/**
 * Building a UI plugin for the published images, which load it at run time from a mounted
 * folder rather than compiling it in. One build writes:
 *
 * ```
 * <outDir>/manifest.json   { id, version, browser, server, shared }
 * <outDir>/browser/        index.js and its chunks and stylesheets, for the pages
 * <outDir>/server/         index.js, for the console's and the portal's server render
 * ```
 *
 * The modules in `SHARED_MODULES` stay imports of the app's copies; everything else the plugin
 * uses is bundled into it. Runs in Node, with Vite and `@fluixi/vite-plugin` installed beside
 * the plugin.
 *
 * @module
 */
import { readFile, writeFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shareKind } from './shared.js';

/** Options of {@link buildUiPlugin}. */
export interface BuildUiPluginOptions {
  /** The plugin's entry, exporting `plugin`, relative to `root`. */
  entry: string;
  /** The plugin package's folder. Default: the current directory. */
  root?: string;
  /** Where the build goes, relative to `root`. Default `dist/ui-plugin`. */
  outDir?: string;
  /** More Vite plugins (a CSS engine, a component resolver). `fluixi()` is always first. */
  plugins?: unknown[];
}

/** `manifest.json`: what the apps read before loading anything. */
export interface UiPluginManifest {
  /** The plugin's `id`, which names its folder in the deployment. */
  id: string;
  /** The plugin package's version. */
  version: string;
  /** The browser entry, relative to the manifest. */
  browser: string;
  /** The server entry, relative to the manifest. */
  server: string;
  /** The shared modules the plugin imports: each must be exposed by the app. */
  shared: string[];
}

const BUILTIN = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

/**
 * Build the plugin at `entry` into a folder the apps can load at run time.
 *
 * @returns The manifest written.
 * @throws Error When `outDir` is outside the package, the plugin imports a framework module the
 *   apps do not share, or its entry does not export a `plugin` with an `id`.
 */
export async function buildUiPlugin(options: BuildUiPluginOptions): Promise<UiPluginManifest> {
  const root = resolve(options.root ?? process.cwd());
  const out = resolve(root, options.outDir ?? 'dist/ui-plugin');
  // The server build is loaded from where it is written, and its shared imports resolve from
  // the package's node_modules only below the package.
  if (!out.startsWith(root + sep)) throw new Error(`[buntubi] outDir must be inside the plugin package (${root}).`);
  const { build } = await import('vite');
  const { fluixi } = await import('@fluixi/vite-plugin');
  const shared = new Set<string>();

  // Decides each import: the app's copy, an error, or the plugin's own.
  const external = (id: string) => {
    if (BUILTIN.has(id)) return true;
    const kind = shareKind(id);
    if (kind === 'shared') shared.add(id);
    if (kind === 'unshared') {
      throw new Error(
        `[buntubi] ${id} is not shared with plugins, and bundling it would give the plugin a second copy ` +
          `of its package. Import from a module in SHARED_MODULES (@buntubi/sdk/shared).`,
      );
    }
    return kind === 'shared';
  };

  const plugins = [fluixi(), ...(options.plugins ?? [])] as never[];
  const common = { root, configFile: false as const, logLevel: 'warn' as const, plugins };

  await build({
    ...common,
    // Chunks and stylesheets are addressed from the module that imports them, wherever the
    // deployment serves the folder.
    base: './',
    build: {
      outDir: join(out, 'browser'),
      emptyOutDir: true,
      assetsInlineLimit: 0,
      modulePreload: { polyfill: false },
      rollupOptions: {
        input: { index: resolve(root, options.entry) },
        preserveEntrySignatures: 'exports-only',
        external,
        output: { entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
      },
    },
  });

  await build({
    ...common,
    ssr: { noExternal: true },
    build: {
      outDir: join(out, 'server'),
      emptyOutDir: true,
      ssr: resolve(root, options.entry),
      rollupOptions: { external, output: { entryFileNames: 'index.js', chunkFileNames: 'chunks/[name]-[hash].js' } },
    },
  });

  // Loaded once here, from the plugin's own folder where the shared packages resolve: it
  // proves the server build imports, and gives the id the deployment's folder is named by.
  const mod = (await import(pathToFileURL(join(out, 'server', 'index.js')).href)) as { plugin?: { id?: unknown } };
  const id = mod.plugin?.id;
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(`[buntubi] ${options.entry} must export a plugin with a lowercase id (definePlugin({ id: 'acme', ... })).`);
  }
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { version?: string };
  const manifest: UiPluginManifest = {
    id,
    version: pkg.version ?? '0.0.0',
    browser: 'browser/index.js',
    server: 'server/index.js',
    shared: [...shared].sort(),
  };
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
