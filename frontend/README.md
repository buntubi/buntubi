# The provider's pages

Every page the provider shows a person: signing in and up, the email code, the two-step code,
password reset, consent, the account chooser, the device code, the offer of a passkey after
signing up, and the account area under `/account`. Written with Fluixi and fluixi-ui, built by
Vite into `idp/src/buntubi/static/idp/`, and served by the provider. There is no server of its own.

## How a page comes together

1. The provider renders `templates/shell.html` with a JSON config: which screen (`element`),
   the language, the CSRF token, the brand for this sign-in, and the screen's own props.
2. `src/main.tsx` reads that config and mounts the screen named by `element` inside the shared
   frame (`host/page.tsx`): the brand, the language and theme menus, the hero or a plugin's look.
3. The screen is a custom element from `src/elements/`. It is given its words, schema and an
   `action` that calls the provider's `/api` endpoints, and it reports the answer as an event.
4. The answer says where to go next (`redirect`, or a step such as `mfa`). Moving on is always a
   full page load: the next step is the provider's decision, never the page's.

The account area is different: one Fluixi app under `/account` (`src/account/`), routed in the
browser, built from `@idp/elements`, and loaded only on its own pages. Its calls go through the
`Account` service (`src/account/service.ts`), which the elements inject.

## Layout

```
src/
  main.tsx          reads the page config, mounts the screen, applies brand, scheme and look
  host/             the frame (page.tsx), the API client, brand colours, words, schemas
  elements/         one folder per sign-in screen: sign-in, sign-up, mfa-verify, consent, ...
  account/          the account area: app.tsx (routes), service.ts, i18n.ts, account.css
  styles.css        layers, fluixi-ui tokens and skins, the frame's styles
```

Every word is in `host/i18n.ts` and `account/i18n.ts`, French and English side by side. A
screen never holds text of its own.

## Brand, skin, scheme and look

- **Brand.** The client's name, logo and accent colour, or the platform's when the sign-in is not
  for a client. `host/brand.ts` turns the accent into the theme's variables, with a lighter ink
  for dark mode when the colour is too dark to read there.
- **Skin.** `data-ui` on `<html>`: one of fluixi-ui's skins (`paper`, `soft`, `material`), chosen
  by the client's brand or a plugin. The account area always uses the platform's own skin.
- **Scheme.** Light, dark or the system's, kept in the `idp-scheme` cookie so the server writes
  `data-theme` before the page draws.
- **Look.** A plugin can replace the hero and restyle the page: see
  [docs/plugins.md](../docs/plugins.md#looks-for-the-sign-in-pages).

## Working on it

```bash
pnpm install
pnpm dev          # rebuilds into the provider's static folder on every change
pnpm build        # once
pnpm typecheck
```

Reload the provider's page after a rebuild; the provider itself needs no restart.
`IDP_UI_PLUGINS` in `frontend/.env` lists the UI plugins whose looks the pages carry; rebuild
after changing it.
