/**
 * The page's entry: the UI plugins the provider mounted, then the page itself. Loaded first and
 * through a promise, not a top-level await (see loadMountedUiPlugins), so their views and looks
 * are in place before the page script reads them.
 */
import { loadMountedUiPlugins } from '@buntubi/sdk/runtime';

void loadMountedUiPlugins().then(() => import('./main.js'));
