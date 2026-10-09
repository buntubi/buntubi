/**
 * What a plugin brings to the console and the developer portal: sections, each a custom element
 * the plugin's package defines. A deployment lists its UI plugins in `IDP_UI_PLUGINS`; the apps
 * compose them at build time (see `./vite`), so no code arrives at run time.
 */
import { injectionToken } from '@fluixi/start/di';

/** A page a plugin adds: a sidebar entry and the element that fills the page. */
export interface PluginSection {
  /** Unique within the plugin; part of the address. */
  key: string;
  label: { fr: string; en: string };
  /** An SVG path, 24 by 24, drawn as the sidebar icon. */
  icon: string;
  /** The custom element tag, defined by `load`. */
  element: string;
  /** Defines the element: imported when the section is first shown. */
  load: () => Promise<unknown>;
}

export interface IdpUiPlugin {
  /** The id of its server half, the provider plugin of the same name. */
  id: string;
  /** Pages in the owner's console. The element gets `locale`. */
  console?: PluginSection[];
  /**
   * Pages in the developer portal: an organization's (`organization` and `locale` given), or an
   * app's (`organization`, `app`, `locale`).
   */
  portal?: { organization?: PluginSection[]; app?: PluginSection[] };
}

/** Types a UI plugin, nothing more. */
export const definePlugin = (plugin: IdpUiPlugin): IdpUiPlugin => plugin;

export type PluginMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * A plugin's own API on the provider (`/api/plugins/<id>/...`), called as the signed-in person.
 * Refusals throw an Error whose message is the provider's code.
 */
export interface PluginApiService {
  call<T = unknown>(plugin: string, method: PluginMethod, path: string, body?: unknown): Promise<T>;
}

export const PluginApi = injectionToken<PluginApiService>('PluginApi');

export type SectionPlace = 'console' | 'organization' | 'app';

/** The sections a place shows, with their plugin, for the plugins the provider runs. */
export function sectionsOf(
  plugins: IdpUiPlugin[],
  place: SectionPlace,
  enabled: readonly string[],
): { plugin: string; section: PluginSection }[] {
  return plugins
    .filter((plugin) => enabled.includes(plugin.id))
    .flatMap((plugin) => {
      const sections = place === 'console' ? plugin.console : plugin.portal?.[place];
      return (sections ?? []).map((section) => ({ plugin: plugin.id, section }));
    });
}

/** One section, or null for an unknown plugin or key. */
export function sectionOf(plugins: IdpUiPlugin[], place: SectionPlace, plugin: string, key: string): PluginSection | null {
  const found = plugins.find((candidate) => candidate.id === plugin);
  const sections = place === 'console' ? found?.console : found?.portal?.[place];
  return sections?.find((section) => section.key === key) ?? null;
}
