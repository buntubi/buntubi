# Operations

Running the provider, the console and the portal from the images that a version tag publishes
(`ghcr.io/<owner>/idp-provider`, `idp-console`, `idp-portal`), each for `linux/amd64` and
`linux/arm64` under one tag. Building them is in the repository README.

## What a deployment provides

- PostgreSQL, reachable from the provider (`IDP_DATABASE_URL`).
- A volume for the signing keys, mounted at `/keys` in the provider, and backed up.
- Redis (or another store Flask-Limiter supports) for `IDP_RATE_LIMIT_STORAGE` when the provider
  runs more than one worker or container. With a single worker, `memory://` set explicitly.
- A reverse proxy terminating TLS in front of all three. Set `IDP_TRUSTED_PROXIES` to the number
  of proxies that append to `X-Forwarded-For`; never more.
- The settings, as environment variables. Every `IDP_*` setting is in `idp/src/buntubi/config.py`.

With an issuer that is not on the machine itself, the provider refuses to start when the issuer
is not https, `IDP_EMAIL_TEST_MODE` is on, `IDP_SECURE_COOKIES` is off or
`IDP_RATE_LIMIT_STORAGE` is not set. The error lists what to change.

## First deploy

With the provider image, before any traffic:

```bash
docker run --rm --env-file idp.env -v keys:/keys ghcr.io/<owner>/idp-provider:<version> alembic upgrade head
docker run --rm --env-file idp.env -v keys:/keys ghcr.io/<owner>/idp-provider:<version> flask keys generate
docker run --rm -it --env-file idp.env -v keys:/keys ghcr.io/<owner>/idp-provider:<version> flask admin create
docker run --rm --env-file idp.env -v keys:/keys -v ./platform:/platform \
  ghcr.io/<owner>/idp-provider:<version> flask platform setup --file /platform/platform.toml
```

`./platform` holds the deployment's `platform.toml`. `platform setup` writes each confidential
app's secret into the env file its `secret` names, relative to `platform.toml`
(`secret = { file = "console.env", key = "CONSOLE_CLIENT_SECRET" }`), and never prints it. The
directory must be writable by the image's user (uid 10001). Give those env files to the console
and portal containers.

Then start the three containers. The provider listens on 8000 and the console and portal on
3420 and 3410. The provider's health check is `GET /healthz`: `ok`, or `unavailable` with
status 503 when the database does not answer.

## Upgrading

In this order:

1. Back up the database (below).
2. `alembic upgrade head` with the new provider image.
3. `flask plugins sync` with the new image, when plugins changed.
4. Replace the containers.

With several provider workers or containers, set `IDP_PLUGINS_SYNC_ON_START=false` and keep
step 3, so the catalogue is written once per deploy.

## Every day

`flask prune` deletes expired codes and tokens, sign-ins that ended more than
`IDP_SESSION_RETENTION_DAYS` ago (30) and audit rows older than `IDP_AUDIT_RETENTION_DAYS` (365).
Run it once a day, from cron or a scheduled container:

```bash
docker run --rm --env-file idp.env -v keys:/keys ghcr.io/<owner>/idp-provider:<version> flask prune
```

## Signing keys

The newest key in `/keys` signs; every key there verifies and is published in the JWKS.

To rotate: `flask keys generate`, restart the provider. After an hour, once no token signed by
the old key is still valid, delete the old file and restart again.

Back up the key volume with the database. Losing it invalidates every token in circulation.
`IDP_SECRET_KEY` must not change either: it signs the session cookies and encrypts the
authenticator app secrets.

## Backups

```bash
pg_dump --format=custom --file=idp-$(date +%F).dump "$DATABASE_URL"
```

Keep the dumps and a copy of the key volume off the server. Test a restore regularly, into a
fresh database:

```bash
createdb idp_restore
pg_restore --no-owner --dbname=idp_restore idp-2026-10-14.dump
```

Point a provider container at `idp_restore`, check `GET /healthz` answers `ok`, and sign in.

A person who deletes their account stays in the backups until those age out: keep them only as
long as the restore plan needs.

## Logs

The provider writes access lines and errors to stdout. Access lines hold client addresses: give
them the same retention as the backups or less. With `IDP_EMAIL_TEST_MODE` on, whole emails,
sign-in codes included, go to the log, which is why a public provider refuses it.
