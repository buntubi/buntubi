# The provider

The OAuth 2.1 and OpenID Connect server, in Flask. It owns every account, every session and
every token on the platform, and every rule about who may do what. The console, the portal and
the sign-in pages hold no rules of their own: they call this server and show what it answers.

Setup, deployment and the platform's concepts (accounts, organizations, apps, the catalogue) are
in the [repository README](../README.md). Plugins are in [docs/plugins.md](../docs/plugins.md).

## What it serves

| Prefix | Who calls it | What |
|---|---|---|
| `/.well-known/openid-configuration`, `/.well-known/jwks.json` | Any client | Discovery and the signing keys |
| `/.well-known/brand.json` | The console and the portal | The platform's name, colour and links |
| `/oauth/*` | OAuth clients | `authorize`, `token`, `revoke`, `introspect`, `device_authorization`, `userinfo`, `logout`, `check-session` |
| `/signin`, `/signup`, `/mfa`, `/consent`, `/accounts`, `/account/*`, ... | People, in a browser | The pages built from `frontend/`, rendered into `templates/shell.html` |
| `/api/*` | Those pages | Sign-in steps, the account area, passkeys. Same-site, with a CSRF token |
| `/developer/api/*` | The portal | Organizations, members, apps, secrets, test users, API keys. Bearer token with the `developer` scope |
| `/admin/api/*` | The console | Users, organizations, reviews, the catalogue, the platform's apps. Bearer token with the `admin` scope and a two-step sign-in |
| `/api/plugins/<id>/*` | Plugin pages in the console and portal | Each plugin's own API |
| `/openapi.json` | Developers, Postman | The OAuth endpoints, the developer API and the admin API |

Grants: authorization code with PKCE, refresh token (rotated, with reuse detection), client
credentials, and the device code. Tokens are JWTs signed with the newest key in
`IDP_SIGNING_KEYS_DIR`; every key in the directory still verifies.

Sessions end everywhere they reached: a sign-out, a device signed out from the account area,
or a deleted account sends an OpenID back-channel logout token to every app with a
`backchannel_logout_uri` that took part in that session.

## Layout

```
src/idp/
  app.py          create_app: settings, extensions, blueprints, plugins
  config.py       every setting, read from IDP_* variables and .env
  cli.py          the flask commands
  models/         SQLAlchemy models
  db/             the session and utcnow
  oauth/          Authlib server, grants, claims, JWT helpers
  security/       passwords, TOTP, CSRF, signing keys, encryption at rest
  services/       the rules: accounts, sessions, MFA, passkeys, platform, profile, ...
  web/            the blueprints: pages, api, developer, admin, oidc, openapi
  plugins/        the plugin interface and the catalogue sync
  templates/      the page shell
  static/idp/     the built sign-in pages (from frontend/, not edited here)
migrations/       Alembic revisions
tests/            pytest, against a real PostgreSQL database
platform.example.toml   the platform's apps, copied to platform.toml per deployment
```

The rule of thumb when changing something: a view in `web/` parses the request and shapes the
answer; the decision lives in `services/`. A rule that two endpoints share is one function in a
service, never two copies in two views.

## Commands

Run from `idp/` as `../.venv/bin/flask --app idp.app:create_app <command>`.

| Command | Does |
|---|---|
| `keys generate` | Adds a signing key; the newest signs from then on |
| `admin create`, `admin check` | Creates the superadmin; checks one exists |
| `users admins`, `users promote`, `users demote` | Lists admins; gives or takes the admin role |
| `users delete <pattern> --yes` | Deletes accounts by email (a `*` pattern works), as deleting from the account page does: apps are signed out, plugins told, the audit trail kept without who it was |
| `prune` | Deletes expired codes and tokens, sign-ins ended more than `IDP_SESSION_RETENTION_DAYS` ago and audit rows older than `IDP_AUDIT_RETENTION_DAYS`; schedule it daily |
| `platform setup [--file] [--rotate-secrets]` | The platform organization, the apps `platform.toml` lists, and the plugins' catalogue |
| `clients create`, `clients homepage <client_id> [url]` | A client by hand; set or clear the address it lives at |
| `plugins list`, `plugins sync` | The plugins running; bring the catalogue in line with them |

Migrations: `../.venv/bin/alembic upgrade head`, with `IDP_DATABASE_URL` set. A new revision
goes in `migrations/versions/` and names its `down_revision`; there is one head.

## Settings

All of them are in `src/idp/config.py`, each with a comment, and read from the environment with
the `IDP_` prefix or from `idp/.env` (see `.env.example`). The ones every deployment sets:

| Setting | Meaning |
|---|---|
| `IDP_ISSUER` | The public origin, exactly as clients see it, no trailing slash |
| `IDP_DATABASE_URL` | PostgreSQL |
| `IDP_SECRET_KEY` | Signs the session cookie and CSRF tokens; 32 characters or more |
| `IDP_SIGNING_KEYS_DIR` | The token signing keys |
| `IDP_EMAIL_TEST_MODE`, `IDP_RESEND_API_KEY`, `IDP_EMAIL_FROM` | Email: logged in test mode (development only), sent through Resend otherwise |
| `IDP_TRUSTED_PROXIES` | How many proxies in front set `X-Forwarded-For` and `X-Forwarded-Proto`; 0 when none |
| `IDP_RATE_LIMIT_STORAGE` | Where rate limits are counted: `redis://...` shared by every process, or `memory://` for one |
| `IDP_BRAND_*` | The platform's name, colour, logo and links |
| `IDP_CORS_ORIGINS` | Browser origins allowed on the token, revocation and userinfo endpoints |
| `IDP_PLUGINS`, `IDP_PLUGINS_SYNC_ON_START` | The plugins, as a JSON list (`["acme"]`); whether to sync the catalogue at start |

With an issuer that is not on this machine, the provider refuses to start when the issuer is
not https, email test mode is on, cookies are not Secure, or `IDP_RATE_LIMIT_STORAGE` is not
set. It then also sends `Strict-Transport-Security`.

Lifetimes (`IDP_ACCESS_TOKEN_TTL`, `IDP_REFRESH_TOKEN_TTL`, `IDP_SESSION_TTL`, ...) are in
seconds. What `prune` keeps is in days: `IDP_SESSION_RETENTION_DAYS` (30) for ended sign-ins,
`IDP_AUDIT_RETENTION_DAYS` (365) for the audit trail.

## Checks

```bash
../.venv/bin/python -m pytest      # needs the idp_test database on localhost
../.venv/bin/ruff check src tests
../.venv/bin/mypy src
```

Every change to a rule comes with a test in `tests/` that fails without it.
