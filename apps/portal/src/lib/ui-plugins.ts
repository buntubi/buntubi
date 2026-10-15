/**
 * The deployment's UI plugins: those composed in at build time (`IDP_UI_PLUGINS`, used in
 * development) and those mounted into the published image, loaded at run time. On the server
 * they are read from the mounted folder when this module loads; in the browser the client
 * entry has loaded them before importing the app (`loadMountedUiPlugins`).
 */
import type { IdpUiPlugin } from '@buntubi/sdk/plugins';
import { mountedUiPlugins, uiPluginIndexScript } from '@buntubi/sdk/runtime';
import built from 'virtual:idp-ui-plugins';

const runtime = import.meta.env.SSR ? await (await import('../server/ui-plugins.js')).uiPluginHost.load() : mountedUiPlugins();

/** Every UI plugin, the build-time ones first: the first plugin's views win. */
export const uiPlugins: IdpUiPlugin[] = [...built, ...runtime.plugins];

/** The head tag carrying the mounted plugins' index to the browser. */
export const uiPluginIndexTag = uiPluginIndexScript(runtime.index);
