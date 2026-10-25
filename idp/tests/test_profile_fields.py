"""The standard profile fields a platform asks for: hidden, optional or required, and released."""

from datetime import date
from pathlib import Path

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from buntubi.db import db
from buntubi.models import User
from buntubi.oauth.claims import user_claims
from buntubi.services import mail, profile_fields, setup

from conftest import PASSWORD, api, page_config, sign_up


def _modes(app: Flask, **wanted: str) -> None:
    with app.app_context():
        profile_fields.set_modes(wanted)
        db().commit()


def test_discovery_lists_the_standard_claims(browser: FlaskClient) -> None:
    claims = browser.get("/.well-known/openid-configuration").json["claims_supported"]
    assert {"birthdate", "gender", "middle_name", "nickname", "website", "zoneinfo"} <= set(claims)


def test_a_platform_that_configures_nothing_shows_no_field(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    summary = browser.get("/api/account").json
    assert summary["fields"] == {} and "birthdate" not in summary["user"]
    refused = api(browser, "PATCH", "/api/account/profile", {"birthdate": "1990-04-02"}, csrf)
    assert refused.status_code == 400 and refused.json["error"] == "unknown_field"


def test_optional_fields_are_set_checked_and_cleared(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    _modes(app, birthdate="optional", gender="optional", website="optional", zoneinfo="optional")
    csrf = sign_up(browser, outbox)
    done = api(
        browser,
        "PATCH",
        "/api/account/profile",
        {
            "birthdate": "1990-04-02",
            "gender": "female",
            "website": "https://awa.example",
            "zoneinfo": "Africa/Dakar",
        },
        csrf,
    )
    assert done.status_code == 200 and done.json["updated"] == ["birthdate", "gender", "website", "zoneinfo"]
    summary = browser.get("/api/account").json
    assert summary["fields"]["birthdate"] == "optional"
    assert summary["user"]["birthdate"] == "1990-04-02" and summary["user"]["zoneinfo"] == "Africa/Dakar"
    for key, value in (
        ("birthdate", "1990-02-30"),
        ("birthdate", "2999-01-01"),
        ("birthdate", "1850-01-01"),
        ("gender", "robot"),
        ("website", "javascript:alert(1)"),
        ("website", "https://"),
        ("zoneinfo", "Mars/Olympus"),
    ):
        refused = api(browser, "PATCH", "/api/account/profile", {key: value}, csrf)
        assert refused.json["error"] == f"invalid_{key}", (key, value)
    cleared = api(browser, "PATCH", "/api/account/profile", {"website": ""}, csrf)
    assert cleared.status_code == 200 and browser.get("/api/account").json["user"]["website"] is None


def test_a_required_field_is_asked_at_sign_up_and_cannot_be_emptied(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    _modes(app, birthdate="required", nickname="optional")
    config = page_config(browser, "/signup")
    assert config["props"]["fields"] == ["birthdate"]
    body = {"email": "awa@example.test", "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"}
    missing = api(browser, "POST", "/api/signup", body, config["csrf"])
    assert missing.status_code == 400 and missing.json["error"] == "birthdate_required"
    made = api(browser, "POST", "/api/signup", {**body, "birthdate": "1990-04-02"}, config["csrf"])
    assert made.status_code == 200
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None and str(user.birthdate) == "1990-04-02"


def test_a_required_field_refusal_does_not_tell_a_known_address(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    _modes(app, birthdate="required")
    other = app.test_client()
    csrf = page_config(other, "/signup")["csrf"]
    body = {"email": "awa@example.test", "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"}
    assert api(other, "POST", "/api/signup", body, csrf).json["error"] == "birthdate_required"


def test_a_required_field_cannot_be_emptied(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    _modes(app, nickname="required")
    assert api(browser, "PATCH", "/api/account/profile", {"nickname": "Awa D"}, csrf).status_code == 200
    emptied = api(browser, "PATCH", "/api/account/profile", {"nickname": " "}, csrf)
    assert emptied.json["error"] == "nickname_required"


def test_claims_carry_the_fields_shown_and_never_a_hidden_one(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    _modes(app, birthdate="optional", website="optional")
    csrf = sign_up(browser, outbox)
    api(
        browser,
        "PATCH",
        "/api/account/profile",
        {"birthdate": "1990-04-02", "website": "https://awa.example"},
        csrf,
    )
    _modes(app, website="hidden")
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        claims = user_claims(user, "openid profile")
        assert claims["birthdate"] == "1990-04-02" and "website" not in claims
        assert "birthdate" not in user_claims(user, "openid email")


def test_setup_reads_the_profile_table(app: Flask, tmp_path: Path) -> None:
    path = tmp_path / "platform.toml"
    path.write_text('[profile]\nbirthdate = "required"\nwebsite = "optional"\n')
    with app.app_context():
        assert setup.apply_profile(setup.read_profile(path)) == ["birthdate", "website"]
        path.write_text('[profile]\nbirthdate = "optional"\n')
        assert setup.apply_profile(setup.read_profile(path)) == ["birthdate"]
        assert profile_fields.shown() == {"birthdate": "optional", "website": "optional"}
    for text, message in (
        ('[profile]\nsector = "optional"\n', "not a profile field"),
        ('[profile]\nbirthdate = "always"\n', "the mode is"),
    ):
        path.write_text(text)
        with pytest.raises(setup.SetupError, match=message):
            setup.read_profile(path)


def test_the_console_user_page_shows_the_fields_and_values(app: Flask, outbox: list[mail.Message]) -> None:
    from test_console_api import admin_call, setup_people

    owner_browser, owner, _, _ = setup_people(app, outbox)
    _modes(app, birthdate="optional", website="hidden")
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "dev@example.test"))
        assert user is not None
        user.birthdate, user.website = date(1990, 4, 2), "https://dev.example"
        target = str(user.id)
        db().commit()
    page = admin_call(owner_browser, owner, "GET", f"/users/{target}").json
    assert page["fields"] == {"birthdate": "optional"}
    assert page["profile"] == {"birthdate": "1990-04-02"}
