"""The account area's Data and account page: the data copy, and deleting the account."""

import json
from datetime import timedelta

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select, update

from idp.db import db, utcnow
from idp.models import AuditEvent, LoginSession, Organization, OrganizationMember, User
from idp.services import mail

from conftest import PASSWORD, api, sign_up


def _user(app: Flask) -> User | None:
    with app.app_context():
        return db().scalar(select(User).where(User.email == "awa@example.test"))


def test_the_copy_holds_the_account_and_is_remembered(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    assert browser.get("/api/account/closing").json["last_export_at"] is None
    reply = browser.get("/api/account/export")
    assert reply.status_code == 200 and "attachment" in reply.headers["Content-Disposition"]
    data = json.loads(reply.data)
    assert data["profile"]["email"] == "awa@example.test"
    assert {"passkeys", "devices", "connected_apps", "organizations", "activity"} <= set(data)
    assert any(e["event"] == "sign_up" for e in data["activity"])
    assert browser.get("/api/account/closing").json["last_export_at"]


def test_an_organization_owned_alone_blocks_the_deletion(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    user = _user(app)
    assert user is not None
    with app.app_context():
        org = Organization(name="Atelier Baobab")
        org.members.append(OrganizationMember(user_id=user.id, role="owner"))
        db().add(org)
        db().commit()
    closing = browser.get("/api/account/closing").json
    assert [o["name"] for o in closing["organizations"]] == ["Atelier Baobab"] and closing[
        "last_admin"
    ] is False
    refused = api(browser, "DELETE", "/api/account", {"email": "awa@example.test"}, csrf)
    assert refused.json["error"] == "owns_organizations" and _user(app) is not None


def test_deleting_the_account(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    csrf = sign_up(browser, outbox)
    assert (
        api(browser, "DELETE", "/api/account", {"email": "someone@else.test"}, csrf).json["error"]
        == "email_mismatch"
    )
    with app.app_context():
        db().execute(update(LoginSession).values(created_at=utcnow() - timedelta(hours=1)))
        db().commit()
    assert browser.get("/api/account/closing").json["password_needed"] is True
    assert (
        api(browser, "DELETE", "/api/account", {"email": "AWA@example.test"}, csrf).json["error"]
        == "reauth_required"
    )
    body = {"email": "awa@example.test", "password": "wrong"}
    assert api(browser, "DELETE", "/api/account", body, csrf).json["error"] == "wrong_password"

    done = api(browser, "DELETE", "/api/account", {"email": "awa@example.test", "password": PASSWORD}, csrf)
    assert done.status_code == 200 and done.json["redirect"] == "/signin"
    assert _user(app) is None
    assert browser.get("/api/account").status_code == 401
    with app.app_context():
        trace = db().scalar(select(AuditEvent).where(AuditEvent.event == "account.deleted"))
        assert trace is not None and trace.user_id is None and trace.ip is None
        assert trace.details["source"] == "self" and "email" not in trace.details, "recorded without who it was"


def test_the_last_admin_stays(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    csrf = sign_up(browser, outbox)
    with app.app_context():
        db().execute(update(User).values(roles=["admin"]))
        db().commit()
    assert browser.get("/api/account/closing").json["last_admin"] is True
    assert (
        api(browser, "DELETE", "/api/account", {"email": "awa@example.test"}, csrf).json["error"]
        == "last_admin"
    )
