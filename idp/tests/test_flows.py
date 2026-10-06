"""The other grants and endpoints: client credentials, device, revocation, introspection, logout."""

import base64
import re
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from flask.testing import FlaskClient

from idp.db import db
from idp.models import Client, User
from idp.security import totp
from idp.security.tokens import hash_token
from idp.services import mail

from conftest import (
    ISSUER,
    PASSWORD,
    REDIRECT,
    add_client,
    api,
    authorize_query,
    page_config,
    pkce,
    sign_up,
)

SECRET = "a-long-random-test-secret"


def add_service(app: Flask) -> None:
    with app.app_context():
        db().add(
            Client(
                client_id="service",
                name="Resource server",
                client_type="confidential",
                secret_hash=hash_token(SECRET),
                redirect_uris=[],
                grant_types=["client_credentials"],
                scope="read write",
                token_endpoint_auth_method="client_secret_basic",
            )
        )
        db().commit()


def basic(client_id: str, secret: str) -> dict[str, str]:
    return {"Authorization": "Basic " + base64.b64encode(f"{client_id}:{secret}".encode()).decode()}


def signed_in_tokens(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> dict[str, Any]:
    add_client(app, first_party=True, post_logout_redirect_uris=["http://localhost:9000/bye"])
    sign_up(browser, outbox)
    verifier, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    code = parse_qs(urlparse(reply.location).query)["code"][0]
    tokens = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "spa",
            "code_verifier": verifier,
        },
    )
    assert tokens.status_code == 200, tokens.json
    body: dict[str, Any] = tokens.json
    return body


def test_discovery_and_keys(browser: FlaskClient) -> None:
    config = browser.get("/.well-known/openid-configuration").json
    assert config["issuer"] == ISSUER
    assert config["code_challenge_methods_supported"] == ["S256"]
    assert config["response_types_supported"] == ["code"]
    keys = browser.get("/.well-known/jwks.json").json["keys"]
    assert keys and all("d" not in key and "p" not in key for key in keys), "only public halves"


def test_client_credentials(app: Flask, browser: FlaskClient) -> None:
    add_service(app)
    wrong = browser.post(
        "/oauth/token", data={"grant_type": "client_credentials"}, headers=basic("service", "x")
    )
    assert wrong.status_code == 401
    ok = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "scope": "read"},
        headers=basic("service", SECRET),
    )
    assert ok.status_code == 200, ok.json
    assert "refresh_token" not in ok.json and ok.json["scope"] == "read"


def test_a_public_client_cannot_use_client_credentials(app: Flask, browser: FlaskClient) -> None:
    add_client(app, grant_types=["authorization_code", "client_credentials"])
    reply = browser.post("/oauth/token", data={"grant_type": "client_credentials", "client_id": "spa"})
    assert reply.status_code in (400, 401)


def test_introspection_is_for_confidential_clients(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    add_service(app)
    public = browser.post("/oauth/introspect", data={"token": tokens["access_token"], "client_id": "spa"})
    assert public.status_code in (400, 401)
    seen = browser.post(
        "/oauth/introspect", data={"token": tokens["access_token"]}, headers=basic("service", SECRET)
    )
    assert seen.status_code == 200 and seen.json["active"] is True and seen.json["client_id"] == "spa"
    junk = browser.post("/oauth/introspect", data={"token": "not-a-token"}, headers=basic("service", SECRET))
    assert junk.json == {"active": False}


def test_revoking_a_refresh_token_ends_its_access_tokens(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    bearer = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert browser.get("/oauth/userinfo", headers=bearer).status_code == 200
    revoked = browser.post("/oauth/revoke", data={"token": tokens["refresh_token"], "client_id": "spa"})
    assert revoked.status_code == 200
    assert browser.get("/oauth/userinfo", headers=bearer).status_code == 401
    refresh = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"], "client_id": "spa"},
    )
    assert refresh.status_code == 400


def test_revoking_an_access_token(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    browser.post("/oauth/revoke", data={"token": tokens["access_token"], "client_id": "spa"})
    bearer = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert browser.get("/oauth/userinfo", headers=bearer).status_code == 401


def test_prompt_none_without_a_session(app: Flask, browser: FlaskClient) -> None:
    add_client(app, first_party=True)
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, prompt="none")))
    params = parse_qs(urlparse(reply.location).query)
    assert reply.location.startswith(REDIRECT)
    assert params["error"] == ["login_required"] and params["state"] == ["s1"]


def test_logout_returns_only_to_a_registered_address(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    stray = browser.get("/oauth/logout?" + urlencode({"post_logout_redirect_uri": "https://evil.example/"}))
    assert urlparse(stray.location).path == "/signed-out"
    assert browser.get("/account").status_code == 302, "signed out"

    sign_in(browser)
    query = {
        "post_logout_redirect_uri": "http://localhost:9000/bye",
        "id_token_hint": tokens["id_token"],
        "state": "x",
    }
    back = browser.get("/oauth/logout?" + urlencode(query))
    assert back.location == "http://localhost:9000/bye?state=x"


def test_device_flow(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    add_client(
        app, client_id="tv", grant_types=["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]
    )
    start = browser.post("/oauth/device_authorization", data={"client_id": "tv", "scope": "openid profile"})
    assert start.status_code == 200, start.json
    device = start.json
    assert re.fullmatch(r"[A-Z0-9]{4}-[A-Z0-9]{4}", device["user_code"])
    assert device["verification_uri"] == f"{ISSUER}/device"

    poll = {
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        "device_code": device["device_code"],
    }
    pending = browser.post("/oauth/token", data={**poll, "client_id": "tv"})
    assert pending.json["error"] in ("authorization_pending", "slow_down")

    user = app.test_client()
    csrf = sign_up(user, outbox)
    approved = api(
        user, "POST", "/api/device", {"user_code": device["user_code"].lower(), "approve": True}, csrf
    )
    assert approved.status_code == 200, approved.json

    from idp.models import DeviceCode

    with app.app_context():
        row = db().query(DeviceCode).one()
        row.last_polled_at = None  # skip the polling interval
        db().commit()
    done = browser.post("/oauth/token", data={**poll, "client_id": "tv"})
    assert done.status_code == 200, done.json
    assert "access_token" in done.json
    again = browser.post("/oauth/token", data={**poll, "client_id": "tv"})
    assert again.status_code == 400


def test_password_reset_signs_out_everywhere(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    other = app.test_client()
    csrf = page_config(other, "/forgot-password")["csrf"]
    assert (
        api(other, "POST", "/api/password/forgot", {"email": "nobody@example.test"}, csrf).status_code == 202
    )
    sent_before = len(outbox)
    assert api(other, "POST", "/api/password/forgot", {"email": "awa@example.test"}, csrf).status_code == 202
    assert len(outbox) == sent_before + 1
    token = re.search(r"token=([\w-]+)", outbox[-1].text).group(1)  # type: ignore[union-attr]

    weak = api(other, "POST", "/api/password/reset", {"token": token, "password": "short"}, csrf)
    assert weak.json == {"error": "weak_password"}
    done = api(
        other, "POST", "/api/password/reset", {"token": token, "password": "a brand new passphrase"}, csrf
    )
    assert done.status_code == 200, done.json
    reused = api(
        other, "POST", "/api/password/reset", {"token": token, "password": "another new passphrase"}, csrf
    )
    assert reused.json == {"error": "link_expired"}

    assert browser.get("/account").status_code == 302, "the old browser session ended"
    bearer = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert browser.get("/oauth/userinfo", headers=bearer).status_code == 401
    old = api(other, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    assert old.status_code == 401


def test_the_email_code_locks_after_five_tries(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = page_config(browser, "/signup")["csrf"]
    api(browser, "POST", "/api/signup", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    code = re.search(r"\b(\d{6})\b", outbox[-1].text).group(1)  # type: ignore[union-attr]
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        assert api(browser, "POST", "/api/email/verify", {"code": wrong}, csrf).json == {
            "error": "invalid_code"
        }
    locked = api(browser, "POST", "/api/email/verify", {"code": code}, csrf)
    assert locked.json == {"error": "too_many_attempts"}


def sign_in(browser: FlaskClient) -> None:
    csrf = page_config(browser, "/signin")["csrf"]
    reply = api(browser, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    assert reply.status_code == 200, reply.json


def admin_token(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], *, make_admin: bool, with_mfa: bool = True
) -> str:
    add_client(app, client_id="console", first_party=True, scope="openid admin")
    sign_up(browser, outbox, email="root@example.test")
    if make_admin:
        with app.app_context():
            user = db().query(User).filter_by(email="root@example.test").one()
            user.roles = ["admin"]
            db().commit()
    if with_mfa:
        # A fresh sign-in with both factors, as the console requires.
        csrf = page_config(browser, "/account")["csrf"]
        secret = api(browser, "POST", "/api/mfa/totp", {}, csrf).json["secret"]
        api(
            browser,
            "POST",
            "/api/mfa/totp/confirm",
            {"code": totp.code_at(secret, totp.current_step())},
            csrf,
        )
        api(browser, "DELETE", "/api/session", None, csrf)
        csrf = page_config(browser, "/signin")["csrf"]
        api(browser, "POST", "/api/session", {"email": "root@example.test", "password": PASSWORD}, csrf)
        code = totp.code_at(secret, totp.current_step() + 1)
        assert api(browser, "POST", "/api/mfa/verify", {"code": code}, csrf).status_code == 200
    verifier, challenge = pkce()
    query = authorize_query(challenge, client_id="console", scope="openid admin")
    code = parse_qs(urlparse(browser.get("/oauth/authorize?" + urlencode(query)).location).query)["code"][0]
    reply = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "console",
            "code_verifier": verifier,
        },
    )
    token: str = reply.json["access_token"]
    return token


def test_admin_api_needs_the_admin_role(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    token = admin_token(app, browser, outbox, make_admin=False)
    reply = browser.get("/admin/api/clients", headers={"Authorization": f"Bearer {token}"})
    assert reply.status_code == 403


def test_admin_api_needs_a_second_factor(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    token = admin_token(app, browser, outbox, make_admin=True, with_mfa=False)
    reply = browser.get("/admin/api/clients", headers={"Authorization": f"Bearer {token}"})
    assert reply.status_code == 403
    assert browser.get("/admin/api/clients").status_code == 401


def test_admin_api_manages_clients_and_users(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    bearer = {"Authorization": f"Bearer {admin_token(app, browser, outbox, make_admin=True)}"}
    created = browser.post(
        "/admin/api/clients",
        headers=bearer,
        json={
            "client_id": "billing",
            "name": "Billing",
            "client_type": "confidential",
            "redirect_uris": ["https://billing.example/callback"],
            "brand": {"accent": "#0055ff"},
        },
    )
    assert created.status_code == 201, created.json
    secret = created.json["client_secret"]
    assert secret and created.json["client"]["brand"] == {"accent": "#0055ff"}
    listed = browser.get("/admin/api/clients", headers=bearer).json["items"]
    assert "billing" in [c["client_id"] for c in listed]
    assert all("secret" not in key for c in listed for key in c)

    bad = browser.post("/admin/api/clients", headers=bearer, json={"client_id": "x", "name": ""})
    assert bad.status_code == 422

    users = browser.get("/admin/api/users?q=root", headers=bearer).json["items"]
    assert [u["email"] for u in users] == ["root@example.test"]
    self_disable = browser.post(f"/admin/api/users/{users[0]['id']}/disable", headers=bearer)
    assert self_disable.json == {"error": "cannot_disable_yourself"}
    events = browser.get("/admin/api/audit", headers=bearer).json["items"]
    assert "admin.client_created" in [e["event"] for e in events]
