"""The audit trail: who did what, when, from where. Never a secret in `details`."""

from typing import Any

from flask import request

from idp.db import db
from idp.models import AuditEvent, Client, User


def record(event: str, *, user: User | None = None, client: Client | None = None, **details: Any) -> None:
    db().add(
        AuditEvent(
            event=event,
            user_id=user.id if user is not None else None,
            client_id=client.id if client is not None else None,
            ip=request.remote_addr,
            details=details,
        )
    )
