"""Passkeys, sessions and logout under attack: a passkey answer replayed with its old cookie, a
foreign origin or relying party, a late answer; expired sessions and disabled accounts; a page
acting for an account no longer current; logout forced from another site; back-channel logout
delivery when the app does not answer."""

from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

import pytest
import requests
from flask import Flask
from flask.testing import FlaskClient
from soft_authenticator import SoftAuthenticator
from sqlalchemy import update
from test_flows import signed_in_tokens
from test_passkeys import _add

from idp.db import db, utcnow
from idp.models import LoginSession, User
from idp.services import backchannel, mail, passkeys

from conftest import ISSUER, api, page_config, sign_up

COOKIE = "idp_session"


def _passkey_answer(app: Flask, device: SoftAuthenticator) -> tuple[FlaskClient, str, dict[str, Any]]:
    client = app.test_client()
    csrf = page_config(client, "/signin")["csrf"]
    options = api(client, "POST", "/api/passkey/options", {}, csrf).json
    return client, csrf, device.get(options)


# Passkeys


def test_a_passkey_answer_replayed_with_its_cookie_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # Someone who captured a sign-in (its cookie and its answer) plays it again within 5 minutes.
    _add(browser, sign_up(browser, outbox), device := SoftAuthenticator(ISSUER, synced=True))
    client, csrf, answer = _passkey_answer(app, device)
    cookie = client.get_cookie(COOKIE)
    assert cookie is not None
    assert "redirect" in api(client, "POST", "/api/passkey", {"credential": answer}, csrf).json
    replay = app.test_client()
    replay.set_cookie(COOKIE, cookie.value)
    again = api(replay, "POST", "/api/passkey", {"credential": answer}, csrf)
    assert again.status_code == 400 and again.json["error"] in ("passkey_expired", "passkey_failed"), (
        again.json
    )


@pytest.mark.parametrize("field", ["origin", "rp_id"])
def test_a_passkey_answer_for_another_site_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], field: str
) -> None:
    device = SoftAuthenticator(ISSUER)
    _add(browser, sign_up(browser, outbox), device)
    setattr(device, field, "https://evil.example" if field == "origin" else "evil.example")
    client, csrf, answer = _passkey_answer(app, device)
    signed = api(client, "POST", "/api/passkey", {"credential": answer}, csrf)
    assert signed.status_code == 400 and signed.json["error"] in ("passkey_failed", "passkey_expired")


def test_a_passkey_registration_for_another_site_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    device = SoftAuthenticator(ISSUER)
    device.origin = "https://evil.example"
    options = api(browser, "POST", "/api/account/passkeys/options", {}, csrf).json
    added = api(browser, "POST", "/api/account/passkeys", {"credential": device.create(options)}, csrf)
    assert added.status_code == 400 and added.json["error"] == "passkey_failed"


def test_a_late_passkey_answer_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], monkeypatch: pytest.MonkeyPatch
) -> None:
    _add(browser, sign_up(browser, outbox), device := SoftAuthenticator(ISSUER))
    client, csrf, answer = _passkey_answer(app, device)
    later = passkeys.time.time() + 301
    monkeypatch.setattr(passkeys.time, "time", lambda: later)
    late = api(client, "POST", "/api/passkey", {"credential": answer}, csrf)
    assert late.json["error"] == "passkey_expired"


# Sessions


def _signed_in(client: FlaskClient) -> bool:
    return bool(client.get("/api/session").json["signed_in"])


def test_an_expired_session_is_over(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    sign_up(browser, outbox)
    assert _signed_in(browser)
    with app.app_context():
        db().execute(update(LoginSession).values(expires_at=utcnow() - timedelta(seconds=1)))
        db().commit()
    assert not _signed_in(browser)


def test_a_disabled_account_is_signed_out_at_once(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    with app.app_context():
        db().execute(update(User).values(disabled_at=utcnow()))
        db().commit()
    assert not _signed_in(browser)


def test_a_page_opened_for_one_account_cannot_act_for_another(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # Two accounts in one browser; a tab opened as the first keeps going after a switch elsewhere.
    sign_up(browser, outbox, email="first@example.test")
    first = page_config(browser, "/account")
    sign_up(browser, outbox, email="second@example.test")
    assert browser.get("/api/session").json["accounts"][0]["email"] == "second@example.test"
    stale = browser.patch(
        "/api/account/profile",
        json={"given_name": "Changed"},
        headers={"X-CSRF-Token": first["csrf"], "X-IDP-Session": first["session"]},
    )
    assert stale.status_code == 409 and stale.json["error"] == "account_changed"
    with app.app_context():
        from sqlalchemy import select

        second = db().scalar(select(User).where(User.email == "second@example.test"))
        assert second is not None and second.given_name != "Changed"


# Logout


def test_a_logout_from_another_site_asks_first(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    forced = browser.get("/oauth/logout")
    assert (
        forced.status_code == 200 and page_config(browser, "/oauth/logout")["element"] == "idp-logout-confirm"
    )
    assert _signed_in(browser), "nothing ends before the person confirms"
    confirmed = api(browser, "POST", "/oauth/logout", {}, csrf)
    assert confirmed.status_code == 200 and not _signed_in(browser)


def test_a_logout_from_the_app_itself_goes_straight_through(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    query = {
        "id_token_hint": tokens["id_token"],
        "post_logout_redirect_uri": "http://localhost:9000/bye",
        "state": "s9",
    }
    reply = browser.get("/oauth/logout?" + urlencode(query))
    assert reply.status_code == 302 and reply.location == "http://localhost:9000/bye?state=s9"
    assert not _signed_in(browser)


def test_a_logout_hint_for_someone_else_asks_first(app: Flask, outbox: list[mail.Message]) -> None:
    victim = app.test_client()
    tokens = signed_in_tokens(app, victim, outbox)  # awa's ID token, from awa's sign-in
    other = app.test_client()
    sign_up(other, outbox, email="other@example.test")
    reply = other.get("/oauth/logout?" + urlencode({"id_token_hint": tokens["id_token"]}))
    assert reply.status_code == 200 and _signed_in(other), "a hint naming another session asks"


# Back-channel logout delivery


def test_a_back_channel_logout_is_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    class Answer:
        def __init__(self, status: int) -> None:
            self.status_code = status

    def post(*_: Any, **__: Any) -> Answer:
        calls.append(1)
        if len(calls) == 1:
            raise requests.ConnectionError("down")
        return Answer(503 if len(calls) == 2 else 200)

    monkeypatch.setattr(backchannel.requests, "post", post)
    monkeypatch.setattr(backchannel, "RETRY_DELAYS", (0, 0, 0))
    backchannel.deliver("https://app.example/logout", "token")
    assert len(calls) == 3


def test_a_refused_logout_token_is_not_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    class Answer:
        status_code = 400

    monkeypatch.setattr(backchannel.requests, "post", lambda *a, **k: calls.append(1) or Answer())
    monkeypatch.setattr(backchannel, "RETRY_DELAYS", (0, 0, 0))
    backchannel.deliver("https://app.example/logout", "token")
    assert len(calls) == 1, "the app answered: it read the token and refused it"
