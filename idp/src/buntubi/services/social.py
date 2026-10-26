"""
Social sign-in. A provider proves who someone is there; this resolves that to a Buntubi account
and hands back an outcome. The web layer then resumes the app's own authorization request, so
no token for an app ever comes from a provider's answer.

An account is never linked because an address matches: linking happens only from a signed-in
account (`begin` with `link_to`).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
import uuid
from dataclasses import asdict, dataclass, replace
from typing import Any
from urllib.parse import parse_qs, urlparse

from flask import session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from buntubi import plugins, social
from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import Client, Identity, Invitation, User
from buntubi.security.tokens import new_token
from buntubi.services import audit, platform_settings, profile_fields, sessions
from buntubi.services.accounts import AccountError
from buntubi.social import ExternalIdentity, Provider, ProviderError, Transaction

_TRANSACTION = "social_transaction"
# An identity from a provider waiting for the fields the platform requires before its account is made.
_WAITING = "social_waiting"
TRANSACTION_TTL = 600
WAITING_TTL = 900

SIGNED_IN = "signed_in"
NEEDS_PROFILE = "needs_profile"
LINKED = "linked"
# Why a round trip ended without a sign-in, as the sign-in page names it.
REFUSALS = (
    "expired",
    "cancelled",
    "provider_failed",
    "account_disabled",
    "account_exists",
    "no_verified_email",
    "signup_closed",
    "already_linked",
)


@dataclass(frozen=True)
class Outcome:
    kind: str
    provider: str
    user: User | None = None
    # Started from the account area to connect a provider, not to sign in.
    linking: bool = False


def offered() -> list[Provider]:
    """
    The providers a sign-in page shows: listed by the deployment, configured, and allowed by the
    app the person is signing in to, when there is one.
    """
    listed = [p for pid in platform_settings.social_providers() if (p := social.get(pid)) and p.configured()]
    client = client_signing_in()
    if client is not None and client.social_providers is not None:
        return [p for p in listed if p.id in client.social_providers]
    return listed


def signup_allowed(email: str | None) -> bool:
    """
    Whether someone may make an account here: the deployment's policy, narrowed by the app being
    signed in to. An address invited to an organization may always.
    """
    client = client_signing_in()
    if platform_settings.signup_open() and (client is None or client.signup_open):
        return True
    return email is not None and _invited(email)


def begin(provider: Provider, *, login_hint: str | None = None, link_to: User | None = None) -> str:
    """The provider's authorization address; what the callback needs is kept in the session."""
    tx = Transaction(
        state=new_token(),
        nonce=new_token(),
        verifier=new_token(48),
        redirect_uri=f"{get_settings().issuer}/signin/{provider.id}/callback",
    )
    session[_TRANSACTION] = {
        **asdict(tx),
        "provider": provider.id,
        "link_to": str(link_to.id) if link_to else None,
        "at": time.time(),
    }
    challenge = base64.urlsafe_b64encode(hashlib.sha256(tx.verifier.encode()).digest()).rstrip(b"=").decode()
    return provider.authorization_url(tx, challenge, login_hint)


def finish(provider: Provider, args: dict[str, str], signed_in: User | None, locale: str) -> Outcome:
    """The callback: the transaction checked and spent, the identity checked, then resolved."""
    kept = session.pop(_TRANSACTION, None)
    if not _valid(kept, provider.id, args.get("state", "")):
        return _refused(provider, "expired")
    tx = Transaction(kept["state"], kept["nonce"], kept["verifier"], kept["redirect_uri"])
    if args.get("error"):
        return _refused(provider, "cancelled" if args["error"] == "access_denied" else "provider_failed")
    if not args.get("code"):
        return _refused(provider, "provider_failed")
    try:
        found = provider.identity(tx, args["code"])
    except ProviderError as error:
        return _refused(provider, "provider_failed", detail=str(error))

    if kept.get("link_to"):
        # Connecting from the account area: only for the account that started it.
        if signed_in is None or str(signed_in.id) != kept["link_to"]:
            return replace(_refused(provider, "expired"), linking=True)
        return replace(_link(signed_in, found), linking=True)

    linked = _identity(found)
    if linked is not None:
        if linked.user.disabled_at is not None:
            return _refused(provider, "account_disabled", user=linked.user)
        linked.last_used_at = utcnow()
        return Outcome(SIGNED_IN, provider.id, linked.user)
    if not found.email or not found.email_verified:
        return _refused(provider, "no_verified_email", detail=found.note)
    if db().scalar(select(User.id).where(User.email == found.email)) is not None:
        return _refused(provider, "account_exists")
    if not signup_allowed(found.email):
        return _refused(provider, "signup_closed")
    if any(mode == "required" for mode in profile_fields.shown().values()):
        session[_WAITING] = {**asdict(found), "at": time.time()}
        return Outcome(NEEDS_PROFILE, provider.id)
    return _create(found, {}, locale)


def waiting() -> ExternalIdentity | None:
    """The identity waiting for its required fields, while it is fresh."""
    kept = session.get(_WAITING)
    if not isinstance(kept, dict) or time.time() - float(kept.get("at", 0)) > WAITING_TTL:
        return None
    fields = {k: v for k, v in kept.items() if k != "at"}
    try:
        return ExternalIdentity(**fields)
    except TypeError:
        return None


def complete(data: dict[str, Any], locale: str) -> Outcome:
    """The required fields for the waiting identity: its account is made with them."""
    found = waiting()
    if found is None:
        raise AccountError("expired")
    values = profile_fields.check(data, signing_up=True)
    session.pop(_WAITING, None)
    provider = social.get(found.provider)
    if provider is None:
        raise AccountError("expired")
    if not signup_allowed(found.email):
        return _refused(provider, "signup_closed")
    return _create(found, values, locale)


def identities_of(user: User) -> list[Identity]:
    return list(
        db().scalars(select(Identity).where(Identity.user_id == user.id).order_by(Identity.created_at))
    )


def unlink(user: User, identity_id: str) -> None:
    """Removes a linked provider, unless it is the last way in."""
    try:
        wanted = uuid.UUID(identity_id)
    except ValueError:
        raise AccountError("not_found") from None
    identity = db().scalar(select(Identity).where(Identity.id == wanted, Identity.user_id == user.id))
    if identity is None:
        raise AccountError("not_found")
    from buntubi.services import passkeys  # passkeys import the session service

    others = len(identities_of(user)) - 1
    if user.password_hash is None and not passkeys.list_for(user) and others == 0:
        raise AccountError("last_way_in")
    db().delete(identity)
    audit.record("identity_unlinked", user=user, provider=identity.provider)


def _link(user: User, found: ExternalIdentity) -> Outcome:
    provider = social.get(found.provider)
    assert provider is not None
    existing = _identity(found)
    if existing is not None:
        return (
            Outcome(LINKED, found.provider, user)
            if existing.user_id == user.id
            else _refused(provider, "already_linked", user=user)
        )
    db().add(
        Identity(
            user_id=user.id,
            provider=found.provider,
            subject=found.subject,
            email=found.email,
            last_used_at=utcnow(),
        )
    )
    try:
        db().flush()
    except IntegrityError:
        db().rollback()
        return _refused(provider, "already_linked", user=user)
    audit.record("identity_linked", user=user, provider=found.provider)
    return Outcome(LINKED, found.provider, user)


def _create(found: ExternalIdentity, values: dict[str, Any], locale: str) -> Outcome:
    provider = social.get(found.provider)
    assert provider is not None and found.email is not None
    user = User(
        email=found.email,
        email_verified_at=utcnow(),
        password_hash=None,
        given_name=found.given_name,
        family_name=found.family_name,
        picture=found.picture,
        locale=locale,
    )
    profile_fields.store(user, values)
    db().add(user)
    try:
        db().flush()
        db().add(
            Identity(
                user_id=user.id,
                provider=found.provider,
                subject=found.subject,
                email=found.email,
                last_used_at=utcnow(),
            )
        )
        db().flush()
    except IntegrityError:
        # The same person twice at once: the other request made the account first.
        db().rollback()
        linked = _identity(found)
        if linked is not None:
            return Outcome(SIGNED_IN, found.provider, linked.user)
        return _refused(provider, "account_exists")
    plugins.emit("account.created", {"user": str(user.id), "email": user.email, "source": found.provider})
    audit.record("sign_up", user=user, provider=found.provider)
    return Outcome(SIGNED_IN, found.provider, user)


def _identity(found: ExternalIdentity) -> Identity | None:
    return db().scalar(
        select(Identity).where(Identity.provider == found.provider, Identity.subject == found.subject)
    )


def _refused(provider: Provider, reason: str, user: User | None = None, detail: str | None = None) -> Outcome:
    # Never a code or a token: the reason, and the provider's failure as the adapter worded it.
    audit.record(
        "social_sign_in_refused",
        user=user,
        provider=provider.id,
        reason=reason,
        detail=detail,
    )
    return Outcome(reason, provider.id, user)


def _valid(kept: Any, provider_id: str, state: str) -> bool:
    return (
        isinstance(kept, dict)
        and kept.get("provider") == provider_id
        and isinstance(kept.get("state"), str)
        and hmac.compare_digest(kept["state"], state)
        and time.time() - float(kept.get("at", 0)) <= TRANSACTION_TTL
    )


def client_signing_in() -> Client | None:
    """The app the saved return address authorizes, if it is one."""
    path = sessions.return_to()
    if not path or not path.startswith("/oauth/authorize"):
        return None
    client_id = parse_qs(urlparse(path).query).get("client_id", [None])[0]
    if not client_id:
        return None
    return db().scalar(select(Client).where(Client.client_id == client_id))


def _invited(email: str) -> bool:
    return (
        db().scalar(
            select(Invitation.id).where(
                Invitation.email == email.lower(),
                Invitation.accepted_at.is_(None),
                Invitation.expires_at > utcnow(),
            )
        )
        is not None
    )
