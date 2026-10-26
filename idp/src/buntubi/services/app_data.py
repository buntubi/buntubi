"""
What an app keeps about a person for itself (`additional user information` elsewhere): one JSON
object per app and person, read and written by the app with its own credentials. Never shown in
the account area, never in a token, given back in the person's data export.

An app reaches only the people who use it: those who consented to it, or anyone for one of the
platform's own apps. Anyone else answers as not found, so the API does not reveal accounts.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select

from buntubi.db import db, utcnow
from buntubi.models import AppUserData, Client, Consent, User
from buntubi.services.platform import PlatformError

# The object's size as JSON: room for preferences and ids, not for files.
MAX_BYTES = 16_384


def person(app: Client, user_id: str) -> User:
    """The person `user_id` names, if this app may keep data about them."""
    try:
        wanted = uuid.UUID(user_id)
    except ValueError:
        raise PlatformError("not_found", 404) from None
    user = db().get(User, wanted)
    if user is None or user.disabled_at is not None or not _uses(app, user):
        raise PlatformError("not_found", 404)
    return user


def read(app: Client, user: User) -> AppUserData | None:
    return db().scalar(
        select(AppUserData).where(AppUserData.client_id == app.id, AppUserData.user_id == user.id)
    )


def write(app: Client, user: User, data: Any, *, merge: bool) -> AppUserData:
    """
    Replaces the object, or with `merge` sets the keys given (a null value removes its key).
    Refused as `invalid_data` when not an object, `data_too_large` past MAX_BYTES.
    """
    if not isinstance(data, dict):
        raise PlatformError("invalid_data", 422)
    row = read(app, user)
    current = dict(row.data) if row is not None else {}
    wanted = {k: v for k, v in {**current, **data}.items() if v is not None} if merge else data
    if len(json.dumps(wanted, separators=(",", ":")).encode()) > MAX_BYTES:
        raise PlatformError("data_too_large", 413, limit=MAX_BYTES)
    if row is None:
        row = AppUserData(client_id=app.id, user_id=user.id, data=wanted, updated_at=utcnow())
        db().add(row)
    else:
        row.data = wanted
        row.updated_at = utcnow()
    return row


def remove(app: Client, user: User) -> None:
    row = read(app, user)
    if row is not None:
        db().delete(row)


def of_person(user: User) -> list[dict[str, Any]]:
    """Every app's object about this person, by app, for the data export."""
    rows = db().execute(
        select(AppUserData, Client.name)
        .join(Client, Client.id == AppUserData.client_id)
        .where(AppUserData.user_id == user.id)
    )
    return [{"app": name, "data": row.data, "updated_at": row.updated_at.isoformat()} for row, name in rows]


def _uses(app: Client, user: User) -> bool:
    if app.first_party:
        return True
    return (
        db().scalar(select(Consent.id).where(Consent.client_id == app.id, Consent.user_id == user.id))
        is not None
    )
