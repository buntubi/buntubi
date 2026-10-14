"""Scopes from the catalogue to a token: an app gets only what it holds, a live app only the
sensitive scopes its own review approved, checked at every issuance; a scope reclassified as
sensitive sends the live apps holding it back to review, whether an admin or a plugin did it."""

from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from sqlalchemy import select, update
from test_console_api import admin_call, setup_people
from test_developer_api import call

from buntubi.db import db
from buntubi.models import Client
from buntubi.plugins import Catalogue, Localized, Plugin, Product, ScopeSpec
from buntubi.plugins.sync import sync
from buntubi.services import mail

from conftest import REDIRECT, api, authorize_query, pkce, sign_up


def _dev_app(app: Flask, outbox: list[mail.Message], scopes: list[str], *, live: bool) -> tuple[Any, ...]:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    organization_id = call(dev_browser, dev, "POST", "/organizations", {"name": "Shop"}).json["organization"][
        "id"
    ]
    made = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Shop web", "redirect_uris": [REDIRECT], "scopes": scopes},
    )
    assert made.status_code == 201, made.json
    client_id = made.json["app"]["client_id"]
    if live:
        with app.app_context():
            db().execute(update(Client).where(Client.client_id == client_id).values(environment="live"))
            db().commit()
    return owner_browser, owner, dev_browser, dev, client_id


def _granted(app: Flask, outbox: list[mail.Message], client_id: str, scope: str, email: str) -> set[str]:
    """A visitor signs in to the app with consent; the scopes their token carries."""
    visitor = app.test_client()
    csrf = sign_up(visitor, outbox, email=email)
    verifier, challenge = pkce()
    query = authorize_query(challenge, client_id=client_id, scope=scope)
    first = visitor.get("/oauth/authorize?" + urlencode(query))
    if urlparse(first.location or "").path == "/consent":
        answer = api(visitor, "POST", "/oauth/authorize?" + urlencode(query), {"approve": True}, csrf).json
        location = answer["redirect"]
    else:
        location = first.location
    code = parse_qs(urlparse(location).query)["code"][0]
    tokens = visitor.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    ).json
    return set(tokens["scope"].split())


def _state(app: Flask, client_id: str) -> tuple[str, str]:
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == client_id))
        assert client is not None
        return client.environment, client.review_status


def test_a_token_carries_only_what_the_app_holds(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    *_, client_id = _dev_app(app, outbox, ["profile"], live=True)
    granted = _granted(app, outbox, client_id, "openid profile email billing.read nope", "a@example.test")
    assert granted == {"openid", "profile"}, "unknown and unheld scopes are dropped"


def test_a_live_app_does_not_get_a_sensitive_scope_it_was_not_approved_for(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    # However the app came to hold it unreviewed (data written by hand, an old migration),
    # issuance checks its own approval.
    *_, client_id = _dev_app(app, outbox, ["profile", "billing.write"], live=True)
    assert _granted(app, outbox, client_id, "openid profile billing.write", "b@example.test") == {
        "openid",
        "profile",
    }
    with app.app_context():
        db().execute(
            update(Client).where(Client.client_id == client_id).values(approved_scopes=["billing.write"])
        )
        db().commit()
    assert "billing.write" in _granted(
        app, outbox, client_id, "openid profile billing.write", "c@example.test"
    )


def test_a_sandbox_app_uses_its_sensitive_scopes_with_its_own_people(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    _, _, dev_browser, dev, client_id = _dev_app(app, outbox, ["profile", "billing.write"], live=False)
    with app.app_context():
        organization_id = str(
            db().scalar(select(Client.organization_id).where(Client.client_id == client_id))
        )
    call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/test-users",
        {"email": "tester@example.test"},
    )
    assert "billing.write" in _granted(app, outbox, client_id, "openid billing.write", "tester@example.test")


def test_a_scope_an_admin_makes_sensitive_sends_live_apps_back_to_review(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    owner_browser, owner, *_, client_id = _dev_app(app, outbox, ["profile", "billing.read"], live=True)
    assert "billing.read" in _granted(app, outbox, client_id, "openid billing.read", "d@example.test")
    changed = admin_call(owner_browser, owner, "PATCH", "/scopes/billing.read", {"sensitivity": "sensitive"})
    assert changed.status_code == 200, changed.json
    assert _state(app, client_id) == ("sandbox", "pending")
    assert client_id in [
        a["client_id"] for a in admin_call(owner_browser, owner, "GET", "/reviews").json["items"]
    ]


class _Shop(Plugin):
    id = "shop"
    version = "1"

    def __init__(self, sensitivity: str) -> None:
        self.sensitivity = sensitivity

    def catalogue(self) -> Catalogue:
        return Catalogue(
            products=(
                Product(
                    "shop-orders",
                    Localized("Commandes", "Orders"),
                    Localized("x", "x"),
                    "https://shop.example",
                ),
            ),
            scopes=(ScopeSpec("orders:read", Localized("Voir", "See"), self.sensitivity, "shop-orders"),),
        )


def test_a_scope_a_plugin_makes_sensitive_sends_live_apps_back_to_review(
    app: Flask, outbox: list[mail.Message]
) -> None:
    with app.app_context():
        sync([_Shop("public")])
    *_, client_id = _dev_app(app, outbox, ["profile", "orders:read"], live=True)
    with app.app_context():
        sync([_Shop("sensitive")])
    assert _state(app, client_id) == ("sandbox", "pending")
