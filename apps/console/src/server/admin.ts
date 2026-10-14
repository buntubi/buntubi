/**
 * The console's calls to the provider's admin API, made on this server as the signed-in owner:
 * the access token stays in the session cookie. Refusals the console words are returned as
 * values; anything else throws its code.
 */
import { pluginTarget } from '@buntu/sdk/plugins';
import type { Brand } from '@buntu/sdk/types';
import type { ClientRow, Gate, Me, NewUser, UserEdit, UserPage, Overview, OrganizationRow, ProductRow, Review, ScopeRow, UserRow } from '../lib/types.js';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * A refusal from the admin API. Its `status` is the provider's, so the browser gets a 4xx it can
 * word, never a 500; a provider fault has none and stays a server error.
 */
class AdminRefusal extends Error {
  constructor(
    readonly code: string,
    readonly status?: number,
  ) {
    super(code);
  }
}

async function call<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const { requestAuth } = await import('@fluixi/oauth2/server');
  const { publicEnv } = await import('@fluixi/start/env');
  const { fetch, unreachable } = await requestAuth();
  // A session the provider could not confirm because it did not answer: not a signed-out visitor.
  if (!fetch) throw new AdminRefusal(unreachable ? 'provider_unreachable' : 'signed_out', unreachable ? undefined : 401);
  const response = await fetch(`${publicEnv().IDP_URL}/admin/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const code = typeof data.error === 'string' ? data.error : response.status === 401 ? 'signed_out' : 'generic';
    throw new AdminRefusal(code, response.status < 500 ? response.status : undefined);
  }
  return data as T;
}

const GATES = new Set(['signed_out', 'not_admin', 'mfa_required']);

/** The overview, or why the console is closed to this visitor. */
export const loadOverview = async (): Promise<{ gate: Gate; overview: Overview | null; reviews: Review[] }> => {
  'use server';
  try {
    const overview = await call<Overview>('GET', '/overview');
    const reviews = (await call<{ items: Review[] }>('GET', '/reviews')).items;
    return { gate: null, overview, reviews };
  } catch (error) {
    if (error instanceof AdminRefusal && GATES.has(error.code)) {
      return { gate: error.code as Gate, overview: null, reviews: [] };
    }
    throw error;
  }
};

/** The apps waiting, and when the list was read, so the page counts the same wait on both sides. */
export const loadReviews = async (): Promise<{ reviews: Review[]; now: string }> => {
  'use server';
  return { reviews: (await call<{ items: Review[] }>('GET', '/reviews')).items, now: new Date().toISOString() };
};

/** One app as a reviewer sees it, with the scope catalogue for what its scopes mean. */
export const loadReview = async (clientId: string): Promise<{ review: Review | null; scopes: ScopeRow[] }> => {
  'use server';
  const scopes = (await call<{ items: ScopeRow[] }>('GET', '/scopes')).items;
  try {
    const review = (await call<{ app: Review }>('GET', `/apps/${encodeURIComponent(clientId)}/review`)).app;
    return { review, scopes };
  } catch (error) {
    if (error instanceof AdminRefusal && error.code === 'not_found') return { review: null, scopes };
    throw error;
  }
};

/** The platform's brand: public, the same for everyone. */
export const loadBrand = async (): Promise<Brand> => {
  'use server';
  const { publicEnv } = await import('@fluixi/start/env');
  const response = await fetch(`${publicEnv().IDP_URL}/.well-known/brand.json`).catch(() => null);
  return response?.ok ? ((await response.json()) as Brand) : {};
};

export const reviewApp = async (input: { clientId: string; approve: boolean; note: string }): Promise<void> => {
  'use server';
  await call('POST', `/apps/${encodeURIComponent(input.clientId)}/review`, { approve: input.approve, note: input.note });
};

export const loadOrganizations = async (q: string): Promise<OrganizationRow[]> => {
  'use server';
  return (await call<{ items: OrganizationRow[] }>('GET', `/organizations?q=${encodeURIComponent(q)}`)).items;
};

export const suspendOrganization = async (input: { id: string; reason: string }): Promise<void> => {
  'use server';
  await call('POST', `/organizations/${encodeURIComponent(input.id)}/suspend`, { reason: input.reason });
};

export const restoreOrganization = async (id: string): Promise<void> => {
  'use server';
  await call('POST', `/organizations/${encodeURIComponent(id)}/restore`);
};

export const loadUsers = async (q: string): Promise<UserRow[]> => {
  'use server';
  return (await call<{ items: UserRow[] }>('GET', `/users?q=${encodeURIComponent(q)}`)).items;
};

/** One account's page, or null when there is none by that id. */
export const loadUser = async (id: string): Promise<UserPage | null> => {
  'use server';
  try {
    return await call<UserPage>('GET', `/users/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof AdminRefusal && error.status === 404) return null;
    throw error;
  }
};

export const createUser = async (input: NewUser): Promise<string> => {
  'use server';
  return (await call<{ user: { id: string } }>('POST', '/users', input)).user.id;
};

export const updateUser = async (input: { id: string } & UserEdit): Promise<void> => {
  'use server';
  const { id, ...edit } = input;
  await call('PATCH', `/users/${encodeURIComponent(id)}`, edit);
};

export const sendPasswordReset = async (id: string): Promise<void> => {
  'use server';
  await call('POST', `/users/${encodeURIComponent(id)}/password-reset`);
};

export const signOutUser = async (id: string): Promise<void> => {
  'use server';
  await call('POST', `/users/${encodeURIComponent(id)}/sign-out`);
};

export const resetTwoStep = async (id: string): Promise<void> => {
  'use server';
  await call('DELETE', `/users/${encodeURIComponent(id)}/mfa`);
};

export const setUserDisabled = async (input: { id: string; disabled: boolean }): Promise<void> => {
  'use server';
  await call('POST', `/users/${encodeURIComponent(input.id)}/${input.disabled ? 'disable' : 'enable'}`);
};

/** Every app, the platform's own and the developers', with whose each is. */
export const loadClients = async (q: string): Promise<ClientRow[]> => {
  'use server';
  const all = (await call<{ items: ClientRow[] }>('GET', '/clients')).items;
  const term = q.trim().toLowerCase();
  const matching = term
    ? all.filter((c) => [c.name, c.client_id, c.organization ?? ''].some((v) => v.toLowerCase().includes(term)))
    : all;
  // The platform's own first, then by name.
  return matching.sort((a, b) => Number(b.platform) - Number(a.platform) || a.name.localeCompare(b.name));
};

/** Who is signed in, and where the platform's own apps live. */
export const loadMe = async (): Promise<Me> => {
  'use server';
  return call<Me>('GET', '/me');
};

/** One app, or null when there is none by that id. */
export const loadClient = async (clientId: string): Promise<ClientRow | null> => {
  'use server';
  try {
    return (await call<{ client: ClientRow }>('GET', `/clients/${encodeURIComponent(clientId)}`)).client;
  } catch (error) {
    if (error instanceof AdminRefusal && error.status === 404) return null;
    throw error;
  }
};

export const setClientDisabled = async (input: { client_id: string; disabled: boolean }): Promise<void> => {
  'use server';
  await call('PATCH', `/clients/${encodeURIComponent(input.client_id)}`, { disabled: input.disabled });
};

export const setAdmin = async (input: { id: string; admin: boolean }): Promise<void> => {
  'use server';
  await call(input.admin ? 'POST' : 'DELETE', `/users/${encodeURIComponent(input.id)}/admin`);
};

export const setFirstParty = async (input: { client_id: string; first_party: boolean }): Promise<void> => {
  'use server';
  await call('PATCH', `/clients/${encodeURIComponent(input.client_id)}`, { first_party: input.first_party });
};

export const loadScopes = async (): Promise<ScopeRow[]> => {
  'use server';
  return (await call<{ items: ScopeRow[] }>('GET', '/scopes')).items;
};

export const createScope = async (input: ScopeRow): Promise<void> => {
  'use server';
  await call('POST', '/scopes', input);
};

export const loadProducts = async (): Promise<ProductRow[]> => {
  'use server';
  return (await call<{ items: ProductRow[] }>('GET', '/products')).items;
};

export const createProduct = async (
  input: Pick<ProductRow, 'slug' | 'names' | 'descriptions' | 'category' | 'availability'>,
): Promise<void> => {
  'use server';
  await call('POST', '/products', input);
};

export const setAvailability = async (input: { slug: string; availability: ProductRow['availability'] }): Promise<void> => {
  'use server';
  await call('PATCH', `/products/${encodeURIComponent(input.slug)}`, { availability: input.availability });
};

/** Puts a scope in a product, or takes it out with `null`. */
export const setScopeProduct = async (input: { scope: string; product: string | null }): Promise<void> => {
  'use server';
  await call('PATCH', `/scopes/${encodeURIComponent(input.scope)}`, { product: input.product });
};

/** The plugins the provider runs, by id: the console shows the pages of these only. */
export const loadPlugins = async (): Promise<string[]> => {
  'use server';
  try {
    return (await call<{ items: { id: string }[] }>('GET', '/plugins')).items.map((plugin) => plugin.id);
  } catch {
    return [];
  }
};

/** A plugin's own API, as the signed-in owner. */
export const pluginCall = async (input: { plugin: string; method: Method; path: string; body?: unknown }): Promise<unknown> => {
  'use server';
  const { requestAuth } = await import('@fluixi/oauth2/server');
  const { publicEnv } = await import('@fluixi/start/env');
  const { fetch, unreachable } = await requestAuth();
  // A session the provider could not confirm because it did not answer: not a signed-out visitor.
  if (!fetch) throw new AdminRefusal(unreachable ? 'provider_unreachable' : 'signed_out', unreachable ? undefined : 401);
  // Only the plugin's own API: never a path that resolves into the admin API, with this token.
  const target = pluginTarget(publicEnv().IDP_URL ?? '', input.plugin, input.method, input.path);
  if (!target) throw new AdminRefusal('invalid_plugin_call', 400);
  const response = await fetch(target, {
    method: input.method,
    headers: input.body === undefined ? {} : { 'content-type': 'application/json' },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    throw new AdminRefusal(typeof data.error === 'string' ? data.error : 'generic', response.status < 500 ? response.status : undefined);
  }
  return data;
};
