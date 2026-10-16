/**
 * Organization events, as a product receives them from the provider's webhooks: the names, the
 * shape of each event, and `verifyWebhook`, which checks a request before anything trusts it.
 *
 * Each request carries `Buntubi-Signature: t=<unix seconds>,v1=<hex>`, an HMAC-SHA256 of
 * `<t>.<raw body>` with the app's webhook secret, and `Buntubi-Event-Id`. Verify against the raw
 * body, before parsing it. Events of one organization are numbered (`sequence`): apply them in
 * order, ignore an id already applied, and when a number is missing, read the organization again
 * from the organizations API (`@buntubi/sdk/organizations`).
 *
 * @example
 * ```ts
 * const event = await verifyWebhook({
 *   secret: process.env.BUNTUBI_WEBHOOK_SECRET!,
 *   body: await request.text(),
 *   signature: request.headers.get('buntubi-signature'),
 * });
 * if (event.type === WEBHOOK_EVENTS.MemberRemoved) removeMember(event.data.member.user_id);
 * ```
 *
 * @module
 */
import type { Role } from './types.js';

/** Every event name: the provider's `Event` (services/webhooks.py), one for one. */
export const WEBHOOK_EVENTS = {
  OrganizationCreated: 'organization.created',
  OrganizationUpdated: 'organization.updated',
  OrganizationSuspended: 'organization.suspended',
  OrganizationRestored: 'organization.restored',
  OrganizationDeleted: 'organization.deleted',
  MemberAdded: 'member.added',
  MemberRoleChanged: 'member.role_changed',
  MemberRemoved: 'member.removed',
  InvitationAccepted: 'invitation.accepted',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export interface WebhookOrganization {
  id: string;
  name: string;
  suspended: boolean;
}

export interface WebhookMember {
  /** The membership's id. */
  id: string;
  /** The person's id: the `sub` of their tokens. */
  user_id: string;
  email: string;
  role: Role;
}

export interface WebhookInvitation {
  id: string;
  email: string;
  role: Role;
}

/** What each event carries in `data`. */
export interface WebhookEventData {
  'organization.created': { organization: WebhookOrganization; owner: WebhookMember };
  'organization.updated': { organization: WebhookOrganization };
  'organization.suspended': { organization: WebhookOrganization };
  'organization.restored': { organization: WebhookOrganization };
  'organization.deleted': { organization: WebhookOrganization };
  'member.added': { member: WebhookMember };
  'member.role_changed': { member: WebhookMember; previous_role: Role };
  'member.removed': { member: WebhookMember };
  'invitation.accepted': { invitation: WebhookInvitation };
}

/** An event, its `data` known from its `type`. */
export type WebhookEvent = {
  [T in WebhookEventType]: {
    id: string;
    type: T;
    created_at: string;
    organization_id: string;
    /** Its number among the organization's events, from 1, without gaps. */
    sequence: number;
    data: WebhookEventData[T];
  };
}[WebhookEventType];

export type WebhookVerificationCode =
  | 'missing_signature'
  | 'malformed_signature'
  | 'too_old'
  | 'bad_signature'
  | 'malformed_body';

export class WebhookVerificationError extends Error {
  constructor(readonly code: WebhookVerificationCode) {
    super(`[buntubi] webhook refused: ${code}`);
    this.name = 'WebhookVerificationError';
  }
}

export interface VerifyWebhookOptions {
  /** The app's webhook secret (`whsec_...`). */
  secret: string;
  /** The raw request body, exactly as received. */
  body: string | Uint8Array;
  /** The `Buntubi-Signature` header. */
  signature: string | null | undefined;
  /** How far the signing time may be from now, in seconds: 300 by default. */
  toleranceSeconds?: number;
  /** Now, in unix seconds; for tests. */
  now?: number;
}

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares in a time that does not depend on where the strings differ. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/**
 * The event, once its signature matches the body and it was signed within the tolerance.
 *
 * @throws WebhookVerificationError With the reason, for a request to answer with a 400.
 */
export async function verifyWebhook(options: VerifyWebhookOptions): Promise<WebhookEvent> {
  if (!options.signature) throw new WebhookVerificationError('missing_signature');
  const parts = options.signature.split(',').map((part) => part.trim().split('='));
  const stamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key, value]) => key === 'v1' && value).map(([, value]) => value!);
  if (!Number.isInteger(stamp) || !signatures.length) throw new WebhookVerificationError('malformed_signature');

  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - stamp) > (options.toleranceSeconds ?? 300)) throw new WebhookVerificationError('too_old');

  const body = typeof options.body === 'string' ? encoder.encode(options.body) : options.body;
  const signed = new Uint8Array([...encoder.encode(`${stamp}.`), ...body]);
  const key = await crypto.subtle.importKey('raw', encoder.encode(options.secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const expected = hex(await crypto.subtle.sign('HMAC', key, signed));
  if (!signatures.some((candidate) => sameText(candidate, expected))) throw new WebhookVerificationError('bad_signature');

  try {
    const event = JSON.parse(new TextDecoder().decode(body)) as WebhookEvent;
    if (typeof event?.type !== 'string' || typeof event.sequence !== 'number') throw new Error('not an event');
    return event;
  } catch {
    throw new WebhookVerificationError('malformed_body');
  }
}
