# The developer portal

Where developers build on the platform: their organizations and members, their apps (OAuth
clients), the credentials and permissions of each, and the way from sandbox to live. A Fluixi
Start app, server-rendered, at http://localhost:3410 in development.

## Who gets in

Any account that accepts the developer terms on the first visit; admins get in without them.
Inside, what a person may do in an organization follows their role there (owner, manager,
developer, reviewer, viewer), checked by the provider on every call. The repository README
lists what each role can do.

## Pages

| Address | Page |
|---|---|
| `/` | The way in: sign in, the developer terms, then the organization last worked in, or the picker |
| `/organizations`, `/organizations/new` | The organizations a developer belongs to; creating one |
| `/o/<org>` | Developer home: the organization's apps, what waits on its members |
| `/o/<org>/team` | Members and invitations; sandbox test users |
| `/o/<org>/products` | The API products apps can build on |
| `/o/<org>/settings` | The organization's details; its deletion, for an owner |
| `/o/<org>/apps/new` | Creating an app, a focused flow that lands on its credentials |
| `/o/<org>/apps/<app>` | The app's overview and its way to live |
| `/o/<org>/apps/<app>/settings`, `redirects`, `permissions`, `credentials` | Its details; redirect addresses; the scopes it asks for, by product; client secrets, API keys and signing keys |
| `/o/<org>/apps/<app>/review`, `review/submit` | Its review: status, history, and submitting |
| `/o/<org>/p/...`, `/o/<org>/apps/<app>/p/...` | Pages plugins add ([docs/plugins.md](../../docs/plugins.md)) |

Secrets and keys are shown in full once, in the answer that creates them.

## How it works

Like the console: sign-in through the provider with `@fluixi/oauth2`, tokens kept on the server
in a sealed cookie, and server functions calling the developer API (`/developer/api`) as the
signed-in developer.

```
src/
  server/developer.ts   server functions: one per developer API call
  services/             named actions, auth, plugins
  data/developer.ts     cached reads shared by routes
  routes/               pages, arranging @idp/elements
  lib/                  words, addresses, parameters
```

Pages are layout only; each piece of a page is an `idp-*` element from `packages/elements`.

## Settings

`.env`, from `.env.example`:

| Variable | Meaning |
|---|---|
| `IDP_URL` | The provider |
| `APP_URL` | This portal's own address, as registered for its client |
| `PORTAL_CLIENT_ID`, `PORTAL_CLIENT_SECRET` | Its OAuth client, written by `flask platform setup` |
| `SESSION_SECRET` | Seals the session cookie |
| `IDP_UI_PLUGINS` | UI plugins whose pages it shows, comma-separated |

Register `<APP_URL>/auth/backchannel-logout` as the client's `backchannel_logout_uri` so a
sign-out at the provider ends the portal's session too.

## Working on it

```bash
pnpm install
pnpm dev          # http://localhost:3410; builds @buntubi/sdk first
pnpm typecheck
```
