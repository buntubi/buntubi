/**
 * The portal's calls to the provider's developer API. Each runs on this server, as the
 * signed-in developer: the access token stays in the session cookie and never reaches the
 * browser. A refusal throws its code (`missing_for_live`, `restricted_scope`...), which the
 * page words.
 */
import type { AppPatch, NewApp } from '@idp/sdk/developer';
import type { ApiKey, App, AppOverview, AppWorkspace, Brand, Home, Me, Member, Organization, OrganizationDetail, Product, Role, Workspace } from '../lib/types.js';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * A refusal from the developer API, with whatever detail it gave (missing fields, scopes).
 * Its `status` is the provider's, so the browser gets a 4xx it can word, never a 500; a
 * provider fault has none and stays a server error.
 */
export class ApiRefusal extends Error {
  constructor(
    readonly code: string,
    readonly details: Record<string, unknown> = {},
    readonly status?: number,
  ) {
    super(code);
  }
}

async function call<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const { requestAuth } = await import('@fluixi/oauth2/server');
  const { publicEnv } = await import('@fluixi/start/env');
  const { fetch } = await requestAuth();
  if (!fetch) throw new ApiRefusal('signed_out', {}, 401);
  const response = await fetch(`${publicEnv().IDP_URL}/developer/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const { error, ...details } = data;
    const code = typeof error === 'string' ? error : response.status === 401 ? 'signed_out' : 'generic';
    throw new ApiRefusal(code, details, response.status < 500 ? response.status : undefined);
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

/** The platform's brand: public, the same for everyone, so no session is needed. */
export const loadBrand = async (): Promise<Brand> => {
  'use server';
  const { publicEnv } = await import('@fluixi/start/env');
  const response = await fetch(`${publicEnv().IDP_URL}/.well-known/brand.json`).catch(() => null);
  return response?.ok ? ((await response.json()) as Brand) : {};
};

/**
 * Everything the workspace shell shows around a page: who is signed in, the organizations
 * they belong to, and the one in the address with its apps. `organization` is null when the
 * address names one they are not in.
 */
export const loadWorkspace = async (organizationId: string): Promise<Workspace> => {
  'use server';
  const [me, list, products] = await Promise.all([
    call<Me>('GET', '/me'),
    call<{ items: Organization[] }>('GET', '/organizations'),
    call<{ items: Product[] }>('GET', '/products'),
  ]);
  const base = { me, organizations: list.items, products: products.items };
  try {
    const detail = await call<OrganizationDetail>('GET', `/organizations/${encodeURIComponent(organizationId)}`);
    return { ...base, current: detail };
  } catch (error) {
    if (error instanceof ApiRefusal && error.code === 'not_found') return { ...base, current: null };
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

export const updateOrganization = async (
  id: string,
  patch: { name?: string; description?: string; support_email?: string | null },
): Promise<Organization> => {
  'use server';
  return (await call<{ organization: Organization }>('PATCH', `/organizations/${encodeURIComponent(id)}`, patch)).organization;
};

export const deleteOrganization = async (id: string): Promise<void> => {
  'use server';
  await call('DELETE', `/organizations/${encodeURIComponent(id)}`);
};

export const createApp = async (
  organizationId: string,
  input: NewApp,
): Promise<{ app: App; client_secret: string | null }> => {
  'use server';
  return call('POST', `/organizations/${encodeURIComponent(organizationId)}/apps`, input);
};

export const loadApp = async (clientId: string): Promise<App> => {
  'use server';
  return (await call<{ app: App }>('GET', `/apps/${encodeURIComponent(clientId)}`)).app;
};

/**
 * One app as its workspace shows it: the app, the reader's role on it, and its way to live.
 * `app` is null when the address names an app the reader cannot see.
 */
export const loadAppWorkspace = async (clientId: string): Promise<AppWorkspace> => {
  'use server';
  const { publicEnv } = await import('@fluixi/start/env');
  const issuer = publicEnv().IDP_URL ?? '';
  const id = encodeURIComponent(clientId);
  try {
    const [{ app, role }, overview] = await Promise.all([
      call<{ app: App; role: Role }>('GET', `/apps/${id}`),
      call<AppOverview>('GET', `/apps/${id}/overview`),
    ]);
    return { issuer, app, role, overview };
  } catch (error) {
    if (error instanceof ApiRefusal && error.code === 'not_found') return { issuer, app: null, role: null, overview: null };
    throw error;
  }
};

export const updateApp = async (clientId: string, patch: AppPatch): Promise<App> => {
  'use server';
  return (await call<{ app: App }>('PATCH', `/apps/${encodeURIComponent(clientId)}`, patch)).app;
};

/** `missing` lists what the app still lacks to go live, when that is why it is not live. */
export const publishApp = async (clientId: string): Promise<{ state: 'live' | 'pending' | 'sandbox'; missing: string[] }> => {
  'use server';
  try {
    const answer = await call<{ state: 'live' | 'pending' }>('POST', `/apps/${encodeURIComponent(clientId)}/publish`);
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

export const revokeKey = async (organizationId: string, keyId: string): Promise<ApiKey> => {
  'use server';
  const path = `/organizations/${encodeURIComponent(organizationId)}/keys/${encodeURIComponent(keyId)}`;
  return (await call<{ key: ApiKey }>('DELETE', path)).key;
};

export const addTestUser = async (organizationId: string, email: string): Promise<void> => {
  'use server';
  await call('POST', `/organizations/${encodeURIComponent(organizationId)}/test-users`, { email });
};

export const removeTestUser = async (organizationId: string, email: string): Promise<void> => {
  'use server';
  await call('DELETE', `/organizations/${encodeURIComponent(organizationId)}/test-users/${encodeURIComponent(email)}`);
};

export const addMember = async (
  organizationId: string,
  input: { email: string; role: Role; apps?: string[] },
): Promise<Member> => {
  'use server';
  return (await call<{ member: Member }>('POST', `/organizations/${encodeURIComponent(organizationId)}/members`, input)).member;
};

export const changeMember = async (
  organizationId: string,
  memberId: string,
  patch: { role?: Role; apps?: string[] },
): Promise<Member> => {
  'use server';
  const path = `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}`;
  return (await call<{ member: Member }>('PATCH', path, patch)).member;
};

export const removeMember = async (organizationId: string, memberId: string): Promise<void> => {
  'use server';
  await call('DELETE', `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}`);
};
