/**
 * The console's route data, cached and named, in one place: routes and layouts import from
 * here, never from one another, and nothing here imports a route. One entry per key, so the
 * shell's count and the overview page share a fetch.
 */
import { cache } from '@fluixi/start/router';
import {
  loadBrand,
  loadClient,
  loadClients,
  loadMe,
  loadOrganizations,
  loadOverview,
  loadPlugins,
  loadProducts,
  loadReview,
  loadReviews,
  loadScopes,
  loadUsers,
} from '../server/admin.js';

export const brand = cache(() => loadBrand(), 'brand');
export const overview = cache(() => loadOverview(), 'overview');
export const reviews = cache(() => loadReviews(), 'reviews');
export const review = cache((clientId: string) => loadReview(clientId), 'review');
export const organizations = cache((q: string) => loadOrganizations(q), 'organizations');
export const users = cache((q: string) => loadUsers(q), 'users');
export const clients = cache((q: string) => loadClients(q), 'clients');
export const client = cache((clientId: string) => loadClient(clientId), 'client');
export const me = cache(() => loadMe(), 'me');
export const scopes = cache(() => loadScopes(), 'scopes');
export const products = cache(() => loadProducts(), 'products');
export const enabledPlugins = cache(() => loadPlugins(), 'plugins');
