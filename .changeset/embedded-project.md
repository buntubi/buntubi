---
"@buntubi/sdk": minor
"create-buntubi": minor
---

`create-buntubi` exports `generate` and `TEMPLATES`; using the `host` option creates a project embedded in a product folder with its compose project name, command names, extra provider settings and mounts, extra apps in `platform.toml`, and without its own package or readme. `@buntubi/sdk/project` exports `runSetup`, `runUp`, and `runDown` with options `mount`, `dev`, and `name`, and the `buntubi` command accepts `--dev`.
