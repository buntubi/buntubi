/**
 * The data every page of an app's workspace reads: the organization's workspace (its products
 * and keys) and the app itself. Both are cached, so the layout and the page share one fetch.
 */
import { cache, type RouteDataArgs } from '@fluixi/start/router';
import { loadAppWorkspace } from '../server/developer.js';
import { workspace } from '../routes/o/[org]/layout.js';
import { paramOf } from './params.js';
import type { AppWorkspace, Workspace } from './types.js';

export const appWorkspace = cache((clientId: string) => loadAppWorkspace(clientId), 'app');

export interface AppPageData {
  workspace: Workspace;
  app: AppWorkspace;
}

export const appRouteData = async (args: RouteDataArgs): Promise<AppPageData> => {
  const [shell, app] = await Promise.all([workspace(paramOf(args, 'org')), appWorkspace(paramOf(args, 'clientId'))]);
  return { workspace: shell, app };
};

export { appPath } from './paths.js';
