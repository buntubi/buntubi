/**
 * UI plugins loaded at run time, in the browser: the page imports each plugin's browser entry,
 * whose imports of the shared modules resolve through the page's import map to the app's own
 * copies. The server side is `@buntubi/sdk/runtime/server`.
 *
 * @module
 */
import type { IdpUiPlugin } from './plugins.js';

/** One mounted plugin, as an app publishes it to its pages. */
export interface UiPluginIndexEntry {
  id: string;
  version: string;
  /** URL of the plugin's browser entry. */
  browser: string;
}

/** The plugins an app runs, in order: what its pages load before they start. */
export interface UiPluginIndex {
  plugins: UiPluginIndexEntry[];
}

/**
 * Import every plugin in `index`, keeping its order (the first plugin's views win). One that
 * fails to load, or does not export the plugin its index names, is left out with an error in the
 * console: the page starts without it rather than not at all.
 */
export async function loadBrowserUiPlugins(index: UiPluginIndex): Promise<IdpUiPlugin[]> {
  const loaded = await Promise.all(
    index.plugins.map(async (entry): Promise<IdpUiPlugin | null> => {
      try {
        const mod = (await import(/* @vite-ignore */ entry.browser)) as { plugin?: IdpUiPlugin };
        if (mod.plugin?.id !== entry.id) throw new Error(`${entry.browser} does not export the plugin "${entry.id}"`);
        return mod.plugin;
      } catch (error) {
        console.error(`[buntubi] the UI plugin "${entry.id}" did not load, the page starts without it:`, error);
        return null;
      }
    }),
  );
  return loaded.filter((plugin): plugin is IdpUiPlugin => plugin !== null);
}

/** The id of the script element that carries the index in the page the server renders. */
export const UI_PLUGIN_INDEX_ID = 'idp-ui-plugins';

/** The mounted plugins and the index they came from. */
export interface MountedUiPlugins {
  plugins: IdpUiPlugin[];
  index: UiPluginIndex;
}

const KEY = Symbol.for('buntubi.mountedUiPlugins');
const store = globalThis as unknown as Record<symbol, MountedUiPlugins | undefined>;

/**
 * Import the plugins named by the index in the page, for {@link mountedUiPlugins} to return.
 * The client entry calls it before importing the app, and through a promise, not a top-level
 * await: a plugin imports modules the app shares, and their chunks may import the entry's own.
 * Awaited from inside the app's module graph, the plugin would wait for a module that waits
 * for the plugin, and the page would never start, without an error.
 *
 * @example
 * ```ts
 * void loadMountedUiPlugins()
 *   .then(() => import('./app.js'))
 *   .then(({ default: App }) => startClient(App, { root: '#root' }));
 * ```
 */
export async function loadMountedUiPlugins(): Promise<void> {
  const data = document.getElementById(UI_PLUGIN_INDEX_ID)?.textContent;
  const index = (data ? JSON.parse(data) : { plugins: [] }) as UiPluginIndex;
  store[KEY] = { plugins: index.plugins.length ? await loadBrowserUiPlugins(index) : [], index };
}

/** What {@link loadMountedUiPlugins} loaded in this page; none before it ran. */
export function mountedUiPlugins(): MountedUiPlugins {
  return store[KEY] ?? { plugins: [], index: { plugins: [] } };
}

/**
 * The script tag carrying `index` into the page, for the app's head (`useHead({ script: [...] })`),
 * with `<` escaped so the JSON cannot end the element.
 */
export function uiPluginIndexScript(index: UiPluginIndex): { type: string; id: string; children: string } {
  return { type: 'application/json', id: UI_PLUGIN_INDEX_ID, children: JSON.stringify(index).replace(/</g, '\\u003c') };
}
