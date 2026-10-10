"""The account area's personal info: profile edits, the photo, and changing the address."""

import re
from typing import Any

from flask import Flask
from flask.testing import FlaskClient

from idp.services import mail

from conftest import PASSWORD, api, sign_up


def test_profile_edits_change_only_what_is_sent(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    done = api(
        browser,
        "PATCH",
        "/api/account/profile",
        {"given_name": "Awa", "phone": "+221 77 123 45 67", "country": "sn", "locale": "en"},
        csrf,
    )
    assert done.status_code == 200 and done.json["updated"] == ["country", "given_name", "locale", "phone"]
    user = browser.get("/api/account").json["user"]
    assert (user["phone"], user["country"], user["locale"]) == ("+221771234567", "SN", "en")
    assert (
        api(browser, "PATCH", "/api/account/profile", {"phone": "12"}, csrf).json["error"] == "invalid_phone"
    )
    cleared = api(browser, "PATCH", "/api/account/profile", {"phone": ""}, csrf)
    assert cleared.status_code == 200 and browser.get("/api/account").json["user"]["phone"] is None


def test_a_photo_is_stored_served_and_removed(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    headers = {"X-CSRF-Token": csrf}
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 100
    refused = browser.post(
        "/api/account/picture", data=b"<svg/>", headers={**headers, "Content-Type": "image/svg+xml"}
    )
    assert refused.status_code == 400 and refused.json["error"] == "unsupported_picture"
    big = browser.post(
        "/api/account/picture", data=b"0" * 200_001, headers={**headers, "Content-Type": "image/png"}
    )
    assert big.json["error"] == "picture_too_large"

    stored = browser.post("/api/account/picture", data=png, headers={**headers, "Content-Type": "image/png"})
    assert stored.status_code == 200
    address = stored.json["picture"]
    path = address[address.index("/avatars/") :]
    served = browser.get(path)
    assert served.status_code == 200 and served.data == png and served.mimetype == "image/png"
    assert "immutable" in served.headers["Cache-Control"]

    assert browser.delete("/api/account/picture", headers=headers).status_code == 200
    assert browser.get(path).status_code == 404
    assert browser.get("/api/account").json["user"]["picture"] is None


def test_the_address_changes_once_the_new_one_is_proven(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    sign_up(app.test_client(), outbox, email="taken@example.test")

    def ask(email: str, password: str = PASSWORD) -> Any:
        return api(browser, "POST", "/api/account/email", {"email": email, "password": password}, csrf)

    assert ask("new@example.test", "wrong password here").json["error"] == "wrong_password"
    assert ask("awa@example.test").json["error"] == "same_email"
    assert ask("taken@example.test").json["error"] == "email_taken"

    sent = len(outbox)
    asked = ask("New@Example.test")
    assert asked.status_code == 200 and asked.json["pending_email"] == "new@example.test"
    link, notice = outbox[sent], outbox[sent + 1]
    assert (
        link.to == "new@example.test"
        and notice.to == "awa@example.test"
        and "new@example.test" in notice.text
    )
    assert browser.get("/api/account").json["user"]["pending_email"] == "new@example.test"
    assert browser.get("/api/account").json["user"]["email"] == "awa@example.test", "nothing changes yet"

    token = re.search(r"token=([\w-]+)", link.text).group(1)  # type: ignore[union-attr]
    assert (
        api(browser, "POST", "/api/account/email/confirm", {"token": "nope"}, csrf).json["error"]
        == "link_expired"
    )
    confirmed = api(browser, "POST", "/api/account/email/confirm", {"token": token}, csrf)
    assert confirmed.status_code == 200 and confirmed.json["email"] == "new@example.test"
    user = browser.get("/api/account").json["user"]
    assert user["email"] == "new@example.test" and user["email_verified"] and user["pending_email"] is None
    assert (
        api(browser, "POST", "/api/account/email/confirm", {"token": token}, csrf).json["error"]
        == "link_expired"
    )


def test_a_pending_change_can_be_cancelled(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    api(browser, "POST", "/api/account/email", {"email": "new@example.test", "password": PASSWORD}, csrf)
    token = re.search(r"token=([\w-]+)", outbox[-2].text).group(1)  # type: ignore[union-attr]
    assert browser.delete("/api/account/email", headers={"X-CSRF-Token": csrf}).json["pending_email"] is None
    assert (
        api(browser, "POST", "/api/account/email/confirm", {"token": token}, csrf).json["error"]
        == "link_expired"
    )
