# Security

Buntubi signs people in and issues the tokens other applications trust, so a flaw here reaches
every app connected to it. Reports are welcome and handled before anything else.

## Reporting a vulnerability

Report it privately through GitHub: the repository's **Security** tab, then **Report a
vulnerability**. Please do not open a public issue, pull request or discussion for it.

A useful report has:

- the version or commit, and how the provider was run (images, `docker/example`, from source);
- the steps to reproduce, with the requests and responses where it helps;
- what an attacker gains: another account, a token with more access, another organization's
  data, a bypassed second factor.

You get an answer in the advisory thread. Once a fix is released, the advisory is published with
credit to you, unless you prefer otherwise.

## Supported versions

Buntubi is before 1.0. Fixes go into the latest release only; upgrade to it to receive them.

## In scope

- The provider (`idp/`): OAuth 2.0 and OpenID Connect endpoints, sign-in, two-step, passkeys,
  sessions, the account, developer and admin APIs, organizations, webhooks, plugins' boundaries.
- The sign-in pages (`frontend/`), the console and the developer portal (`apps/`).
- `@buntubi/sdk` and the published images.

Not in scope: a deployment that ignores the production settings in
[docs/operations.md](docs/operations.md) (the provider refuses to start without most of them),
attacks that need control of the server or its database, and denial of service by volume.

## Testing

Test against your own deployment, never someone else's. `docker/example/` runs the whole
platform on one machine.
