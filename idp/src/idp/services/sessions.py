"""
Browser sessions. The signed Flask cookie holds only login-session ids; the database row is what
counts, so a session revoked anywhere ends everywhere at once. Several accounts can be signed in
side by side (the account chooser); one of them is current.

Where to go after signing in is kept here too, server-side, and only ever as a path on this site.
"""

import uuid
from dataclasses import dataclass
from datetime import timedelta

from flask import request, session
from sqlalchemy import update

from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import AccessTokenRecord, AuthorizationCode, LoginSession, RefreshToken, User
from idp.services import backchannel

_SIDS = "sids"
_CURRENT = "sid"
_RETURN_TO = "return_to"
# Sign-in steps not finished yet (email code, two-factor): the user is known, not signed in.
_PENDING = "pending_user"
# A sign-up for an address that already has an account: the code page behaves as usual, and no
# code can succeed (services/accounts.py register).
_EXISTING_SIGN_UP = "existing_sign_up"


def start(user: User, methods: list[str], replaces: str | None = None) -> LoginSession:
    """
    A new login. One that `replaces` another of the same person (a step-up to a second factor)
    takes over what was issued under it, so the apps signed in with the old one keep their
    tokens; the old one then ends with nothing left under it.
    """
    now = utcnow()
    login = LoginSession(
        user_id=user.id,
        expires_at=now + timedelta(seconds=get_settings().session_ttl),
        auth_methods=methods,
        ip=request.remote_addr,
        user_agent=(request.user_agent.string or "")[:512],
    )
    db().add(login)
    db().flush()
    old = _load(replaces) if replaces else None
    if old is not None and old.user_id == user.id:
        for model in (RefreshToken, AccessTokenRecord, AuthorizationCode):
            db().execute(update(model).where(model.session_id == old.id).values(session_id=login.id))
        end(old)
    sids = [sid for sid in session.get(_SIDS, []) if sid != str(login.id)]
    session[_SIDS] = [str(login.id), *sids][:5]
    session[_CURRENT] = str(login.id)
    session.pop(_PENDING, None)
    session.pop(_EXISTING_SIGN_UP, None)
    session.permanent = True
    return login


def current_id() -> str | None:
    """The current login's id as the cookie holds it, without loading it."""
    value = session.get(_CURRENT)
    return str(value) if value else None


def acting_for_another() -> bool:
    """
    A request from a page opened for another account than the current one: the page declares its
    session in X-IDP-Session (pages put it in their config); a switch elsewhere since changed it.
    Pages opened while signed out declare none.
    """
    declared = request.headers.get("X-IDP-Session")
    return bool(declared) and declared != current_id()


def current() -> LoginSession | None:
    """The current login, if it is still valid; touching it keeps `last_seen_at` honest."""
    sid = session.get(_CURRENT)
    login = _load(sid) if sid else None
    if login is None:
        session.pop(_CURRENT, None)
        return None
    login.last_seen_at = utcnow()
    return login


def all_signed_in() -> list[LoginSession]:
    logins = [login for sid in session.get(_SIDS, []) if (login := _load(sid)) is not None]
    session[_SIDS] = [str(login.id) for login in logins]
    return logins


def switch_to(session_id: str) -> LoginSession | None:
    if session_id not in session.get(_SIDS, []):
        return None
    login = _load(session_id)
    if login is not None:
        session[_CURRENT] = session_id
    return login


def end(login: LoginSession) -> None:
    login.revoked_at = utcnow()
    backchannel.notify([login.id])
    sid = str(login.id)
    session[_SIDS] = [s for s in session.get(_SIDS, []) if s != sid]
    if session.get(_CURRENT) == sid:
        session.pop(_CURRENT, None)


def sign_out_here(session_id: str) -> LoginSession | None:
    """
    Ends one of the accounts signed in on this browser. When it was the current one, the next
    signed-in account becomes current. None: no such account here.
    """
    if session_id not in session.get(_SIDS, []):
        return None
    login = _load(session_id)
    if login is None:
        return None
    end(login)
    if session.get(_CURRENT) is None:
        remaining = all_signed_in()
        if remaining:
            session[_CURRENT] = str(remaining[0].id)
    return login


def end_all_here() -> None:
    ended = all_signed_in()
    for login in ended:
        login.revoked_at = utcnow()
    backchannel.notify([login.id for login in ended])
    session.clear()


@dataclass(frozen=True)
class Pending:
    """A sign-in past its password, waiting on one more step."""

    user: User
    methods: list[str]
    # "verify_email": the address is not proven yet; "mfa": the second factor is due.
    stage: str
    # A login this one takes over once done: the same person, signed in without the second factor.
    replaces: str | None = None


def set_pending(user: User, methods: list[str], stage: str, replaces: str | None = None) -> None:
    session.pop(_EXISTING_SIGN_UP, None)
    session[_PENDING] = {"user_id": str(user.id), "methods": methods, "stage": stage, "replaces": replaces}


def set_existing_sign_up(email: str) -> None:
    session.pop(_PENDING, None)
    session[_EXISTING_SIGN_UP] = {"email": email, "failures": 0}


def existing_sign_up() -> str | None:
    """The address of a sign-up that met an existing account, while its code page is open."""
    value = session.get(_EXISTING_SIGN_UP)
    return str(value["email"]) if value else None


def existing_sign_up_failure() -> int:
    """Counts a code typed on that page, as a real one is counted; returns how many so far."""
    value = dict(session.get(_EXISTING_SIGN_UP) or {})
    value["failures"] = int(value.get("failures", 0)) + 1
    session[_EXISTING_SIGN_UP] = value
    return int(value["failures"])


def pending(stage: str | None = None) -> Pending | None:
    """The pending sign-in, if there is one (at `stage`, when given)."""
    value = session.get(_PENDING)
    if not value or (stage is not None and value.get("stage") != stage):
        return None
    user = db().get(User, uuid.UUID(value["user_id"]))
    if user is None or user.disabled_at is not None:
        session.pop(_PENDING, None)
        return None
    return Pending(user, list(value["methods"]), value["stage"], value.get("replaces"))


def clear_pending() -> None:
    session.pop(_PENDING, None)


def remember_return_to(path: str) -> None:
    if is_local_path(path):
        session[_RETURN_TO] = path


def take_return_to(default: str = "/") -> str:
    path = session.pop(_RETURN_TO, None)
    return path if path and is_local_path(path) else default


def is_local_path(path: str) -> bool:
    """
    A path on this site: not another host ("//evil", "https://..."), not a backslash trick, and no
    control characters, which browsers drop (so "/\t/evil" would be followed as "//evil").
    """
    if any(ord(c) < 0x20 or ord(c) == 0x7F for c in path):
        return False
    return path.startswith("/") and not path.startswith("//") and "\\" not in path


def _load(sid: str) -> LoginSession | None:
    try:
        login = db().get(LoginSession, uuid.UUID(sid))
    except ValueError:
        return None
    if login is None or not login.is_active(utcnow()) or login.user.disabled_at is not None:
        return None
    return login
