/** The address apps had before the workspace: sends a saved link on to the app's workspace. */
import { Redirect, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { paramOf } from '../../lib/params.js';
import { paths } from '../../lib/paths.js';
import type { App } from '../../lib/types.js';
import { appById } from '../../data/developer.js';

export const routeData = (args: RouteDataArgs) => appById(paramOf(args, 'clientId'));

export default function LegacyAppPage() {
  const data = useRouteData<App>();
  return (
    <Show when={data()}>
      {(found: App) => <Redirect to={paths.app(found.organization_id, found.client_id)} />}
    </Show>
  );
}
