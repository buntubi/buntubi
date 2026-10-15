# @buntubi/sdk

## 0.5.1

### Patch Changes

- 7cfa1e3: Provider, console, and portal images are published for both `linux/amd64` and `linux/arm64` under a single tag, allowing any host to pull a native image.

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
