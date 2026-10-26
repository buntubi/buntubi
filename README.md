# Buntubi

Buntubi is an identity platform: an OAuth 2.1 and OpenID Connect provider, a developer portal and
an owner console, deployed together. One deployment serves one brand. Its own products sign
people in through it, outside developers register apps that call those products' APIs, and
organizations, their members and roles live in it, shared by every product.

It is white-label: the name, colours, logo and links people see come from the deployment's
settings, never from the code.

## What it does

### For the people who sign in

- One account per email address, created with a verified address.
- Sign-in with a password, a passkey, or a password and a second step. The second step is a code
  from an authenticator app (with one-time backup codes) or a passkey. Once an account has one,
  a password alone no longer signs in.
- Sign-in with Google or GitHub when the deployment offers them, each app choosing among them.
  A provider is linked to an existing account only from the account area, never because an
  address matches, and it does not stand for the second step.
- After sign-up, a passkey and two-step sign-in are offered once; both can be added later.
- Several accounts in one browser, with a picker.
- Consent per app: a person sees what an app asks for and allows it once; an app that asks for
  more, or for another organization, asks again.
- An account area: personal information and photo, email change, security (password, passkeys,
  two-step, backup codes, recent activity), devices with their sessions, connected apps with a
  way to remove each, a download of their data in JSON, and account deletion.

### For apps

- Sign-in with the authorization code flow and OpenID Connect, PKCE with S256.
- Access tokens as signed JWTs that an API checks against the published keys, or by
  introspection. ID tokens, the userinfo endpoint and discovery.
- Refresh tokens, rotated at each use, with reuse detection: a copied token ends its whole
  family. `offline_access` keeps an app signed in after the browser session ends.
- Sign-out everywhere a session reached: the sign-out endpoint, a session check for open pages,
  and back-channel logout to every app that took part.
- Server-to-server access (client credentials), devices without a keyboard (device flow), and
  API keys for developers' scripts.
- Tokens bound to an organization (`org_id`, `org_role`), when an app asks for one.
- Signed webhooks telling products of every change to their organizations and members, retried
  for a day, with a verifier in the SDK ([docs/webhooks.md](docs/webhooks.md)).

### Organizations

- Organizations with five roles shared by every product: owner, admin, billing, member, guest.
  Each product keeps its own finer roles on top.
- Invitations by email, ownership transfer, and suspension by the platform's admins.
- The organizations API (`/v1/organizations`), which products call as the signed-in person to
  build their own team screens on the same rules.

### For developers: the portal

- Apps start in a sandbox, open to the organization's members and test users, and go live; an
  app asking for sensitive scopes goes live after a review.
- A catalogue of API products and their scopes, client secrets with rotation, API keys, test
  users, redirect addresses, and the brand shown on the consent screen.
- The OpenAPI description at `/openapi.json`.

### For the owner of the deployment: the console

- Accounts (search, disable, reset two-step, sign out everywhere, admin role), organizations
  (suspend, restore), app reviews, the catalogue, the platform's own apps and the audit log.
- Open to admins with two-step sign-in only.

### Brand and extension

- The deployment's name, colours, logo, links and the look of the sign-in pages.
- Plugins: Python plugins add products, scopes, token claims and hooks to the provider; UI
  plugins add pages to the console and the portal and a look to the sign-in pages, mounted at
  run time without rebuilding the images ([docs/plugins.md](docs/plugins.md)).

### Security

- Passwords hashed with scrypt, codes and refresh tokens stored as hashes, client secrets shown
  once.
- Rate limits on every credential check, a pause after repeated wrong passwords, CSRF checks on
  every change, a strict content security policy on the provider's pages, and security headers
  on the console and the portal.
- An audit log of every account, app and admin action, and data retention with a daily prune.

## Standards

| Specification | Supported |
|---|---|
| OAuth 2.0 (RFC 6749) and Bearer tokens (RFC 6750) | Authorization code, refresh token and client credentials grants; the token in a header, or for userinfo also in a form body |
| OAuth 2.1 and the OAuth security practice (RFC 9700) | No implicit or password grant; exact redirect addresses; PKCE required for public clients, optional for confidential ones; refresh token rotation |
| PKCE (RFC 7636) | S256 only |
| Token revocation (RFC 7009) and introspection (RFC 7662) | Both; introspection for confidential clients |
| Device authorization (RFC 8628) | Yes |
| JWT access tokens (RFC 9068) | Yes, signed RS256, `typ` `at+jwt` |
| Authorization server issuer identification (RFC 9207) | `iss` in every authorization answer |
| OpenID Connect Core 1.0 | Code flow; `prompt` none, login, consent and select_account; `max_age`, `id_token_hint`, `nonce`; standard claims for the profile, email, phone and address scopes, the optional profile claims as the deployment chooses. `login_hint` fills the email on the sign-in and sign-up pages; `ui_locales`, `claims_locales` and `display` are accepted and ignored |
| Initiating User Registration via OpenID Connect 1.0 | `prompt=create` opens sign-up, then returns to the app |
| OpenID Connect Discovery 1.0 | `/.well-known/openid-configuration` and the key set |
| OpenID Connect RP-Initiated Logout 1.0 | Yes |
| OpenID Connect Session Management 1.0 | Yes |
| OpenID Connect Back-Channel Logout 1.0 | Yes, with the session id |

Not supported: the implicit and hybrid flows, `form_post`, dynamic client registration,
front-channel logout, pairwise subject identifiers, request objects (`request` and
`request_uri` are refused as unsupported), the `claims` parameter, `acr_values`, and client
authentication by signed JWT.

**Conformance.** The OpenID Foundation conformance suite was run locally against the Basic OP,
Config OP, RP-Initiated Logout, Session Management and Back-Channel Logout profiles, with no
failure. Warnings remain on optional points: the ID token carries `email`, which the specification
prefers to leave to userinfo, and userinfo has no value for profile claims a deployment leaves hidden (birthdate, nickname,
website and the like, set per field in `platform.toml`). This is a local run, not a certification.

## Connecting an app

1. **Register the app** in the portal, in an organization: its redirect addresses and the scopes
   it needs. A public app (in the browser, on a phone) has no secret; a server app gets one.
2. **Read the discovery document** at `<issuer>/.well-known/openid-configuration`: it gives every
   endpoint and the key set. Any OpenID Connect library configures itself from it.
3. **Sign people in** with the authorization code flow: send them to the authorization endpoint
   with `response_type=code`, the app's `client_id`, a registered `redirect_uri`, the scopes
   (`openid` first), a `state` and a `nonce`, and PKCE (`code_challenge` with S256, required for a
   public app). Exchange the code at the token endpoint.
4. **Use the tokens.** The ID token says who signed in (`sub`, the person's stable id, and the
   claims the scopes allow). The access token goes to APIs, which check its signature against the
   key set, its `aud` and expiry, or ask the introspection endpoint when they need the live
   state. Access tokens last 5 minutes; with `offline_access`, a refresh token renews them.
5. **Sign out** through the end session endpoint with the ID token as `id_token_hint`, and
   register a `backchannel_logout_uri` to hear when a session ends elsewhere.
6. **Work in an organization**, when the app needs one: set its organization setting in the
   portal and pass `organization=<id>`, or let people pick. The tokens then carry `org_id` and
   `org_role`, and the organizations API gives the members.

Every endpoint, request and answer is in `/openapi.json`, which Postman imports.

## Repository

Each part has its own README with its layout, settings and commands.

| Path | What it is |
|---|---|
| `idp/` | The provider (Flask): OAuth and OIDC endpoints, accounts, the developer and admin APIs, the command line |
| `frontend/` | The sign-in, consent and account pages, built into `idp/src/buntubi/static/idp/` |
| `apps/portal/` | The developer portal, port 3410 |
| `apps/console/` | The owner console, port 3420 |
| `packages/elements/` | The custom elements the portal and console are built from |
| `packages/sdk/` | Types, services and the Vite plugin shared by the apps and by UI plugins |
| `packages/shell/`, `packages/skin/`, `packages/theme/` | Layout, skin and colours of the apps |
| `docs/running.md` | Starting everything from a terminal or with Docker, and every day after |
| `docs/operations.md` | A deployment on a server: first deploy, upgrades, keys, backups |
| `docs/webhooks.md` | Organization events for the products: what they carry, checking them, setting them up |
| `docs/plugins.md` | Writing and installing plugins |
| `docs/manual-testing.md` | A walk through every screen on a local install |
| `docker/example/` | A complete deployment for one machine with Docker |

## Concepts

**Accounts.** One person, one email. An account can hold two roles from the command line or the
console:

- `admin`: opens the owner console. The console also requires a second factor at sign-in: an
  authenticator app or a passkey.
- `superadmin`: an admin who gives and takes the admin role in the console. A superadmin is
  created only from the command line, before the platform is deployed, and the console cannot
  disable or demote one.

An account that accepts the developer terms gets into the portal. Admins get in without them.

**Organizations** own apps, API keys and test users. Their members have one role each, shared
by every product, and a member or billing person may also hold a portal role:

| Role | Can in the portal |
|---|---|
| owner | everything, including deleting the organization and making other owners |
| admin | members, settings, billing, live keys, taking apps live |
| billing | billing, read |
| member | read |
| guest | nothing: a product decides what a guest sees |

| Portal role | Adds |
|---|---|
| developer | edit apps, test users, sandbox keys: on the apps their membership lists, or all of them when it lists none |
| reviewer, viewer | read |

**The platform organization** holds the deployment's own apps: the console, the portal and the
products it runs. There is one. Every admin is an owner of it, nobody else can join, and it
cannot be suspended or deleted.

**Apps** are OAuth clients. Each belongs to one organization and runs in one environment:

- sandbox: only the organization's members and test users can sign in;
- live: anyone can. An app that asks for sensitive scopes goes live after a review in the console.

**First-party** apps skip the consent screen and appear on people's account pages. Only an app
of the platform organization can be first-party, and only an admin sets it, in the console.

**The catalogue** lists the API products apps can add and the scopes inside them. A scope is
public, sensitive (needs a review) or restricted (only an admin gives it). Plugins declare their
products and scopes as code; entries added in the console are edited there.

### Who does what, and where

| Task | Who | Screen | Command line |
|---|---|---|---|
| Create the superadmin | whoever runs the server | | `flask admin create` |
| Give or remove the admin role | a superadmin | Console, Users | `flask users promote` / `demote` |
| Create the platform's apps | an admin | Portal, Platform organization, or Console, Applications, "New platform app" | `flask platform setup` |
| Edit an app (redirects, permissions, brand, secrets) | the organization's members | Portal | |
| Make an app first-party | an admin | Console, Applications, the app's page | `first_party` in `platform.toml` |
| Make an app's tokens name an organization | the organization's members | Developer API, `organization_usage` | `organization_usage` in `platform.toml` |
| Disable an app | an admin | Console, Applications, the app's page | |
| Create an organization, invite members | any developer | Portal | |
| Review an app, suspend an organization, disable an account | an admin | Console | |
| Products and scopes | an admin, or a plugin | Console | `flask plugins sync` |

## Requirements

- Python 3.11 or later
- PostgreSQL (developed on 17)
- Node 22 and pnpm

## First install on your machine

[docs/running.md](docs/running.md) has both ways side by side: from this checkout in a
terminal, or from the images with Docker, with a ready deployment in `docker/example/`.

```bash
./scripts/install.sh
```

The script runs every step below, skips the ones already done, and can be run again at any
time. With `--no-web` it sets up the provider only.

1. Creates `.venv` and installs the provider with its development tools.
2. Creates `idp/.env` from the example and generates `IDP_SECRET_KEY`.
3. Creates the database named by `IDP_DATABASE_URL` and runs the migrations.
4. Makes the first token signing key.
5. Installs the web packages, builds the sign-in pages, and creates the portal's and console's
   `.env` files with a session secret.
6. Creates `idp/platform.toml` from the example. It lists the platform's apps: client id, name,
   redirect URIs, scopes, whether it is first-party, and the env file and key where its secret
   goes. Add the deployment's own products there and run the script again. The file is not
   committed.
7. Asks for the superadmin's email, name and password, when there is none yet.
8. Runs `flask platform setup`: the platform organization, the apps the file lists and the
   plugins' catalogue. A new confidential app's secret is written into the env file its entry
   names and is never printed. On an app that exists, what the file states wins (scope,
   redirect and logout addresses, grant types, home page, sign-in look) and the rest stays as a
   screen left it.
   `--rotate <client_id>` gives one app a new secret, `--rotate-secrets` every listed app.

`./scripts/reset-local.sh` empties the database first, then runs the install script. It refuses
to run when the issuer in `idp/.env` is not a localhost address.

The same steps by hand, from `idp/`:

```bash
alias idp='../.venv/bin/flask --app buntubi.app:create_app'
../.venv/bin/alembic upgrade head      # with IDP_DATABASE_URL set
idp keys generate
idp admin create
idp platform setup
```

**Start the servers**, one terminal each:

```bash
cd idp && ../.venv/bin/flask --app buntubi.app:create_app run --port 5010
cd apps/portal && pnpm dev
cd apps/console && pnpm dev
```

**Two-step sign-in.** Sign in as the superadmin at http://localhost:5010/account and turn on
two-step sign-in. The console at http://localhost:3420 opens after that.

## Deploying

With the Docker images: [docs/operations.md](docs/operations.md) (first deploy, upgrades, the
daily prune, signing keys, backups). Without them:

`./scripts/install.sh --no-web` runs these on a server, with the deployment's
`idp/platform.toml` in place. By hand, in this order, before the platform takes traffic:

1. `alembic upgrade head`
2. `flask keys generate`, once
3. `flask admin create`, once: the superadmin
4. `flask platform setup --file <the deployment's platform.toml>`

On every later deploy, run the migrations and `flask plugins sync`. Where several workers start
at once, set `IDP_PLUGINS_SYNC_ON_START=false` so that only the deploy step writes the
catalogue.

Set `IDP_EMAIL_TEST_MODE=false` with `IDP_RESEND_API_KEY` and `IDP_EMAIL_FROM` to send email,
and the `IDP_BRAND_*` settings for the deployment's name, colour and links. Every setting is in
`idp/src/buntubi/config.py`.

## Plugins

A deployment adds its own products, scopes, token claims, console and portal pages, and sign-in
look through plugins:

- Python plugins are packages with an entry point in the `buntubi.plugins` group, installed in the
  provider's environment and named in `IDP_PLUGINS`.
- UI plugins are named in `IDP_UI_PLUGINS` in `apps/console/.env`, `apps/portal/.env` and
  `frontend/.env`. Restart the apps, and rebuild `frontend`, after changing it.

[docs/plugins.md](docs/plugins.md) covers both halves: every hook and when it runs, the
catalogue and its sync, events, a plugin's own API, console and portal pages, and sign-in looks.

## Docker images

Built from the repository root:

```bash
docker build -f docker/provider.Dockerfile -t idp-provider .
docker build -f docker/app.Dockerfile --build-arg APP=console -t idp-console .
docker build -f docker/app.Dockerfile --build-arg APP=portal -t idp-portal .
```

- **provider**: gunicorn on port 8000, as a non-root user. Settings come from `IDP_*`
  variables only. Mount the signing keys at `/keys`. `WEB_CONCURRENCY` sets the worker count.
  `--build-arg PLUGINS="acme-idp==1.2.0"` installs a deployment's plugins. `GET /healthz`
  answers `ok` or `unavailable`, nothing more.
- **console** and **portal**: `fluixi start` on 3420 and 3410, with production dependencies
  only. Settings come from the environment.

Run the migrations and create the first key with the provider image:

```bash
docker run --rm --env-file idp.env -v ./keys:/keys idp-provider alembic upgrade head
docker run --rm --env-file idp.env -v ./keys:/keys idp-provider flask keys generate
```

No image contains a `.env` file, `platform.toml` or signing keys (`.dockerignore`).

## Checks

```bash
cd idp
../.venv/bin/python -m pytest
../.venv/bin/ruff check src tests
../.venv/bin/mypy src
```

Each web package has `pnpm typecheck`.
