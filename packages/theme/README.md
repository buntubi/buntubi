# @idp/theme

The platform's skins, colours, fonts and colour scheme.

| Import | What |
|---|---|
| `@idp/theme/appearance` | `appearance`, the props for fluixi-ui's `AppearanceProvider`: every predefined skin (soft, fluixi, material, paper, glass), soft by default, each choice kept in an `idp-*` cookie so the server renders it. `SKINS` and `DEFAULT_SKIN` list them |
| `@idp/theme/tokens.css` | The `--idp-*` tokens, each pointing at the active skin's `--flx-ui-*` token, plus the page's ground and type |
| `@idp/theme/fonts.css` | Geist and Geist Mono, self-hosted |
| `@idp/theme/document` | `createDocumentScheme()`: light, dark or the system's, kept in the `idp-scheme` cookie, for pages that offer no skin choice (the sign-in pages) |

An app wraps its root in `<AppearanceProvider {...appearance}>` and imports every skin's
stylesheet; the theme menu in `@idp/shell` switches between them. The provider picks the skin of
its own pages the same way: the reader's `idp-skin` cookie, else `IDP_BRAND_SKIN` (soft when
unset), and on a client's sign-in pages that client's own skin.

Elements and frames use fluixi-ui's components and tokens, never a raw colour, so changing the
skin restyles all of them. The `--idp-*` names remain for the views that still read them.

Create the provider or the scheme inside the render (the app root, or `render`'s callback), not
at module level: outside an owner nothing applies it, and a reload falls back to the default.
