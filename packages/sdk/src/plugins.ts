/**
 * What a plugin brings to the console and the developer portal: sections, each a custom element
 * the plugin's package defines. A deployment lists its UI plugins in `IDP_UI_PLUGINS`; the apps
 * compose them at build time (see `./vite`), so no code arrives at run time.
 */
import { injectionToken } from '@fluixi/di';

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

/**
 * A look for the provider's sign-in pages, which the provider plugin hands to the clients it
 * chooses (`page_brand` returns `look`). Its stylesheet is bundled with the pages, so every rule
 * sits under `:root[data-look='<name>']`.
 */
export interface PluginLook {
  /** Takes the place of the hero beside the form; the element gets `locale` and `brand`. */
  aside?: { element: string; load: () => Promise<unknown> };
  /** Imports the look's stylesheet. */
  styles?: () => Promise<unknown>;
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
  /** Looks for the sign-in pages, by name. */
  looks?: Record<string, PluginLook>;
  /**
   * Views in place of the provider's own, by element tag (`idp-sidebar`, `idp-sign-in`): each
   * receives that element's logic and returns its markup. Applies in the console, the portal and
   * the sign-in pages.
   */
  views?: Record<string, (logic: any) => unknown>;
}

/** Every plugin's views, the first plugin listed winning a tag two of them give. */
export function viewsOf(plugins: IdpUiPlugin[]): Record<string, (logic: never) => unknown> {
  const views: Record<string, (logic: never) => unknown> = {};
  for (const plugin of [...plugins].reverse()) Object.assign(views, plugin.views ?? {});
  return views;
}

/** The look of that name from any plugin, or null. */
export function lookOf(plugins: IdpUiPlugin[], name: string | undefined): PluginLook | null {
  if (!name) return null;
  for (const plugin of plugins) {
    const look = plugin.looks?.[name];
    if (look) return look;
  }
  return null;
}

/** Types a UI plugin, nothing more. */
export const definePlugin = (plugin: IdpUiPlugin): IdpUiPlugin => plugin;

export type PluginMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const PLUGIN_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const METHODS: readonly string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * The provider address a plugin call goes to, or null when the call would leave that plugin's own
 * API: an id that is not a plugin id, a method outside the five, or a path that resolves anywhere
 * but under `/api/plugins/<id>/` (`..`, encoded dots, another host). The relays that make these
 * calls on the server, with the person's token, check every call with it.
 */
export function pluginTarget(provider: string, plugin: string, method: string, path: string): string | null {
  if (!PLUGIN_ID.test(plugin) || !METHODS.includes(method) || !path.startsWith('/')) return null;
  let base: URL;
  let target: URL;
  try {
    base = new URL(`${provider.replace(/\/$/, '')}/api/plugins/${plugin}/`);
    target = new URL(`.${path}`, base);
  } catch {
    return null;
  }
  return target.origin === base.origin && target.pathname.startsWith(base.pathname) ? target.toString() : null;
}

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
