"""
What the provider stops keeping, and when. `flask prune` runs it; a deployment schedules that
daily. Every row it removes has stopped working already: nothing a person can still use goes.
"""

from datetime import timedelta

from sqlalchemy import Text, and_, cast, delete, exists, func, or_, select, update

from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import (
    AccessTokenRecord,
    AuditEvent,
    AuthorizationCode,
    DeviceCode,
    EmailToken,
    Invitation,
    LoginSession,
    RefreshToken,
    WebhookDelivery,
    WebhookEvent,
)

# Past their end, rows stay this long so a late request is answered "expired", not "unknown".
GRACE = timedelta(days=1)


def prune() -> dict[str, int]:
    """Deletes what has expired or ended; returns the number of rows per kind."""
    settings = get_settings()
    now = utcnow()
    before = now - GRACE
    removed: dict[str, int] = {}

    def run(name: str, statement: object) -> None:
        removed[name] = db().execute(statement).rowcount  # type: ignore[call-overload]

    run("authorization_codes", delete(AuthorizationCode).where(AuthorizationCode.expires_at < before))
    run("access_tokens", delete(AccessTokenRecord).where(AccessTokenRecord.expires_at < before))
    # A family goes whole, once its newest token has expired: a copied token presented while the
    # family lives must still be recognized, to revoke it.
    live_families = select(RefreshToken.family_id).where(RefreshToken.expires_at >= before)
    run(
        "refresh_tokens",
        delete(RefreshToken).where(RefreshToken.family_id.not_in(live_families)),
    )

    old_sessions = select(LoginSession.id).where(
        func.coalesce(LoginSession.revoked_at, LoginSession.expires_at)
        < now - timedelta(days=settings.session_retention_days)
    )
    # Without its session a token would read as unbound: online tokens of an ended sign-in go with
    # it (they are refused already); offline ones outlive it, as they are meant to.
    offline = func.concat(" ", RefreshToken.scope, " ").like("% offline_access %")
    db().execute(
        delete(RefreshToken).where(
            RefreshToken.session_id.in_(old_sessions), or_(RefreshToken.scope.is_(None), ~offline)
        )
    )
    run("login_sessions", delete(LoginSession).where(LoginSession.id.in_(old_sessions)))

    run(
        "email_tokens",
        delete(EmailToken).where(or_(EmailToken.expires_at < before, EmailToken.used_at < before)),
    )
    run("device_codes", delete(DeviceCode).where(DeviceCode.expires_at < before))
    run(
        "invitations",
        delete(Invitation).where(and_(Invitation.accepted_at.is_(None), Invitation.expires_at < before)),
    )
    # A month of finished deliveries, for the delivery log; an event goes with its last delivery.
    finished_before = now - timedelta(days=settings.webhook_retention_days)
    run(
        "webhook_deliveries",
        delete(WebhookDelivery).where(
            WebhookDelivery.status.in_(("delivered", "failed")), WebhookDelivery.created_at < finished_before
        ),
    )
    run(
        "webhook_events",
        delete(WebhookEvent).where(
            WebhookEvent.created_at < finished_before,
            ~exists().where(WebhookDelivery.event_id == WebhookEvent.id),
        ),
    )
    run(
        "audit_events",
        delete(AuditEvent).where(AuditEvent.at < now - timedelta(days=settings.audit_retention_days)),
    )
    db().commit()
    return removed


def forget_in_audit(user_id: object, email: str) -> None:
    """
    A deleted account's trail keeps what happened and when, not who: its rows lose the address
    they came from and their details, and the address is replaced wherever another row names it.
    """
    db().execute(
        update(AuditEvent).where(AuditEvent.user_id == user_id).values(ip=None, user_agent=None, details={})
    )
    naming = db().scalars(select(AuditEvent).where(cast(AuditEvent.details, Text).contains(email)))
    for event in naming:
        event.details = {
            key: ("(deleted)" if value == email else value) for key, value in event.details.items()
        }
