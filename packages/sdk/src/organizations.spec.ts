/** The organizations API client: what it sends, and how a refusal comes back. */
import { describe, expect, it } from 'vitest';
import { OrganizationsApiError, organizationsClient } from './organizations.js';

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
