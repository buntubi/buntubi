# {{name}}

An identity provider on Buntubi, run with Docker.

```sh
pnpm install
pnpm run setup  # once: its database, a signing key, the first admin, the apps
pnpm up         # the provider on :5010, the console on :3420, the portal on :3410
pnpm down
```

On public addresses, a reverse proxy sends each one to its port with https: the provider's to
5010, the console's to 3420, the portal's to 3410.

Its apps are in `platform.toml`, its settings in the `.env` files, written with fresh secrets
when the project was made. `pnpm exec buntubi add plugin <id>` adds a plugin of its own in
`plugins/`; `pnpm build` builds the plugins' pages into `ui-plugins/`.
