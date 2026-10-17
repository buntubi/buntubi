# @buntubi/sdk

## 0.6.0

### Minor Changes

- 11195e5: `ROLE_ABILITIES` and `PORTAL_ABILITIES` replace `ABILITIES`; `can(membership, ability)` accepts `{ role, portal_role }` with role values `owner`, `admin`, `billing`, `member`, `guest` and portal roles `developer`, `reviewer`, `viewer`; `portal_role` is available on `Organization`, `Member`, and `Invitation`; `POSITIONS`, `positionOf`, and `rolesOf` are exported from `@buntubi/sdk/roles`. `App` includes the `organization_usage` property, which can be `none`, `optional`, or `required`. The new `@buntubi/sdk/organizations` entry exports `organizationsClient({ issuer, accessToken, fetch })`, which calls `/v1/organizations` as the signed-in person and throws `OrganizationsApiError` with status and code on refusals.
- 635fb3a: The CLI `buntubi-ui-plugin build <entry>` (or `buildUiPlugin` from `@buntubi/sdk/plugin-build`) builds UI plugins that are mounted at `/app/ui-plugins` in the provider, console, and portal without rebuilding images. Plugins receive shared code from `@buntubi/sdk/shared` via `SHARED_MODULES` instead of bundling it themselves. Runtime functions such as `loadMountedUiPlugins`, `mountedUiPlugins`, `uiPluginIndexScript`, `createUiPluginHost`, and `readUiPlugins` load these plugins, and `IDP_UI_PLUGINS` remains functional for development.
- 3638a7c: The new `@buntubi/sdk/webhooks` entry adds a `verifyWebhook({ secret, body, signature, toleranceSeconds, now })` function that validates the Buntubi-Signature header using HMAC-SHA256 with a 300 s tolerance and returns the typed event or throws `WebhookVerificationError` with codes missing_signature, malformed_signature, too_old, bad_signature, or malformed_body, introduces `WEBHOOK_EVENTS` and a discriminated-union `WebhookEvent` with typed data, adds `webhook_url` and `webhook_events` properties to `App`, and exports `WEBHOOK_SCOPES`.

### Patch Changes

- 77a3dd8: `AdminUser` includes `passkeys`, the account's passkey count, and the admin two-step reset removes the passkeys together with the authenticator app.
- 382a560: Provider, console, and portal images are published for both `linux/amd64` and `linux/arm64` under a single tag, allowing any host to pull a native image.
- 7cc4edb: `@buntubi/sdk/types` exports `ROLES`, `PORTAL_ROLES` and `ORGANIZATION_USAGES` as const arrays and derives `Role`, `PortalRole` and `OrganizationUsage` from them; `@buntubi/sdk/roles` exports `POSITIONS` as a const tuple that `memberInviteSchema` uses to build its enum.
- 729ed29: serveUiPluginFile and createUiPluginHost compare real paths, so a symbolic link inside a plugin's `browser/` folder that points outside the folder is not served. readUiPlugins rejects a manifest whose `browser` or `server` entry is not a `.js` or `.mjs` path inside its own `browser/` or `server/` folder, or contains a `.` or `..` segment.

## 0.5.0

### Minor Changes

- 612b301: The product is named Buntubi: the npm package moves from `@buntu/sdk` to `@buntubi/sdk`, the PyPI package from `buntu` to `buntubi`, and the Python import from `idp` to `buntubi`. Plugins import `buntubi.plugins` and register under the `buntubi.plugins` group.

## 0.4.0

### Minor Changes

- 9f51a08: The SDK imports service tokens from `@fluixi/di`; peer dependency `@fluixi/di` version `^1.0.0-alpha.99` replaces `@fluixi/start`, and `SHARED_WITH_PLUGINS` includes `@fluixi/di`.
- 0919e51: UI plugins give views in place of the provider's own by element tag, and each view receives the element's logic. The SDK adds `overrideViews` and `viewsOf`, with `viewToken` names matching the element tags.

### Patch Changes

- 1726351: `@fluixi/start` and `zod` are peer dependencies, so the SDK uses the app's copies, and `idpUiPlugins()` resolves `@buntubi/sdk` and the Fluixi runtime to a single shared copy for UI plugins, which then use the same DI tokens and services as the app.

## 0.3.0

### Minor Changes

- 9284bb0: `@buntubi/sdk/navigation` offers a Navigation DI token with `go(href, options)`, `useNavigation()`, and `followLink(event, navigator)` for handling `<a href>` clicks, and if no provider is supplied `go` loads the page in full.

## 0.2.0

### Minor Changes

- 5f735a2: `@buntubi/sdk/view` exports `viewToken` and `useView`, a view token and hook that retrieve an element's view via DI, defaulting to the element's own, so apps restyle it by providing a different view.

## 0.1.0

### Minor Changes

- 0b6cb78: First release: the provider's types, API clients for the developer, admin and account APIs, form schemas with the provider's limits, role helpers, and plugin helpers (`pluginTarget`, UI plugins, the Vite plugin).
