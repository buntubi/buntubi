"""Which scopes a user already agreed to give a client; a request asking for more asks again."""

from authlib.oauth2.rfc6749 import scope_to_list
from sqlalchemy import select

from buntubi.db import db, utcnow
from buntubi.models import Client, Consent, User


def is_needed(user: User, client: Client, scope: str) -> bool:
    if client.first_party:
        return False
    granted = db().scalar(select(Consent).where(Consent.user_id == user.id, Consent.client_id == client.id))
    requested = set(scope_to_list(scope) or [])
    return granted is None or not requested.issubset(granted.scopes)


def record(user: User, client: Client, scope: str) -> None:
    requested = set(scope_to_list(scope) or [])
    granted = db().scalar(select(Consent).where(Consent.user_id == user.id, Consent.client_id == client.id))
    if granted is None:
        db().add(Consent(user_id=user.id, client_id=client.id, scopes=sorted(requested)))
    else:
        granted.scopes = sorted(requested | set(granted.scopes))
        granted.granted_at = utcnow()
