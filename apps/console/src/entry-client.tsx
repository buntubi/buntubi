import '@idp/theme/tokens.css';
import '@idp/skin/fonts.css';
import '@idp/skin/styles.css';
import './styles.css';
import { loadMountedUiPlugins } from '@buntubi/sdk/runtime';

// The mounted UI plugins before the app's modules, through a promise rather than a top-level
// await (see loadMountedUiPlugins for why both).
void loadMountedUiPlugins()
  .then(() => Promise.all([import('@fluixi/core/client'), import('./app.js')]))
  .then(([{ startClient }, { default: App, appRoutes }]) => startClient(App, { root: '#root', routes: appRoutes as never }));
