"""
The account area's Data and account page: a copy of what the provider keeps about a person, and
deleting the account themselves.
"""

from typing import Any

from sqlalchemy import select

from idp import plugins
from idp.db import db, utcnow
from idp.models import AuditEvent, Client, LoginSession, Organization, OrganizationMember, User
from idp.services import backchannel, connected, passkeys, profile


def export(user: User, here: set[Any]) -> dict[str, Any]:
    """Everything the account area shows, and the full audit trail of the account, as JSON."""
    memberships = db().execute(
        select(Organization, OrganizationMember.role)
        .join(OrganizationMember)
        .where(OrganizationMember.user_id == user.id)
        .order_by(Organization.name)
    )
    events = db().scalars(select(AuditEvent).where(AuditEvent.user_id == user.id).order_by(AuditEvent.at))
    return {
        "exported_at": utcnow().isoformat(),
        "profile": {
            "id": str(user.id),
            "email": user.email,
            "email_verified": user.email_verified,
            "given_name": user.given_name,
            "family_name": user.family_name,
            "locale": user.locale,
            "country": user.country,
            "phone": user.phone,
            "address": profile.address_of(user),
            "picture": user.picture,
            "roles": list(user.roles),
            "created_at": user.created_at.isoformat(),
            "password_changed_at": user.password_changed_at.isoformat() if user.password_changed_at else None,
        },
        "passkeys": [passkeys.as_json(p) for p in passkeys.list_for(user)],
        "devices": connected.sessions_of(user, here),
        "connected_apps": connected.apps_of(user, user.locale),
        "organizations": [{"id": str(org.id), "name": org.name, "role": role} for org, role in memberships],
        "activity": [
            {
                "at": e.at.isoformat(),
                "event": e.event,
                "ip": e.ip,
                "user_agent": e.user_agent,
                "details": e.details,
            }
            for e in events
        ],
    }


def last_export(user: User) -> str | None:
    at = db().scalar(
        select(AuditEvent.at)
        .where(AuditEvent.user_id == user.id, AuditEvent.event == "data_exported")
        .order_by(AuditEvent.at.desc())
        .limit(1)
    )
    return at.isoformat() if at else None


def blockers(user: User) -> dict[str, Any]:
    """
    What stops the account from being deleted: organizations it alone owns (they would be left
    with nobody to run them), and being the last admin of the platform.
    """
    owned = db().scalars(
        select(Organization)
        .join(OrganizationMember)
        .where(OrganizationMember.user_id == user.id, OrganizationMember.role == "owner")
        .order_by(Organization.name)
    )
    alone = [
        {"id": str(org.id), "name": org.name}
        for org in owned
        if not any(m.role == "owner" and m.user_id != user.id for m in org.members)
    ]
    last_admin = user.is_admin and not any(
        u.is_admin for u in db().scalars(select(User).where(User.id != user.id, User.disabled_at.is_(None)))
    )
    return {"organizations": alone, "last_admin": last_admin}


def portal_url() -> str | None:
    """Where organizations are managed: the platform's own app that asks for the developer scope."""
    apps = db().scalars(
        select(Client).where(
            Client.first_party.is_(True), Client.disabled_at.is_(None), Client.homepage_url.is_not(None)
        )
    )
    return next((app.homepage_url for app in apps if "developer" in (app.scope or "").split()), None)


def delete(user: User) -> None:
    """The account and, through the database, its sessions, tokens, consents and passkeys."""
    plugins.emit("user.deleted", {"user": str(user.id)})
    # Told before the rows go, while the grants still name the apps.
    backchannel.notify(
        db().scalars(
            select(LoginSession.id).where(LoginSession.user_id == user.id, LoginSession.revoked_at.is_(None))
        )
    )
    db().delete(user)
