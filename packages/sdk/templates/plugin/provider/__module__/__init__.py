"""{{label}}'s provider plugin. Every hook of `Plugin` does nothing until overridden here."""

from typing import Any

from buntubi.plugins import Plugin


class {{className}}(Plugin):
    id = "{{id}}"
    version = "0.1.0"

    def ui(self) -> dict[str, Any]:
        """What the plugin's console page is given: anything JSON."""
        return {"name": "{{label}}"}
