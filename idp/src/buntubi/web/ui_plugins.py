"""
UI plugins mounted for the sign-in pages: the folder `IDP_UI_PLUGINS_DIR`, one subfolder per
plugin as `buntubi-ui-plugin build` wrote it. Read once when the app starts; the pages import
each plugin's browser half from `/ui-plugins/<folder>/browser/`, and its imports of the modules
the pages share resolve through the import map the pages' build wrote (`static/idp/share.json`).

The same rules as `@buntubi/sdk/runtime/server`, which the console and the portal use: plugins
are the operator's code, trusted like the Python plugins, and only files inside a mounted
plugin's `browser/` folder are ever served.
"""

import base64
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

from flask import Blueprint, Response, abort, current_app, send_file

bp = Blueprint("ui_plugins", __name__)

_ID = re.compile(r"^[a-z][a-z0-9-]*$")
_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
}


@dataclass(frozen=True)
class MountedUiPlugin:
    folder: str
    id: str
    version: str
    browser: str


@dataclass(frozen=True)
class UiPlugins:
    """What the pages need: the plugins, and the import map that resolves their shared imports."""

    dir: Path | None
    plugins: tuple[MountedUiPlugin, ...]
    import_map: str | None
    import_map_hash: str | None

    def index(self) -> dict[str, Any]:
        """The index the page loads the plugins from, in their order (the first one's views win)."""
        return {
            "plugins": [
                {"id": p.id, "version": p.version, "browser": f"/ui-plugins/{quote(p.folder)}/{p.browser}"}
                for p in self.plugins
            ]
        }


def load(directory: Path | None, share_file: Path) -> UiPlugins:
    """
    The plugins mounted in `directory`, ordered by folder name, and the pages' import map.

    Raises RuntimeError on a manifest that is missing or incomplete, two plugins with one id, or
    a plugin importing a module the pages do not share: the app refuses to start rather than
    serve pages that cannot load.
    """
    import_map = share_file.read_text().strip().replace("<", "\\u003c") if share_file.is_file() else None
    shared = set(json.loads(import_map)["imports"]) if import_map else set()
    plugins: list[MountedUiPlugin] = []
    if directory is not None and directory.is_dir():
        for folder in sorted(p for p in directory.iterdir() if p.is_dir() and not p.name.startswith(".")):
            where = folder / "manifest.json"
            try:
                manifest = json.loads(where.read_text())
            except (OSError, ValueError) as error:
                raise RuntimeError(
                    f"{where} is missing or not JSON: build the plugin with buntubi-ui-plugin"
                ) from error
            plugin_id, browser = manifest.get("id"), manifest.get("browser")
            if not isinstance(plugin_id, str) or not _ID.fullmatch(plugin_id) or not isinstance(browser, str):
                raise RuntimeError(f"{where} lacks an id or a browser entry")
            if any(p.id == plugin_id for p in plugins):
                raise RuntimeError(f'two mounted UI plugins have the id "{plugin_id}"')
            missing = sorted(set(manifest.get("shared", [])) - shared)
            if missing:
                raise RuntimeError(
                    f'the UI plugin "{plugin_id}" needs {", ".join(missing)}, which these pages do not share'
                )
            plugins.append(MountedUiPlugin(folder.name, plugin_id, str(manifest.get("version", "")), browser))
    digest = None
    if import_map and plugins:
        digest = base64.b64encode(hashlib.sha256(import_map.encode()).digest()).decode()
    # Without plugins nothing needs the map: the page stays as it was, and so does its CSP.
    return UiPlugins(directory, tuple(plugins), import_map if plugins else None, digest)


def current() -> UiPlugins:
    plugins: UiPlugins = current_app.extensions["ui_plugins"]
    return plugins


def script_src() -> str:
    """The pages' `script-src`: this origin, and the import map by its hash when there is one."""
    digest = current().import_map_hash
    return "'self'" + (f" 'sha256-{digest}'" if digest else "")


@bp.get("/ui-plugins/<path:path>")
def serve(path: str) -> Response:
    plugins = current()
    parts = path.split("/")
    if plugins.dir is None or len(parts) < 3 or parts[1] != "browser":
        abort(404)
    if any(not p or p.startswith(".") or "\\" in p for p in parts):
        abort(404)
    if parts[0] not in {p.folder for p in plugins.plugins}:
        abort(404)
    base = (plugins.dir / parts[0] / "browser").resolve()
    file = (base / Path(*parts[2:])).resolve()
    mimetype = _TYPES.get(file.suffix)
    if not file.is_relative_to(base) or file == base or mimetype is None or not file.is_file():
        abort(404)
    response = send_file(file, mimetype=mimetype, conditional=True)
    # Chunks and assets carry a hash in their name; an entry keeps its name across versions.
    hashed = len(parts) > 3
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable" if hashed else "no-cache"
    return response
