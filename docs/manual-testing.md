# Manual testing

Everything runs on this machine: the provider on port 5010, the developer portal on 3410, the
owner console on 3420. Emails are not sent in development; sign-up codes and password reset
links are printed in the provider's terminal.

Use addresses such as `you@example.com`. Sign-up refuses reserved domains like `.test`.

## 0. Start from an empty database

```bash
cd ~/Developer/libs/oauth/identity-provider
./scripts/reset-local.sh
```

This empties the database, seeds the scope catalog, registers the portal, console and Postman
clients, and writes the portal's and console's client secrets into their `.env` files. It
refuses to run when the issuer in `idp/.env` is not a localhost address. Restart the portal and
console after a reset.

## 1. Start the servers

One terminal each.

```bash
# Provider: http://localhost:5010
cd ~/Developer/libs/oauth/identity-provider/idp
../.venv/bin/flask --app idp.app:create_app run --port 5010

# Developer portal: http://localhost:3410
cd ~/Developer/libs/oauth/identity-provider/apps/portal
pnpm dev

# Owner console: http://localhost:3420
cd ~/Developer/libs/oauth/identity-provider/apps/console
pnpm dev
```

In a fourth terminal, a shortcut for the provider's commands:

```bash
cd ~/Developer/libs/oauth/identity-provider/idp
alias idp='../.venv/bin/flask --app idp.app:create_app'
```

## 2. Create the admin account

```bash
idp admin create      # email, first and last name, password (asked twice, hidden)
idp users admins      # your email, "two-step OFF"
```

The console requires two-step sign-in:

1. Open http://localhost:5010/account and sign in.
2. Choose "Activer la validation en deux étapes", scan the QR code with an authenticator app
   (Google Authenticator, 1Password, Authy), type the code it shows, keep the backup codes.

```bash
idp users admins      # now "two-step on"
```

## 3. Developer portal (http://localhost:3410)

1. **Se connecter**, then "Créer un compte" with a second email: this is the developer. Type
   the 6-digit code printed by the provider.
2. Accept the developer terms.
3. Create a project with a support email.
4. Create an app: type **Confidentielle**, redirect URI `http://localhost:3000/callback`. Copy
   the secret, shown once.
5. On the app page:
   - **Mettre en ligne** lists what is missing. Fill in the homepage, privacy, terms and logo
     URLs, **Enregistrer**, then **Mettre en ligne** again: the app goes live.
   - **Nouveau secret**: the previous secret gets a 24 hour expiry. **Révoquer** ends one at
     once.
   - Add `phone` to the scopes, save, publish again: the app goes to review (section 5).
6. On the project page: create an API key (`sk_test_...`) and copy it, add a test user, try
   **English / Français** in the header.

## 4. Sandbox gate and consent

1. In the portal, create a second app and do not publish it. Copy its client ID (`app_...`).
2. In a private window, create a third account at http://localhost:5010/signup.
3. In that window, open this URL with the client ID in place of `APP_ID`:

   ```
   http://localhost:5010/oauth/authorize?response_type=code&client_id=APP_ID&redirect_uri=http://localhost:3000/callback&scope=openid%20profile%20email&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256
   ```

   Expected: **Accès bloqué**, with the project's support email.
4. Add the third account as a test user in the portal and reload the URL. Expected: the consent
   screen, with the "not verified" warning and the app's links.
5. **Autoriser** redirects to `http://localhost:3000/callback?code=...`. Nothing listens there,
   so the browser shows an error page; the code in the address bar is the result.
6. Remove that test user in the portal: their tokens for the app end at once.

## 5. Owner console (http://localhost:3420)

1. **Se connecter** with the admin account. The provider asks for the authenticator code, then
   the overview opens.
2. **Revues**: the app with `phone` is waiting.
   - **Refuser** without a note is refused.
   - Refuse with a note: the developer sees it on the app page in the portal.
   - Publish again from the portal, then **Approuver**: the app goes live.
3. **Projets**: suspend a project with a reason. Its apps stop and the portal refuses changes
   to it. **Rétablir** brings it back.
4. **Utilisateurs**: search, read the badges, disable and enable an account.
5. **Portées**: add a platform scope, for example name `orders.read`, resource `orders`, with a
   French and an English text. Developers can then put it on API keys.
6. The console's refusals:

   ```bash
   idp users demote you@example.com    # reload the console: "Accès refusé"
   idp users promote you@example.com   # back
   ```

## 6. APIs from the terminal

A first-party server client, as a platform API would be:

```bash
idp clients create --client-id platform-api --name "Platform API" --type confidential \
  --grant-type client_credentials --redirect-uri http://localhost/unused --first-party
# copy the secret it prints
SECRET=paste-the-secret-here
```

```bash
# Discovery and public keys
curl -s localhost:5010/.well-known/openid-configuration | python3 -m json.tool | head -20
curl -s localhost:5010/.well-known/jwks.json | python3 -m json.tool

# Client credentials
curl -s -u platform-api:$SECRET -d grant_type=client_credentials localhost:5010/oauth/token \
  | python3 -m json.tool

# Check an API key from the portal: active, project_id, env, scope
curl -s -u platform-api:$SECRET -d token=sk_test_PASTE_KEY localhost:5010/oauth/introspect \
  | python3 -m json.tool
```

Device flow, as a TV or a terminal app does it:

```bash
idp clients create --client-id tv --name "TV" --type public \
  --grant-type urn:ietf:params:oauth:grant-type:device_code --grant-type refresh_token \
  --redirect-uri http://localhost/unused --first-party

curl -s -d client_id=tv -d scope=openid localhost:5010/oauth/device_authorization | python3 -m json.tool
# open verification_uri, sign in, type user_code, Autoriser; then:
curl -s -d client_id=tv -d grant_type=urn:ietf:params:oauth:grant-type:device_code \
  -d device_code=PASTE_DEVICE_CODE localhost:5010/oauth/token | python3 -m json.tool
```

## 7. Postman

1. **Import**, then **Link**: `http://localhost:5010/openapi.json`.
2. On the collection's **Authorization** tab, choose OAuth 2.0:
   - Grant type: Authorization Code (With PKCE), method SHA-256
   - Client ID: `postman`, no secret
   - Callback URL: `https://oauth.pstmn.io/v1/callback`
   - Scope: `openid profile email offline_access developer admin`
3. **Get New Access Token**, sign in with the admin account and its code, then **Use Token**.

## 8. Automated tests

```bash
cd ~/Developer/libs/oauth/identity-provider/idp
../.venv/bin/python -m pytest -q
```

They run against the `idp_test` database and never touch the one used above.
