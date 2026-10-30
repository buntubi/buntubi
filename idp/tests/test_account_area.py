"""The account area: its page, its summary, and several accounts signed in on one browser."""

from urllib.parse import quote

import pytest
from flask import Flask
from flask.testing import FlaskClient

from buntubi.config import Settings, get_settings
from buntubi.services import mail

from conftest import page_config, sign_up


def test_the_account_area_is_one_app_behind_sign_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    gone = browser.get("/account/security")
    assert gone.status_code == 302 and gone.location.endswith("/signin")
    sign_up(browser, outbox)
    for path in ("/account", "/account/security", "/account/devices"):
        config = page_config(browser, path)
        assert config["element"] == "idp-account-app" and config["account"] is True


def test_the_summary_says_who_and_how_safe(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    assert browser.get("/api/account").status_code == 401
    sign_up(browser, outbox)
    summary = browser.get("/api/account").json
    assert summary["user"]["email"] == "awa@example.test" and summary["user"]["email_verified"]
    assert summary["mfa"] == {"enabled": False, "since": None, "backup_codes_left": 0}
    assert summary["devices"] == 1 and summary["connected_apps"] == 0
    assert [a["current"] for a in summary["accounts"]] == [True]


def test_two_accounts_on_one_browser(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    sign_up(browser, outbox, email="awa@example.test")
    csrf = sign_up(browser, outbox, email="moussa@example.test")
    accounts = browser.get("/api/account").json["accounts"]
    assert {a["email"] for a in accounts} == {"awa@example.test", "moussa@example.test"}
    current = next(a for a in accounts if a["current"])
    other = next(a for a in accounts if not a["current"])
    assert current["email"] == "moussa@example.test", "the newest sign-in is current"

    headers = {"X-CSRF-Token": csrf}
    out = browser.delete(f"/api/accounts/{current['id']}", headers=headers)
    assert out.status_code == 200 and out.json["redirect"].endswith("/account")
    left = browser.get("/api/account").json["accounts"]
    assert [(a["email"], a["current"]) for a in left] == [(other["email"], True)], "the other one took over"

    assert browser.delete("/api/accounts/not-a-session", headers=headers).status_code == 404
    everything = browser.delete("/api/accounts", headers=headers)
    assert everything.json["redirect"].endswith("/signin")
    assert browser.get("/api/account").status_code == 401


def test_the_page_is_drawn_in_the_saved_scheme(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    assert "data-theme" not in browser.get("/account").get_data(as_text=True).split(">", 2)[1]
    # As the browser writes it: URL-encoded JSON.
    browser.set_cookie("idp-scheme", quote('{"v":1,"value":"dark","createdAt":1}'))
    assert 'data-theme="dark"' in browser.get("/account/security").get_data(as_text=True)
    browser.set_cookie("idp-scheme", '{"v":1,"value":"system"}')
    assert "data-theme" not in browser.get("/account").get_data(as_text=True).split(">", 2)[1]
    browser.set_cookie("idp-scheme", "not json")
    assert browser.get("/account").status_code == 200


def test_the_page_is_drawn_in_the_saved_skin(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], monkeypatch: pytest.MonkeyPatch
) -> None:
    sign_up(browser, outbox)
    assert 'data-ui="soft" data-account' in browser.get("/account").get_data(as_text=True)
    monkeypatch.setattr(get_settings(), "brand_skin", "paper")
    assert 'data-ui="paper"' in browser.get("/signin").get_data(as_text=True)
    browser.set_cookie("idp-skin", quote('{"v":1,"value":"glass","createdAt":1}'))
    assert 'data-ui="glass"' in browser.get("/account").get_data(as_text=True)
    # Only a skin the platform offers: anything else falls back to its default.
    browser.set_cookie("idp-skin", quote('{"v":1,"value":"idp"}'))
    assert 'data-ui="paper"' in browser.get("/account").get_data(as_text=True)


def test_the_default_skin_is_one_the_platform_offers() -> None:
    with pytest.raises(ValueError, match="one of soft"):
        Settings(brand_skin="idp")
