/**
 * A client for the provider's organizations API (`/v1/organizations`), for a product's server
 * acting as the signed-in person. The token needs `organizations:read`, and `organizations:manage`
 * for changes; a token bound to one organization reaches that one only. The provider applies its
 * own rules (who may change whom, always one owner) and answers a refusal with a code, which this
 * client throws as an {@link OrganizationsApiError}.
 *
 * @example
 * ```ts
 * const organizations = organizationsClient({ issuer: env.IDP_URL, accessToken: () => session.accessToken });
 * const mine = await organizations.list();
 * ```
 *
 * @module
 */
import type { Role } from './types.js';

/** An organization as the person sees it, with their role there. */
export interface OrganizationMembership {
  id: string;
  name: string;
  description: string;
  support_email: string | null;
  suspended: boolean;
  role: Role;
  created_at: string;
}

export interface OrganizationPerson {
  /** The membership's id, which changing or removing it names. */
  id: string;
  /** The person's id: the `sub` of their tokens. */
  user_id: string;
  email: string;
  name: string;
  role: Role;
  added_at: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: Role;
  invited_at: string;
  expires_at: string;
}

/** Adding someone: a member when the address has an account, an invitation otherwise. */
export type AddMemberResult =
  | { invited: false; member: OrganizationPerson }
  | { invited: true; invitation: OrganizationInvitation };

/** A refusal from the provider: `code` is its error code (`forbidden`, `last_owner`, ...). */
export class OrganizationsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(`[buntubi] the organizations API answered ${status} ${code}`);
    this.name = 'OrganizationsApiError';
  }
}

export interface OrganizationsClientOptions {
  /** The provider's address. */
  issuer: string;
  /** The person's access token, read for every call so a renewed one is used. */
  accessToken: () => string | Promise<string>;
  fetch?: typeof globalThis.fetch;
}

export function organizationsClient(options: OrganizationsClientOptions) {
  const base = `${options.issuer.replace(/\/+$/, '')}/v1/organizations`;
  const fetch = options.fetch ?? globalThis.fetch;
  const at = (...segments: string[]) => [base, ...segments.map(encodeURIComponent)].join('/');

  async function call<T>(method: string, url: string, body?: unknown): Promise<{ status: number; data: T }> {
    const headers = new Headers({ authorization: `Bearer ${await options.accessToken()}`, accept: 'application/json' });
    if (body !== undefined) headers.set('content-type', 'application/json');
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const { error, ...details } = data;
      throw new OrganizationsApiError(response.status, typeof error === 'string' ? error : 'http_error', details);
    }
    return { status: response.status, data: data as T };
  }

  return {
    /** The person's organizations; only the token's when it names one. */
    list: async () => (await call<{ items: OrganizationMembership[] }>('GET', base)).data.items,
    create: async (input: { name: string; description?: string; support_email?: string | null }) =>
      (await call<{ organization: OrganizationMembership }>('POST', base, input)).data.organization,
    /** One the person is in, a guest's too. */
    get: async (organization: string) =>
      (await call<{ organization: OrganizationMembership }>('GET', at(organization))).data.organization,
    update: async (organization: string, patch: { name?: string; description?: string; support_email?: string | null }) =>
      (await call<{ organization: OrganizationMembership }>('PATCH', at(organization), patch)).data.organization,
    remove: async (organization: string) => {
      await call('DELETE', at(organization));
    },
    /** Hands ownership to another member; the caller, an owner, stays on as an admin. */
    transfer: async (organization: string, member: string) => {
      await call('POST', at(organization, 'transfer'), { member });
    },
    leave: async (organization: string) => {
      await call('POST', at(organization, 'leave'));
    },
    /** Members and pending invitations; not for guests. */
    members: async (organization: string) =>
      (await call<{ items: OrganizationPerson[]; invitations: OrganizationInvitation[] }>('GET', at(organization, 'members')))
        .data,
    addMember: async (organization: string, input: { email: string; role?: Role }): Promise<AddMemberResult> => {
      const { status, data } = await call<{ member?: OrganizationPerson; invitation?: OrganizationInvitation }>(
        'POST',
        at(organization, 'members'),
        input,
      );
      return status === 202 ? { invited: true, invitation: data.invitation! } : { invited: false, member: data.member! };
    },
    changeMember: async (organization: string, member: string, role: Role) =>
      (await call<{ member: OrganizationPerson }>('PATCH', at(organization, 'members', member), { role })).data.member,
    removeMember: async (organization: string, member: string) => {
      await call('DELETE', at(organization, 'members', member));
    },
    withdrawInvitation: async (organization: string, invitation: string) => {
      await call('DELETE', at(organization, 'invitations', invitation));
    },
  };
}

export type OrganizationsClient = ReturnType<typeof organizationsClient>;
