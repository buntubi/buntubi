# @idp/shell

The frames the portal and the console are drawn in. The apps differ in what they show, not in
how they are framed, so the frames live here and take everything app-specific as data: the
sidebar's items, the breadcrumb, the signed-in person, the brand.

| Import | What |
|---|---|
| `@idp/shell/shell` | The workspace frame: a sidebar with the signed-in person at its foot, a top bar with the breadcrumb and the theme, and the page |
| `@idp/shell/focused` | The frame for a focused flow, such as creating an app: the brand and the flow's name, the theme, a way out, no sidebar |
| `@idp/shell/public-frame` | The pages outside a workspace (welcome, developer terms, a first organization): the focused bar over one centred column |
| `@idp/shell/sticky-head` | A list page's title and search, kept in view while the list scrolls; writes its height to `--idp-head` so table headings stick under it |
| `@idp/shell/theme-toggle` | The light, dark or system menu, the same in every frame |
| `@idp/shell/brand` | The platform's brand, loaded once by the root layout and read by every frame |
| `@idp/shell/preferences` | The visitor's choices kept in a cookie, so the server renders with them: language, folded sidebar, current organization |
| `@idp/shell/icons` | Stroke icons as SVG paths in a 24 by 24 box |

The frames are Fluixi components built from fluixi-ui; they read the `--idp-*` tokens from
`@idp/theme` and take the `idp` skin from `@idp/skin`.
