"""Online and offline access. A refresh token without offline_access lives as long as the sign-in
it came from; with it, it outlives that sign-in. A third-party app gets offline_access only with
consent asked in the same request. A step-up to a second factor keeps the apps signed in. Consent
follows the app's scopes when they shrink."""

from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select, update
from test_developer_api import call
from test_mfa import enable
from test_platform_gates import authorize
from test_scope_rules import _dev_app

from idp.db import db
from idp.models import Client, Consent, User
from idp.security import totp
from idp.services import mail

from conftest import REDIRECT, add_client, api, authorize_query, page_config, pkce, sign_up


def _tokens(browser: FlaskClient, client_id: str, scope: str, csrf: str | None = None) -> dict[str, Any]:
    verifier, challenge = pkce()
    query = authorize_query(challenge, client_id=client_id, scope=scope)
    reply = browser.get("/oauth/authorize?" + urlencode(query))
    location = reply.location or ""
    if urlparse(location).path == "/consent":
        assert csrf is not None
        location = api(browser, "POST", "/oauth/authorize?" + urlencode(query), {"approve": True}, csrf).json[
            "redirect"
        ]
    code = parse_qs(urlparse(location).query)["code"][0]
    answer: dict[str, Any] = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    ).json
    return answer


def _renew(app: Flask, client_id: str, refresh_token: str) -> int:
    return int(
        app.test_client()
        .post(
            "/oauth/token",
            data={"grant_type": "refresh_token", "refresh_token": refresh_token, "client_id": client_id},
        )
        .status_code
    )


def _sign_out(browser: FlaskClient, csrf: str) -> None:
    assert api(browser, "DELETE", "/api/session", None, csrf).status_code == 200


def test_signing_out_ends_online_access_but_not_offline_access(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    csrf = sign_up(browser, outbox)
    online = _tokens(browser, "spa", "openid profile")
    offline = _tokens(browser, "spa", "openid profile offline_access")
    assert "offline_access" in offline["scope"].split()
    _sign_out(browser, csrf)
    assert _renew(app, "spa", online["refresh_token"]) == 400, (
        "signed out at the provider: online access ends"
    )
    assert _renew(app, "spa", offline["refresh_token"]) == 200, "offline access outlives the sign-in"


def test_a_third_party_app_gets_offline_access_only_with_consent_asked_now(
    app: Flask, outbox: list[mail.Message]
) -> None:
    *_, client_id = _dev_app(app, outbox, ["profile", "offline_access"], live=True)
    visitor = app.test_client()
    csrf = sign_up(visitor, outbox, email="visitor@example.test")
    first = _tokens(visitor, client_id, "openid profile offline_access", csrf)
    assert "offline_access" in first["scope"].split(), "asked on the consent screen"
    again = _tokens(visitor, client_id, "openid profile offline_access", csrf)
    assert "offline_access" not in again["scope"].split(), "not from a consent given before"
    verifier, challenge = pkce()
    query = authorize_query(
        challenge, client_id=client_id, scope="openid profile offline_access", prompt="consent"
    )
    assert urlparse(visitor.get("/oauth/authorize?" + urlencode(query)).location).path == "/consent"


def test_a_step_up_keeps_the_apps_signed_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    secret, _ = enable(browser, sign_up(browser, outbox))
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        user.roles = ["admin"]
        db().commit()
    add_client(app, first_party=True)
    add_client(app, client_id="console", first_party=True, scope="openid profile email admin")
    portal = _tokens(browser, "spa", "openid profile")  # online, from the password-only sign-in

    asked, _ = authorize(browser, "console", scope="openid admin")
    assert urlparse(asked.location).path == "/mfa"
    csrf = page_config(browser, "/mfa")["csrf"]
    done = api(
        browser, "POST", "/api/mfa/verify", {"code": totp.code_at(secret, totp.current_step() + 1)}, csrf
    )
    assert "redirect" in done.json
    assert _renew(app, "spa", portal["refresh_token"]) == 200, (
        "the step-up replaced the sign-in, not the apps"
    )


def test_consent_shrinks_with_the_app(app: Flask, outbox: list[mail.Message]) -> None:
    _, _, dev_browser, dev, client_id = _dev_app(app, outbox, ["profile", "email"], live=True)
    visitor = app.test_client()
    csrf = sign_up(visitor, outbox, email="visitor@example.test")
    _tokens(visitor, client_id, "openid profile email", csrf)
    assert call(dev_browser, dev, "PATCH", f"/apps/{client_id}", {"scopes": ["profile"]}).status_code == 200
    with app.app_context():
        record = db().scalar(
            select(Consent).join(Client, Client.id == Consent.client_id).where(Client.client_id == client_id)
        )
        assert record is not None and "email" not in record.scopes
    call(dev_browser, dev, "PATCH", f"/apps/{client_id}", {"scopes": ["profile", "email"]})
    verifier, challenge = pkce()
    query = authorize_query(challenge, client_id=client_id, scope="openid profile email")
    assert urlparse(visitor.get("/oauth/authorize?" + urlencode(query)).location).path == "/consent", (
        "asked again"
    )


def test_a_device_needs_no_browser_sign_in_to_keep_access(app: Flask, outbox: list[mail.Message]) -> None:
    from idp.models import DeviceCode

    add_client(
        app, client_id="tv", grant_types=["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]
    )
    tv = app.test_client()
    device = tv.post("/oauth/device_authorization", data={"client_id": "tv", "scope": "openid profile"}).json
    person = app.test_client()
    csrf = sign_up(person, outbox)
    api(person, "POST", "/api/device", {"user_code": device["user_code"], "approve": True}, csrf)
    with app.app_context():
        db().execute(update(DeviceCode).values(last_polled_at=None))
        db().commit()
    tokens = tv.post(
        "/oauth/token",
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "device_code": device["device_code"],
            "client_id": "tv",
        },
    ).json
    _sign_out(person, csrf)
    assert _renew(app, "tv", tokens["refresh_token"]) == 200, "the TV did not sign in through that browser"
