#!/usr/bin/env bash
# Starts the local platform from zero: empties the database, asks for the superadmin, then runs
# `flask platform setup` with idp/platform.toml, which creates the platform's apps and writes
# their secrets into the env files the file names.
# Refuses to run unless idp/.env points the issuer at this machine.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/idp"

setting() { grep "^$1=" .env | head -1 | cut -d= -f2-; }
issuer="$(setting IDP_ISSUER)"
database="$(setting IDP_DATABASE_URL)"
case "$issuer" in
  http://localhost:* | http://127.0.0.1:*) ;;
  *) echo "Refusing: IDP_ISSUER is '$issuer', not a local address." >&2; exit 1 ;;
esac

flask() { ../.venv/bin/flask --app idp.app:create_app "$@"; }

# The portal and console need an env file with a session secret; one is generated once and kept.
for app in portal console; do
  file="$root/apps/$app/.env"
  [ -f "$file" ] || { cp "$root/apps/$app/.env.example" "$file"; chmod 600 "$file"; }
  ../.venv/bin/python - "$file" <<'PY'
import re, secrets, sys
path = sys.argv[1]
text = open(path).read()
if not re.search(r"^SESSION_SECRET=.{32,}$", text, flags=re.M):
    text = re.sub(r"^SESSION_SECRET=.*$", f"SESSION_SECRET={secrets.token_urlsafe(48)}", text, flags=re.M)
    open(path, "w").write(text)
PY
done

if [ ! -f platform.toml ]; then
  cp platform.example.toml platform.toml
  echo "Created idp/platform.toml from the example: add your own apps there and run setup again."
fi

echo "Emptying the database..."
IDP_DATABASE_URL="$database" ../.venv/bin/alembic downgrade base >/dev/null
IDP_DATABASE_URL="$database" ../.venv/bin/alembic upgrade head >/dev/null

echo "The superadmin account:"
flask admin create

echo "Creating the platform..."
flask platform setup

echo "Done. Restart the portal, the console and any app whose secret changed, then turn on"
echo "two-step sign-in for the superadmin at $issuer/account: the console needs it."
