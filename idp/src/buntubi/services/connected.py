"""
Where a person is signed in, and which apps use their account: the account area's Devices and
Connected apps pages. Ending either revokes the tokens that came from it.
"""

import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select, update

from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import AccessTokenRecord, Client, Consent, LoginSession, RefreshToken, Scope, User
from buntubi.services import backchannel, devices
from buntubi.services.accounts import AccountError


def _iso(moment: datetime | None) -> str | None:
    return moment.isoformat() if moment else None


def _revoke_tokens(
    user: User, *, session_id: uuid.UUID | None = None, client_id: uuid.UUID | None = None
) -> None:
    """The refresh tokens of one session or one app, and the access tokens issued from them."""
    now = utcnow()
    refresh = select(RefreshToken.family_id).where(RefreshToken.user_id == user.id)
    if session_id is not None:
        refresh = refresh.where(RefreshToken.session_id == session_id)
    if client_id is not None:
        refresh = refresh.where(RefreshToken.client_id == client_id)
    access = update(AccessTokenRecord).where(
        AccessTokenRecord.user_id == user.id, AccessTokenRecord.revoked_at.is_(None)
    )
    if client_id is not None:
        # An app's access tokens go too when it held no refresh token.
        access = access.where(AccessTokenRecord.client_id == client_id)
    else:
        access = access.where(AccessTokenRecord.refresh_family_id.in_(refresh))
    db().execute(access.values(revoked_at=now))
    revoked = update(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
    if session_id is not None:
        revoked = revoked.where(RefreshToken.session_id == session_id)
    if client_id is not None:
        revoked = revoked.where(RefreshToken.client_id == client_id)
    db().execute(revoked.values(revoked_at=now))


# ── Devices ──────────────────────────────────────────────────────────────────

# Seen this recently: in use now. Not seen for this long: worth a second look.
ACTIVE = timedelta(minutes=5)
INACTIVE = timedelta(days=30)


def sessions_of(user: User, here: set[uuid.UUID]) -> list[dict[str, Any]]:
    """Open sessions, most recently seen first; `here` marks the ones in this browser."""
    now = utcnow()
    logins = db().scalars(
        select(LoginSession)
        .where(
            LoginSession.user_id == user.id, LoginSession.revoked_at.is_(None), LoginSession.expires_at > now
        )
        .order_by(LoginSession.last_seen_at.desc())
    )
    return [
        {
            "id": str(login.id),
            **devices.describe(login.user_agent),
            "ip": login.ip,
            "signed_in_at": login.created_at.isoformat(),
            "last_seen_at": login.last_seen_at.isoformat(),
            "active_now": now - login.last_seen_at < ACTIVE,
            "inactive": now - login.last_seen_at > INACTIVE,
            "methods": list(login.auth_methods or []),
            "here": login.id in here,
        }
        for login in logins
    ]


def sign_out_session(user: User, session_id: str, here: set[uuid.UUID]) -> LoginSession:
    """Ends one of the person's sessions on another device, with its tokens."""
    try:
        key = uuid.UUID(session_id)
    except ValueError:
        raise AccountError("not_found") from None
    if key in here:
        raise AccountError("this_device")
    login = db().scalar(
        select(LoginSession).where(
            LoginSession.id == key, LoginSession.user_id == user.id, LoginSession.revoked_at.is_(None)
        )
    )
    if login is None:
        raise AccountError("not_found")
    login.revoked_at = utcnow()
    backchannel.notify([login.id])
    _revoke_tokens(user, session_id=login.id)
    return login


# ── Connected apps ───────────────────────────────────────────────────────────


def _scope_texts(names: list[str], locale: str) -> list[dict[str, str]]:
    """Each scope with the platform's own words for it, when it has some."""
    rows = {s.name: s for s in db().scalars(select(Scope).where(Scope.name.in_(names)))}
    texts = []
    for name in names:
        descriptions = rows[name].descriptions if name in rows else {}
        said = descriptions.get(locale) or descriptions.get("en") if isinstance(descriptions, dict) else None
        texts.append({"name": name, "description": said or ""})
    return texts


def apps_of(user: User, locale: str) -> list[dict[str, Any]]:
    """
    Apps the person agreed to, and the platform's own apps they use (those never ask). Newest use
    first; an app never used yet goes by when access was given.
    """
    usage = {
        client_id: (first, last)
        for client_id, first, last in db().execute(
            select(
                AccessTokenRecord.client_id,
                func.min(AccessTokenRecord.issued_at),
                func.max(AccessTokenRecord.issued_at),
            )
            .where(AccessTokenRecord.user_id == user.id)
            .group_by(AccessTokenRecord.client_id)
        )
    }
    consents = {c.client_id: c for c in db().scalars(select(Consent).where(Consent.user_id == user.id))}
    ids = set(consents) | set(usage)
    if not ids:
        return []
    clients = db().scalars(select(Client).where(Client.id.in_(ids), Client.disabled_at.is_(None)))
    brand = get_settings().brand_name
    apps = []
    for client in clients:
        consent = consents.get(client.id)
        if consent is None and not client.first_party:
            continue
        first, last = usage.get(client.id, (None, None))
        scopes = list(consent.scopes) if consent else (client.scope or "").split()
        apps.append(
            {
                "id": client.client_id,
                "name": client.name,
                "logo": client.brand.get("logo") if isinstance(client.brand, dict) else None,
                "by": brand
                if client.first_party
                else (client.organization.name if client.organization else ""),
                "platform": client.first_party,
                "since": _iso(consent.granted_at if consent else first),
                "last_used_at": _iso(last),
                "scopes": _scope_texts([s for s in scopes if s != "openid"], locale),
            }
        )
    return sorted(apps, key=lambda a: a["last_used_at"] or a["since"] or "", reverse=True)


def remove_app(user: User, client_id: str) -> Client:
    """Takes back an app's access: its consent goes, and every token it holds for the person."""
    client: Client | None = db().scalar(select(Client).where(Client.client_id == client_id))
    if client is None:
        raise AccountError("not_found")
    if client.first_party:
        raise AccountError("platform_app")
    consent = db().scalar(select(Consent).where(Consent.user_id == user.id, Consent.client_id == client.id))
    if consent is None:
        raise AccountError("not_found")
    db().delete(consent)
    _revoke_tokens(user, client_id=client.id)
    return client
