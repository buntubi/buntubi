import { createMemoryHistory } from '@fluixi/start/router';
import { routes } from '@fluixi/core/routes';
import { ThemeProvider } from '@fluixi/core';
import { createDocumentScheme } from '@idp/theme/document';

// Exported so entry-client preloads the current route's chunk before hydrating.
export const appRoutes = routes;

export default function App(props?: { url?: string }) {
  // The request URL on the server, browser history on the client.
  const history = typeof window === 'undefined' ? createMemoryHistory(props?.url ?? '/') : undefined;
  // Made during the render: on the server once per request, with the visitor's cookie.
  const scheme = createDocumentScheme();
  return (
    <ThemeProvider themes={{ scheme }}>
      <Router routes={appRoutes as never} history={history as never} />
    </ThemeProvider>
  );
}
