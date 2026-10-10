"""The platform's own apps an account page lists, and the command that says where one lives."""

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_cli import run
from test_console_api import admin_call, setup_people

from idp.db import db, utcnow
from idp.models import Client, User
from idp.services import mail

from conftest import add_client, sign_up


def listed(browser: FlaskClient) -> list[str]:
    return [app["name"] for app in browser.get("/api/account").json["apps"]]


def test_an_account_page_lists_the_platform_apps_its_owner_may_open(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, client_id="portal", name="Portal", first_party=True, homepage_url="https://portal.test/")
    add_client(
        app,
        client_id="console",
        name="Console",
        first_party=True,
        scope="openid profile admin",
        homepage_url="https://console.test/",
        brand={"logo": "https://console.test/logo.png"},
    )
    add_client(app, client_id="no-home", name="No home", first_party=True)
    add_client(
        app,
        client_id="gone",
        name="Gone",
        first_party=True,
        homepage_url="https://gone.test/",
        disabled_at=utcnow(),
    )
    add_client(app, client_id="third", name="Third party", homepage_url="https://third.test/")
    sign_up(browser, outbox, email="awa@example.test")

    assert listed(browser) == ["Portal"]

    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        user.roles = ["admin"]
        db().commit()
    apps = browser.get("/api/account").json["apps"]
    assert apps == [
        {"name": "Console", "url": "https://console.test/", "logo": "https://console.test/logo.png"},
        {"name": "Portal", "url": "https://portal.test/", "logo": None},
    ]


def test_the_homepage_command_sets_checks_and_clears(app: Flask) -> None:
    add_client(app, client_id="portal", name="Portal", first_party=True)
    assert "portal: https://portal.test/" in run(app, "clients", "homepage", "portal", "https://portal.test/")
    assert "expected an http or https URL" in run(app, "clients", "homepage", "portal", "javascript:alert(1)")
    assert "no client nope" in run(app, "clients", "homepage", "nope", "https://x.test/")
    assert "portal: no homepage" in run(app, "clients", "homepage", "portal")
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == "portal"))
        assert client is not None and client.homepage_url is None


def test_the_owner_sets_where_a_client_lives_from_the_console(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    created = admin_call(
        owner_browser,
        owner,
        "POST",
        "/clients",
        {"client_id": "docs", "name": "Docs", "first_party": True, "homepage_url": "https://docs.test/"},
    )
    assert created.status_code == 201 and created.json["client"]["homepage_url"] == "https://docs.test/"
    moved = admin_call(
        owner_browser, owner, "PATCH", "/clients/docs", {"homepage_url": "https://docs.example/"}
    )
    assert moved.json["client"]["homepage_url"] == "https://docs.example/"
    cleared = admin_call(owner_browser, owner, "PATCH", "/clients/docs", {"homepage_url": None})
    assert cleared.json["client"]["homepage_url"] is None
    refused = admin_call(owner_browser, owner, "PATCH", "/clients/docs", {"homepage_url": "not a url"})
    assert refused.status_code == 422
