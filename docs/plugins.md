# Plugins

The provider is one codebase, and each deployment serves one brand. What belongs to that brand
comes in through plugins: its API products and scopes, extra claims in its tokens, its rules for
which app may hold which scope, lines on the go-live checklist, reactions to what happens on the
platform, its own API endpoints, pages in the console and the portal, and the look of its
sign-in pages. The provider's source never names a brand.

A plugin has two halves, and most need both:

| Half | What it is | Where it runs | How a deployment turns it on |
|---|---|---|---|
| Provider plugin | A Python package with a `Plugin` subclass | Inside the provider process | Installed in the provider's environment, named in `IDP_PLUGINS` |
| UI plugin | An npm package (or a module path) exporting `plugin` | In the console, the portal and the sign-in pages | Built with `buntubi-ui-plugin` and mounted at `/app/ui-plugins`; in development, named in `IDP_UI_PLUGINS` |

The two halves share an id. The console and the portal show a UI plugin's pages only when the
provider runs the provider plugin of the same id.

Plugins run in process and are trusted code: the operator installs them, as with Keycloak
extensions or Kong plugins. A hook in token issuance is a function call, with no network round
trip. Keep a hook fast and free of side effects it cannot undo; the provider calls some of them
on every token.

The examples below follow one fictional plugin, `acme`, from its first file to its pages in the
console.

## The provider plugin

### A minimal plugin

```
acme-idp/
  pyproject.toml
  acme_idp/__init__.py
```

```toml
# pyproject.toml
[project]
name = "acme-idp"
version = "0.1.0"
requires-python = ">=3.11"

[project.entry-points."buntubi.plugins"]
acme = "acme_idp:AcmePlugin"
```

```python
# acme_idp/__init__.py
from buntubi.plugins import Catalogue, Localized, Plugin, Product, ScopeSpec


class AcmePlugin(Plugin):
    id = "acme"          # must equal the entry point name
    version = "0.1.0"

    def catalogue(self) -> Catalogue:
        return Catalogue(
            products=(
                Product(
                    slug="acme-invoices",
                    names=Localized("Factures", "Invoices"),
                    descriptions=Localized("Les factures d'un client.", "A customer's invoices."),
                    resource="https://api.acme.example",
                ),
            ),
            scopes=(
                ScopeSpec("invoices:read", Localized("Voir vos factures", "See your invoices"), "public", "acme-invoices"),
                ScopeSpec("invoices:write", Localized("Modifier vos factures", "Change your invoices"), "sensitive", "acme-invoices"),
            ),
        )
```

Install it into the provider's environment and turn it on:

```bash
.venv/bin/pip install -e ../acme-idp      # from the repository root
echo 'IDP_PLUGINS=["acme"]' >> idp/.env   # several: ["acme","other"], run in that order
cd idp && ../.venv/bin/flask --app buntubi.app:create_app plugins list
```

`plugins list` prints each plugin with its version and the number of products and scopes it
declares. The provider refuses to start when `IDP_PLUGINS` names a plugin that is not
installed, when the name is not a lowercase slug (letters, digits and hyphens, at most 40), when
the entry point does not give a `Plugin`, or when its `id` differs from the entry point name.

### Hooks

`Plugin` defines every hook as a no-op. Override the ones the plugin needs.

| Hook | Called | Returns |
|---|---|---|
| `catalogue()` | On `flask plugins sync`, at start unless `IDP_PLUGINS_SYNC_ON_START=false`, and by the plugin listings | The products and scopes the plugin declares |
| `token_claims(client, user, scopes)` | For every access token, whatever the grant. `user` is None for client credentials | Claims to add to the access token |
| `scope_refusal(client, scopes)` | When an app is created in the portal, and when its scopes change | A reason to refuse, or None |
| `live_checks(client)` | When the portal shows an app's way to live, and when the app is taken live | Extra lines on the checklist |
| `on_event(name, payload)` | After something happens on the platform (see Events) | Nothing |
| `blueprint()` | Once, at start | A Flask blueprint, mounted at `/api/plugins/<id>/` |
| `ui()` | By `GET /admin/api/plugins` and `GET /developer/api/plugins` | Anything JSON, for the plugin's own UI half |
| `page_brand(client, brand)` | When a sign-in page is drawn | Changes to that page's brand |

Hooks run in the order `IDP_PLUGINS` lists the plugins.

**When a hook raises.** `page_brand` and `ui` only shape how things look: a failure is logged
and that plugin is skipped, so a broken plugin cannot take the sign-in pages down. The hooks
that decide something (`token_claims`, `scope_refusal`, `live_checks`, `catalogue`) fail the
request instead, and nothing it started is kept: no token is issued and the authorization code
stays unused, no app is created. `on_event` failures are logged; the request goes on.

**`token_claims`.** Each plugin's claims are merged in order, a later plugin overwriting an
earlier one's. The claims the provider decides are dropped, with a warning in the log: `iss`,
`sub`, `aud`, `exp`, `iat`, `nbf`, `jti`, `scope`, `client_id`, `azp`, `env`, `auth_time`, `amr`,
`sid`. The hook adds to access tokens only; ID tokens and the userinfo endpoint are not affected.

**`scope_refusal`.** The first plugin that gives a reason wins. The portal's request fails with
`422 scope_refused`, the reason included, and the app keeps the scopes it had.

**`live_checks`.** A `LiveCheck` has a `key`, a `label` (`Localized`), a `state` (`done`, `warn`
or `todo`), optional `items`, and `required`. The portal shows the line among the provider's own.
While a required line is not `done`, taking the app live fails with `422 plugin_checks`, naming
the checks.

**`page_brand`.** The sign-in pages start from the client's own brand (its name and the brand set
in the portal) or, for the platform's own pages, from the `IDP_BRAND_*` settings. `client` is
None in the second case. Each plugin may change these keys, others are ignored:

| Key | Effect |
|---|---|
| `name`, `logo`, `tagline` | Drawn by the page |
| `accent` | The brand colour, as `#rrggbb` |
| `skin` | A fluixi-ui skin for the page's controls: `paper`, `soft` or `material` (the page's `data-ui`) |
| `look` | A look defined by a UI plugin (see Looks). A plain slug: lowercase letters, digits and hyphens |

The account area under `/account` always wears the platform's own look, whatever a plugin says.

### Products, scopes and the catalogue

A `Product` is an API developers add to their apps:

| Field | Meaning |
|---|---|
| `slug` | Its key, unique across all plugins |
| `names`, `descriptions` | `Localized(fr, en)` |
| `resource` | The API's identifier, used as the audience of tokens that hold its scopes |
| `category` | Groups products in the portal's catalogue |
| `auth` | How it is called: any of `oauth2`, `oidc`, `api_key`, `webhooks`. Default `("oauth2",)` |
| `availability` | `ga`, `beta` or `sandbox` |
| `docs_url` | Linked from the portal |
| `position` | Order in the catalogue |

A `ScopeSpec` is one permission:

| Field | Meaning |
|---|---|
| `name` | The scope string, unique across all plugins |
| `descriptions` | `Localized(fr, en)`: what the consent screen says |
| `sensitivity` | `public`; `sensitive`, which needs a review in the console before a live app holds it; or `restricted`, which only an admin gives |
| `product` | The product it belongs to, declared by the same plugin |
| `notes` | Shown to admins |

**Audience.** An access token's `aud` holds the client id and the `resource` of every product its
scopes belong to. An API checks that its own identifier is in `aud`, whichever app holds the
token.

**Sync.** The catalogue is code: `flask plugins sync` brings the database in line with what the
plugins declare, and prints what it added, updated, adopted, restored and deprecated. In
development it also runs at start. Where several workers start at once, set
`IDP_PLUGINS_SYNC_ON_START=false` and run the command once per deploy.

- A declared product or scope that does not exist is added, marked with the plugin's id.
- One that exists follows the declaration. An entry made earlier in the console is adopted, and
  the adoption is audited.
- One the plugin stops declaring is deprecated, never deleted: apps keep the scopes they hold.
  Declared again, it is restored.
- Two plugins declaring the same slug or scope, an unknown sensitivity, or a scope naming a
  product its plugin does not declare stop the sync with an error.
- A sync holds a database lock, so several workers syncing at start run one after the other;
  the later ones find nothing to change.
- A scope that goes from public to sensitive or restricted sends the live apps holding it
  without a review back to review.

An entry a plugin manages carries its id in `managed_by`, and the admin API refuses to edit it
with `409 managed_by_plugin`: change the plugin and sync instead.

#### A catalogue without a plugin

A deployment that only has an API to offer can declare its products and scopes as data, with no
Python: a JSON file per owner, named in `IDP_CATALOGUE_FILES`. Each file is synced like a
plugin's catalogue, under its `owner`, at start and by `flask plugins sync`; take a file out of
the setting and its rows are deprecated as a plugin's would be.

```json
{
  "owner": "acme",
  "products": [
    {
      "slug": "acme-orders",
      "names": { "fr": "Commandes", "en": "Orders" },
      "descriptions": { "fr": "Les commandes d'Acme.", "en": "Acme's orders." },
      "resource": "https://api.acme.example",
      "auth": ["oauth2", "api_key"]
    }
  ],
  "scopes": [
    {
      "name": "orders:write",
      "descriptions": { "fr": "Modifier les commandes", "en": "Change orders" },
      "sensitivity": "sensitive",
      "product": "acme-orders"
    }
  ]
}
```

```sh
echo 'IDP_CATALOGUE_FILES=["/deployment/catalogue.json"]' >> idp/.env
```

The fields are the ones above, with the same defaults. `owner` follows the rule for a plugin id
and must not be one: the provider refuses to start on a file that is missing or not in this
shape.

### Events

`on_event(name, payload)` is called after the change is made. A listener that raises is logged
and does not stop the others or the request.

| Name | Payload |
|---|---|
| `account.created` | `user`, `email` |
| `user.deleted` | `user` |
| `organization.created` | `organization`, `owner` |
| `organization.suspended` | `organization`, `reason` |
| `organization.restored` | `organization` |
| `app.created` | `app` (client id), `organization` |
| `app.approved`, `app.rejected` | `app`, `organization`, `note` |

Ids are strings. Keep a listener short: it runs inside the request that caused the event. Work
that takes time belongs in a queue the listener writes to.

### The plugin's own API

`blueprint()` returns a Flask blueprint, mounted at `/api/plugins/<id>/`. The console and the
portal call it with the signed-in person's access token, so its views check that token with the
helpers in `buntubi.plugins`:

| Helper | Lets through | The view gets |
|---|---|---|
| `@require_admin` | The platform owner, signed in with two-step, with the `admin` scope | `admin` (the User) |
| `@require_developer` | A signed-in developer who accepted the terms, with the `developer` scope | `me` (the User) |
| `member_of(user, organization_id, ability="read")` | Returns the membership; answers 403 or 404 when the user may not do `ability` there | |

```python
from flask import Blueprint, jsonify
from buntubi.plugins import member_of, require_developer


def blueprint() -> Blueprint:
    bp = Blueprint("acme", __name__)

    @bp.get("/organizations/<organization_id>/usage")
    @require_developer
    def usage(organization_id: str, me):
        member_of(me, organization_id)
        return jsonify(calls=0)

    return bp
```

A plugin that needs another service's data relays to it from here, keeping that service's
credentials on the provider: the console calls `/api/plugins/acme/usage`, and the plugin calls
acme's billing service with a token only the provider holds.

## The UI plugin

### A minimal UI plugin

```ts
// acme-idp-ui/src/index.ts
import { definePlugin } from '@buntubi/sdk/plugins';

export const plugin = definePlugin({
  id: 'acme',
  console: [
    {
      key: 'billing',
      label: { fr: 'Facturation', en: 'Billing' },
      icon: 'M4 6h16v12H4zM4 10h16',
      element: 'acme-billing',
      load: () => import('./billing.js'),
    },
  ],
  portal: {
    organization: [/* sections on an organization's pages */],
    app: [/* sections on an app's pages */],
  },
});
```

The module must export `plugin`. `definePlugin` only types it.

A **section** is one page: a sidebar entry under "Extensions" and the custom element that fills
the page.

| Field | Meaning |
|---|---|
| `key` | Unique within the plugin; part of the page's address |
| `label` | `{ fr, en }`, the sidebar entry |
| `icon` | An SVG path in a 24 by 24 box |
| `element` | The custom element tag the page renders |
| `load` | Imports the module that defines the element |

Where sections appear, and what their element is given:

| Place | Address | Properties |
|---|---|---|
| `console` | `/p/<plugin>/<key>` | `locale` |
| `portal.organization` | `/o/<org>/p/<plugin>/<key>` | `organization`, `locale` |
| `portal.app` | `/o/<org>/apps/<app>/p/<plugin>/<key>` | `organization`, `app`, `locale` |

`load` runs on the server before the page renders, and again in the browser, so the element must
import safely on a server (no `window` or `document` at module level).

### Calling the plugin's API

The console and the portal provide `PluginApi`. An element injects it and calls its own
endpoints, as the signed-in person:

```ts
import { inject } from '@fluixi/start/di';
import { PluginApi } from '@buntubi/sdk/plugins';

const api = inject(PluginApi);
const usage = await api.call<{ calls: number }>('acme', 'GET', `/organizations/${this.organization}/usage`);
```

A refusal throws an `Error` whose message is the provider's error code. The console and the
portal relay a call only to that plugin's own API: a path that resolves anywhere else (`..`,
another host), an id that is not a plugin id or an unexpected method is refused with
`invalid_plugin_call`.

Write elements the way the provider's own are written (`packages/elements`): fluixi-ui
components rather than native controls, `--idp-*` tokens rather than raw colours, French and
English text. Split each element into its logic and a view, and look the view up through
`viewToken` and `useView` from `@buntubi/sdk/view`, so a deployment can restyle it by providing
another view without touching the logic.

### Views in place of the provider's own

Every element of the console, the portal and the sign-in pages keeps its logic (state, actions,
events) apart from its view, the function that turns that logic into markup. A plugin gives its
own view for an element by the element's tag:

```ts
import { definePlugin } from '@buntubi/sdk/plugins';
import { signInView } from './sign-in-view.js';

export const plugin = definePlugin({
  id: 'acme',
  views: {
    'idp-sign-in': signInView,
  },
});
```

The view receives the element's logic, the same object its own view gets: for `idp-sign-in`, the
form, the labels, the pending and error states, `submit` and `askPasskey`. The element's
`logic.ts` (or the `logic()` method of the sign-in pages' elements) lists what each one offers.
Events, validation and the calls to the provider stay the element's; only the markup changes.

The console, the portal and the sign-in pages apply every plugin's views when they start, before
anything renders. When two plugins give a view for the same tag, the one listed first in
`IDP_UI_PLUGINS` wins. For lighter changes no view is needed: the `--idp-*` tokens and the
elements' `part` attributes can be styled from a stylesheet, and the next section covers the
sign-in pages' looks.

### Social sign-in buttons

Each provider's button on the sign-in and sign-up pages is an `idp-social-button`, and the list
around them is `idp-social-buttons`. A view given for `idp-social-button:<provider>` replaces
that provider's button only; one given for `idp-social-button` replaces every provider's button
without its own; one given for `idp-social-buttons` replaces the whole list and the separator.

```ts
export const plugin = definePlugin({
  id: 'acme',
  views: {
    'idp-social-button:github': ({ label, href }) => (
      <a class="acme-github" href={href()}>{label()}</a>
    ),
  },
});
```

A button's logic gives `provider`, `label` (already worded, "Continue with GitHub"), `href`,
`icon` (the provider's mark as SVG paths, or null) and `go`. The same buttons appear in the
account area to link a provider, with "Link GitHub" as their label.

### Looks for the sign-in pages

A look replaces the hero beside the sign-in form and restyles the page. The UI plugin defines it.
Which apps get it is set per app: `look = "acme"` on its entry in `platform.toml`, which
`flask platform setup` keeps in the app's brand, or a provider plugin returning `look` from
`page_brand`, which wins. A UI plugin that only brings looks needs no provider plugin.

```ts
export const plugin = definePlugin({
  id: 'acme',
  looks: {
    acme: {
      aside: { element: 'acme-sign-in-aside', load: () => import('./sign-in/aside.js') },
      styles: () => import('./sign-in/look.css'),
    },
  },
});
```

- The page sets `data-look="<name>"` on `<html>`. Every rule in the look's stylesheet goes under
  `:root[data-look='<name>']`, since the stylesheet is bundled with all the sign-in pages.
- The aside element gets `locale` and `brand`.
- The sign-in pages have no scoped style compiler: style the aside from the look's stylesheet.
- The stylesheet and the aside load before the page draws, so it does not change under the
  reader.

### Turning it on in a deployment

The published images load UI plugins at run time from a mounted folder: no rebuild, no source of
this repository. Build the plugin from its own package:

```bash
npx buntubi-ui-plugin build src/ui/index.ts     # writes dist/ui-plugin
```

```
dist/ui-plugin/manifest.json   id, version, entries, the shared modules it imports
dist/ui-plugin/browser/        what the pages import: index.js, chunks, stylesheets
dist/ui-plugin/server/         what the console and the portal load for their server render
```

A plugin imports the modules it shares with the apps (`SHARED_MODULES` in
`@buntubi/sdk/shared`: `@fluixi/core`, `@fluixi/di`, `@buntubi/sdk/view` and the rest) and gets
the apps' own copies, through an import map in the browser and the apps' `node_modules` on the
server. Everything else it imports (fluixi-ui components, zod, its own code) is built into it.
Importing a Fluixi or SDK module outside that list fails the build, since a second copy would
not see the apps' state. A plugin that needs more Vite plugins calls `buildUiPlugin` from
`@buntubi/sdk/plugin-build` in a script instead.

Mount the folder, one subfolder per plugin, at `/app/ui-plugins` in the provider, the console
and the portal:

```yaml
volumes:
  - ./ui-plugins:/app/ui-plugins:ro      # ui-plugins/acme = the plugin's dist/ui-plugin
```

Plugins load in the order of their folder names (`10-acme` before `20-other`), which decides
whose views win. A folder without a valid manifest, two plugins with one id, or a plugin needing
a module the image does not share stops the app at start, with the reason. Mounted plugins are
the operator's code, trusted like the provider plugins: nothing is fetched from elsewhere, and
only each plugin's `browser/` files are served (at `/api/ui-plugins/...` by the console and the
portal, `/ui-plugins/...` by the provider, whose policy allows the pages' import map by its
hash).

### Turning it on in development

Name the UI plugins, comma-separated, in each place that should show them:

| File | Shows |
|---|---|
| `apps/console/.env` | Console sections |
| `apps/portal/.env` | Portal sections |
| `frontend/.env` | Looks |

```bash
IDP_UI_PLUGINS=@acme/idp-ui
# or a path to the module, for a plugin checked out beside this repository:
IDP_UI_PLUGINS=/Users/me/code/acme-idp/src/ui/index.ts
```

A package name must be installed in the app. A path is served from outside the repository, and
its package folder is allowed for the dev server.

The list is composed at build time into `virtual:idp-ui-plugins` (the `idpUiPlugins()` Vite
plugin from `@buntubi/sdk/vite`), so the plugin's source is live while you work on it. After
changing it, restart the console and the portal, and run `pnpm build` in `frontend`. Plugins
named here come before mounted ones.

## Checklist for a new plugin

1. Pick an id: short, lowercase, stable. Rows the plugin manages and its API address carry it.
2. Write the provider half: a `Plugin` subclass, the `buntubi.plugins` entry point, `version`.
3. Install it in the provider's environment, add it to `IDP_PLUGINS`, run `flask plugins sync`.
4. Write the UI half, if it has pages or looks, with the same id.
5. In development, name it in `IDP_UI_PLUGINS`; for a deployment, build it with
   `buntubi-ui-plugin` and mount it at `/app/ui-plugins`.
6. On every deploy: the migrations, then `flask plugins sync`.

The hooks' source, with their docstrings, is `idp/src/buntubi/plugins/__init__.py` and
`idp/src/buntubi/plugins/sync.py`; the UI types are `packages/sdk/src/plugins.ts`. The provider's
own tests of the system are `idp/tests/test_plugins.py`.
