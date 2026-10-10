#!/usr/bin/env bash
# Starts the local platform from zero: empties the database, then runs install.sh, which asks for
# the superadmin and creates the platform again from idp/platform.toml.
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

echo "Emptying the database..."
IDP_DATABASE_URL="$database" ../.venv/bin/alembic downgrade base >/dev/null

exec "$root/scripts/install.sh" "$@"
