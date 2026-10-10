"""The console's users: creating one by invitation, the dates, the profile page and its actions."""

import re

from flask import Flask
from sqlalchemy import select
from test_console_api import admin_call, setup_people

from idp.db import db
from idp.models import User
from idp.services import mail

from conftest import PASSWORD, api, page_config


def user_id(app: Flask, email: str) -> str:
    with app.app_context():
        found = db().scalar(select(User).where(User.email == email))
        assert found is not None
        return str(found.id)


def test_an_admin_invites_someone_who_then_chooses_a_password(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    created = admin_call(
        owner_browser,
        owner,
        "POST",
        "/users",
        {"email": "Moussa@Example.test", "given_name": "Moussa", "family_name": "Ba", "locale": "en"},
    )
    assert created.status_code == 201, created.json
    user = created.json["user"]
    assert user["email"] == "moussa@example.test" and not user["password_set"] and not user["email_verified"]
    assert user["last_sign_in_at"] is None

    invitation = outbox[-1]
    assert invitation.to == "moussa@example.test" and invitation.subject == "Your account is ready"
    token = re.search(r"token=([\w-]+)", invitation.text).group(1)  # type: ignore[union-attr]
    newcomer = app.test_client()
    csrf = page_config(newcomer, "/reset-password")["csrf"]
    chosen = api(newcomer, "POST", "/api/password/reset", {"token": token, "password": PASSWORD}, csrf)
    assert chosen.status_code == 200, chosen.json
    after = admin_call(owner_browser, owner, "GET", f"/users/{user['id']}").json["user"]
    assert after["password_set"] and after["email_verified"], "the link proves the address"

    again = admin_call(owner_browser, owner, "POST", "/users", {"email": "moussa@example.test"})
    assert again.status_code == 409 and again.json["error"] == "email_taken"


def test_the_list_says_when_people_signed_up_and_last_signed_in(
    app: Flask, outbox: list[mail.Message]
) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    items = {u["email"]: u for u in admin_call(owner_browser, owner, "GET", "/users").json["items"]}
    developer = items["dev@example.test"]
    assert developer["created_at"] and developer["last_sign_in_at"], "signed in by the setup"


def test_the_profile_page_and_its_edits(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    target = user_id(app, "dev@example.test")
    page = admin_call(owner_browser, owner, "GET", f"/users/{target}").json
    assert page["active_sessions"] >= 1 and page["organizations"] == []

    edited = admin_call(
        owner_browser,
        owner,
        "PATCH",
        f"/users/{target}",
        {
            "given_name": "Awa",
            "family_name": "Diallo",
            "country": "SN",
            "phone": "+221771234567",
            "locale": "en",
        },
    )
    assert edited.status_code == 200
    assert edited.json["user"]["family_name"] == "Diallo" and edited.json["user"]["country"] == "SN"
    cleared = admin_call(owner_browser, owner, "PATCH", f"/users/{target}", {"phone": ""}).json["user"]
    assert cleared["phone"] is None and cleared["country"] == "SN", "only what was sent changes"
    bad = admin_call(owner_browser, owner, "PATCH", f"/users/{target}", {"phone": "12"})
    assert bad.status_code == 400 or bad.status_code == 422


def test_the_security_actions(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    target = user_id(app, "dev@example.test")

    sent = admin_call(owner_browser, owner, "POST", f"/users/{target}/password-reset")
    assert sent.status_code == 202 and outbox[-1].to == "dev@example.test"

    signed_out = admin_call(owner_browser, owner, "POST", f"/users/{target}/sign-out")
    assert signed_out.status_code == 200
    assert admin_call(owner_browser, owner, "GET", f"/users/{target}").json["active_sessions"] == 0

    me = user_id(app, next(u.email for u in _admins(app)))
    mine = admin_call(owner_browser, owner, "DELETE", f"/users/{me}/mfa")
    assert mine.status_code == 422 and mine.json["error"] == "use_your_account_page"
    other = admin_call(owner_browser, owner, "DELETE", f"/users/{target}/mfa")
    assert other.status_code == 200 and not other.json["user"]["mfa"]


def _admins(app: Flask) -> list[User]:
    with app.app_context():
        return [u for u in db().scalars(select(User)) if u.is_admin]


def test_an_admin_can_make_an_account_ready_without_any_email(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    sent_before = len(outbox)
    created = admin_call(
        owner_browser,
        owner,
        "POST",
        "/users",
        {"email": "fatou@example.test", "given_name": "Fatou", "password": PASSWORD},
    )
    assert created.status_code == 201, created.json
    assert created.json["user"]["email_verified"] and created.json["user"]["password_set"]
    assert len(outbox) == sent_before, "no invitation, no code"

    newcomer = app.test_client()
    csrf = page_config(newcomer, "/signin")["csrf"]
    signed_in = api(
        newcomer, "POST", "/api/session", {"email": "fatou@example.test", "password": PASSWORD}, csrf
    )
    assert signed_in.status_code == 200 and "redirect" in signed_in.json, "straight in, no verification step"

    weak = admin_call(
        owner_browser, owner, "POST", "/users", {"email": "x@example.test", "password": "short"}
    )
    assert weak.status_code == 422 and weak.json["error"] == "weak_password"
