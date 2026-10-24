# Webhooks

Organizations, their members and invitations live in the provider. A product keeps its own copy of
what it needs (who is in which organization, with which role) and learns of each change from a
webhook: a signed `POST` to an address the app registers.

## Which apps receive what

An app with a webhook receives the events of the organizations it works with: the ones it was
given a token naming (`organization=<id>`) by someone who may read the members, a guest's token
not counting. It hears of an organization for as long as one such person keeps their consent:
once the last of them takes the app back from their account, or leaves the organization, the
events stop, deliveries still queued included. A platform product can be subscribed to every
organization instead, from the platform file (`webhook_events = "all"`).

| Event | When | `data` |
|---|---|---|
| `organization.created` | an organization is made | `organization`, `owner` |
| `organization.updated` | its name, description or support email changes | `organization` |
| `organization.suspended` | an admin suspends it | `organization` |
| `organization.restored` | an admin lifts the suspension | `organization` |
| `organization.deleted` | it is deleted, by its owner or with its last account | `organization` |
| `member.added` | someone joins: added, invited and signed up, or made an admin of the platform | `member` |
| `member.role_changed` | someone's organization role changes, an ownership transfer included | `member`, `previous_role` |
| `member.removed` | someone leaves, is removed, or deletes their account | `member` |
| `invitation.accepted` | an invited address signs up; a `member.added` follows | `invitation` |

The developer portal's own roles (developer, reviewer, viewer) and app lists are not
organization changes: no event tells of them.

## A request

```http
POST /hooks HTTP/1.1
Content-Type: application/json
Buntubi-Event-Id: 0b6d8f0e-6f1c-4b7a-9a43-2a1f4c8d9e10
Buntubi-Event-Type: member.role_changed
Buntubi-Signature: t=1792133000,v1=5f2c...e81

{"id":"0b6d8f0e-6f1c-4b7a-9a43-2a1f4c8d9e10","type":"member.role_changed",
 "created_at":"2026-10-16T08:03:20+00:00","organization_id":"dd3c82b0-bf09-42c8-a90b-d8910437464b",
 "sequence":4,"data":{"member":{"id":"9e1c...","user_id":"e520...","email":"omar@example.com",
 "role":"admin"},"previous_role":"member"}}
```

- `organization.id`, `name`, `suspended` describe an organization; `member.id` is the membership,
  `member.user_id` the person, the same value as the `sub` of their tokens.
- `sequence` numbers the events of one organization from 1, without gaps.

## Checking a request

Check the signature against the raw body, before parsing it, and refuse a request that fails with
a 400.

With the SDK, in any JavaScript runtime with Web Crypto (Node 20, Deno, Bun, edge functions):

```ts
import { verifyWebhook, WEBHOOK_EVENTS } from '@buntubi/sdk/webhooks';

const event = await verifyWebhook({
  secret: process.env.BUNTUBI_WEBHOOK_SECRET!,
  body: await request.text(),
  signature: request.headers.get('buntubi-signature'),
});
if (event.type === WEBHOOK_EVENTS.MemberRoleChanged) {
  // event.data is { member, previous_role } here.
}
```

`verifyWebhook` throws a `WebhookVerificationError` whose `code` says why: `missing_signature`,
`malformed_signature`, `too_old` (signed more than 5 minutes away from the current time), `bad_signature` or
`malformed_body`.

In another language, the same steps:

1. Split `Buntubi-Signature` on commas: `t` is the signing time in Unix seconds, each `v1` a
   signature. There is more than one `v1` only while a secret is being replaced.
2. Refuse the request if `t` is more than 5 minutes from your clock: an old request replayed.
3. Compute the HMAC-SHA256 of `<t>.<raw body>` with the webhook secret as the key, in lowercase
   hex, and compare it with each `v1` in constant time. One must match.

## Applying events

- **Answer quickly** with a 2xx, then do the work. Ten seconds without an answer counts as a
  failure. A redirect is not followed and counts as a failure too.
- **Once per event.** A delivery can arrive twice (an answer lost on the way back): skip an `id`
  already applied.
- **In order.** Apply an organization's events by `sequence`. When one is missing, or a request
  failed for too long, read the organization again (below) and continue from the event after
  the `sequence` it answers. Do the same on start, and once a day: the copy repairs itself even
  if an event was lost.

## Reading the organizations again

The app reads the organizations it hears of with its own token, no person involved, shaped as
the events carry them:

| | |
|---|---|
| `GET /v1/app/organizations` | each one with its latest event number (`sequence`) |
| `GET /v1/app/organizations/{id}` | one with its members, as of `sequence`; `404` for one the app does not hear of |

The app must be confidential, allowed the `client_credentials` grant and the
`organizations:read` scope. In `platform.toml`:

```toml
[[apps]]
client_id = "my-product"
# ...
grant_types = ["authorization_code", "refresh_token", "client_credentials"]
scope = "openid profile email organizations:read"
```

`appOrganizationsClient` from `@buntubi/sdk/organizations` gets and renews the token itself:

```ts
import { appOrganizationsClient } from '@buntubi/sdk/organizations';

const provider = appOrganizationsClient({ issuer, clientId, clientSecret });
for (const { id, sequence } of await provider.list()) {
  if (sequence > lastApplied(id)) replaceCopy(await provider.get(id));
}
```

A person's token is refused here (`403`): it reads the person's organizations under
`/v1/organizations` instead.

## Delivery and retries

A failed delivery is tried again after 1 minute, 5 minutes, 30 minutes, 2 hours, 6 hours, then
every 12 hours, and given up a day after the event. Every try is logged.

| | Developer API | Command line |
|---|---|---|
| The last 50 deliveries of an app | `GET /developer/api/apps/{client_id}/webhook-deliveries` | |
| Send one again | `POST .../webhook-deliveries/{delivery_id}/redeliver` | `flask webhooks redeliver <id>` |

Delivered and failed deliveries stay 30 days (`IDP_WEBHOOK_RETENTION_DAYS`), removed by the daily
`flask prune`.

## Setting it up

**An app** sets `webhook_url` through the developer API (`POST` or `PATCH` an app). The first
address makes a signing secret, answered that once (`webhook_secret`); keep it with the app's
other secrets. `POST /developer/api/apps/{client_id}/webhook-secret` replaces it, answered once
too; the old one stops signing at once. `"webhook_url": null` removes the webhook and its secret.

**A platform product** sets it in `platform.toml`; `flask platform setup` writes the secret into
the env file it names, as for client secrets, and `--rotate-secrets` replaces it:

```toml
[[apps]]
client_id = "my-product"
# ...
webhook_url = "https://my-product.example/hooks/buntubi"
webhook_events = "all"
webhook_secret = { file = "../my-product/.env", key = "BUNTUBI_WEBHOOK_SECRET" }
```

**The address.** The provider makes these requests itself, so a provider on the internet takes
only `https` addresses to public hosts: not `localhost`, not an internal name (`.local`,
`.internal`, `.lan`), not a private or link-local IP, no credentials in the address. The host is
resolved again at each delivery, and an address that has turned private, or a name that no
longer resolves, is not sent to (`address_not_allowed`). The request goes to the address checked,
never resolved a second time, with the name kept as the Host and checked against the certificate. A provider on this machine, for development, takes `http` and local
addresses.

## Running the sender

Events are written with the change that causes them; a separate process sends them:

```bash
flask webhooks deliver                 # keeps going; --interval sets the pause when idle
flask webhooks deliver --once          # one pass, for cron or a test
```

Several can run at once: each takes deliveries the others are not holding. With Docker it is the
`webhooks` service of the compose files, from the provider image ([running](running.md)).
