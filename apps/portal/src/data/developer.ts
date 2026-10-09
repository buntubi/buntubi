/**
 * The portal's route data, cached and named, in one place: routes and layouts import from
 * here, never from one another, and nothing here imports a route.
 */
import { cache, type RouteDataArgs } from '@fluixi/start/router';
import { paramOf } from '../lib/params.js';
import type { AppWorkspace, Workspace } from '../lib/types.js';
import {
  loadApp,
  loadAppReviews,
  loadAppWorkspace,
  loadBrand,
  loadHome,
  loadWorkspace,
} from '../server/developer.js';

export const brand = cache(() => loadBrand(), 'brand');
export const home = cache(() => loadHome(), 'home');
/** An organization's workspace: its apps, keys, members, and the products on offer. */
export const workspace = cache((organization: string) => loadWorkspace(organization), 'workspace');
export const appWorkspace = cache((clientId: string) => loadAppWorkspace(clientId), 'app');
export const appReviews = cache((clientId: string) => loadAppReviews(clientId), 'reviews');
/** An app found by its ID alone, for the old address without the organization. */
export const appById = cache((clientId: string) => loadApp(clientId), 'legacy-app');

/** What every page of an app's workspace reads: the organization's workspace and the app. */
export interface AppPageData {
  workspace: Workspace;
  app: AppWorkspace;
}

export const appRouteData = async (args: RouteDataArgs): Promise<AppPageData> => {
  const [shell, app] = await Promise.all([workspace(paramOf(args, 'org')), appWorkspace(paramOf(args, 'clientId'))]);
  return { workspace: shell, app };
};
