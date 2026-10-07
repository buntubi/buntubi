/**
 * The portal's calls to the provider's developer API. Each runs on this server, as the
 * signed-in developer: the access token stays in the session cookie and never reaches the
 * browser. A refusal throws its code (`missing_for_live`, `restricted_scope`...), which the
 * page words.
 */
import type { ApiKey, App, Home, Me, Organization, OrganizationDetail } from '../lib/types.js';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** A refusal from the developer API, with whatever detail it gave (missing fields, scopes). */
export class ApiRefusal extends Error {
  constructor(
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

async function call<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const { requestAuth } = await import('@fluixi/oauth2/server');
  const { publicEnv } = await import('@fluixi/start/env');
  const { fetch } = await requestAuth();
  if (!fetch) throw new ApiRefusal('signed_out');
  const response = await fetch(`${publicEnv().IDP_URL}/developer/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const { error, ...details } = data;
    throw new ApiRefusal(typeof error === 'string' ? error : response.status === 401 ? 'signed_out' : 'generic', details);
  }
  return data as T;
}

export const loadHome = async (): Promise<Home> => {
  'use server';
  try {
    const me = await call<Me>('GET', '/me');
    const organizations = me.developer ? (await call<{ items: Organization[] }>('GET', '/organizations')).items : [];
    return { me, organizations };
  } catch (error) {
    if (error instanceof ApiRefusal && error.code === 'signed_out') return { me: null, organizations: [] };
    throw error;
  }
};

export const acceptTerms = async (): Promise<void> => {
  'use server';
  await call('POST', '/terms');
};

export const createOrganization = async (input: { name: string; support_email?: string }): Promise<Organization> => {
  'use server';
  const body = { name: input.name, support_email: input.support_email || undefined };
  return (await call<{ organization: Organization }>('POST', '/organizations', body)).organization;
};

export const loadOrganization = async (id: string): Promise<OrganizationDetail> => {
  'use server';
  return call<OrganizationDetail>('GET', `/organizations/${encodeURIComponent(id)}`);
};

export const updateOrganization = async (id: string, patch: { name?: string; support_email?: string | null }) => {
  'use server';
  return (await call<{ organization: Organization }>('PATCH', `/organizations/${encodeURIComponent(id)}`, patch)).organization;
};

export const createApp = async (
  organizationId: string,
  input: { name: string; client_type: 'public' | 'confidential'; redirect_uri: string },
): Promise<{ app: App; client_secret: string | null }> => {
  'use server';
  return call('POST', `/organizations/${encodeURIComponent(organizationId)}/apps`, {
    name: input.name,
    client_type: input.client_type,
    redirect_uris: input.redirect_uri ? [input.redirect_uri] : [],
  });
};

export const loadApp = async (clientId: string): Promise<App> => {
  'use server';
  return (await call<{ app: App }>('GET', `/apps/${encodeURIComponent(clientId)}`)).app;
};

export const updateApp = async (clientId: string, patch: Record<string, unknown>): Promise<App> => {
  'use server';
  return (await call<{ app: App }>('PATCH', `/apps/${encodeURIComponent(clientId)}`, patch)).app;
};

/** `missing` lists what the app still lacks to go live, when that is why it is not live. */
export const publishApp = async (clientId: string): Promise<{ state: string; missing: string[] }> => {
  'use server';
  try {
    const answer = await call<{ state: string }>('POST', `/apps/${encodeURIComponent(clientId)}/publish`);
    return { state: answer.state, missing: [] };
  } catch (error) {
    if (error instanceof ApiRefusal && error.code === 'missing_for_live') {
      return { state: 'sandbox', missing: (error.details.fields as string[] | undefined) ?? [] };
    }
    throw error;
  }
};

export const rotateSecret = async (clientId: string): Promise<{ client_secret: string; app: App }> => {
  'use server';
  return call('POST', `/apps/${encodeURIComponent(clientId)}/secrets`);
};

export const revokeSecret = async (clientId: string, secretId: string): Promise<App> => {
  'use server';
  const path = `/apps/${encodeURIComponent(clientId)}/secrets/${encodeURIComponent(secretId)}`;
  return (await call<{ app: App }>('DELETE', path)).app;
};

export const createKey = async (
  organizationId: string,
  input: { name: string; environment: 'sandbox' | 'live'; scopes: string[] },
): Promise<{ key: ApiKey; api_key: string }> => {
  'use server';
  return call('POST', `/organizations/${encodeURIComponent(organizationId)}/keys`, input);
};

export const revokeKey = async (organizationId: string, keyId: string): Promise<void> => {
  'use server';
  await call('DELETE', `/organizations/${encodeURIComponent(organizationId)}/keys/${encodeURIComponent(keyId)}`);
};

export const addTestUser = async (organizationId: string, email: string): Promise<void> => {
  'use server';
  await call('POST', `/organizations/${encodeURIComponent(organizationId)}/test-users`, { email });
};

export const removeTestUser = async (organizationId: string, email: string): Promise<void> => {
  'use server';
  await call('DELETE', `/organizations/${encodeURIComponent(organizationId)}/test-users/${encodeURIComponent(email)}`);
};
