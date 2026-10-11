"""Sign-in limits under attack: an old session cookie replayed to reset the two-step counter,
email codes guessed in parallel, a reset link used twice or at the same time."""

import re
import threading
from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from test_mfa import enable, password_step

from idp.security import totp
from idp.services import mail

from conftest import PASSWORD, api, page_config, sign_up

COOKIE = "idp_session"


def _with_cookie(app: Flask, value: str) -> FlaskClient:
    client = app.test_client()
    client.set_cookie(COOKIE, value)
    return client


def test_replaying_an_old_cookie_does_not_reset_the_two_step_limit(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # The password is known; the attacker keeps the cookie from right after it and sends every
    # guess with that cookie, ignoring the one each answer sets.
    secret, _ = enable(browser, sign_up(browser, outbox))
    other, csrf, reply = password_step(app)
    assert reply.json.get("next") == "mfa"
    cookie = other.get_cookie(COOKIE)
    assert cookie is not None
    for _ in range(8):
        api(_with_cookie(app, cookie.value), "POST", "/api/mfa/verify", {"code": "000000"}, csrf)
    good = totp.code_at(secret, totp.current_step() + 1)  # the setup used the current step
    last = api(_with_cookie(app, cookie.value), "POST", "/api/mfa/verify", {"code": good}, csrf)
    assert last.status_code == 400 and last.json["error"] == "too_many_attempts", last.json


def test_the_two_step_limit_also_holds_across_fresh_password_steps(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    secret, _ = enable(browser, sign_up(browser, outbox))
    for _ in range(2):
        other, csrf, _ = password_step(app)
        for _ in range(5):
            api(other, "POST", "/api/mfa/verify", {"code": "000000"}, csrf)
    other, csrf, _ = password_step(app)
    good = totp.code_at(secret, totp.current_step() + 1)
    late = api(other, "POST", "/api/mfa/verify", {"code": good}, csrf)
    assert late.json.get("error") == "too_many_attempts", "ten wrong codes in a row, still guessing"


def test_the_account_owner_gets_in_again_after_the_pause(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    from datetime import timedelta

    from sqlalchemy import update

    from idp.db import db, utcnow
    from idp.models import User

    secret, _ = enable(browser, sign_up(browser, outbox))
    other, csrf, _ = password_step(app)
    for _ in range(5):
        api(other, "POST", "/api/mfa/verify", {"code": "000000"}, csrf)
    with app.app_context():
        db().execute(update(User).values(second_factor_failed_at=utcnow() - timedelta(minutes=16)))
        db().commit()
    again, csrf, _ = password_step(app)
    good = totp.code_at(secret, totp.current_step() + 1)
    assert "redirect" in api(again, "POST", "/api/mfa/verify", {"code": good}, csrf).json


def test_email_codes_guessed_in_parallel_still_stop_at_five(app: Flask, outbox: list[mail.Message]) -> None:
    browser = app.test_client()
    csrf = page_config(browser, "/signup")["csrf"]
    api(
        browser,
        "POST",
        "/api/signup",
        {"email": "awa@example.test", "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"},
        csrf,
    )
    code = re.search(r"\b(\d{6})\b", outbox[-1].text).group(1)  # type: ignore[union-attr]
    cookie = browser.get_cookie(COOKIE)
    assert cookie is not None
    wrong = "000000" if code != "000000" else "111111"
    start = threading.Barrier(10)

    def guess() -> None:
        start.wait()
        api(_with_cookie(app, cookie.value), "POST", "/api/email/verify", {"code": wrong}, csrf)

    threads = [threading.Thread(target=guess) for _ in range(10)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    last = api(_with_cookie(app, cookie.value), "POST", "/api/email/verify", {"code": code}, csrf)
    assert last.status_code == 400 and last.json["error"] == "too_many_attempts", last.json


def _reset_token(app: Flask, outbox: list[mail.Message]) -> str:
    client = app.test_client()
    csrf = page_config(client, "/forgot-password")["csrf"]
    api(client, "POST", "/api/password/forgot", {"email": "awa@example.test"}, csrf)
    return re.search(r"token=([A-Za-z0-9_\-]+)", outbox[-1].text).group(1)  # type: ignore[union-attr]


def _reset(app: Flask, token: str, password: str) -> Any:
    client = app.test_client()
    csrf = page_config(client, "/reset-password")["csrf"]
    return api(client, "POST", "/api/password/reset", {"token": token, "password": password}, csrf)


def test_a_reset_link_works_once_even_at_the_same_time(app: Flask, outbox: list[mail.Message]) -> None:
    sign_up(app.test_client(), outbox)
    token = _reset_token(app, outbox)
    answers: list[int] = []
    start = threading.Barrier(2)

    def use(password: str) -> None:
        start.wait()
        answers.append(_reset(app, token, password).status_code)

    threads = [threading.Thread(target=use, args=(p,)) for p in ("first new password", "second new password")]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(answers) == [200, 400], answers
    assert _reset(app, token, "third new password").status_code == 400


def test_a_new_reset_link_ends_the_old_one(app: Flask, outbox: list[mail.Message]) -> None:
    sign_up(app.test_client(), outbox)
    old = _reset_token(app, outbox)
    new = _reset_token(app, outbox)
    assert _reset(app, old, "a fresh password here").status_code == 400
    assert _reset(app, new, "a fresh password here").status_code == 200
