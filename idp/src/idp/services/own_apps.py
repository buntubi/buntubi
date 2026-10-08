"""The platform's own apps a person can open from their account page."""

from authlib.oauth2.rfc6749 import scope_to_list
from sqlalchemy import select

from idp.db import db
from idp.models import Client, User


def own_apps_for(user: User) -> list[Client]:
    """
    First-party apps with a home page, in name order. One that asks for the `admin` scope is
    listed only for an admin: anyone else would be turned away at its door.
    """
    clients = db().scalars(
        select(Client)
        .where(
            Client.first_party.is_(True),
            Client.organization_id.is_(None),
            Client.disabled_at.is_(None),
            Client.homepage_url.is_not(None),
        )
        .order_by(Client.name)
    )
    return [c for c in clients if user.is_admin or "admin" not in (scope_to_list(c.scope) or [])]
