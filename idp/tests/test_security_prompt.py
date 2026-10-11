"""After signing up: a passkey or two-step is offered once, and "not now" goes on to the app."""

import re

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from idp.db import db
from idp.models import User
from idp.services import mail

from conftest import PASSWORD, api, page_config


def _sign_up(browser: FlaskClient, outbox: list[mail.Message], start: str = "/signup") -> tuple[str, str]:
    csrf = page_config(browser, start)["csrf"]
    api(
        browser,
        "POST",
        "/api/signup",
        {"email": "awa@example.test", "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"},
        csrf,
    )
    code = re.search(r"\b(\d{6})\b", outbox[-1].text).group(1)  # type: ignore[union-attr]
    verified = api(browser, "POST", "/api/email/verify", {"code": code}, csrf)
    assert verified.status_code == 200, verified.json
    return csrf, verified.json["redirect"]


def test_offered_after_sign_up_and_skipping_goes_on(browser: FlaskClient, outbox: list[mail.Message]) -> None:
    browser.get("/account/devices")  # where sign-up was headed
    csrf, redirect = _sign_up(browser, outbox, "/signin")
    assert redirect == "/secure-account"
    assert page_config(browser, "/secure-account")["element"] == "idp-secure-account"

    answered = api(browser, "POST", "/api/account/security-prompt", {}, csrf)
    assert answered.status_code == 200 and answered.json["redirect"] == "/account/devices"
    # Answered: not shown again.
    assert browser.get("/secure-account").status_code == 302


def test_answered_once_for_good(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    csrf, _ = _sign_up(browser, outbox)
    api(browser, "POST", "/api/account/security-prompt", {}, csrf)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None and user.security_prompt_answered_at is not None
    signed_in = api(
        browser, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf
    )
    assert signed_in.json.get("redirect") != "/secure-account"


def test_not_offered_to_someone_signed_out(browser: FlaskClient) -> None:
    response = browser.get("/secure-account")
    assert response.status_code == 302 and response.location.endswith("/signin")
