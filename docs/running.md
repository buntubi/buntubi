# Running Buntubi

Three programs and a database:

| Program | Address on one machine | Source | Image |
|---|---|---|---|
| The provider: sign-in, tokens, APIs | http://localhost:5010 | `idp/`, sign-in pages from `frontend/` | `ghcr.io/buntubi/idp-provider` |
| The owner console | http://localhost:3420 | `apps/console/` | `ghcr.io/buntubi/idp-console` |
| The developer portal | http://localhost:3410 | `apps/portal/` | `ghcr.io/buntubi/idp-portal` |
| PostgreSQL 17 | localhost:5432 | | `postgres:17-alpine` |

They run either from a checkout in a terminal (part A) or from the images with Docker (part B).
Both use the same settings and the same `flask` commands; only how they are started differs.
Putting a deployment on a server (TLS, backups, key rotation) is in [operations](operations.md).

## At a glance

| Task | In a terminal | With Docker (from `docker/example/`) |
|---|---|---|
| First install | `pnpm run setup` | the first-run commands in `compose.yaml` |
| Start | `pnpm dev` | `docker compose up -d` |
| Stop | Ctrl+C | `docker compose down` (the data stays) |
| A provider command | `pnpm idp <command>` | `docker compose exec provider flask <command>` |
| Send webhooks | `pnpm idp webhooks deliver`, in its own terminal | the `webhooks` service, started with the rest |
| The provider's log | its terminal | `docker compose logs -f provider` |
| Settings | `idp/.env`, `apps/console/.env`, `apps/portal/.env` | `provider.env`, `console.env`, `portal.env` |
| After changing settings | stop and start the program | B.4 |
| Upgrade | `git pull`, then `pnpm run setup` | new `BUNTUBI_VERSION`, then the steps in B.5 |

## A. In a terminal, without Docker

### A.1 Requirements

- Python 3.11 or later
- Node 22 and pnpm
- PostgreSQL 17, listening on localhost:5432. On a Mac: `brew install postgresql@17` then
  `brew services start postgresql@17`. Or only the database in Docker:

  ```bash
  docker run -d --name buntubi-postgres -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust \
    -v buntubi-postgres:/var/lib/postgresql/data postgres:17-alpine
  ```

  `idp/.env.example` expects `postgresql+psycopg://postgres@localhost:5432/idp`; change
  `IDP_DATABASE_URL` in `idp/.env` for another server or password.

### A.2 First install

```bash
pnpm run setup
```

That is `./scripts/install.sh` (`pnpm setup` without `run` is pnpm's own command). It creates
the Python environment and the env files, creates the database and runs the
migrations, makes the first signing key, builds the sign-in pages, asks for the superadmin and
creates the platform's apps from `idp/platform.toml`. It can be run again at any time and skips
what is done. The README lists each step. `./scripts/reset-local.sh` empties the database
first.

### A.3 Start for development

```bash
pnpm dev
```

One terminal, each line prefixed by its program: the provider on the port of `IDP_ISSUER`
(http://localhost:5010), the sign-in pages rebuilt into the provider on every change (reload the
page; the provider needs no restart), the portal (http://localhost:3410) and the console
(http://localhost:3420). Ctrl+C stops them all. `pnpm dev --no-web` starts the provider only.

The provider reads `.env` from `idp/`; `pnpm dev` and `pnpm idp` start it there.

### A.4 Start as a server, without Docker

The same programs in production mode, as the images run them:

```bash
# Provider, with gunicorn (WEB_CONCURRENCY sets the workers)
cd idp && ../.venv/bin/gunicorn --bind 0.0.0.0:5010 --access-logfile - "buntubi.app:create_app()"

# Portal and console: build once, then start (each reads its own .env)
cd apps/portal && pnpm build && pnpm start      # port 3410, set in fluixi.config.ts
cd apps/console && pnpm build && pnpm start     # port 3420
```

Build the sign-in pages before starting the provider: `cd frontend && pnpm build`. Keep the
programs running with the machine's service manager (systemd, launchd). The settings a public
deployment needs are in [operations](operations.md).

### A.5 Every day

```bash
pnpm idp users admins       # the admins, and whether they use two-step sign-in
pnpm idp users delete 'someone@example.com' --yes
pnpm idp platform setup     # again after changing platform.toml
pnpm idp plugins sync       # after changing the Python plugins
pnpm idp prune              # once a day: expired codes, tokens and old audit rows
pnpm migrate                # after pulling new migrations
```

With `IDP_EMAIL_TEST_MODE=true` in `idp/.env`, no email is sent: each one, sign-up codes and
invitations included, is printed in the provider's terminal.

## B. With Docker

### B.1 The images

- **Published**: `ghcr.io/buntubi/idp-provider`, `idp-console` and `idp-portal`, one tag per
  version, for `linux/amd64` and `linux/arm64`.
- **Built from this checkout**: `pnpm images:dev` builds all three as `:dev`, against the
  fluixi-core checkout beside this repository (`FLUIXI_CORE` to point elsewhere; build
  fluixi-core first). `pnpm images:dev provider` builds one.
- **By hand**: the `docker build` commands in the README.

The provider image runs gunicorn on port 8000 unless told otherwise; the console and the portal
listen on 3420 and 3410. No image holds settings, keys or `platform.toml`.

### B.2 First run

`docker/example/` is a complete deployment for one machine: PostgreSQL, the provider on
localhost:5010, the console and the portal. Copy the folder anywhere, then from it:

```bash
cp .env.example .env                    # set POSTGRES_PASSWORD
cp provider.env.example provider.env    # set IDP_SECRET_KEY
cp console.env.example console.env      # set SESSION_SECRET
cp portal.env.example portal.env        # set SESSION_SECRET
cp platform.example.toml platform.toml
mkdir -p keys ui-plugins

docker compose up -d postgres
docker compose run --rm provider alembic upgrade head
docker compose run --rm provider flask keys generate
docker compose run --rm -it provider flask admin create
docker compose run --rm -v .:/deployment provider flask platform setup --file /deployment/platform.toml
docker compose up -d
```

A value for each secret: `python3 -c "import secrets; print(secrets.token_urlsafe(40))"`.
`platform setup` writes the console's and the portal's client secrets into `console.env` and
`portal.env`. On Linux the folder must be writable by the image's user (uid 10001) for that,
and `keys/` too.

Then sign in at http://localhost:5010/account with the superadmin, turn on two-step sign-in, and
open the console.

### B.3 Every day

From the deployment's folder:

```bash
docker compose ps                         # what runs, and the provider's health
docker compose logs -f provider           # its log; Ctrl+C stops following
docker compose exec provider flask users admins
docker compose exec provider flask users delete 'someone@example.com' --yes
docker compose run --rm provider flask prune
docker compose down                       # stops everything; the database volume stays
docker compose up -d                      # starts it again
```

With `IDP_EMAIL_TEST_MODE=true` in `provider.env`, emails go to the provider's log:

```bash
docker compose logs --since 10m provider | grep -A6 "email, test mode"
```

### B.4 Changing settings

`docker compose restart` keeps the settings a container started with. After editing an env file,
recreate the service so it reads the file again:

```bash
docker compose up -d console              # after editing console.env
docker compose up -d --force-recreate provider console portal   # after editing provider.env
```

The console and the portal live in the provider container's network: a new provider container
leaves them attached to the old one, and http://localhost:3420 and :3410 stop answering until
they are recreated with it.

### B.5 Upgrading

```bash
# .env: BUNTUBI_VERSION=<new version>
docker compose pull
docker compose run --rm provider alembic upgrade head
docker compose up -d
```

Back up the database first on anything that matters ([operations](operations.md)).

### B.6 Running what is being developed

To try the working tree without a release: `pnpm images:dev` in this repository, then in the
deployment's folder add `compose.dev.yaml` to every command:

```bash
docker compose -f compose.yaml -f compose.dev.yaml run --rm provider alembic upgrade head
docker compose -f compose.yaml -f compose.dev.yaml up -d
```

## UI plugins

In development (A.3), `IDP_UI_PLUGINS` in each app's `.env` and in `frontend/.env` names them.
Built for a deployment, each plugin is a folder in a `ui-plugins` directory: with Docker,
`ui-plugins/` beside the compose file, mounted into the three containers (recreate them after
adding one); without Docker (A.4), `ui-plugins/` in `apps/console/` and `apps/portal/` (or
`IDP_UI_PLUGINS_DIR`), and `IDP_UI_PLUGINS_DIR` for the provider. [Plugins](plugins.md) covers
both.
