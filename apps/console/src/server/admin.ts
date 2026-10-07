/**
 * The console's calls to the provider's admin API, made on this server as the signed-in owner:
 * the access token stays in the session cookie. Refusals the console words are returned as
 * values; anything else throws its code.
 */
import type { Gate, Overview, OrganizationRow, Review, ScopeRow, UserRow } from '../lib/types.js';

type Method = 'GET' | 'POST' | 'PATCH';

class AdminRefusal extends Error {}

async function call<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const { requestAuth } = await import('@fluixi/oauth2/server');
  const { publicEnv } = await import('@fluixi/start/env');
  const { fetch } = await requestAuth();
  if (!fetch) throw new AdminRefusal('signed_out');
  const response = await fetch(`${publicEnv().IDP_URL}/admin/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    throw new AdminRefusal(typeof data.error === 'string' ? data.error : response.status === 401 ? 'signed_out' : 'generic');
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
    if (error instanceof AdminRefusal && GATES.has(error.message)) {
      return { gate: error.message as Gate, overview: null, reviews: [] };
    }
    throw error;
  }
};

export const loadReviews = async (): Promise<Review[]> => {
  'use server';
  return (await call<{ items: Review[] }>('GET', '/reviews')).items;
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

export const setUserDisabled = async (input: { id: string; disabled: boolean }): Promise<void> => {
  'use server';
  await call('POST', `/users/${encodeURIComponent(input.id)}/${input.disabled ? 'disable' : 'enable'}`);
};

export const loadScopes = async (): Promise<ScopeRow[]> => {
  'use server';
  return (await call<{ items: ScopeRow[] }>('GET', '/scopes')).items;
};

export const createScope = async (input: ScopeRow): Promise<void> => {
  'use server';
  await call('POST', '/scopes', input);
};
