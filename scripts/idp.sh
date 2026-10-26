#!/usr/bin/env bash
# A provider command from anywhere in the checkout: `scripts/idp.sh platform setup`, `scripts/idp.sh
# users delete <email>`. The same as `flask` in idp/, with idp/.env read.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/idp"
exec "$root/.venv/bin/flask" --app buntubi.app:create_app "$@"
