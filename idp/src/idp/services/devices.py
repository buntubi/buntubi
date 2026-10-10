"""What a person sees of a browser: "Chrome on macOS", from its user agent. Never used to decide access."""

import re

# Order matters: Edge and Opera also say Chrome, Chrome also says Safari.
_BROWSERS = (
    (r"Edg(e|A|iOS)?/", "Edge"),
    (r"OPR/|Opera", "Opera"),
    (r"SamsungBrowser/", "Samsung Internet"),
    (r"Firefox/|FxiOS/", "Firefox"),
    (r"Chrome/|CriOS/", "Chrome"),
    (r"Safari/", "Safari"),
)
_SYSTEMS = (
    (r"iPhone", "iPhone"),
    (r"iPad", "iPad"),
    (r"Android", "Android"),
    (r"CrOS", "ChromeOS"),
    (r"Windows", "Windows"),
    (r"Mac OS X|Macintosh", "macOS"),
    (r"Linux", "Linux"),
)


def describe(user_agent: str | None) -> dict[str, str]:
    """`browser` and `system`, each empty when unknown."""
    text = user_agent or ""
    browser = next((name for pattern, name in _BROWSERS if re.search(pattern, text)), "")
    system = next((name for pattern, name in _SYSTEMS if re.search(pattern, text)), "")
    return {"browser": browser, "system": system}
