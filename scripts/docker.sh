#!/usr/bin/env bash
# The provider, console and portal from their images, with docker/example's deployment:
#
#   scripts/docker.sh setup [--dev]   env files with fresh secrets, database, migrations, signing
#                                     key, the superadmin (asked once), platform.toml; safe to rerun
#   scripts/docker.sh up [--dev]      start everything
#   scripts/docker.sh down            stop everything; the database volume stays
#   scripts/docker.sh logs            follow the provider's log
#
# --dev runs the images this checkout builds (`pnpm images:dev`) instead of the published ones.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/docker/example"
command="${1:-}"
shift || true
files=(-f compose.yaml)
for arg in "$@"; do
  case "$arg" in
    --dev) files+=(-f compose.dev.yaml) ;;
    *) echo "usage: scripts/docker.sh setup|up|down|logs [--dev]" >&2; exit 1 ;;
  esac
done
compose() { docker compose "${files[@]}" "$@"; }
secret() { python3 -c 'import secrets; print(secrets.token_urlsafe(40))'; }

# An env file from its example, the empty secrets filled in; one that exists is left alone.
env_file() {
  local name="$1"
  shift
  [ -f "$name" ] && return 0
  cp "$name.example" "$name"
  for key in "$@"; do
    sed -i.bak "s|^$key=\$|$key=$(secret)|" "$name" && rm -f "$name.bak"
  done
  echo "wrote $name"
}

case "$command" in
  setup)
    env_file .env POSTGRES_PASSWORD
    env_file provider.env IDP_SECRET_KEY
    env_file console.env SESSION_SECRET
    env_file portal.env SESSION_SECRET
    [ -f platform.toml ] || { cp platform.example.toml platform.toml; echo "wrote platform.toml"; }
    mkdir -p keys ui-plugins
    compose up -d --wait postgres
    compose run --rm provider alembic upgrade head
    [ -n "$(ls -A keys)" ] || compose run --rm provider flask keys generate
    compose run --rm provider flask admin check >/dev/null 2>&1 || compose run --rm -it provider flask admin create
    compose run --rm -v .:/deployment provider flask platform setup --file /deployment/platform.toml
    compose up -d
    echo "Ready: http://localhost:5010/account (turn on two-step sign-in), the console on :3420, the portal on :3410."
    ;;
  up) compose up -d ;;
  down) compose down ;;
  logs) compose logs -f provider ;;
  *) echo "usage: scripts/docker.sh setup|up|down|logs [--dev]" >&2; exit 1 ;;
esac
