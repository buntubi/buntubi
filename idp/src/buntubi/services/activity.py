"""A person's recent security activity, read from the audit trail: what happened, from which browser, when."""

from datetime import timedelta
from typing import Any

from sqlalchemy import select

from buntubi import social
from buntubi.db import db, utcnow
from buntubi.models import AuditEvent, User
from buntubi.services import devices

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
    "device_signed_out": "device_signed_out",
    "app_access_removed": "app_access_removed",
    "data_exported": "data_exported",
    "identity_linked": "provider_linked",
    "identity_unlinked": "provider_unlinked",
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
        details = row.details if isinstance(row.details, dict) else {}
        methods = details.get("methods", [])
        provider = social.get(str(details.get("provider") or ""))
        entries.append(
            {
                "kind": kind,
                "at": row.at.isoformat(),
                "ip": row.ip,
                **devices.describe(row.user_agent),
                "two_step": "mfa" in methods,
                "passkey": "hwk" in methods,
                "password": "pwd" in methods,
                # The social provider of a sign-in, or of a provider linked or unlinked.
                "provider": provider.label if provider else None,
                "name": details.get("name"),
                "count": 1,
            }
        )
    return entries
