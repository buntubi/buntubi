/** Checking an organization event as a product receives it: the signature, its age, the body. */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WEBHOOK_EVENTS, WebhookVerificationError, verifyWebhook, type WebhookEvent } from './webhooks.js';

const SECRET = 'whsec_test_secret';
const NOW = 1_800_000_000;

const event = {
  id: 'e1',
  type: WEBHOOK_EVENTS.MemberRoleChanged,
  created_at: '2027-01-15T08:00:00+00:00',
  organization_id: 'o1',
  sequence: 4,
  data: {
    member: { id: 'm1', user_id: 'u1', email: 'omar@example.test', role: 'admin' },
    previous_role: 'member',
  },
};
const body = JSON.stringify(event);
const sign = (payload: string, at = NOW, secret = SECRET) =>
  `t=${at},v1=${createHmac('sha256', secret).update(`${at}.${payload}`).digest('hex')}`;

describe('verifyWebhook', () => {
  it('answers the event when the signature matches the body and is recent', async () => {
    const verified: WebhookEvent = await verifyWebhook({ secret: SECRET, body, signature: sign(body), now: NOW + 10 });
    expect(verified.type).toBe('member.role_changed');
    if (verified.type === WEBHOOK_EVENTS.MemberRoleChanged) {
      // The union narrows: the data of this event, typed.
      expect(verified.data.previous_role).toBe('member');
      expect(verified.data.member.user_id).toBe('u1');
    }
  });

  it('takes the body as bytes too, exactly as received', async () => {
    const bytes = new TextEncoder().encode(body);
    expect((await verifyWebhook({ secret: SECRET, body: bytes, signature: sign(body), now: NOW })).id).toBe('e1');
  });

  it('accepts any of several v1 signatures, as during a secret rotation', async () => {
    const both = `${sign(body, NOW, 'whsec_old')},v1=${sign(body).split('v1=')[1]}`;
    expect((await verifyWebhook({ secret: SECRET, body, signature: both, now: NOW })).sequence).toBe(4);
  });

  it.each([
    ['a missing header', undefined, 'missing_signature'],
    ['a header without parts', 'nonsense', 'malformed_signature'],
    ['another secret', sign(body, NOW, 'whsec_other'), 'bad_signature'],
    ['a changed body', sign(body.replace('admin', 'owner')), 'bad_signature'],
    ['an old message', sign(body, NOW - 600), 'too_old'],
    ['a message from the future', sign(body, NOW + 600), 'too_old'],
  ])('refuses %s', async (_, signature, code) => {
    const failure = await verifyWebhook({ secret: SECRET, body, signature, now: NOW }).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(WebhookVerificationError);
    expect(failure).toMatchObject({ code });
  });

  it('refuses a signed body that is not an event', async () => {
    const failure = await verifyWebhook({ secret: SECRET, body: 'not json', signature: sign('not json'), now: NOW }).catch(
      (e: unknown) => e,
    );
    expect(failure).toMatchObject({ code: 'malformed_body' });
  });

  it('matches the provider on a shared vector (idp tests/test_webhook_delivery.py VECTOR)', async () => {
    const vectorBody = '{"type":"member.added","sequence":1}';
    const vector = 't=1700000000,v1=fdba52d689ee5afb5cb1f2c3f7147350428ab44bf2d4b1278d21845b3052a962';
    const verified = await verifyWebhook({ secret: 'whsec_vector', body: vectorBody, signature: vector, now: 1700000000 });
    expect(verified.type).toBe('member.added');
  });
});
