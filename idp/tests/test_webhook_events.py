"""
Organization events for the products: written in the same transaction as the change, numbered
per organization, and queued for each app that hears of that organization (one it works with,
or one subscribed to all of them). A change that does not happen leaves no event.
"""

from typing import Any

import pytest
from flask import Flask
from sqlalchemy import select

from buntubi.db import db
from buntubi.models import AppOrganization, Client, Organization, User, WebhookDelivery, WebhookEvent
from buntubi.services import mail
from buntubi.services import platform as p

from conftest import add_client, sign_up


def person(app: Flask, email: str) -> User:
    user = db().scalar(select(User).where(User.email == email))
    assert user is not None
    return user


def events(organization_id: Any = None) -> list[tuple[str, int]]:
    query = select(WebhookEvent).order_by(WebhookEvent.created_at, WebhookEvent.sequence)
    if organization_id is not None:
        query = query.where(WebhookEvent.organization_id == organization_id)
    return [(e.type, e.sequence) for e in db().scalars(query)]


@pytest.fixture
def two(app: Flask, outbox: list[mail.Message]) -> None:
    """Awa and Omar have accounts."""
    sign_up(app.test_client(), outbox)
    sign_up(app.test_client(), outbox, email="omar@example.test")


def test_each_change_of_an_organization_is_an_event_numbered_in_order(app: Flask, two: None) -> None:
    with app.app_context():
        awa = person(app, "awa@example.test")
        organization = p.create_organization(awa, "ACME", "", None)
        db().commit()
        owner = organization.members[0]
        p.update_organization(owner, name="ACME Studio")
        db().commit()
        added = p.add_member(owner, "omar@example.test", "member", None, [])
        db().commit()
        # The portal's own role is the portal's: no product hears of it.
        p.change_member(owner, added, None, None, "developer")
        db().commit()
        p.change_member(owner, added, "admin", None)
        db().commit()
        p.remove_member(owner, added)
        db().commit()
        assert events(organization.id) == [
            ("organization.created", 1),
            ("organization.updated", 2),
            ("member.added", 3),
            ("member.role_changed", 4),
            ("member.removed", 5),
        ]
        changed = db().scalar(select(WebhookEvent).where(WebhookEvent.type == "member.role_changed"))
        assert changed is not None
        assert changed.data["member"]["role"] == "admin" and changed.data["previous_role"] == "member"
        assert changed.data["member"]["user_id"] == str(person(app, "omar@example.test").id)


def test_a_refused_change_leaves_no_event(app: Flask, two: None) -> None:
    with app.app_context():
        organization = p.create_organization(person(app, "awa@example.test"), "ACME", "", None)
        db().commit()
        owner = organization.members[0]
        with pytest.raises(p.PlatformError):
            p.remove_member(owner, owner)  # the last owner
        db().rollback()
        assert events(organization.id) == [("organization.created", 1)]


def test_suspension_transfer_invitation_and_deletion(app: Flask, outbox: list[mail.Message]) -> None:
    sign_up(app.test_client(), outbox)
    with app.app_context():
        organization = p.create_organization(person(app, "awa@example.test"), "ACME", "", None)
        owner = organization.members[0]
        p.invite(owner, "nia@example.test", "member", None, [], "https://id.example/signup")
        db().commit()
        org_id = organization.id
    sign_up(app.test_client(), outbox, email="nia@example.test")  # accepts the invitation
    with app.app_context():
        organization = db().get(Organization, org_id)
        assert organization is not None
        owner = next(m for m in organization.members if m.role == "owner")
        nia = next(m for m in organization.members if m.role == "member")
        p.suspend(organization, "unpaid")
        p.restore(organization)
        p.transfer_ownership(owner, nia)
        db().commit()
        p.delete_organization(nia)
        db().commit()
        assert [t for t, _ in events(org_id)] == [
            "organization.created",
            "invitation.accepted",
            "member.added",
            "organization.suspended",
            "organization.restored",
            "member.role_changed",
            "member.role_changed",
            "organization.deleted",
        ]
        assert [s for _, s in events(org_id)] == list(range(1, 9)), "the deletion is still told, in order"


def test_each_organization_counts_on_its_own(app: Flask, two: None) -> None:
    with app.app_context():
        awa = person(app, "awa@example.test")
        first = p.create_organization(awa, "ACME", "", None)
        second = p.create_organization(awa, "Globex", "", None)
        db().commit()
        assert events(first.id) == [("organization.created", 1)]
        assert events(second.id) == [("organization.created", 1)]


def test_deliveries_go_to_the_apps_that_hear_of_the_organization(app: Flask, two: None) -> None:
    add_client(app, client_id="linked", webhook_url="https://linked.example/hooks")
    add_client(app, client_id="everything", webhook_url="https://all.example/hooks", webhook_events="all")
    add_client(app, client_id="elsewhere", webhook_url="https://elsewhere.example/hooks")
    add_client(app, client_id="silent")
    with app.app_context():
        awa = person(app, "awa@example.test")
        acme = p.create_organization(awa, "ACME", "", None)
        globex = p.create_organization(awa, "Globex", "", None)
        db().commit()
        clients = {c.client_id: c for c in db().scalars(select(Client))}
        db().add(AppOrganization(client_id=clients["linked"].id, organization_id=acme.id))
        db().add(AppOrganization(client_id=clients["elsewhere"].id, organization_id=globex.id))
        db().add(AppOrganization(client_id=clients["silent"].id, organization_id=acme.id))
        db().commit()
        p.update_organization(acme.members[0], name="ACME Studio")
        db().commit()
        updated = db().scalar(select(WebhookEvent).where(WebhookEvent.type == "organization.updated"))
        assert updated is not None
        queued = db().scalars(select(WebhookDelivery).where(WebhookDelivery.event_id == updated.id))
        assert sorted(d.client.client_id for d in queued) == ["everything", "linked"]
        assert all(d.status == "pending" for d in db().scalars(select(WebhookDelivery)))


def test_an_organization_bound_token_links_the_app(
    app: Flask, browser: Any, outbox: list[mail.Message]
) -> None:
    from test_organization_tokens import organization, tokens_for

    add_client(app, organization_usage="optional", webhook_url="https://spa.example/hooks")
    csrf = sign_up(browser, outbox)
    org = organization(app, "awa@example.test", "ACME")
    tokens_for(browser, csrf, organization=org)
    with app.app_context():
        links = db().scalars(select(AppOrganization)).all()
        assert [(str(link.organization_id)) for link in links] == [org]
