/**
 * The UI plugins mounted into this app's image (`IDP_UI_PLUGINS_DIR`, default `ui-plugins` in
 * the app's folder, where the shared modules resolve from its node_modules), served to the
 * pages under `/api/ui-plugins`.
 */
import { join } from 'node:path';
import { createUiPluginHost } from '@buntubi/sdk/runtime/server';

export const uiPluginHost = createUiPluginHost({
  dir: process.env.IDP_UI_PLUGINS_DIR ?? join(process.cwd(), 'ui-plugins'),
  base: '/api/ui-plugins',
  // A development server writes no import map, so mounted plugins load only in a production build.
  mount: !import.meta.env.DEV,
});
