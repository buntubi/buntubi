# @idp/theme

The platform's colours, and the colour scheme switch.

| Import | What |
|---|---|
| `@idp/theme/tokens.css` | The `--idp-*` design tokens (accent, surfaces, borders, text, states, radius, shadow), light by default and dark under `[data-theme='dark']`, mapped onto fluixi-ui's `--flx-ui-*` tokens |
| `@idp/theme/document` | `createDocumentScheme()`: light, dark or the system's, kept in the `idp-scheme` cookie so the server renders the visitor's choice |

Every element and frame reads these tokens, never a raw colour. A deployment restyles the whole
platform by overriding them, and a brand only sets `--idp-accent`.

Create the scheme inside the render (the app root, or `render`'s callback), not at module level:
outside an owner nothing applies it, and a reload falls back to the default.
