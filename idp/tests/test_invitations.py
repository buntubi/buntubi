"""Invitations: someone without an account is asked by email, and joins at their first verified sign-in."""

from datetime import timedelta

from flask import Flask
from sqlalchemy import select, update
from test_developer_api import call
from test_members import add
from test_platform_gates import sandbox_app

from buntubi.db import db, utcnow
from buntubi.models import Invitation, OrganizationMember, User
from buntubi.services import mail

from conftest import sign_up


def _member_role(app: Flask, email: str, organization_id: str) -> str | None:
    with app.app_context():
        user = db().scalar(select(User).where(User.email == email))
        if user is None:
            return None
        member = db().scalar(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id, OrganizationMember.organization_id == organization_id
            )
        )
        return member.role if member else None


def test_an_invited_address_joins_when_its_account_is_made(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, _ = sandbox_app(app, outbox)
    sent = len(outbox)
    invited = add(dev_browser, dev, organization_id, email="Nia@Example.test", role="viewer")
    assert invited.status_code == 202
    letter = outbox[sent]
    assert letter.to == "nia@example.test" and "/signup" in letter.text
    detail = call(dev_browser, dev, "GET", f"/organizations/{organization_id}").json
    assert [i["email"] for i in detail["invitations"]] == ["nia@example.test"] and len(detail["members"]) == 1

    # Asking again renews the same invitation rather than adding a second.
    add(dev_browser, dev, organization_id, email="nia@example.test", role="developer")
    detail = call(dev_browser, dev, "GET", f"/organizations/{organization_id}").json
    assert [(i["email"], i["role"]) for i in detail["invitations"]] == [("nia@example.test", "developer")]

    sign_up(app.test_client(), outbox, email="nia@example.test")
    assert _member_role(app, "nia@example.test", organization_id) == "developer"
    assert call(dev_browser, dev, "GET", f"/organizations/{organization_id}").json["invitations"] == []


def test_a_withdrawn_or_expired_invitation_is_not_accepted(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, _ = sandbox_app(app, outbox)
    invitation = add(dev_browser, dev, organization_id, email="omar@example.test").json["invitation"]
    withdrawn = call(
        dev_browser, dev, "DELETE", f"/organizations/{organization_id}/invitations/{invitation['id']}"
    )
    assert withdrawn.json == {"withdrawn": True}
    sign_up(app.test_client(), outbox, email="omar@example.test")
    assert _member_role(app, "omar@example.test", organization_id) is None

    add(dev_browser, dev, organization_id, email="lea@example.test")
    with app.app_context():
        db().execute(update(Invitation).values(expires_at=utcnow() - timedelta(days=1)))
        db().commit()
    sign_up(app.test_client(), outbox, email="lea@example.test")
    assert _member_role(app, "lea@example.test", organization_id) is None
