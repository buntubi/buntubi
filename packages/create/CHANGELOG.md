# create-buntubi

## 0.9.0

### Minor Changes

- b227580: `create-buntubi` exports `generate` and `TEMPLATES`; using the `host` option creates a project embedded in a product folder with its compose project name, command names, extra provider settings and mounts, extra apps in `platform.toml`, and without its own package or readme. `@buntubi/sdk/project` exports `runSetup`, `runUp`, and `runDown` with options `mount`, `dev`, and `name`, and the `buntubi` command accepts `--dev`.

## 0.8.0

### Minor Changes

- fd002d0: `npm create buntubi` creates a project with published images, a provider image built from the project's plugins, fresh secret env files, and a `platform.toml` configured for console and portal, asking for its public addresses and email, each also given as a flag.
