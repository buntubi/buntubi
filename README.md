# Identity provider

An OAuth 2.1 and OpenID Connect provider with a developer portal and an owner console. One
deployment serves one brand: its own products sign people in through it, and outside developers
register apps that call those products' APIs.

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
| `docs/plugins.md` | Writing and installing plugins |
| `docs/manual-testing.md` | A walk through every screen on a local install |

## How it fits together

**Accounts.** One person, one email. An account can hold two roles from the command line or the
console:

- `admin`: opens the owner console. The console also requires two-step sign-in.
- `superadmin`: an admin who gives and takes the admin role in the console. A superadmin is
  created only from the command line, before the platform is deployed, and the console cannot
  disable or demote one.

An account that accepts the developer terms gets into the portal. Admins get in without them.

**Organizations** own apps, API keys and test users. Their members have one role each:

| Role | Can |
|---|---|
| owner | everything, including deleting the organization and making other owners |
| manager | members, settings, live keys, taking apps live |
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
| Disable an app | an admin | Console, Applications, the app's page | |
| Create an organization, invite members | any developer | Portal | |
| Review an app, suspend an organization, disable an account | an admin | Console | |
| Products and scopes | an admin, or a plugin | Console | `flask plugins sync` |

## Requirements

- Python 3.11 or later
- PostgreSQL (developed on 17)
- Node 22 and pnpm

## First install on your machine

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
   names and is never printed. An app that exists keeps its changes; `--rotate-secrets` gives
   every listed app a new secret.

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
