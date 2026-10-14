"""The audit trail: who did what, when, from where. Never a secret in `details`."""

from typing import Any

from flask import has_request_context, request

from buntubi.db import db
from buntubi.models import AuditEvent, Client, User


def record(event: str, *, user: User | None = None, client: Client | None = None, **details: Any) -> None:
    db().add(
        AuditEvent(
            event=event,
            user_id=user.id if user is not None else None,
            client_id=client.id if client is not None else None,
            # None from the command line, where there is no request.
            ip=request.remote_addr if has_request_context() else None,
            user_agent=(request.user_agent.string[:512] or None) if has_request_context() else None,
            details=details,
        )
    )
