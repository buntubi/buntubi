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

# A port another program holds would not always fail: Flask binds 127.0.0.1 beside a program on
# every address, and the browser, trying IPv6 first, would reach that one. Refuse up front.
app_port() { sed -n 's/^ *port: *\([0-9][0-9]*\).*/\1/p' "$root/apps/$1/fluixi.config.ts" | head -1; }
check_port() {
  local name="$1" port="$2" holder container
  holder="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR == 2 { print $1 " (pid " $2 ")" }')"
  [ -z "$holder" ] && return 0
  container="$(docker ps --filter "publish=$port" --format '{{.Names}}' 2>/dev/null | head -1 || true)"
  [ -n "$container" ] && holder="Docker, container $container (docker stop $container)"
  echo "Port $port, for the $name, is already taken by $holder. Stop it, or change the port." >&2
  return 1
}
busy=0
check_port provider "$port" || busy=1
if [ "$web" = 1 ]; then
  check_port portal "$(app_port portal)" || busy=1
  check_port console "$(app_port console)" || busy=1
fi
[ "$busy" = 0 ] || exit 1

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
