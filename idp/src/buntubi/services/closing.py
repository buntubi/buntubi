"""
The account area's Data and account page: a copy of what the provider keeps about a person, and
deleting the account themselves.
"""

from typing import Any

from sqlalchemy import func, select

from buntubi import plugins
from buntubi.db import db, utcnow
from buntubi.models import (
    AuditEvent,
    BackupCode,
    Client,
    LoginSession,
    Organization,
    OrganizationMember,
    TotpCredential,
    User,
)
from buntubi.services import (
    app_data,
    backchannel,
    connected,
    passkeys,
    profile,
    profile_fields,
    retention,
    webhooks,
)
from buntubi.services.webhooks import Event


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
            **profile_fields.everything_of(user),
            "terms_version": user.terms_version,
            "terms_accepted_at": user.terms_accepted_at.isoformat() if user.terms_accepted_at else None,
        },
        # What each app keeps about the person for itself.
        "app_data": app_data.of_person(user),
        "pending_email": profile.pending_email(user),
        "developer_since": user.developer_since.isoformat() if user.developer_since else None,
        "linked_accounts": [
            {"provider": i.provider, "email": i.email, "linked_at": i.created_at.isoformat()}
            for i in user.identities
        ],
        "two_step": _two_step(user),
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


def _two_step(user: User) -> dict[str, Any]:
    app = db().scalar(select(TotpCredential).where(TotpCredential.user_id == user.id))
    left = db().scalar(
        select(func.count())
        .select_from(BackupCode)
        .where(BackupCode.user_id == user.id, BackupCode.used_at.is_(None))
    )
    return {
        "authenticator_app_since": app.confirmed_at.isoformat() if app and app.confirmed_at else None,
        "backup_codes_left": left or 0,
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


def delete(user: User, *, source: str) -> None:
    """
    The account and, through the database, its sessions, tokens, consents and passkeys. Its audit
    trail stays without who it was (retention.forget_in_audit); the deletion itself is recorded
    by the account's id alone. Every way of deleting an account goes through here, so its apps and
    the plugins hear of it.
    """
    plugins.emit("user.deleted", {"user": str(user.id)})
    # Told before the rows go, while the grants still name the apps.
    backchannel.notify(
        db().scalars(
            select(LoginSession.id).where(LoginSession.user_id == user.id, LoginSession.revoked_at.is_(None))
        )
    )
    # The organizations it was in hear that it left, before its memberships go with it.
    for seat in db().scalars(select(OrganizationMember).where(OrganizationMember.user_id == user.id)):
        webhooks.member_changed(seat, Event.MEMBER_REMOVED)
    retention.forget_in_audit(user.id, user.email)
    # Not through audit.record: that would keep the address and browser of the person just forgotten.
    db().add(AuditEvent(event="account.deleted", details={"source": source, "account": str(user.id)}))
    db().delete(user)
