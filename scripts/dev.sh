#!/usr/bin/env bash
# The provider, the sign-in pages' build, the portal and the console in one terminal, each line
# prefixed by its name; Ctrl-C stops them all. The provider listens on IDP_ISSUER's port.
# With --no-web, the provider only.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
web=1
for arg in "$@"; do
  case "$arg" in
    --no-web) web=0 ;;
    *) echo "usage: scripts/dev.sh [--no-web]" >&2; exit 1 ;;
  esac
done
[ -x "$root/.venv/bin/flask" ] || { echo "No .venv yet: run ./scripts/install.sh first." >&2; exit 1; }

cd "$root/idp"
port="$("$root/.venv/bin/python" -c 'from urllib.parse import urlparse
from buntubi.config import get_settings
print(urlparse(get_settings().issuer).port or 80)')"

trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT
run() {
  local name="$1"
  shift
  ("$@" 2>&1 | sed -l "s/^/[$name] /") &
}
PYTHONUNBUFFERED=1 run provider "$root/.venv/bin/flask" --app buntubi.app:create_app run --port "$port"
if [ "$web" = 1 ]; then
  run pages pnpm --dir "$root/frontend" dev
  run portal pnpm --dir "$root/apps/portal" dev
  run console pnpm --dir "$root/apps/console" dev
fi
wait
