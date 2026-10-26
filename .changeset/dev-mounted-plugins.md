---
"@buntubi/sdk": patch
---

`createUiPluginHost` takes `mount: false` for an app's development server, so no mounted plugin is loaded or served and a single log line appears when the folder contains plugins. `loadBrowserUiPlugins` skips a plugin that fails to load, logs a console error, and allows the page to start instead of stopping it.
