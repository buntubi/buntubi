---
"@buntubi/sdk": minor
---

`buntubi setup` sets up a project's database, signing key, first admin and apps from `platform.toml`, and can be safely re-run; `buntubi build` compiles plugin pages into `ui-plugins/`. `buntubi add plugin <id>` writes a Python provider and a TypeScript UI plugin into `plugins/<id>` and registers the id in `IDP_PLUGINS`.
