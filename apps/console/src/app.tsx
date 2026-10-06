import { createMemoryHistory } from '@fluixi/start/router';
import { routes } from '@fluixi/core/routes';

// Exported so entry-client preloads the current route's chunk before hydrating.
export const appRoutes = routes;

export default function App(props?: { url?: string }) {
  // The request URL on the server, browser history on the client.
  const history = typeof window === 'undefined' ? createMemoryHistory(props?.url ?? '/') : undefined;
  return <Router routes={appRoutes as never} history={history as never} />;
}
