"""
UI plugins mounted for the sign-in pages: which are loaded and in what order, what makes the
provider refuse to start, that only a plugin's browser files are served, and that the page's
import map is allowed by its hash and by nothing broader.
"""

import base64
import hashlib
import json
import re
from collections.abc import Iterator
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient

from buntubi.web import ui_plugins

SHARE = {"imports": {"@fluixi/core": "/static/idp/assets/share/fluixi-core-abc.js"}}


def mount(root: Path, folder: str, **manifest: object) -> None:
    base = root / folder
    (base / "browser" / "chunks").mkdir(parents=True)
    (base / "server").mkdir()
    (base / "browser" / "index.js").write_text("export const plugin = {};")
    (base / "browser" / "chunks" / "page-abc.js").write_text("export {};")
    (base / "browser" / "notes.txt").write_text("not served")
    (base / "browser" / ".env").write_text("TOKEN=x")
    (base / "server" / "index.js").write_text("export const plugin = {};")
    plugin_id = folder.split("-", 1)[-1] if folder[0].isdigit() else folder
    (base / "manifest.json").write_text(
        json.dumps(
            {
                "id": plugin_id,
                "version": "1.0.0",
                "browser": "browser/index.js",
                "server": "server/index.js",
                "shared": ["@fluixi/core"],
                **manifest,
            }
        )
    )


@pytest.fixture
def share_file(tmp_path: Path) -> Path:
    file = tmp_path / "share.json"
    file.write_text(json.dumps(SHARE))
    return file


@pytest.fixture
def mounted(app: Flask, tmp_path: Path, share_file: Path) -> Iterator[Path]:
    """The app with plugins read from a folder of the test's, put back as it was after."""
    root = tmp_path / "ui-plugins"
    root.mkdir()
    saved = app.extensions["ui_plugins"]
    app.extensions["ui_plugins"] = ui_plugins.load(root, share_file)
    yield root
    app.extensions["ui_plugins"] = saved


def reload(app: Flask, root: Path, share_file: Path) -> None:
    app.extensions["ui_plugins"] = ui_plugins.load(root, share_file)


def test_plugins_are_read_in_folder_order(tmp_path: Path, share_file: Path) -> None:
    mount(tmp_path, "20-zeta")
    mount(tmp_path, "10-acme")
    loaded = ui_plugins.load(tmp_path, share_file)
    assert [p.id for p in loaded.plugins] == ["acme", "zeta"]
    assert loaded.index()["plugins"][0]["browser"] == "/ui-plugins/10-acme/browser/index.js"


def test_no_folder_means_no_plugins_and_no_import_map(tmp_path: Path, share_file: Path) -> None:
    loaded = ui_plugins.load(None, share_file)
    assert loaded.plugins == () and loaded.import_map is None and loaded.import_map_hash is None
    assert ui_plugins.load(tmp_path / "absent", share_file).plugins == ()


@pytest.mark.parametrize(
    ("folders", "error"),
    [
        ({"acme": {"id": "Acme!"}}, "lacks an id"),
        ({"10-acme": {}, "20-acme": {}}, 'two mounted UI plugins have the id "acme"'),
        ({"acme": {"shared": ["@fluixi/core", "@fluixi/core/i18n"]}}, "needs @fluixi/core/i18n"),
    ],
)
def test_a_bad_mount_stops_the_start(
    tmp_path: Path, share_file: Path, folders: dict[str, dict[str, object]], error: str
) -> None:
    for folder, manifest in folders.items():
        mount(tmp_path, folder, **manifest)
    with pytest.raises(RuntimeError, match=re.escape(error)):
        ui_plugins.load(tmp_path, share_file)


@pytest.mark.parametrize(
    "browser", ["../outside.js", "server/index.js", "browser/../../x.js", "/etc/passwd", "browser/x.css"]
)
def test_a_browser_entry_outside_the_browser_folder_stops_the_start(
    tmp_path: Path, share_file: Path, browser: str
) -> None:
    mount(tmp_path, "acme", browser=browser)
    with pytest.raises(RuntimeError, match="entry"):
        ui_plugins.load(tmp_path, share_file)


def test_a_link_out_of_the_browser_folder_is_not_followed(
    app: Flask, browser: FlaskClient, mounted: Path, share_file: Path
) -> None:
    mount(mounted, "acme")
    (mounted / "secret.js").write_text("TOKEN=x")
    (mounted / "acme" / "browser" / "leak.js").symlink_to(mounted / "secret.js")
    reload(app, mounted, share_file)
    assert browser.get("/ui-plugins/acme/browser/leak.js").status_code == 404


def test_a_folder_without_a_manifest_stops_the_start(tmp_path: Path, share_file: Path) -> None:
    (tmp_path / "broken").mkdir()
    with pytest.raises(RuntimeError, match="missing or not JSON"):
        ui_plugins.load(tmp_path, share_file)


def test_only_a_mounted_plugins_browser_files_are_served(
    app: Flask, browser: FlaskClient, mounted: Path, share_file: Path
) -> None:
    mount(mounted, "acme")
    (mounted.parent / "outside.js").write_text("export {};")
    reload(app, mounted, share_file)
    entry = browser.get("/ui-plugins/acme/browser/index.js")
    assert entry.status_code == 200
    assert entry.mimetype == "text/javascript"
    assert entry.headers["Cache-Control"] == "no-cache"
    assert "immutable" in browser.get("/ui-plugins/acme/browser/chunks/page-abc.js").headers["Cache-Control"]
    for path in [
        "/ui-plugins/acme/server/index.js",
        "/ui-plugins/acme/manifest.json",
        "/ui-plugins/acme/browser/../server/index.js",
        "/ui-plugins/acme/browser/%2e%2e/server/index.js",
        "/ui-plugins/acme/browser/..%2fserver%2findex.js",
        "/ui-plugins/acme/browser/.env",
        "/ui-plugins/acme/browser/notes.txt",
        "/ui-plugins/other/browser/index.js",
        "/ui-plugins/../outside.js",
        "/ui-plugins/acme/browser",
        "/ui-plugins/acme/browser/missing.js",
    ]:
        assert browser.get(path).status_code == 404, path


def test_the_page_carries_the_import_map_allowed_by_its_hash(
    app: Flask, browser: FlaskClient, mounted: Path, share_file: Path
) -> None:
    mount(mounted, "acme")
    reload(app, mounted, share_file)
    response = browser.get("/signin")
    html = response.get_data(as_text=True)
    found = re.search(r'<script type="importmap">(.*?)</script>', html, re.S)
    assert found, "no import map in the page"
    assert html.index('type="importmap"') < html.index('type="module"')
    digest = base64.b64encode(hashlib.sha256(found.group(1).encode()).digest()).decode()
    assert f"script-src 'self' 'sha256-{digest}';" in response.headers["Content-Security-Policy"]
    index = re.search(r'<script type="application/json" id="idp-ui-plugins">(.*?)</script>', html, re.S)
    assert index and json.loads(index.group(1))["plugins"][0]["id"] == "acme"


def test_without_plugins_the_page_and_its_policy_are_unchanged(browser: FlaskClient) -> None:
    response = browser.get("/signin")
    html = response.get_data(as_text=True)
    assert 'type="importmap"' not in html and 'id="idp-ui-plugins"' not in html
    assert "script-src 'self';" in response.headers["Content-Security-Policy"]
