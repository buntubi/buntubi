import { createMemoryHistory } from '@fluixi/start/router';
import { routes } from '@fluixi/core/routes';
import { AppearanceProvider } from '@fluixi-ui/theme';
import { appearance } from '@idp/theme/appearance';

// Exported so entry-client preloads the current route's chunk before hydrating.
export const appRoutes = routes;

export default function App(props?: { url?: string }) {
  // The request URL on the server, browser history on the client.
  const history = typeof window === 'undefined' ? createMemoryHistory(props?.url ?? '/') : undefined;
  // The skin, light or dark and the accent, from the visitor's cookies on the server too.
  return (
    <AppearanceProvider {...appearance}>
      <Router routes={appRoutes as never} history={history as never} />
    </AppearanceProvider>
  );
}
