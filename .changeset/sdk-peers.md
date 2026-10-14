---
"@buntu/sdk": patch
---

`@fluixi/start` and `zod` are peer dependencies, so the SDK uses the app's copies, and `idpUiPlugins()` resolves `@buntu/sdk` and the Fluixi runtime to a single shared copy for UI plugins, which then use the same DI tokens and services as the app.
