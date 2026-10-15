---
"@buntubi/sdk": minor
---

The CLI `buntubi-ui-plugin build <entry>` (or `buildUiPlugin` from `@buntubi/sdk/plugin-build`) builds UI plugins that are mounted at `/app/ui-plugins` in the provider, console, and portal without rebuilding images. Plugins receive shared code from `@buntubi/sdk/shared` via `SHARED_MODULES` instead of bundling it themselves. Runtime functions such as `loadMountedUiPlugins`, `mountedUiPlugins`, `uiPluginIndexScript`, `createUiPluginHost`, and `readUiPlugins` load these plugins, and `IDP_UI_PLUGINS` remains functional for development.
