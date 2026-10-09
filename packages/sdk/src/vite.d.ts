import type { Plugin } from 'vite';

/** `virtual:idp-ui-plugins`, composed from `IDP_UI_PLUGINS` (or `list`). */
export function idpUiPlugins(list?: string): Plugin;
