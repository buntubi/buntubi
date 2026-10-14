"""Two-step sign-in: the TOTP algorithm, enrolment, the second step, backup codes."""

import base64
from typing import Any

from flask import Flask
from flask.testing import FlaskClient

from buntubi.security import totp
from buntubi.services import mail

from conftest import PASSWORD, api, page_config, sign_up


def test_rfc_6238_vectors() -> None:
    secret = base64.b32encode(b"12345678901234567890").decode()
    # Appendix B, SHA-1, cut to 8 digits as the RFC shows them.
    assert totp.code_at(secret, 59 // 30, digits=8) == "94287082"
    assert totp.code_at(secret, 1111111109 // 30, digits=8) == "07081804"
    assert totp.code_at(secret, 20000000000 // 30, digits=8) == "65353130"


def test_a_code_works_once_and_only_inside_the_window() -> None:
    secret = totp.new_secret()
    now = 1_800_000_000.0
    code = totp.code_at(secret, totp.current_step(now))
    step = totp.matching_step(secret, code, None, now)
    assert step is not None
    assert totp.matching_step(secret, code, step, now) is None, "replay"
    old = totp.code_at(secret, totp.current_step(now) - 3)
    assert totp.matching_step(secret, old, None, now) is None


def wrong_code(secret: str) -> str:
    """A code no step around now produces, so a refusal never depends on chance or the clock."""
    here = totp.current_step()
    taken = {totp.code_at(secret, step) for step in range(here - 2, here + 3)}
    return next(c for c in ("000000", "111111", "222222", "333333", "444444", "555555") if c not in taken)


def enable(browser: FlaskClient, csrf: str) -> tuple[str, list[str]]:
    setup = api(browser, "POST", "/api/mfa/totp", {}, csrf).json
    assert setup["qr"].startswith("data:image/svg+xml") and setup["uri"].startswith("otpauth://totp/")
    wrong = api(browser, "POST", "/api/mfa/totp/confirm", {"code": wrong_code(setup["secret"])}, csrf)
    assert wrong.json == {"error": "invalid_code"}
    code = totp.code_at(setup["secret"], totp.current_step())
    done = api(browser, "POST", "/api/mfa/totp/confirm", {"code": code}, csrf)
    assert done.status_code == 200, done.json
    return setup["secret"], done.json["backup_codes"]


def password_step(app: Flask) -> tuple[FlaskClient, str, Any]:
    other = app.test_client()
    csrf = page_config(other, "/signin")["csrf"]
    reply = api(other, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    return other, csrf, reply


def test_sign_in_asks_for_the_second_step(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    secret, backups = enable(browser, sign_up(browser, outbox))
    assert len(backups) == 10 and len(set(backups)) == 10

    other, csrf, reply = password_step(app)
    assert reply.json == {"next": "mfa"}
    assert other.get("/account").status_code == 302, "not signed in yet"
    assert other.get("/mfa").status_code == 200

    # The code used to enrol is spent; a later step works.
    later = totp.code_at(secret, totp.current_step() + 1)
    done = api(other, "POST", "/api/mfa/verify", {"code": later}, csrf)
    assert done.status_code == 200 and "redirect" in done.json
    assert other.get("/account").status_code == 200


def test_a_backup_code_works_once(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    _, backups = enable(browser, sign_up(browser, outbox))
    other, csrf, _ = password_step(app)
    typed = backups[0].lower().replace("-", "")
    assert api(other, "POST", "/api/mfa/verify", {"code": typed}, csrf).status_code == 200

    again, csrf2, _ = password_step(app)
    assert api(again, "POST", "/api/mfa/verify", {"code": backups[0]}, csrf2).json == {
        "error": "invalid_code"
    }


def test_five_wrong_codes_start_over(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    secret, _ = enable(browser, sign_up(browser, outbox))
    other, csrf, _ = password_step(app)
    for _ in range(4):
        assert api(other, "POST", "/api/mfa/verify", {"code": "12345"}, csrf).json == {
            "error": "invalid_code"
        }
    assert api(other, "POST", "/api/mfa/verify", {"code": "12345"}, csrf).json == {
        "error": "too_many_attempts"
    }
    good = totp.code_at(secret, totp.current_step() + 1)
    assert api(other, "POST", "/api/mfa/verify", {"code": good}, csrf).json == {"error": "no_pending_sign_in"}


def test_disabling_needs_a_code(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    csrf = sign_up(browser, outbox)
    secret, _ = enable(browser, csrf)
    assert api(browser, "POST", "/api/mfa/disable", {"code": wrong_code(secret)}, csrf).status_code == 400
    code = totp.code_at(secret, totp.current_step() + 1)
    assert api(browser, "POST", "/api/mfa/disable", {"code": code}, csrf).json == {"enabled": False}
    _, _, reply = password_step(app)
    assert "redirect" in reply.json, "no second step any more"


def test_the_console_scope_asks_a_password_only_session_for_the_second_step(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    from urllib.parse import parse_qs, urlparse

    from sqlalchemy import select
    from test_platform_gates import authorize
    from test_plugins import claims_of

    from buntubi.db import db
    from buntubi.models import User
    from buntubi.models.grants import LoginSession

    from conftest import REDIRECT, add_client

    # Signed in with a password, then two-step turned on: the session never used it.
    secret, _ = enable(browser, sign_up(browser, outbox))
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        user.roles = ["admin"]
        db().commit()
    add_client(app, client_id="console", first_party=True, scope="openid profile email admin")

    asked, verifier = authorize(browser, "console", scope="openid admin")
    assert asked.status_code == 302 and urlparse(asked.location).path == "/mfa", "the code, not a token"

    csrf = page_config(browser, "/mfa")["csrf"]
    later = totp.code_at(secret, totp.current_step() + 1)
    done = api(browser, "POST", "/api/mfa/verify", {"code": later}, csrf)
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
    with app.app_context():
        live = db().scalars(select(LoginSession).where(LoginSession.revoked_at.is_(None))).all()
        assert len(live) == 1 and "mfa" in live[0].auth_methods, "the password-only login was replaced"


def test_an_account_without_two_step_is_not_asked(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    from test_platform_gates import authorize

    from conftest import REDIRECT, add_client

    sign_up(browser, outbox)
    add_client(app, client_id="console", first_party=True, scope="openid profile email admin")
    answered, _ = authorize(browser, "console", scope="openid admin")
    assert answered.status_code == 302 and answered.location.startswith(REDIRECT), (
        "the console says what to do"
    )
