"""The developer API: terms, membership, apps and their way to live, test users, API keys."""

from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient

from idp.db import db
from idp.services import mail

from conftest import REDIRECT, add_client, authorize_query, pkce, sign_up

LIVE_FIELDS = {
    "homepage_url": "https://shop.example/",
    "privacy_url": "https://shop.example/privacy",
    "terms_url": "https://shop.example/terms",
    "brand": {"logo": "https://shop.example/logo.png"},
}


def developer_token(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], email: str
) -> dict[str, str]:
    """Signs a new user up and returns bearer headers from the portal's own client."""
    with app.app_context():
        from idp.models import Client

        if db().query(Client).filter_by(client_id="portal").first() is None:
            add_client(app, client_id="portal", first_party=True, scope="openid profile email developer")
    sign_up(browser, outbox, email=email)
    verifier, challenge = pkce()
    query = authorize_query(challenge, client_id="portal", scope="openid developer")
    code = parse_qs(urlparse(browser.get("/oauth/authorize?" + urlencode(query)).location).query)["code"][0]
    reply = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "portal",
            "code_verifier": verifier,
        },
    )
    return {"Authorization": f"Bearer {reply.json['access_token']}"}


def call(browser: FlaskClient, bearer: dict[str, str], method: str, path: str, body: Any = None) -> Any:
    return browser.open("/developer/api" + path, method=method, json=body, headers=bearer)


@pytest.fixture
def dev(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> dict[str, str]:
    bearer = developer_token(app, browser, outbox, "dev@example.test")
    assert call(browser, bearer, "POST", "/terms").json == {"developer": True}
    return bearer


def new_organization(browser: FlaskClient, bearer: dict[str, str], **extra: Any) -> str:
    reply = call(browser, bearer, "POST", "/organizations", {"name": "Shop", **extra})
    assert reply.status_code == 201, reply.json
    organization_id: str = reply.json["organization"]["id"]
    return organization_id


def test_terms_come_first(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    bearer = developer_token(app, browser, outbox, "new@example.test")
    assert call(browser, bearer, "GET", "/me").json["developer"] is False
    assert call(browser, bearer, "GET", "/organizations").json == {"error": "terms_required"}
    assert call(browser, bearer, "POST", "/terms").status_code == 200
    assert call(browser, bearer, "GET", "/organizations").json == {"items": []}


def test_the_api_needs_the_developer_scope(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    verifier, challenge = pkce()
    code = parse_qs(
        urlparse(browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge))).location).query
    )["code"][0]
    token = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "spa",
            "code_verifier": verifier,
        },
    ).json["access_token"]
    assert call(browser, {"Authorization": f"Bearer {token}"}, "GET", "/me").status_code == 403


def test_an_organization_is_closed_to_outsiders(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], dev: dict[str, str]
) -> None:
    organization_id = new_organization(browser, dev)
    other_browser = app.test_client()
    other = developer_token(app, other_browser, outbox, "other@example.test")
    call(other_browser, other, "POST", "/terms")
    for method, path in (("GET", ""), ("PATCH", ""), ("DELETE", ""), ("POST", "/apps"), ("POST", "/keys")):
        reply = call(other_browser, other, method, f"/organizations/{organization_id}{path}", {"name": "x"})
        assert reply.status_code == 404, (method, path, reply.json)
    assert call(other_browser, other, "GET", "/organizations").json == {"items": []}
    assert call(browser, dev, "GET", "/organizations/not-a-uuid").status_code == 404


def test_an_app_starts_in_the_sandbox_and_goes_live(
    app: Flask, browser: FlaskClient, dev: dict[str, str]
) -> None:
    organization_id = new_organization(browser, dev)
    created = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://shop.example/cb"], "scopes": ["profile", "email"]},
    )
    assert created.status_code == 201, created.json
    app_json = created.json["app"]
    assert app_json["environment"] == "sandbox" and app_json["client_id"].startswith("app_")
    assert created.json["client_secret"] is None, "a public app has no secret"
    client_id = app_json["client_id"]

    missing = call(browser, dev, "POST", f"/apps/{client_id}/publish")
    assert missing.status_code == 422
    assert set(missing.json["fields"]) == {
        "homepage_url",
        "privacy_url",
        "terms_url",
        "logo",
        "support_email",
    }

    call(browser, dev, "PATCH", f"/apps/{client_id}", LIVE_FIELDS)
    call(browser, dev, "PATCH", f"/organizations/{organization_id}", {"support_email": "help@shop.example"})
    published = call(browser, dev, "POST", f"/apps/{client_id}/publish")
    assert published.json["state"] == "live" and published.json["app"]["environment"] == "live"


def test_a_sensitive_scope_waits_for_review(app: Flask, browser: FlaskClient, dev: dict[str, str]) -> None:
    organization_id = new_organization(browser, dev, support_email="help@shop.example")
    client_id = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://shop.example/cb"], "scopes": ["phone"], **LIVE_FIELDS},
    ).json["app"]["client_id"]
    unexplained = call(browser, dev, "POST", f"/apps/{client_id}/publish")
    assert unexplained.status_code == 422
    assert unexplained.json == {"error": "justification_required", "scopes": ["phone"]}
    published = call(
        browser, dev, "POST", f"/apps/{client_id}/publish", {"justifications": {"phone": "Reminders"}}
    )
    assert published.json["state"] == "pending"
    assert published.json["app"]["environment"] == "sandbox"
    assert published.json["app"]["review_status"] == "pending"


def test_restricted_and_unknown_scopes_are_refused(
    app: Flask, browser: FlaskClient, dev: dict[str, str]
) -> None:
    organization_id = new_organization(browser, dev)
    base = {"name": "Web", "redirect_uris": ["https://shop.example/cb"]}
    admin = call(
        browser, dev, "POST", f"/organizations/{organization_id}/apps", {**base, "scopes": ["admin"]}
    )
    assert admin.status_code == 422 and admin.json == {"error": "restricted_scope", "scopes": ["admin"]}
    unknown = call(
        browser, dev, "POST", f"/organizations/{organization_id}/apps", {**base, "scopes": ["nope"]}
    )
    assert unknown.json["error"] == "unknown_scope"
    public_cc = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {**base, "grant_types": ["client_credentials"]},
    )
    assert public_cc.json["error"] == "grant_not_allowed"


def test_a_confidential_app_rotates_its_secret(app: Flask, browser: FlaskClient, dev: dict[str, str]) -> None:
    organization_id = new_organization(browser, dev)
    created = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {
            "name": "Server",
            "client_type": "confidential",
            "redirect_uris": ["https://shop.example/cb"],
            "grant_types": ["authorization_code", "client_credentials"],
        },
    ).json
    first = created["client_secret"]
    assert first.startswith("cs_")
    client_id = created["app"]["client_id"]
    rotated = call(browser, dev, "POST", f"/apps/{client_id}/secrets").json
    assert rotated["client_secret"] != first
    secrets = rotated["app"]["secrets"]
    assert len(secrets) == 2 and all("hash" not in key for s in secrets for key in s)
    assert sum(1 for s in secrets if s["expires_at"]) == 1, "the old one gets a grace period"

    token = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": first},
    )
    assert token.status_code == 200, token.json
    old_id = next(s["id"] for s in secrets if s["prefix"] == first[:10])
    call(browser, dev, "DELETE", f"/apps/{client_id}/secrets/{old_id}")
    refused = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": first},
    )
    assert refused.status_code == 401


def test_api_keys(app: Flask, browser: FlaskClient, dev: dict[str, str], platform_scopes: None) -> None:
    organization_id = new_organization(browser, dev)
    sandbox = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/keys",
        {"name": "CI", "scopes": ["billing.read", "billing.write"]},
    )
    assert sandbox.status_code == 201, sandbox.json
    assert sandbox.json["api_key"].startswith("sk_test_")
    live_sensitive = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/keys",
        {"name": "Prod", "environment": "live", "scopes": ["billing.write"]},
    )
    assert live_sensitive.json == {"error": "review_required", "scopes": ["billing.write"]}
    live = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/keys",
        {"name": "Prod", "environment": "live", "scopes": ["billing.read"]},
    )
    assert live.json["api_key"].startswith("sk_live_")
    not_platform = call(
        browser, dev, "POST", f"/organizations/{organization_id}/keys", {"name": "x", "scopes": ["email"]}
    )
    assert not_platform.json["error"] == "not_a_platform_scope"

    listed = call(browser, dev, "GET", f"/organizations/{organization_id}").json["keys"]
    assert len(listed) == 2 and all("api_key" not in k and "hash" not in str(k.keys()) for k in listed)
    revoked = call(browser, dev, "DELETE", f"/organizations/{organization_id}/keys/{listed[0]['id']}").json
    assert revoked["key"]["active"] is False


def test_test_users_and_the_organization_limit(app: Flask, browser: FlaskClient, dev: dict[str, str]) -> None:
    organization_id = new_organization(browser, dev)
    assert (
        call(
            browser, dev, "POST", f"/organizations/{organization_id}/test-users", {"email": "A@x.test"}
        ).status_code
        == 201
    )
    call(browser, dev, "POST", f"/organizations/{organization_id}/test-users", {"email": "a@x.test"})
    users = call(browser, dev, "GET", f"/organizations/{organization_id}").json["test_users"]
    assert [u["email"] for u in users] == ["a@x.test"]
    call(browser, dev, "DELETE", f"/organizations/{organization_id}/test-users/a@x.test")
    assert call(browser, dev, "GET", f"/organizations/{organization_id}").json["test_users"] == []

    for _ in range(9):
        new_organization(browser, dev)
    over = call(browser, dev, "POST", "/organizations", {"name": "One too many"})
    assert over.status_code == 409 and over.json == {"error": "too_many_organizations", "limit": 10}


def test_a_developer_app_can_ask_for_the_phone_and_the_address(
    app: Flask, browser: FlaskClient, dev: dict[str, str]
) -> None:
    # Both are personal data: sensitive, so a live app needs a review for them.
    organization_id = new_organization(browser, dev)
    made = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Shop", "redirect_uris": ["https://shop.example/cb"], "scopes": ["phone", "address"]},
    )
    assert made.status_code == 201, made.json
    catalogue = {
        s["name"]: s for p in call(browser, dev, "GET", "/products").json["items"] for s in p["scopes"]
    }
    assert catalogue["address"]["sensitivity"] == "sensitive" == catalogue["phone"]["sensitivity"]
