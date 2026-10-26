"""The account area's security page: changing the password, and the recent activity."""

from urllib.parse import urlencode

from flask import Flask
from flask.testing import FlaskClient

from buntubi.services import mail

from conftest import PASSWORD, api, page_config, sign_up

NEW = "a brand new passphrase"


def _sign_in(client: FlaskClient, password: str = PASSWORD) -> int:
    csrf = page_config(client, "/signin")["csrf"]
    body = {"email": "awa@example.test", "password": password}
    return api(client, "POST", "/api/session", body, csrf).status_code


def test_changing_the_password_can_sign_out_the_other_devices(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    other = app.test_client()
    assert _sign_in(other) == 200 and other.get("/api/account").status_code == 200

    def change(body: dict[str, object]) -> str | None:
        return api(browser, "POST", "/api/account/password", body, csrf).json.get("error")

    assert change({"current_password": "nope", "new_password": NEW}) == "wrong_password"
    assert change({"current_password": PASSWORD, "new_password": "short"}) == "weak_password"
    assert change({"current_password": PASSWORD, "new_password": PASSWORD}) == "same_password"
    assert change({"current_password": PASSWORD, "new_password": NEW, "sign_out_others": True}) is None

    assert browser.get("/api/account").json["user"]["password_changed_at"]
    assert other.get("/api/account").status_code == 401
    assert _sign_in(app.test_client()) == 401 and _sign_in(app.test_client(), NEW) == 200


def test_keeping_the_other_devices_signed_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    other = app.test_client()
    _sign_in(other)
    body = {"current_password": PASSWORD, "new_password": NEW}
    done = api(browser, "POST", "/api/account/password", body, csrf)
    assert done.status_code == 200 and other.get("/api/account").status_code == 200


def test_activity_shows_sign_ins_and_groups_wrong_passwords(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    for _ in range(3):
        assert _sign_in(app.test_client(), "wrong password here") == 401
    _sign_in(app.test_client())
    api(browser, "POST", "/api/account/password", {"current_password": PASSWORD, "new_password": NEW}, csrf)

    reply = browser.get("/api/account/activity", headers={"User-Agent": "x"}).json
    kinds = [(e["kind"], e["count"]) for e in reply["events"]]
    assert reply["days"] == 30
    assert kinds[:3] == [("password_changed", 1), ("sign_in", 1), ("sign_in_failed", 3)]
    assert browser.get("/api/account/activity").json["events"][0]["browser"] == ""
    assert app.test_client().get("/api/account/activity").json["error"] == "not_signed_in"


def test_activity_shows_sign_outs_and_the_app_that_signed_out(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    from test_flows import signed_in_tokens

    tokens = signed_in_tokens(app, browser, outbox)
    browser.get(
        "/oauth/logout?"
        + urlencode(
            {"post_logout_redirect_uri": "http://localhost:9000/bye", "id_token_hint": tokens["id_token"]}
        )
    )
    other = app.test_client()
    assert _sign_in(other) == 200
    csrf = page_config(other, "/account")["csrf"]
    api(other, "DELETE", "/api/session", None, csrf)
    again = app.test_client()
    assert _sign_in(again) == 200
    events = [e for e in again.get("/api/account/activity").json["events"] if e["kind"] == "signed_out"]
    assert len(events) == 2
    assert events[0]["app"] is None and events[1]["app"] == "Test app"
