"""Every grant against the client types it is not for, and refresh and device codes under
attack: secrets skipped, tokens from another client, wider scopes, expired and replayed
credentials, two refreshes at once, device codes polled too fast, denied or expired."""

import threading
from datetime import timedelta
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import update
from test_flows import SECRET, add_service, basic, signed_in_tokens

from buntubi.db import db, utcnow
from buntubi.models import Client, ClientSecret, DeviceCode, RefreshToken
from buntubi.security.tokens import hash_token
from buntubi.services import mail

from conftest import REDIRECT, add_client, api, authorize_query, pkce, sign_up

DEVICE = "urn:ietf:params:oauth:grant-type:device_code"
WEB_SECRET = "web-app-secret-long-enough"


def _refresh(browser: FlaskClient, token: str, client_id: str = "spa", **extra: str) -> Any:
    return browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": token, "client_id": client_id, **extra},
    )


# Client authentication


def test_a_confidential_app_cannot_leave_out_its_secret(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    with app.app_context():
        db().add(
            Client(
                client_id="web",
                name="Web app",
                first_party=True,
                client_type="confidential",
                environment="live",
                secrets=[ClientSecret(secret_hash=hash_token(WEB_SECRET), prefix="web")],
                redirect_uris=[REDIRECT],
                grant_types=["authorization_code", "refresh_token"],
                scope="openid profile email offline_access",
                token_endpoint_auth_method="client_secret_basic",
            )
        )
        db().commit()
    sign_up(browser, outbox)
    verifier, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, client_id="web")))
    code = parse_qs(urlparse(reply.location).query)["code"][0]
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT,
        "code_verifier": verifier,
    }
    without = browser.post("/oauth/token", data={**form, "client_id": "web"})
    assert without.status_code == 401 and without.json["error"] == "invalid_client"
    wrong = browser.post("/oauth/token", data=form, headers=basic("web", "not-the-secret"))
    assert wrong.status_code == 401
    right = browser.post("/oauth/token", data=form, headers=basic("web", WEB_SECRET))
    assert right.status_code == 200, right.json


def test_a_grant_an_app_was_not_given_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True, grant_types=["authorization_code"])
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
    ).json
    assert "refresh_token" not in tokens, "no refresh_token grant, no refresh token"
    device = browser.post("/oauth/device_authorization", data={"client_id": "spa"})
    assert device.status_code in (400, 401)


@pytest.mark.parametrize(
    "grant_type", ["password", "implicit", "urn:ietf:params:oauth:grant-type:jwt-bearer"]
)
def test_grants_this_provider_does_not_offer(app: Flask, browser: FlaskClient, grant_type: str) -> None:
    add_service(app)
    reply = browser.post(
        "/oauth/token",
        data={"grant_type": grant_type, "username": "a", "password": "b"},
        headers=basic("service", SECRET),
    )
    assert reply.status_code == 400 and reply.json["error"] == "unsupported_grant_type"


# Client credentials


def test_client_credentials_give_no_identity_and_only_registered_scopes(
    app: Flask, browser: FlaskClient
) -> None:
    add_service(app)
    reply = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "scope": "read openid profile offline_access admin"},
        headers=basic("service", SECRET),
    )
    assert reply.status_code == 200, reply.json
    assert (
        reply.json["scope"] == "read" and "refresh_token" not in reply.json and "id_token" not in reply.json
    )
    userinfo = browser.get(
        "/oauth/userinfo", headers={"Authorization": f"Bearer {reply.json['access_token']}"}
    )
    assert userinfo.status_code in (401, 403), "a token with no person is no way into userinfo"


# Refresh tokens


def test_a_refresh_token_belongs_to_its_client(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    add_client(app, client_id="other", name="Other app")
    stolen = _refresh(browser, tokens["refresh_token"], client_id="other")
    assert stolen.status_code == 400 and stolen.json["error"] == "invalid_grant"
    assert _refresh(browser, tokens["refresh_token"]).status_code == 200, "the owner still renews"


def test_a_refresh_cannot_widen_the_scope(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)  # granted: openid profile email offline_access
    wider = _refresh(browser, tokens["refresh_token"], scope="openid profile email offline_access admin")
    assert wider.status_code == 400 and wider.json["error"] == "invalid_scope"
    narrower = _refresh(browser, tokens["refresh_token"], scope="openid")
    assert narrower.status_code == 200 and narrower.json["scope"] == "openid"


def test_an_expired_refresh_token_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    with app.app_context():
        db().execute(update(RefreshToken).values(expires_at=utcnow() - timedelta(seconds=1)))
        db().commit()
    late = _refresh(browser, tokens["refresh_token"])
    assert late.status_code == 400 and late.json["error"] == "invalid_grant"


def test_two_refreshes_at_once_neither_fork_nor_end_the_family(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # Two requests of one app renewing at the same moment (a page and its data, two tabs): one
    # gets the next token, the other is refused, and the person stays signed in.
    tokens = signed_in_tokens(app, browser, outbox)
    answers: list[Any] = []
    start = threading.Barrier(2)

    def renew() -> None:
        start.wait()
        answers.append(_refresh(app.test_client(), tokens["refresh_token"]))

    threads = [threading.Thread(target=renew) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(a.status_code for a in answers) == [200, 400], [a.json for a in answers]
    winner = next(a.json for a in answers if a.status_code == 200)
    assert _refresh(app.test_client(), winner["refresh_token"]).status_code == 200, (
        "the race ended the family"
    )


def test_a_rotated_token_replayed_later_still_ends_the_family(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    newer = _refresh(browser, tokens["refresh_token"]).json["refresh_token"]
    with app.app_context():
        db().execute(
            update(RefreshToken)
            .values(rotated_at=utcnow() - timedelta(minutes=1))
            .where(RefreshToken.rotated_at.is_not(None))
        )
        db().commit()
    assert _refresh(browser, tokens["refresh_token"]).status_code == 400
    assert _refresh(browser, newer).status_code == 400, "a replay outside the race window ends the family"


# Device authorization


def _device(app: Flask, browser: FlaskClient, client_id: str = "tv") -> dict[str, Any]:
    add_client(app, client_id=client_id, name=f"{client_id} app", grant_types=[DEVICE, "refresh_token"])
    start = browser.post(
        "/oauth/device_authorization", data={"client_id": client_id, "scope": "openid profile"}
    )
    assert start.status_code == 200, start.json
    body: dict[str, Any] = start.json
    return body


def _poll(browser: FlaskClient, device: dict[str, Any], client_id: str = "tv") -> Any:
    with browser.application.app_context():
        db().execute(update(DeviceCode).values(last_polled_at=None))
        db().commit()
    return browser.post(
        "/oauth/token",
        data={"grant_type": DEVICE, "device_code": device["device_code"], "client_id": client_id},
    )


def _decide(app: Flask, outbox: list[mail.Message], user_code: str, approve: bool) -> Any:
    person = app.test_client()
    csrf = sign_up(person, outbox, email=f"{'yes' if approve else 'no'}@example.test")
    return api(person, "POST", "/api/device", {"user_code": user_code, "approve": approve}, csrf)


def test_a_denied_device_gets_nothing_ever(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    device = _device(app, browser)
    assert _decide(app, outbox, device["user_code"], approve=False).status_code == 200
    denied = _poll(browser, device)
    assert denied.status_code == 400 and denied.json["error"] == "access_denied"
    later = _decide(app, outbox, device["user_code"], approve=True)
    assert later.status_code == 400, "a denied code cannot be approved afterwards"
    assert _poll(browser, device).status_code == 400


def test_an_expired_device_code_gets_nothing(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    device = _device(app, browser)
    with app.app_context():
        db().execute(update(DeviceCode).values(expires_at=utcnow() - timedelta(seconds=1)))
        db().commit()
    assert _decide(app, outbox, device["user_code"], approve=True).status_code == 400
    expired = _poll(browser, device)
    assert expired.status_code == 400 and expired.json["error"] == "expired_token"


def test_an_approved_but_expired_device_code_gets_nothing(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    device = _device(app, browser)
    assert _decide(app, outbox, device["user_code"], approve=True).status_code == 200
    with app.app_context():
        db().execute(update(DeviceCode).values(expires_at=utcnow() - timedelta(seconds=1)))
        db().commit()
    late = _poll(browser, device)
    assert late.status_code == 400 and late.json["error"] == "expired_token"


def test_polling_too_fast_is_slowed_down(app: Flask, browser: FlaskClient) -> None:
    device = _device(app, browser)
    _poll(browser, device)
    again = browser.post(
        "/oauth/token", data={"grant_type": DEVICE, "device_code": device["device_code"], "client_id": "tv"}
    )
    assert again.status_code == 400 and again.json["error"] == "slow_down"


def test_a_device_code_belongs_to_its_client(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    device = _device(app, browser)
    add_client(app, client_id="thief", name="Thief", grant_types=[DEVICE])
    assert _decide(app, outbox, device["user_code"], approve=True).status_code == 200
    stolen = _poll(browser, device, client_id="thief")
    assert stolen.status_code in (400, 401) and "access_token" not in (stolen.json or {})
    assert _poll(browser, device).status_code == 200, "the device it was issued to still gets its tokens"


def test_a_device_gets_only_the_scopes_its_app_is_registered_for(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, client_id="tv", name="tv app", grant_types=[DEVICE], scope="openid profile")
    start = browser.post(
        "/oauth/device_authorization", data={"client_id": "tv", "scope": "openid profile admin email"}
    )
    assert _decide(app, outbox, start.json["user_code"], approve=True).status_code == 200
    tokens = _poll(browser, start.json)
    assert tokens.status_code == 200, tokens.json
    assert set(tokens.json["scope"].split()) <= {"openid", "profile"}
