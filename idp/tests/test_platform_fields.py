"""A platform's own profile fields: declared in platform.toml, checked by type, asked, released."""

from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from buntubi import plugins
from buntubi.db import db
from buntubi.models import User
from buntubi.oauth.claims import user_claims
from buntubi.services import mail, profile_fields, setup

from conftest import PASSWORD, api, page_config, sign_up

FILE = """
[[profile.fields]]
key = "sector"
type = "choice"
mode = "{sector}"
label = {{ fr = "Secteur", en = "Sector" }}
choices = [
  {{ value = "retail", label = {{ fr = "Commerce", en = "Retail" }} }},
  {{ value = "health", label = {{ fr = "Santé", en = "Health" }} }},
]

[[profile.fields]]
key = "team_size"
type = "number"
label = {{ fr = "Taille de l’équipe", en = "Team size" }}

[[profile.fields]]
key = "newsletter"
type = "boolean"
label = {{ fr = "Lettre d’information", en = "Newsletter" }}

[[profile.fields]]
key = "topics"
type = "choices"
label = {{ fr = "Sujets", en = "Topics" }}
choices = [
  {{ value = "billing", label = {{ fr = "Facturation", en = "Billing" }} }},
  {{ value = "design", label = {{ fr = "Design", en = "Design" }} }},
]
"""


def _declare(app: Flask, tmp_path: Path, sector: str = "optional", text: str | None = None) -> list[str]:
    path = tmp_path / "platform.toml"
    path.write_text(text if text is not None else FILE.format(sector=sector))
    with app.app_context():
        return setup.apply_profile(setup.read_profile(path))


def test_setup_declares_the_fields_in_order(app: Flask, tmp_path: Path) -> None:
    assert _declare(app, tmp_path) == ["sector", "team_size", "newsletter", "topics"]
    with app.app_context():
        fields = profile_fields.platform_fields()
        assert [f.key for f in fields] == ["sector", "team_size", "newsletter", "topics"]
        assert fields[0].labels == {"fr": "Secteur", "en": "Sector"} and len(fields[0].choices) == 2
    # Dropped from the file: kept, hidden.
    only = '[[profile.fields]]\nkey = "sector"\ntype = "text"\nlabel = { fr = "Secteur", en = "Sector" }\n'
    _declare(app, tmp_path, text=only)
    with app.app_context():
        assert [f.key for f in profile_fields.platform_fields()] == ["sector"]


@pytest.mark.parametrize(
    ("entry", "message"),
    [
        ('key = "Sector"\ntype = "text"\nlabel = { fr = "a", en = "b" }', "lowercase"),
        ('key = "birthdate"\ntype = "text"\nlabel = { fr = "a", en = "b" }', "standard claim"),
        ('key = "x"\ntype = "colour"\nlabel = { fr = "a", en = "b" }', "type is"),
        ('key = "x"\ntype = "choice"\nlabel = { fr = "a", en = "b" }', "lists its choices"),
        ('key = "x"\ntype = "text"\nlabel = { fr = "a" }', "fr ="),
        ('key = "x"\ntype = "text"\nlabel = { fr = "a", en = "b" }\nchoices = []', "only a choice"),
    ],
)
def test_setup_refuses_a_bad_field(app: Flask, tmp_path: Path, entry: str, message: str) -> None:
    path = tmp_path / "platform.toml"
    path.write_text(f"[[profile.fields]]\n{entry}\n")
    with pytest.raises(setup.SetupError, match=message):
        setup.read_profile(path)


def test_the_account_sets_checks_and_clears_the_values(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], tmp_path: Path
) -> None:
    _declare(app, tmp_path)
    csrf = sign_up(browser, outbox)
    values = {"sector": "health", "team_size": 12, "newsletter": False, "topics": ["design", "billing"]}
    done = api(browser, "PATCH", "/api/account/profile", {"platform_profile": values}, csrf)
    assert done.status_code == 200, done.json
    summary = browser.get("/api/account").json
    assert [f["key"] for f in summary["platform_fields"]] == ["sector", "team_size", "newsletter", "topics"]
    # Several choices keep the order the platform gave them.
    assert summary["user"]["platform_profile"] == {**values, "topics": ["billing", "design"]}
    for key, value in (
        ("sector", "space"),
        ("team_size", "12"),
        ("team_size", True),
        ("newsletter", "yes"),
        ("topics", ["design", "cooking"]),
    ):
        refused = api(browser, "PATCH", "/api/account/profile", {"platform_profile": {key: value}}, csrf)
        assert refused.json["error"] == f"invalid_{key}", (key, value)
    unknown = api(browser, "PATCH", "/api/account/profile", {"platform_profile": {"colour": "red"}}, csrf)
    assert unknown.json["error"] == "unknown_field"
    cleared = api(browser, "PATCH", "/api/account/profile", {"platform_profile": {"sector": ""}}, csrf)
    assert cleared.status_code == 200
    assert "sector" not in browser.get("/api/account").json["user"]["platform_profile"]


def test_a_required_field_is_asked_at_sign_up(app: Flask, browser: FlaskClient, tmp_path: Path) -> None:
    _declare(app, tmp_path, sector="required")
    config = page_config(browser, "/signup")
    assert [f["key"] for f in config["props"]["platformFields"]] == ["sector"]
    body = {"email": "awa@example.test", "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"}
    assert api(browser, "POST", "/api/signup", body, config["csrf"]).json["error"] == "sector_required"
    made = api(
        browser, "POST", "/api/signup", {**body, "platform_profile": {"sector": "retail"}}, config["csrf"]
    )
    assert made.status_code == 200
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None and profile_fields.platform_values(user) == {"sector": "retail"}


def test_an_account_from_before_is_asked_at_its_next_sign_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], tmp_path: Path
) -> None:
    sign_up(browser, outbox)
    _declare(app, tmp_path, sector="required")
    other = app.test_client()
    csrf = page_config(other, "/signin")["csrf"]
    step = api(other, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    assert step.json["redirect"] == "/profile/complete"
    assert other.get("/api/account").status_code == 401
    page = page_config(other, "/profile/complete")
    assert [f["key"] for f in page["props"]["platformFields"]] == ["sector"]
    assert api(other, "POST", "/api/profile/complete", {}, page["csrf"]).json["error"] == "sector_required"
    done = api(
        other, "POST", "/api/profile/complete", {"platform_profile": {"sector": "retail"}}, page["csrf"]
    )
    assert done.status_code == 200 and done.json["redirect"] == "/account"
    again = app.test_client()
    csrf = page_config(again, "/signin")["csrf"]
    reply = api(again, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    assert reply.json["redirect"] == "/account"


def test_the_claim_carries_the_values_under_its_scope(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], tmp_path: Path
) -> None:
    _declare(app, tmp_path)
    csrf = sign_up(browser, outbox)
    api(browser, "PATCH", "/api/account/profile", {"platform_profile": {"sector": "retail"}}, csrf)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        assert user_claims(user, "openid platform_profile")["platform_profile"] == {"sector": "retail"}
        assert "platform_profile" not in user_claims(user, "openid profile")
    discovery = browser.get("/.well-known/openid-configuration").json
    assert (
        "platform_profile" in discovery["scopes_supported"]
        and "platform_profile" in discovery["claims_supported"]
    )


def test_a_plugin_can_refuse_a_value(
    app: Flask,
    browser: FlaskClient,
    outbox: list[mail.Message],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _declare(app, tmp_path)
    csrf = sign_up(browser, outbox)

    def refusal(user: Any, key: str, value: Any) -> str | None:
        return "too_large_team" if key == "team_size" and value > 500 else None

    monkeypatch.setattr(plugins, "profile_field_refusal", refusal)
    refused = api(browser, "PATCH", "/api/account/profile", {"platform_profile": {"team_size": 900}}, csrf)
    assert refused.json["error"] == "too_large_team"
    assert (
        api(
            browser, "PATCH", "/api/account/profile", {"platform_profile": {"team_size": 40}}, csrf
        ).status_code
        == 200
    )
