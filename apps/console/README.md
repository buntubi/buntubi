# The owner console

Where the platform's owners run it: accounts, developer organizations, app reviews, the API
catalogue and the platform's own apps. A Fluixi Start app, server-rendered, at
http://localhost:3420 in development.

## Who gets in

Accounts with the `admin` role, signed in with two-step (a code or a passkey). The provider
checks both on every call; the console shows a page asking for two-step when it is missing.
Superadmins see the admin role actions too. The first superadmin comes from the command line
(`flask admin create`), never from here.

## Pages

| Address | Page |
|---|---|
| `/` | The overview: the counts, and what waits for an answer |
| `/users`, `/users/new`, `/users/<id>` | Every account; inviting or creating one; one account's profile, address, organizations and the actions on it (password reset, sign out everywhere, reset two-step, disable, admin role) |
| `/organizations` | Developer organizations: owners, approved scopes, suspension |
| `/apps`, `/apps/<client_id>` | Every app: whose it is, sandbox or live, first-party; the console's decisions about one app. Everything else about an app is edited in the portal |
| `/reviews`, `/reviews/<client_id>` | Apps waiting for a review, longest first; one review and its answer |
| `/products`, `/scopes` | The API catalogue: products and scopes, their sensitivity and consent words |
| `/p/<plugin>/<key>` | A page a plugin adds ([docs/plugins.md](../../docs/plugins.md)) |

## How it works

The browser never holds a token. Sign-in goes through the provider with `@fluixi/oauth2`: the
tokens stay on the console's server, sealed in a cookie, and server functions call the
provider's admin API (`/admin/api`) as the signed-in person.

```
src/
  server/admin.ts     server functions: one per admin API call
  services/           named actions over them (with what each invalidates), auth, plugins
  data/admin.ts       cached reads shared by routes
  routes/             pages; each one arranges @idp/elements and passes data and actions in
  lib/                words (i18n.ts, labels.ts), addresses (paths.ts), parameters
  app.config*.ts      the app, its modules and the auth middleware
```

A page is layout only: what it shows and does is an `idp-*` element from
`packages/elements`, given its words, data and action. Addresses come from `lib/paths.ts`.
French and English words live together in `lib/i18n.ts`.

When the provider does not answer, the console shows a provider-down page rather than asking
the person to sign in again.

## Settings

`.env`, from `.env.example`:

| Variable | Meaning |
|---|---|
| `IDP_URL` | The provider |
| `APP_URL` | This console's own address, as registered for its client |
| `PORTAL_URL` | The portal, for links to an app's pages there |
| `CONSOLE_CLIENT_ID`, `CONSOLE_CLIENT_SECRET` | Its OAuth client, written by `flask platform setup` |
| `SESSION_SECRET` | Seals the session cookie |
| `IDP_UI_PLUGINS` | UI plugins whose pages it shows, comma-separated |

The provider calls `<APP_URL>/auth/backchannel-logout` when a session the console took part in
ends; register it as the client's `backchannel_logout_uri` in `platform.toml`.

## Working on it

```bash
pnpm install
pnpm dev          # http://localhost:3420; builds @buntu/sdk first
pnpm typecheck
```

Restart `pnpm dev` after changing `.env` or `IDP_UI_PLUGINS`.
