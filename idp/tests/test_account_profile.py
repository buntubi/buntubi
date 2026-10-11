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


ADDRESS = {
    "street_address": "12 rue Carnot\nAppartement 4",
    "locality": "Dakar",
    "region": "Dakar",
    "postal_code": "10200",
    "country": "sn",
}


def test_the_postal_address_is_kept_by_parts_and_given_as_the_address_claim(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    from sqlalchemy import select

    from idp.db import db
    from idp.models import User
    from idp.oauth.claims import user_claims

    csrf = sign_up(browser, outbox)
    done = api(browser, "PATCH", "/api/account/profile", {"address": ADDRESS}, csrf)
    assert done.status_code == 200, done.json
    address = browser.get("/api/account").json["user"]["address"]
    assert address == {**ADDRESS, "country": "SN"}

    # Only the parts sent change; an empty one clears it.
    api(browser, "PATCH", "/api/account/profile", {"address": {"region": ""}}, csrf)
    assert browser.get("/api/account").json["user"]["address"]["region"] == ""
    too_long = api(browser, "PATCH", "/api/account/profile", {"address": {"postal_code": "1" * 21}}, csrf)
    assert too_long.json["error"] == "invalid_address"
    bad_country = api(browser, "PATCH", "/api/account/profile", {"address": {"country": "S1"}}, csrf)
    assert bad_country.json["error"] == "invalid_country"

    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        claim = user_claims(user, "openid address")["address"]
        assert claim["postal_code"] == "10200" and "region" not in claim
        assert claim["formatted"] == "12 rue Carnot\nAppartement 4\n10200 Dakar\nSN"
        assert "address" not in user_claims(user, "openid profile"), "only with the address scope"

    export = browser.get("/api/account/export").json
    assert export["profile"]["address"]["locality"] == "Dakar"


def test_an_empty_address_gives_no_claim(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    from sqlalchemy import select

    from idp.db import db
    from idp.models import User
    from idp.oauth.claims import user_claims

    sign_up(browser, outbox)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None and "address" not in user_claims(user, "openid address")
