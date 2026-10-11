# @idp/skin

The platform's skin for fluixi-ui: what the design draws differently from fluixi-ui's defaults.
Type (Geist), control sizes, radii, borders, the focus ring, and each control's states. Colours
stay with the `--idp-*` tokens of `@idp/theme`.

| Import | What |
|---|---|
| `@idp/skin/styles.css` | The skin, active under `data-ui="idp"` on `<html>` |
| `@idp/skin/fonts.css` | The Geist faces it uses |

The rules sit in the `flx.skin` cascade layer, above `flx.components`. fluixi-ui writes its
states (hover, active, focus) at zero specificity, so a skin rule that changes a control's
resting look also restates every state it affects, in that order: the resting rule, then hover,
then active.

When the design needs a control to look different, change it here, never in an element or a
page: app CSS is unlayered and would win over every skin, including a deployment's own.
