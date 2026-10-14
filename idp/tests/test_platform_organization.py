"""The platform's own apps belong to the platform organization; first-party is the admin's flag."""

from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_console_api import admin_call, setup_people
from test_developer_api import LIVE_FIELDS, call

from buntubi.db import db
from buntubi.models import Client, Organization, User
from buntubi.services import mail
from buntubi.services import platform as p

from conftest import REDIRECT


def platform_client(owner_browser: FlaskClient, owner: dict[str, str], client_id: str = "suite") -> Any:
    return admin_call(
        owner_browser,
        owner,
        "POST",
        "/clients",
        {"client_id": client_id, "name": "Suite", "redirect_uris": [REDIRECT], "first_party": True},
    ).json["client"]


def developer_app(dev_browser: FlaskClient, dev: dict[str, str]) -> str:
    organization_id = call(
        dev_browser, dev, "POST", "/organizations", {"name": "Shop", "support_email": "help@shop.example"}
    ).json["organization"]["id"]
    return str(
        call(
            dev_browser,
            dev,
            "POST",
            f"/organizations/{organization_id}/apps",
            {"name": "Web", "redirect_uris": [REDIRECT], "scopes": [], **LIVE_FIELDS},
        ).json["app"]["client_id"]
    )


def test_a_console_client_lands_in_the_platform_organization(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    created = platform_client(owner_browser, owner)
    assert created["platform"] and created["organization"] == "Platform" and created["environment"] == "live"
    with app.app_context():
        organization = db().scalar(select(Organization).where(Organization.is_platform))
        assert organization is not None
        admins = {m.user_id for m in organization.members if m.role == "owner"}
        assert admins == {u.id for u in db().scalars(select(User)) if u.is_admin}
        assert p.platform_organization().id == organization.id, "one platform organization"


def test_first_party_is_for_platform_apps_only(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    client_id = developer_app(dev_browser, dev)
    refused = admin_call(owner_browser, owner, "PATCH", f"/clients/{client_id}", {"first_party": True})
    assert refused.status_code == 422 and refused.json["error"] == "not_a_platform_app"
    platform_client(owner_browser, owner)
    changed = admin_call(owner_browser, owner, "PATCH", "/clients/suite", {"first_party": False})
    assert changed.status_code == 200 and not changed.json["client"]["first_party"]


def test_a_first_party_app_is_trusted_in_the_sandbox(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    platform_client(owner_browser, owner)
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == "suite"))
        assert client is not None
        client.environment = "sandbox"
        stranger = User(email="stranger@example.test", roles=[])
        db().add(stranger)
        db().flush()
        assert p.may_sign_in(client, stranger) and p.is_verified(client)
        client.first_party = False
        assert not p.may_sign_in(client, stranger), "a platform app without the flag is an ordinary app"
        db().rollback()


def test_the_platform_organization_stays(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    organization_id = platform_client(owner_browser, owner)["organization_id"]
    refused = admin_call(
        owner_browser, owner, "POST", f"/organizations/{organization_id}/suspend", {"reason": "no"}
    )
    assert refused.status_code == 409 and refused.json["error"] == "platform_organization"


def test_an_app_keeps_a_restricted_scope_it_was_given(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    client_id = developer_app(dev_browser, dev)
    admin_call(owner_browser, owner, "PATCH", f"/clients/{client_id}", {"scope": "openid developer"})
    kept = call(dev_browser, dev, "PATCH", f"/apps/{client_id}", {"scopes": ["developer", "profile"]})
    assert kept.status_code == 200, kept.json
    refused = call(dev_browser, dev, "PATCH", f"/apps/{client_id}", {"scopes": ["admin"]})
    assert refused.status_code == 422 and refused.json["error"] == "restricted_scope"


def test_only_admins_join_the_platform_organization(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    platform_client(owner_browser, owner)
    with app.app_context():
        organization = p.platform_organization()
        actor = organization.members[0]
        with pytest.raises(p.PlatformError, match="platform_members_are_admins"):
            p.add_member(actor, "dev@example.test", "manager", [])
        admin = db().scalar(select(User).where(User.roles.contains(["admin"])))
        assert admin is not None
        p.leave_platform(admin)

        def members() -> set[object]:
            organization = db().scalar(select(Organization).where(Organization.is_platform))
            return {m.user_id for m in organization.members} if organization else set()

        db().expire_all()
        assert admin.id not in members(), "a demoted admin leaves"
        p.platform_organization()
        assert admin.id in members(), "and an admin is always an owner"
        db().rollback()


def test_a_superadmin_gives_and_takes_the_admin_role(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    platform_client(owner_browser, owner)
    with app.app_context():
        developer = db().scalar(select(User).where(User.email == "dev@example.test"))
        assert developer is not None
        target = str(developer.id)
    refused = admin_call(owner_browser, owner, "POST", f"/users/{target}/admin")
    assert refused.status_code == 403 and refused.json["error"] == "superadmin_only"

    with app.app_context():
        me = next(u for u in db().scalars(select(User)) if u.is_admin)
        me.roles = [*me.roles, "superadmin"]
        db().commit()
        my_id = str(me.id)
    granted = admin_call(owner_browser, owner, "POST", f"/users/{target}/admin")
    assert granted.status_code == 200 and "admin" in granted.json["user"]["roles"]
    with app.app_context():
        organization = db().scalar(select(Organization).where(Organization.is_platform))
        assert organization is not None
        assert any(str(m.user_id) == target and m.role == "owner" for m in organization.members)
    for method, path in (("DELETE", f"/users/{my_id}/admin"), ("POST", f"/users/{my_id}/disable")):
        protected = admin_call(owner_browser, owner, method, path)
        assert protected.status_code == 422 and protected.json["error"] in {
            "superadmin_protected",
            "cannot_disable_yourself",
        }
    removed = admin_call(owner_browser, owner, "DELETE", f"/users/{target}/admin")
    assert removed.status_code == 200 and "admin" not in removed.json["user"]["roles"]
    with app.app_context():
        organization = db().scalar(select(Organization).where(Organization.is_platform))
        assert organization is not None
        assert all(str(m.user_id) != target for m in organization.members)


def test_an_admin_uses_the_portal_without_the_developer_terms(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    platform_client(owner_browser, owner)
    with app.app_context():
        admin = next(u for u in db().scalars(select(User)) if u.is_admin)
        assert admin.developer_since is None
        p.require_developer(admin)
        listed = [m.organization for m in p.memberships_of(admin)]
        assert listed and listed[0].is_platform, "the platform organization first"
