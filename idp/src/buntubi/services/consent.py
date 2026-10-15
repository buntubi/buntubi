"""
Which scopes a user already agreed to give a client, as a person or in one organization; a request
asking for more, or for another organization, asks again.
"""

import uuid

from authlib.oauth2.rfc6749 import scope_to_list
from sqlalchemy import select

from buntubi.db import db, utcnow
from buntubi.models import Client, Consent, User


def _given(user: User, client: Client, organization_id: uuid.UUID | None) -> Consent | None:
    return db().scalar(
        select(Consent).where(
            Consent.user_id == user.id,
            Consent.client_id == client.id,
            Consent.organization_id.is_(None)
            if organization_id is None
            else Consent.organization_id == organization_id,
        )
    )


def is_needed(user: User, client: Client, scope: str, organization_id: uuid.UUID | None = None) -> bool:
    if client.first_party:
        return False
    granted = _given(user, client, organization_id)
    requested = set(scope_to_list(scope) or [])
    return granted is None or not requested.issubset(granted.scopes)


def record(user: User, client: Client, scope: str, organization_id: uuid.UUID | None = None) -> None:
    requested = set(scope_to_list(scope) or [])
    granted = _given(user, client, organization_id)
    if granted is None:
        db().add(
            Consent(
                user_id=user.id,
                client_id=client.id,
                organization_id=organization_id,
                scopes=sorted(requested),
            )
        )
    else:
        granted.scopes = sorted(requested | set(granted.scopes))
        granted.granted_at = utcnow()
