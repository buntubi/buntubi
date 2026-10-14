"""Plugins misbehaving: a hook that raises leaves nothing half done, and only a hook that shapes
how things look may be skipped; two catalogue syncs at once; a plugin with a strange name; the
protections a plugin's own routes get from the helpers."""

import threading
from importlib.metadata import EntryPoint
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Blueprint, Flask, jsonify
from flask.testing import FlaskClient
from sqlalchemy import func, select
from test_developer_api import developer_token

from buntubi import plugins
from buntubi.app import create_app
from buntubi.config import get_settings
from buntubi.db import db
from buntubi.models import AuthorizationCode, Client, Scope
from buntubi.plugins import Catalogue, Localized, Plugin, Product, ScopeSpec, require_admin, require_developer
from buntubi.plugins.sync import sync
from buntubi.services import mail

from conftest import REDIRECT, add_client, authorize_query, pkce, sign_up


class Broken(Plugin):
    id = "broken"
    version = "1"

    def __init__(self, *failing: str) -> None:
        self.failing = set(failing)

    def _fail(self, hook: str) -> None:
        if hook in self.failing:
            raise RuntimeError(f"{hook} is broken")

    def token_claims(self, client: Any, user: Any, scopes: list[str]) -> dict[str, Any]:
        self._fail("token_claims")
        return {}

    def scope_refusal(self, client: Any, scopes: list[str]) -> str | None:
        self._fail("scope_refusal")
        return None

    def page_brand(self, client: Any, brand: dict[str, Any]) -> dict[str, Any]:
        self._fail("page_brand")
        return {}

    def ui(self) -> dict[str, Any]:
        self._fail("ui")
        return {}

    def on_event(self, name: str, payload: dict[str, Any]) -> None:
        self._fail("on_event")


@pytest.fixture
def broken() -> Any:
    def use(*failing: str) -> Broken:
        plugin = Broken(*failing)
        plugins.use([plugin])
        return plugin

    yield use
    plugins.use([])


# A hook that only shapes how things look may fail without taking the page down.


def test_a_broken_look_does_not_break_sign_in(app: Flask, browser: FlaskClient, broken: Any) -> None:
    broken("page_brand")
    assert browser.get("/signin").status_code == 200


def test_a_broken_ui_hook_does_not_break_the_plugin_listings(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], broken: Any
) -> None:
    broken("ui")
    bearer = developer_token(app, browser, outbox, "dev@example.test")
    browser.post("/developer/api/terms", headers=bearer)
    listed = browser.get("/developer/api/plugins", headers=bearer)
    assert listed.status_code == 200 and listed.json["items"][0]["id"] == "broken"


def test_a_broken_listener_does_not_stop_the_request(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], broken: Any
) -> None:
    broken("on_event")
    sign_up(browser, outbox)  # account.created reaches the broken listener


# A hook that decides something fails the request, and leaves nothing behind.


def test_a_broken_claims_hook_issues_nothing_and_keeps_the_code(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], broken: Any
) -> None:
    plugin = broken("token_claims")
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    verifier, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    code = parse_qs(urlparse(reply.location).query)["code"][0]
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT,
        "client_id": "spa",
        "code_verifier": verifier,
    }
    # Tests re-raise what a server would answer 500 for.
    with pytest.raises(RuntimeError):
        app.test_client().post("/oauth/token", data=form)
    with app.app_context():
        row = db().scalar(select(AuthorizationCode))
        assert row is not None and row.used_at is None, "the failed request used nothing up"
    plugin.failing.clear()
    assert app.test_client().post("/oauth/token", data=form).status_code == 200


def test_a_broken_refusal_hook_creates_no_app(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], broken: Any
) -> None:
    bearer = developer_token(app, browser, outbox, "dev@example.test")
    browser.post("/developer/api/terms", headers=bearer)
    organization_id = browser.post(
        "/developer/api/organizations", json={"name": "Shop"}, headers=bearer
    ).json["organization"]["id"]
    broken("scope_refusal")
    with pytest.raises(RuntimeError):
        browser.post(
            f"/developer/api/organizations/{organization_id}/apps",
            json={"name": "Web", "redirect_uris": [REDIRECT]},
            headers=bearer,
        )
    with app.app_context():
        assert db().scalar(select(func.count()).select_from(Client).where(Client.name == "Web")) == 0


# The catalogue sync.


class Catalogued(Plugin):
    id = "catalogued"
    version = "1"

    def catalogue(self) -> Catalogue:
        return Catalogue(
            products=(
                Product(
                    "cat-items", Localized("Articles", "Items"), Localized("x", "x"), "https://cat.example"
                ),
            ),
            scopes=tuple(
                ScopeSpec(f"cat.items:{n}", Localized("Voir", "See"), "public", "cat-items")
                for n in range(20)
            ),
        )


def test_two_syncs_at_once_both_finish_and_write_each_row_once(app: Flask) -> None:
    errors: list[BaseException] = []
    start = threading.Barrier(2)

    def run() -> None:
        try:
            start.wait()
            with app.app_context():
                sync([Catalogued()])
        except BaseException as error:  # noqa: BLE001
            errors.append(error)

    threads = [threading.Thread(target=run) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert errors == [], errors
    with app.app_context():
        assert (
            db().scalar(select(func.count()).select_from(Scope).where(Scope.managed_by == "catalogued")) == 20
        )
        assert not sync([Catalogued()]), "a second sync changes nothing"
        db().query(Scope).filter(Scope.managed_by == "catalogued").delete()
        db().execute(Scope.__table__.delete().where(Scope.managed_by == "catalogued"))
        from buntubi.models import ApiProduct

        db().query(ApiProduct).filter(ApiProduct.managed_by == "catalogued").delete()
        db().commit()


# Loading.


@pytest.mark.parametrize("name", ["Shop", "shop plugin", "../admin", "a" * 41, ""])
def test_a_plugin_name_must_be_a_plain_slug(monkeypatch: pytest.MonkeyPatch, name: str) -> None:
    class Odd(Plugin):
        id = name
        version = "1"

    point = EntryPoint(name=name, value="x:y", group=plugins.ENTRY_POINT_GROUP)
    monkeypatch.setattr(plugins, "entry_points", lambda group: [point])
    monkeypatch.setattr(EntryPoint, "load", lambda self: Odd)
    with pytest.raises(RuntimeError):
        plugins.load([name])


# A plugin's own routes.


def _app_with_routes() -> Flask:
    bp = Blueprint("guarded", __name__)

    @bp.get("/admin-only")
    @require_admin
    def admin_only_view(admin: Any) -> Any:
        return jsonify(ok=True)

    @bp.get("/developers")
    @require_developer
    def developers_view(me: Any) -> Any:
        return jsonify(ok=True)

    fresh = create_app(get_settings())
    fresh.register_blueprint(bp, url_prefix="/api/plugins/guarded")
    return fresh


def test_a_plugin_route_gets_its_protection_from_the_helpers(app: Flask, outbox: list[mail.Message]) -> None:
    fresh = _app_with_routes()
    fresh.config["TESTING"] = True
    client = fresh.test_client()
    assert client.get("/api/plugins/guarded/admin-only").status_code == 401
    assert client.get("/api/plugins/guarded/developers").status_code == 401
    bearer = developer_token(app, app.test_client(), outbox, "dev@example.test")
    assert client.get("/api/plugins/guarded/admin-only", headers=bearer).status_code in (401, 403)
    assert client.get("/api/plugins/guarded/developers", headers=bearer).json["error"] == "terms_required"
