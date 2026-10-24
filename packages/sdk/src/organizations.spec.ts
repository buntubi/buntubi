/** The organizations API client: what it sends, and how a refusal comes back. */
import { describe, expect, it } from 'vitest';
import { appOrganizationsClient, OrganizationsApiError, organizationsClient } from './organizations.js';

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

describe('organizationsClient', () => {
  it('calls the provider as the person, with the token it is given', async () => {
    const { calls, fetch } = fakeFetch(200, { items: [{ id: 'o1', name: 'ACME', role: 'owner' }] });
    const client = organizationsClient({ issuer: 'https://id.example/', accessToken: async () => 'tok', fetch });
    const items = await client.list();
    expect(items.map((o) => o.name)).toEqual(['ACME']);
    expect(calls[0]?.url).toBe('https://id.example/v1/organizations');
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer tok');
  });

  it('sends changes as JSON and encodes ids in the path', async () => {
    const { calls, fetch } = fakeFetch(200, { member: { id: 'm/1', role: 'admin' } });
    const client = organizationsClient({ issuer: 'https://id.example', accessToken: () => 'tok', fetch });
    await client.changeMember('o 1', 'm/1', 'admin');
    expect(calls[0]?.url).toBe('https://id.example/v1/organizations/o%201/members/m%2F1');
    expect(calls[0]?.init.method).toBe('PATCH');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ role: 'admin' });
  });

  it('answers an invitation when the address has no account yet', async () => {
    const { fetch } = fakeFetch(202, { invitation: { id: 'i1', email: 'x@example.test', role: 'member' } });
    const client = organizationsClient({ issuer: 'https://id.example', accessToken: () => 'tok', fetch });
    expect(await client.addMember('o1', { email: 'x@example.test' })).toEqual({
      invited: true,
      invitation: { id: 'i1', email: 'x@example.test', role: 'member' },
    });
  });

  it('turns a refusal into an error carrying the provider\'s code', async () => {
    const { fetch } = fakeFetch(409, { error: 'last_owner' });
    const client = organizationsClient({ issuer: 'https://id.example', accessToken: () => 'tok', fetch });
    const failure = await client.leave('o1').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(OrganizationsApiError);
    expect(failure).toMatchObject({ status: 409, code: 'last_owner' });
  });
});

describe('appOrganizationsClient', () => {
  it('signs in as the app once, then reads with that token', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const body = String(url).endsWith('/oauth/token')
        ? { access_token: 'app-tok', expires_in: 3600 }
        : { items: [{ id: 'o1', name: 'ACME', suspended: false, sequence: 4 }] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof globalThis.fetch;
    const client = appOrganizationsClient({ issuer: 'https://id.example/', clientId: 'sync', clientSecret: 's3cret', fetch });

    expect(await client.list()).toEqual([{ id: 'o1', name: 'ACME', suspended: false, sequence: 4 }]);
    await client.list();

    expect(calls.map((c) => c.url)).toEqual([
      'https://id.example/oauth/token',
      'https://id.example/v1/app/organizations',
      'https://id.example/v1/app/organizations',
    ]);
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe(`Basic ${btoa('sync:s3cret')}`);
    expect(String(calls[0]?.init.body)).toBe('grant_type=client_credentials&scope=organizations%3Aread');
    expect(new Headers(calls[1]?.init.headers).get('authorization')).toBe('Bearer app-tok');
  });

  it('throws when the provider refuses the app', async () => {
    const fetch = (async () => new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 })) as typeof globalThis.fetch;
    const client = appOrganizationsClient({ issuer: 'https://id.example', clientId: 'sync', clientSecret: 'wrong', fetch });
    await expect(client.get('o1')).rejects.toMatchObject({ status: 401, code: 'invalid_client' });
  });
});
