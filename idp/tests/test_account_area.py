"""The account area: its page, its summary, and several accounts signed in on one browser."""

from flask import Flask
from flask.testing import FlaskClient

from idp.services import mail

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
    assert summary["mfa"] == {"enabled": False, "backup_codes_left": 0}
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
