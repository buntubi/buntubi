/** The address apps had before the workspace: sends a saved link on to the app's workspace. */
import { cache, Redirect, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { paramOf } from '../../lib/params.js';
import { appPath } from '../../lib/paths.js';
import type { App } from '../../lib/types.js';
import { loadApp } from '../../server/developer.js';

const app = cache((clientId: string) => loadApp(clientId), 'legacy-app');
export const routeData = (args: RouteDataArgs) => app(paramOf(args, 'clientId'));

export default function LegacyAppPage() {
  const data = useRouteData<App>();
  return (
    <Show when={data()}>
      {(found: App) => <Redirect to={appPath(found.organization_id, found.client_id)} />}
    </Show>
  );
}
