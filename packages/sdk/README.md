# @buntu/sdk

The contract between the provider and everything that talks to it from TypeScript: the shapes
the provider's APIs answer with, the services elements call, the validation rules forms check
before sending, passkey ceremonies, and the plugin interface. It has no UI and holds no rule of
its own: where it repeats a provider rule, the provider is the authority and the SDK mirrors it
so a form can say no before a round trip.

## Entries

| Import | What |
|---|---|
| `@buntu/sdk/types` | The developer and admin APIs' shapes: organizations, apps, members, scopes, products, reviews, users |
| `@buntu/sdk/developer` | `Developer`, the service portal elements call. No default: the portal provides it, mapped to its server functions |
| `@buntu/sdk/admin` | `Admin`, the same for console elements, provided by the console |
| `@buntu/sdk/account` | `Account`, the service account area elements call, and the account's shapes (`AccountSummary`, `PostalAddress`, `ProfilePatch`, ...) |
| `@buntu/sdk/roles` | What each organization role may do, as the provider decides it, so pages offer only what it would accept |
| `@buntu/sdk/schemas/*` | Zod schemas for every form: `users`, `organizations`, `apps`, `team`, `catalogue`, `account`. Messages are i18n keys |
| `@buntu/sdk/webauthn` | `createPasskey`, `getPasskey`, `passkeysSupported`, `passkeyAutofillSupported`: the browser half of passkeys, converting the provider's JSON options |
| `@buntu/sdk/plugins` | The UI plugin interface: `definePlugin`, `PluginSection`, `PluginLook`, `PluginApi`, `sectionsOf`, `sectionOf`, `lookOf` |
| `@buntu/sdk/vite` | `idpUiPlugins()`, the Vite plugin that composes `IDP_UI_PLUGINS` into `virtual:idp-ui-plugins` |

Services are injection tokens from `@fluixi/di`. An element calls `inject(Account)`; the
app decides what that means by providing an implementation in its module. That is what keeps
elements free of any app: the same element works in the account area, a test, or another host.

## Building

Most entries are TypeScript sources, used as they are by the apps' bundlers. `@buntu/sdk/vite` is
the exception: a Vite config is loaded by Node, which does not read TypeScript, so it is built
to `dist/`:

```bash
pnpm build        # tsc -p tsconfig.build.json
```

The apps' `dev` and `build` scripts run this first.

## Changing a shape

When the provider's answer or rules change, change the SDK in the same commit: the type in
`types.ts` or `account.ts`, and the schema that mirrors the rule. Then typecheck the portal, the
console and `frontend`, which all depend on it.
