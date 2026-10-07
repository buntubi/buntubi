#!/usr/bin/env bash
# Empties the local database and registers the portal, console and Postman clients again,
# writing the new client secrets into apps/portal/.env and apps/console/.env.
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

echo "Emptying the database..."
IDP_DATABASE_URL="$database" ../.venv/bin/alembic downgrade base >/dev/null
IDP_DATABASE_URL="$database" ../.venv/bin/alembic upgrade head >/dev/null

# Replaces KEY=... in an app's .env (the file is created from .env.example when missing).
store() {
  local file="$root/apps/$1/.env" key="$2" value="$3"
  [ -f "$file" ] || cp "$root/apps/$1/.env.example" "$file"
  ../.venv/bin/python - "$file" "$key" "$value" <<'PY'
import re, secrets, sys
path, key, value = sys.argv[1:]
text = open(path).read()
if re.search(rf"^{key}=", text, flags=re.M):
    text = re.sub(rf"^{key}=.*$", f"{key}={value}", text, flags=re.M)
else:
    text += f"\n{key}={value}\n"
# A session secret is generated once and kept across resets.
if not re.search(r"^SESSION_SECRET=.{32,}$", text, flags=re.M):
    text = re.sub(r"^SESSION_SECRET=.*$", f"SESSION_SECRET={secrets.token_urlsafe(48)}", text, flags=re.M)
open(path, "w").write(text)
PY
  chmod 600 "$file"
}

secret_of() { sed -n 's/^Secret (shown once, store it now): //p'; }

echo "Registering the developer portal..."
store portal PORTAL_CLIENT_SECRET "$(flask clients create --client-id developer-portal --name "Developer portal" \
  --type confidential --first-party --scope "openid profile email developer" \
  --redirect-uri http://localhost:3410/auth/callback --post-logout-redirect-uri http://localhost:3410/ | secret_of)"

echo "Registering the owner console..."
store console CONSOLE_CLIENT_SECRET "$(flask clients create --client-id owner-console --name "Owner console" \
  --type confidential --first-party --scope "openid profile email admin" \
  --redirect-uri http://localhost:3420/auth/callback --post-logout-redirect-uri http://localhost:3420/ | secret_of)"

echo "Registering Postman..."
flask clients create --client-id postman --name "Postman" --type public --first-party \
  --scope "openid profile email offline_access developer admin" \
  --redirect-uri https://oauth.pstmn.io/v1/callback --redirect-uri https://oauth.pstmn.io/v1/browser-callback >/dev/null

echo "Done. Restart the portal and console so they read their new secrets, then create your admin:"
echo "  cd idp && ../.venv/bin/flask --app idp.app:create_app admin create"
