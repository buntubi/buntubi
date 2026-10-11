"""A person's recent security activity, read from the audit trail: what happened, from which browser, when."""

from datetime import timedelta
from typing import Any

from sqlalchemy import select

from idp.db import db, utcnow
from idp.models import AuditEvent, User
from idp.services import devices

DAYS = 30

# The events a person should see on their security page, by the name the page shows.
KINDS = {
    "sign_in": "sign_in",
    "email_verified": "sign_in",
    "sign_in_failed": "sign_in_failed",
    "password_changed": "password_changed",
    "password_reset": "password_reset",
    "admin.password_reset_sent": "password_reset_sent",
    "mfa_enabled": "mfa_enabled",
    "mfa_disabled": "mfa_disabled",
    "admin.two_step_reset": "mfa_disabled",
    "mfa_backup_code_used": "backup_code_used",
    "mfa_backup_codes_renewed": "backup_codes_renewed",
    "email_change_requested": "email_change_requested",
    "email_changed": "email_changed",
    "admin.user_signed_out": "signed_out_everywhere",
    "signed_out_others": "signed_out_others",
    "passkey_added": "passkey_added",
    "passkey_removed": "passkey_removed",
}


def recent(user: User, limit: int = 50) -> list[dict[str, Any]]:
    """Newest first. Wrong passwords in a row from one address are one entry with a count."""
    rows = db().scalars(
        select(AuditEvent)
        .where(
            AuditEvent.user_id == user.id,
            AuditEvent.event.in_(KINDS),
            AuditEvent.at > utcnow() - timedelta(days=DAYS),
        )
        .order_by(AuditEvent.at.desc())
        .limit(limit * 4)
    )
    entries: list[dict[str, Any]] = []
    for row in rows:
        kind = KINDS[row.event]
        last = entries[-1] if entries else None
        if kind == "sign_in_failed" and last and last["kind"] == kind and last["ip"] == row.ip:
            last["count"] += 1
            continue
        if len(entries) == limit:
            break
        methods = row.details.get("methods", []) if isinstance(row.details, dict) else []
        entries.append(
            {
                "kind": kind,
                "at": row.at.isoformat(),
                "ip": row.ip,
                **devices.describe(row.user_agent),
                "two_step": "mfa" in methods,
                "passkey": "hwk" in methods,
                "name": row.details.get("name") if isinstance(row.details, dict) else None,
                "count": 1,
            }
        )
    return entries
