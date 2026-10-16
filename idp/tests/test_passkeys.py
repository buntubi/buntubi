"""Passkeys: adding one from the account, signing in with it, renaming and removing it."""

from datetime import timedelta

from flask import Flask
from flask.testing import FlaskClient
from soft_authenticator import SoftAuthenticator
from sqlalchemy import select, update
from test_mfa import enable, password_step

from buntubi.db import db, utcnow
from buntubi.models import LoginSession
from buntubi.services import mail

from conftest import ISSUER, PASSWORD, api, page_config, sign_up


def _add(browser: FlaskClient, csrf: str, device: SoftAuthenticator, **extra: str) -> dict:
    options = api(browser, "POST", "/api/account/passkeys/options", dict(extra), csrf)
    assert options.status_code == 200, options.json
    added = api(browser, "POST", "/api/account/passkeys", {"credential": device.create(options.json)}, csrf)
    assert added.status_code == 200, added.json
    return added.json


def _sign_in(client: FlaskClient, device: SoftAuthenticator) -> dict:
    csrf = page_config(client, "/signin")["csrf"]
    options = api(client, "POST", "/api/passkey/options", {}, csrf).json
    return api(client, "POST", "/api/passkey", {"credential": device.get(options)}, csrf).json


def test_a_passkey_signs_in_with_two_steps(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    device = SoftAuthenticator(ISSUER)
    added = _add(browser, csrf, device)
    assert added["name"] == "iCloud Keychain" and added["synced"] is True

    other = app.test_client()
    assert "redirect" in _sign_in(other, device)
    assert other.get("/api/account").json["user"]["email"] == "awa@example.test"
    with app.app_context():
        login = db().scalars(select(LoginSession).order_by(LoginSession.created_at.desc())).first()
        assert login is not None and list(login.auth_methods) == ["hwk", "mfa"]

    listed = browser.get("/api/account/passkeys").json["passkeys"]
    assert len(listed) == 1 and listed[0]["last_used_at"]
    kinds = [e["kind"] for e in browser.get("/api/account/activity").json["events"]]
    assert kinds[:2] == ["sign_in", "passkey_added"]


def test_a_challenge_is_used_once_and_a_stranger_key_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    device = SoftAuthenticator(ISSUER)
    _add(browser, csrf, device)
    client = app.test_client()
    page = page_config(client, "/signin")["csrf"]
    options = api(client, "POST", "/api/passkey/options", {}, page).json
    answer = device.get(options)
    assert "redirect" in api(client, "POST", "/api/passkey", {"credential": answer}, page).json
    replay = app.test_client()
    page = page_config(replay, "/signin")["csrf"]
    assert (
        api(replay, "POST", "/api/passkey", {"credential": answer}, page).json["error"] == "passkey_expired"
    )

    stranger = SoftAuthenticator(ISSUER)
    assert _sign_in(app.test_client(), stranger)["error"] == "passkey_failed"


def test_no_user_verification_no_passkey(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    device = SoftAuthenticator(ISSUER)
    options = api(browser, "POST", "/api/account/passkeys/options", {}, csrf).json
    refused = api(
        browser, "POST", "/api/account/passkeys", {"credential": device.create(options, verified=False)}, csrf
    )
    assert refused.json["error"] == "passkey_failed"


def test_an_old_sign_in_needs_the_password_to_add_one(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    with app.app_context():
        db().execute(update(LoginSession).values(created_at=utcnow() - timedelta(hours=1)))
        db().commit()
    asked = api(browser, "POST", "/api/account/passkeys/options", {}, csrf)
    assert asked.json["error"] == "reauth_required"
    wrong = api(browser, "POST", "/api/account/passkeys/options", {"password": "nope"}, csrf)
    assert wrong.json["error"] == "wrong_password"
    _add(browser, csrf, SoftAuthenticator(ISSUER), password=PASSWORD)


def test_rename_and_remove_only_ones_own(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    device = SoftAuthenticator(ISSUER)
    key = _add(browser, csrf, device)["id"]
    renamed = api(browser, "PATCH", f"/api/account/passkeys/{key}", {"name": "  MacBook Air "}, csrf)
    assert renamed.json["name"] == "MacBook Air"
    assert (
        api(browser, "PATCH", f"/api/account/passkeys/{key}", {"name": " "}, csrf).json["error"]
        == "invalid_name"
    )

    someone = app.test_client()
    other_csrf = sign_up(someone, outbox, email="bob@example.test")
    assert (
        api(someone, "DELETE", f"/api/account/passkeys/{key}", None, other_csrf).json["error"] == "not_found"
    )

    assert api(browser, "DELETE", f"/api/account/passkeys/{key}", None, csrf).status_code == 200
    assert _sign_in(app.test_client(), device)["error"] == "passkey_failed"


def test_a_passkey_answers_the_second_step(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    enable(browser, csrf)
    device = SoftAuthenticator(ISSUER)
    _add(browser, csrf, device)

    other, page, _ = password_step(app)
    config = page_config(other, "/mfa")
    assert config["props"]["passkey"] is True
    options = api(other, "POST", "/api/passkey/options", {"second_step": True}, page).json
    assert [c["id"] for c in options["allowCredentials"]] == [device.get(options)["rawId"]]
    answer = device.get(api(other, "POST", "/api/passkey/options", {"second_step": True}, page).json)
    done = api(other, "POST", "/api/passkey", {"credential": answer, "second_step": True}, page)
    assert "redirect" in done.json
    with app.app_context():
        login = db().scalars(select(LoginSession).order_by(LoginSession.created_at.desc())).first()
        assert login is not None and list(login.auth_methods) == ["pwd", "hwk", "mfa"]


def test_the_second_step_refuses_someone_elses_passkey(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    enable(browser, csrf)
    bob = app.test_client()
    bob_csrf = sign_up(bob, outbox, email="bob@example.test")
    bobs_device = SoftAuthenticator(ISSUER)
    _add(bob, bob_csrf, bobs_device)

    other, page, _ = password_step(app)
    answer = bobs_device.get(api(other, "POST", "/api/passkey/options", {}, page).json)
    refused = api(other, "POST", "/api/passkey", {"credential": answer, "second_step": True}, page)
    assert refused.json["error"] == "passkey_other_account"


def test_the_console_scope_asks_a_passkey_only_account_for_its_passkey(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    """Signed up with a password, then a passkey and no authenticator app: the console's step-up
    asks for the passkey, rather than handing out a token the admin API refuses."""
    from urllib.parse import parse_qs, urlparse

    from test_platform_gates import authorize
    from test_plugins import claims_of

    from buntubi.models import User

    from conftest import REDIRECT, add_client

    csrf = sign_up(browser, outbox)
    device = SoftAuthenticator(ISSUER)
    _add(browser, csrf, device)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        user.roles = ["admin"]
        db().commit()
    add_client(app, client_id="console", first_party=True, scope="openid profile email admin")

    asked, verifier = authorize(browser, "console", scope="openid admin")
    assert asked.status_code == 302 and urlparse(asked.location).path == "/mfa", "the passkey, not a token"
    props = page_config(browser, "/mfa")["props"]
    assert props["passkey"] is True and props["code"] is False, "no code to ask for without an app"

    page = page_config(browser, "/mfa")["csrf"]
    answer = device.get(api(browser, "POST", "/api/passkey/options", {"second_step": True}, page).json)
    done = api(browser, "POST", "/api/passkey", {"credential": answer, "second_step": True}, page)
    back = browser.get(done.json["redirect"])
    assert back.status_code == 302 and back.location.startswith(REDIRECT), "back to the authorization"
    code = parse_qs(urlparse(back.location).query)["code"][0]
    tokens = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "console",
            "code_verifier": verifier,
        },
    ).json
    assert "mfa" in claims_of(tokens["access_token"])["amr"]
