# @buntu/sdk

## 0.3.0

### Minor Changes

- 9284bb0: `@buntu/sdk/navigation` offers a Navigation DI token with `go(href, options)`, `useNavigation()`, and `followLink(event, navigator)` for handling `<a href>` clicks, and if no provider is supplied `go` loads the page in full.

## 0.2.0

### Minor Changes

- 5f735a2: `@buntu/sdk/view` exports `viewToken` and `useView`, a view token and hook that retrieve an element's view via DI, defaulting to the element's own, so apps restyle it by providing a different view.

## 0.1.0

### Minor Changes

- 0b6cb78: First release: the provider's types, API clients for the developer, admin and account APIs, form schemas with the provider's limits, role helpers, and plugin helpers (`pluginTarget`, UI plugins, the Vite plugin).
