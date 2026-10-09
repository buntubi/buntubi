"""Plugins: the catalogue as code, claims and audiences in tokens, refusals, checks and events."""

import base64
import json
from collections.abc import Iterator
from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from test_console_api import admin_call, setup_people
from test_developer_api import LIVE_FIELDS, call
from test_platform_gates import authorize

from idp import plugins
from idp.db import db
from idp.models import ApiProduct, AuditEvent, Client, Scope, User
from idp.plugins import Catalogue, LiveCheck, Localized, Plugin, Product, ScopeSpec
from idp.plugins.sync import CatalogueError, sync
from idp.services import mail

from conftest import REDIRECT, api, page_config

ORDERS = Product(
    slug="shop-orders",
    names=Localized("Commandes", "Orders"),
    descriptions=Localized("Lire les commandes", "Read orders"),
    resource="https://api.shop.example",
)
READ = ScopeSpec(
    "shop.orders:read", Localized("Voir vos commandes", "See your orders"), product="shop-orders"
)
WRITE = ScopeSpec(
    "shop.orders:write", Localized("Gérer vos commandes", "Manage your orders"), "sensitive", "shop-orders"
)


class ShopPlugin(Plugin):
    id = "shop"
    version = "1.0.0"

    def __init__(self) -> None:
        self.declared = Catalogue(products=(ORDERS,), scopes=(READ, WRITE))
        self.events: list[tuple[str, dict[str, Any]]] = []
        self.refuse: str | None = None
        self.checks: list[LiveCheck] = []

    def catalogue(self) -> Catalogue:
        return self.declared

    def token_claims(self, client: Client, user: User | None, scopes: list[str]) -> dict[str, Any]:
        # `sub` is the provider's to set: it is dropped.
        return {"shop_tier": "gold", "sub": "someone-else"}

    def scope_refusal(self, client: Client, scopes: list[str]) -> str | None:
        return self.refuse if "shop.orders:write" in scopes else None

    def live_checks(self, client: Client) -> list[LiveCheck]:
        return self.checks

    def on_event(self, name: str, payload: dict[str, Any]) -> None:
        self.events.append((name, payload))

    def page_brand(self, client: Client | None, brand: dict[str, Any]) -> dict[str, Any]:
        return (
            {"look": "shop", "tagline": "Ship it", "secret": "dropped"}
            if client is None
            else {"look": "Not A Slug"}
        )


@pytest.fixture
def shop(app: Flask) -> Iterator[ShopPlugin]:
    plugin = ShopPlugin()
    plugins.use([plugin])
    with app.app_context():
        sync([plugin])
    yield plugin
    plugins.use([])
    with app.app_context():
        db().query(Scope).filter(Scope.managed_by == "shop").delete()
        db().query(ApiProduct).filter(ApiProduct.managed_by == "shop").delete()
        db().query(Scope).filter(Scope.name == "shop.local").delete()
        db().commit()


def claims_of(token: str) -> dict[str, Any]:
    payload = token.split(".")[1]
    result: dict[str, Any] = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    return result


def test_sync_writes_the_catalogue_and_marks_it_managed(app: Flask, shop: ShopPlugin) -> None:
    with app.app_context():
        product = db().get(ApiProduct, "shop-orders")
        scope = db().get(Scope, "shop.orders:write")
        assert product is not None and product.managed_by == "shop" and product.names["en"] == "Orders"
        assert scope is not None and scope.sensitivity == "sensitive"
        assert scope.resource == "https://api.shop.example", "the scope opens its product's API"
        assert not sync([shop]), "a second sync changes nothing"


def test_a_scope_no_longer_declared_is_deprecated_then_restored(app: Flask, shop: ShopPlugin) -> None:
    shop.declared = Catalogue(products=(ORDERS,), scopes=(READ,))
    with app.app_context():
        report = sync([shop])
        assert report.deprecated == ["scope shop.orders:write"]
        scope = db().get(Scope, "shop.orders:write")
        assert scope is not None and scope.deprecated_at is not None, "kept for the apps holding it"
        assert db().query(AuditEvent).filter_by(event="catalogue.deprecated").count() == 1
    shop.declared = Catalogue(products=(ORDERS,), scopes=(READ, WRITE))
    with app.app_context():
        assert sync([shop]).restored == ["scope shop.orders:write"]


def test_a_console_entry_is_adopted_and_two_owners_are_refused(app: Flask, shop: ShopPlugin) -> None:
    with app.app_context():
        db().add(Scope(name="shop.local", sensitivity="public", descriptions={}))
        db().commit()
        local = ScopeSpec("shop.local", Localized("Local", "Local"))
        shop.declared = Catalogue(products=(ORDERS,), scopes=(READ, WRITE, local))
        assert sync([shop]).adopted == ["scope shop.local"]

        other = ShopPlugin()
        other.id = "other"
        with pytest.raises(CatalogueError, match="declared by shop and other"):
            sync([shop, other])


def test_the_console_cannot_edit_a_managed_entry(
    app: Flask, outbox: list[mail.Message], shop: ShopPlugin
) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    refused = admin_call(owner_browser, owner, "PATCH", "/scopes/shop.orders:read", {"notes": "x"})
    assert refused.status_code == 409 and refused.json == {"error": "managed_by_plugin", "plugin": "shop"}
    listed = admin_call(owner_browser, owner, "GET", "/plugins").json["items"]
    assert listed == [
        {
            "id": "shop",
            "version": "1.0.0",
            "products": ["shop-orders"],
            "scopes": ["shop.orders:read", "shop.orders:write"],
            "ui": {},
        }
    ]
    scopes = {s["name"]: s for s in admin_call(owner_browser, owner, "GET", "/scopes").json["items"]}
    assert scopes["shop.orders:read"]["managed_by"] == "shop"


def new_app(dev_browser: FlaskClient, dev: dict[str, str], scopes: list[str]) -> Any:
    organization_id = call(
        dev_browser, dev, "POST", "/organizations", {"name": "Shop", "support_email": "help@shop.example"}
    ).json["organization"]["id"]
    return call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": [REDIRECT], "scopes": scopes, **LIVE_FIELDS},
    )


def test_tokens_are_minted_for_the_api_and_carry_plugin_claims(
    app: Flask, outbox: list[mail.Message], shop: ShopPlugin
) -> None:
    _, _, dev_browser, dev = setup_people(app, outbox)
    client_id = new_app(dev_browser, dev, ["shop.orders:read"]).json["app"]["client_id"]
    first, verifier = authorize(dev_browser, client_id, scope="openid shop.orders:read")
    csrf = page_config(dev_browser, first.location)["csrf"]
    decision = api(
        dev_browser, "POST", f"/oauth/authorize?{urlparse(first.location).query}", {"approve": True}, csrf
    )
    code = parse_qs(urlparse(decision.json["redirect"]).query)["code"][0]
    tokens = dev_browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    ).json
    claims = claims_of(tokens["access_token"])
    assert claims["aud"] == [client_id, "https://api.shop.example"], "the app first, then the API"
    assert claims["shop_tier"] == "gold"
    assert claims["sub"] != "someone-else", "a registered claim stays the provider's"


def test_a_plugin_refuses_scopes_and_a_deprecated_scope_goes_to_nobody_new(
    app: Flask, outbox: list[mail.Message], shop: ShopPlugin
) -> None:
    _, _, dev_browser, dev = setup_people(app, outbox)
    shop.refuse = "Writing orders needs a partner contract."
    refused = new_app(dev_browser, dev, ["shop.orders:write"])
    assert refused.status_code == 422 and refused.json["reason"] == "Writing orders needs a partner contract."

    shop.declared = Catalogue(products=(ORDERS,), scopes=(READ,))
    with app.app_context():
        sync([shop])
    assert new_app(dev_browser, dev, ["shop.orders:write"]).json["error"] == "deprecated_scope"
    listed = call(dev_browser, dev, "GET", "/products").json["items"]
    orders = next(item for item in listed if item["slug"] == "shop-orders")
    assert [s["name"] for s in orders["scopes"]] == ["shop.orders:read"], "offered without the deprecated one"


def test_a_required_plugin_check_holds_the_app_back(
    app: Flask, outbox: list[mail.Message], shop: ShopPlugin
) -> None:
    _, _, dev_browser, dev = setup_people(app, outbox)
    client_id = new_app(dev_browser, dev, ["shop.orders:read"]).json["app"]["client_id"]
    shop.checks = [
        LiveCheck("shop_contract", Localized("Contrat signé", "Contract signed"), "todo", required=True)
    ]
    checks = call(dev_browser, dev, "GET", f"/apps/{client_id}/overview").json["checks"]
    assert {"key": "shop_contract", "state": "todo", "items": [], "required": True} | {
        "label": {"fr": "Contrat signé", "en": "Contract signed"}
    } in checks
    refused = call(dev_browser, dev, "POST", f"/apps/{client_id}/publish", {})
    assert refused.status_code == 422 and refused.json["checks"] == ["shop_contract"]


def test_plugins_hear_what_happens(app: Flask, outbox: list[mail.Message], shop: ShopPlugin) -> None:
    _, _, dev_browser, dev = setup_people(app, outbox)
    new_app(dev_browser, dev, ["shop.orders:read"])
    names = [name for name, _ in shop.events]
    assert "account.created" in names and "organization.created" in names and "app.created" in names


def test_a_plugin_gives_the_sign_in_pages_their_look(app: Flask, shop: ShopPlugin) -> None:
    page = app.test_client().get("/signin").get_data(as_text=True)
    assert 'data-look="shop"' in page
    assert '"tagline": "Ship it"' in page and "dropped" not in page, "only brand keys pass"
