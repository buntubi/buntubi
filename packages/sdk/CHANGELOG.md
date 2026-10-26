# @buntubi/sdk

## 0.8.0

### Minor Changes

- 342df57: A per-app JSON object about each person (up to 16 KiB) is available via `/v1/app/users/{user_id}/data` with GET, PUT, PATCH (merges keys) and DELETE, requiring a client-credentials token with the `app_data` scope and covering only people who consented to the app, or anyone for the platform's own apps. The data export lists each app's object by app name together with every profile value held and the accepted terms.
- 6f9d73d: Each app can specify the profile fields it needs using `required_fields` in `platform.toml` or on the portal's sign-in card, and a user lacking those fields is prompted to provide them during sign-in or while already signed in, with `prompt=none` resulting in `interaction_required`. The SDK's `App` type includes the new `required_fields` and `required_fields_offered` properties.
- 81b221c: `buntubi setup` sets up a project's database, signing key, first admin and apps from `platform.toml`, and can be safely re-run; `buntubi build` compiles plugin pages into `ui-plugins/`. `buntubi add plugin <id>` writes a Python provider and a TypeScript UI plugin into `plugins/<id>` and registers the id in `IDP_PLUGINS`.
- 1a538f0: The SDK includes new types `PLATFORM_FIELD_TYPES`, `PlatformField`, `PlatformValue`, adds `platform_fields` to `AccountSummary` and `platform_profile` to `ProfilePatch`, and provider plugins can reject values using `Plugin.profile_field_refusal`.
- 1a538f0: The platform exposes its own profile fields under `[[profile.fields]]` in `platform.toml`, supporting types text, number, date, boolean, choice, and choices with French and English labels, which are filled at sign-up, in the account area, or on the next sign-in if required, and apps read them via the `platform_profile` claim in the `platform_profile` scope.
- 9d866c8: The provider keeps the standard OpenID Connect profile claims `birthdate`, `gender`, `middle_name`, `nickname`, `website`, and `zoneinfo`, each hidden (default), optional, or required as set in the `[profile]` section of `platform.toml`. Only required fields appear on the sign-up form, optional and required ones are editable in the account area, hidden ones are never released and shown ones are released under the `profile` scope. The SDK exports `PROFILE_FIELDS`, `FIELD_MODES`, `GENDERS`, and `aboutSchema`, and `AccountSummary.fields` and `ProfilePatch` carry the fields.
- 0b4a9fa: The `authorize` endpoint accepts `prompt=create` to open sign-up when there is no session and to continue sign-in when a session exists, and discovery lists `create`. When `login_hint` contains an email address it pre-fills the email field on both sign-in and sign-up pages.
- 522121f: Sign-in with Google (OpenID Connect) or GitHub is available when the corresponding `IDP_GOOGLE_*` or `IDP_GITHUB_*` variables are set and the provider appears in the `[social]` list in `platform.toml`. Each app can narrow the options via `social_providers`. The deployment's `[signup]` open flag controls whether new accounts can be created, while an app can disable sign-up on its own page with `signup = false` but invited addresses always remain allowed. A provider links to an existing account only from the account area and never by matching address, provider sign-in does not count as the second step, and required profile fields are requested before the account is created. UI plugin views replace buttons using `idp-social-button:<provider>` for a single provider, `idp-social-button` for each provider, or `idp-social-buttons` for the whole list, and the SDK adds `LinkedIdentity`, `SignInMethods`, `AccountService.unlinkIdentity`, `App.social_providers`, `App.signup_open`, and `AdminOverview.sign_in`.
- 8a4ddf4: With `[signup] terms_version` in `platform.toml` and `IDP_BRAND_TERMS_URL` set, people accept the terms at sign-up by email or through Google or GitHub, and the version and date are kept on the account. An account that has not accepted the current version, whether created by an admin, invited, from before, or a new version, is asked at its next sign-in and the console shows the version accepted.

### Patch Changes

- 7716f67: `createUiPluginHost` takes `mount: false` for an app's development server, so no mounted plugin is loaded or served and a single log line appears when the folder contains plugins. `loadBrowserUiPlugins` skips a plugin that fails to load, logs a console error, and allows the page to start instead of stopping it.

## 0.7.0

### Minor Changes

- d25989e: Add `appOrganizationsClient({ issuer, clientId, clientSecret })`, which lists the organizations the app hears of with their latest event sequence, retrieves a specific organization with its members as of that sequence, and fetches and renews its own client-credentials token. Also exports `ORGANIZATION_CLAIMS` (`org_id`, `org_role`) and the `AppOrganization` and `AppOrganizationCopy` types.

## 0.6.1

### Patch Changes

- fb4e744: You can import `@buntubi/sdk/webhooks` and `@buntubi/sdk/organizations` directly from the `@buntubi/sdk` package.

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
