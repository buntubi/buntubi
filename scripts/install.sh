#!/usr/bin/env bash
# First install, and safe to run again: each step is skipped when it is already done.
#
#   ./scripts/install.sh            the provider, the portal and the console
#   ./scripts/install.sh --no-web   the provider only (a server that serves the apps elsewhere)
#
# Steps: Python environment, idp/.env with a secret key, the database, migrations, a signing
# key, the web packages and the sign-in pages, the apps' env files, idp/platform.toml, the
# superadmin (asked for, once), then `flask platform setup`.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
web=1
for arg in "$@"; do
  case "$arg" in
    --no-web) web=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\n== %s\n' "$1"; }
need() { command -v "$1" >/dev/null || { echo "Missing: $1. $2" >&2; exit 1; }; }

need python3 "Install Python 3.11 or later."
if [ "$web" = 1 ]; then
  need node "Install Node 22."
  need pnpm "Install pnpm (corepack enable)."
fi

step "Python environment"
cd "$root"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -c 'import sys; sys.exit(sys.version_info < (3, 11))' || {
  echo "The .venv runs Python older than 3.11: remove it and run again with a newer python3." >&2
  exit 1
}
.venv/bin/pip install --quiet -c idp/requirements.lock -e "./idp[dev]"
echo "$(.venv/bin/python --version) in .venv, provider installed."
python="$root/.venv/bin/python"
flask() { "$root/.venv/bin/flask" --app buntubi.app:create_app "$@"; }

step "Provider settings (idp/.env)"
cd "$root/idp"
if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo "Created idp/.env from the example."
else
  echo "Using idp/.env."
fi
"$python" - <<'PY'
import re, secrets
text = open(".env").read()
if not re.search(r"^IDP_SECRET_KEY=.{32,}$", text, flags=re.M):
    text = re.sub(r"^IDP_SECRET_KEY=.*$", f"IDP_SECRET_KEY={secrets.token_urlsafe(48)}", text, flags=re.M)
    open(".env", "w").write(text)
    print("Generated IDP_SECRET_KEY.")
else:
    print("IDP_SECRET_KEY is set.")
PY

step "Database"
"$python" - <<'PY'
import psycopg
from sqlalchemy.engine import make_url
from buntubi.config import get_settings

url = make_url(get_settings().database_url)
server = url.set(drivername="postgresql", database="postgres").render_as_string(hide_password=False)
with psycopg.connect(server, autocommit=True) as connection:
    exists = connection.execute("select 1 from pg_database where datname = %s", (url.database,)).fetchone()
    if exists:
        print(f"Using the existing database {url.database}.")
    else:
        connection.execute(f'create database "{url.database}"')
        print(f"Created {url.database}.")
PY
"$root/.venv/bin/alembic" upgrade head 2>&1 | grep -v '^INFO' || true
echo "Migrations at $("$root/.venv/bin/alembic" current 2>/dev/null | tail -1)."

step "Signing key"
keys="$("$python" -c 'from buntubi.config import get_settings; print(get_settings().signing_keys_dir)')"
if ls "$keys"/*.json >/dev/null 2>&1; then
  echo "Signing keys in $keys: $(ls "$keys"/*.json | wc -l | tr -d ' '). Kept: tokens they signed stay valid."
else
  flask keys generate
fi

if [ "$web" = 1 ]; then
  step "Web packages"
  # One workspace (pnpm-workspace.yaml), one lockfile.
  pnpm --dir "$root" install --silent
  pnpm --dir "$root/frontend" build >/dev/null
  echo "Built the sign-in pages."

  step "Portal and console settings"
  for app in portal console; do
    file="$root/apps/$app/.env"
    if [ ! -f "$file" ]; then
      cp "$root/apps/$app/.env.example" "$file"
      chmod 600 "$file"
      echo "Created apps/$app/.env from the example."
    else
      echo "Using apps/$app/.env."
    fi
    "$python" - "$file" <<'PY'
import re, secrets, sys
path = sys.argv[1]
text = open(path).read()
if not re.search(r"^SESSION_SECRET=.{32,}$", text, flags=re.M):
    text = re.sub(r"^SESSION_SECRET=.*$", f"SESSION_SECRET={secrets.token_urlsafe(48)}", text, flags=re.M)
    open(path, "w").write(text)
    print(f"Generated SESSION_SECRET in {path}.")
else:
    print("SESSION_SECRET is set.")
PY
  done
fi

step "Platform file (idp/platform.toml)"
cd "$root/idp"
if [ -f platform.toml ]; then
  echo "Using idp/platform.toml."
else
  cp platform.example.toml platform.toml
  echo "Created idp/platform.toml from the example: add the deployment's own apps there and run again."
fi

step "Superadmin"
if flask admin check; then
  :
elif [ -t 0 ]; then
  flask admin create
else
  echo "No superadmin, and no terminal to ask for one. Run: pnpm idp admin create" >&2
  exit 1
fi

step "Platform"
flask platform setup

issuer="$("$python" -c 'from buntubi.config import get_settings; print(get_settings().issuer)')"
cat <<EOF

Ready. Start the provider, the portal and the console:
  pnpm dev
Then sign in as the superadmin at $issuer/account and turn on two-step sign-in: the console needs it.
EOF
