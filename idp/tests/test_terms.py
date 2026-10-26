"""The platform's terms: accepted at sign-up on every path, asked again at sign-in for a new version."""

from collections.abc import Iterator
from pathlib import Path
from urllib.parse import urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from buntubi.config import get_settings
from buntubi.db import db
from buntubi.models import AuditEvent, User
from buntubi.models.settings import TERMS_VERSION_SETTING
from buntubi.services import mail, platform_settings, setup

from conftest import PASSWORD, add_client, api, authorize_query, page_config, pkce, sign_up

TERMS_URL = "https://platform.example/terms"
BODY = {"email": "awa@example.test", "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"}


def _version(app: Flask, version: str) -> None:
    with app.app_context():
        platform_settings.put(TERMS_VERSION_SETTING, version)
        db().commit()


@pytest.fixture
def terms_on(app: Flask, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setattr(get_settings(), "brand_terms_url", TERMS_URL)
    _version(app, "2026-10")
    yield


def _user(app: Flask) -> User:
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        return user


def _password_sign_in(client: FlaskClient) -> dict[str, str]:
    csrf = page_config(client, "/signin")["csrf"]
    reply = api(client, "POST", "/api/session", {"email": BODY["email"], "password": PASSWORD}, csrf)
    assert reply.status_code == 200, reply.json
    return {"csrf": csrf, "redirect": reply.json.get("redirect", "")}


def test_nobody_is_asked_without_a_version_or_a_terms_address(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], monkeypatch: pytest.MonkeyPatch
) -> None:
    _version(app, "2026-10")
    monkeypatch.setattr(get_settings(), "brand_terms_url", "")
    assert page_config(browser, "/signup")["props"]["terms"] is None
    sign_up(browser, outbox)
    assert _user(app).terms_version is None


def test_email_sign_up_needs_the_terms_accepted(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], terms_on: None
) -> None:
    config = page_config(browser, "/signup")
    assert config["props"]["terms"] == {"version": "2026-10", "url": TERMS_URL}
    refused = api(browser, "POST", "/api/signup", BODY, config["csrf"])
    assert refused.status_code == 400 and refused.json["error"] == "terms_required"
    made = api(browser, "POST", "/api/signup", {**BODY, "accept_terms": True}, config["csrf"])
    assert made.status_code == 200
    user = _user(app)
    assert user.terms_version == "2026-10" and user.terms_accepted_at is not None


def test_an_account_from_before_is_asked_at_its_next_sign_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], monkeypatch: pytest.MonkeyPatch
) -> None:
    sign_up(browser, outbox)
    monkeypatch.setattr(get_settings(), "brand_terms_url", TERMS_URL)
    _version(app, "2026-10")
    add_client(app, first_party=True)
    other = app.test_client()
    _, challenge = pkce()
    other.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    step = _password_sign_in(other)
    assert step["redirect"] == "/terms/accept"
    assert other.get("/api/account").status_code == 401, "not signed in before accepting"
    page = page_config(other, "/terms/accept")
    assert page["props"]["terms"]["url"] == TERMS_URL
    assert api(other, "POST", "/api/terms/accept", {}, page["csrf"]).json["error"] == "terms_required"
    accepted = api(other, "POST", "/api/terms/accept", {"accept_terms": True}, page["csrf"])
    assert accepted.status_code == 200 and accepted.json["redirect"].startswith("/oauth/authorize?")
    assert _user(app).terms_version == "2026-10"
    with app.app_context():
        assert db().scalar(select(AuditEvent).where(AuditEvent.event == "terms_accepted")) is not None
    # Accepted once: the next sign-in goes straight on; a new version asks again.
    assert _password_sign_in(app.test_client())["redirect"] == "/account"
    _version(app, "2027-01")
    assert _password_sign_in(app.test_client())["redirect"] == "/terms/accept"


def test_the_accept_page_needs_a_sign_in_waiting(app: Flask, browser: FlaskClient, terms_on: None) -> None:
    assert urlparse(browser.get("/terms/accept").location).path == "/signin"
    csrf = page_config(browser, "/signin")["csrf"]
    reply = api(browser, "POST", "/api/terms/accept", {"accept_terms": True}, csrf)
    assert reply.json["error"] == "no_pending_sign_in"


def test_setup_reads_the_terms_version(app: Flask, tmp_path: Path) -> None:
    path = tmp_path / "platform.toml"
    path.write_text('[signup]\nterms_version = "2026-10"\n')
    with app.app_context():
        assert setup.apply_access(setup.read_access(path)) == ["signup.terms_version"]
        assert platform_settings.terms_version() == "2026-10"
    path.write_text("[signup]\nterms_version = 3\n")
    with pytest.raises(setup.SetupError, match="short string"):
        setup.read_access(path)
