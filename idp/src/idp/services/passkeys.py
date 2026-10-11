"""
Passkeys: signing in with the device's own lock (fingerprint, face, PIN) instead of a password.
Each one is verified with user verification required, so a passkey sign-in counts as two steps.
The challenge of a ceremony lives in the session cookie and is used once.
"""

import json
import time
import uuid
from typing import Any
from urllib.parse import urlsplit

from flask import session
from sqlalchemy import select
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import Passkey, User
from idp.services.accounts import AccountError

# What the sign-in methods record for a passkey: a key proven, and two steps (RFC 8176).
METHODS = ["hwk", "mfa"]
_CHALLENGE_TTL = 300
_REGISTER = "passkey_register"
_SIGN_IN = "passkey_sign_in"

# The password managers that say who they are, by AAGUID, for a passkey's default name.
PROVIDERS = {
    "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "iCloud Keychain",
    "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "iCloud Keychain",
    "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
    "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome on Mac",
    "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
    "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
    "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",
    "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
    "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
    "53414d53-554e-4700-0000-000000000000": "Samsung Pass",
    "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
}


def _relying_party() -> tuple[str, str]:
    """The RP ID (the issuer's host) and the origin pages are served from."""
    parts = urlsplit(get_settings().issuer)
    return parts.hostname or "localhost", f"{parts.scheme}://{parts.netloc}"


def _keep_challenge(key: str, challenge: bytes) -> None:
    session[key] = {"challenge": bytes_to_base64url(challenge), "at": int(time.time())}


def _take_challenge(key: str) -> bytes:
    kept = session.pop(key, None)
    if not isinstance(kept, dict) or int(time.time()) - int(kept.get("at", 0)) > _CHALLENGE_TTL:
        raise AccountError("passkey_expired")
    return base64url_to_bytes(kept["challenge"])


def _transports(values: list[str]) -> list[AuthenticatorTransport]:
    known = {t.value for t in AuthenticatorTransport}
    return [AuthenticatorTransport(v) for v in values if v in known]


def list_for(user: User) -> list[Passkey]:
    return list(db().scalars(select(Passkey).where(Passkey.user_id == user.id).order_by(Passkey.created_at)))


def registration_options(user: User) -> dict[str, Any]:
    rp_id, _ = _relying_party()
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=get_settings().brand_name or rp_id,
        user_id=user.id.bytes,
        user_name=user.email,
        user_display_name=user.name or user.email,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=p.credential_id, transports=_transports(p.transports))
            for p in list_for(user)
        ],
    )
    _keep_challenge(_REGISTER, options.challenge)
    result: dict[str, Any] = json.loads(options_to_json(options))
    return result


def register(user: User, credential: dict[str, Any]) -> Passkey:
    rp_id, origin = _relying_party()
    try:
        verified = verify_registration_response(
            credential=credential,
            expected_challenge=_take_challenge(_REGISTER),
            expected_rp_id=rp_id,
            expected_origin=origin,
            require_user_verification=True,
        )
    except WebAuthnException:
        raise AccountError("passkey_failed") from None
    if db().scalar(select(Passkey.id).where(Passkey.credential_id == verified.credential_id)) is not None:
        raise AccountError("passkey_exists")
    response = credential.get("response")
    transports = response.get("transports", []) if isinstance(response, dict) else []
    passkey = Passkey(
        user_id=user.id,
        credential_id=verified.credential_id,
        public_key=verified.credential_public_key,
        sign_count=verified.sign_count,
        transports=[t for t in transports if isinstance(t, str)][:6],
        aaguid=verified.aaguid,
        backed_up=verified.credential_backed_up,
        # Empty when the authenticator does not say: the page names it in the reader's language.
        name=PROVIDERS.get(verified.aaguid, ""),
    )
    db().add(passkey)
    db().flush()
    return passkey


def sign_in_options(user: User | None = None) -> dict[str, Any]:
    """
    Without a user, no list of credentials: the browser offers the passkeys it has for this site.
    With one (the second step of their sign-in), only theirs.
    """
    rp_id, _ = _relying_party()
    allowed = (
        [
            PublicKeyCredentialDescriptor(id=p.credential_id, transports=_transports(p.transports))
            for p in list_for(user)
        ]
        if user is not None
        else None
    )
    options = generate_authentication_options(
        rp_id=rp_id, user_verification=UserVerificationRequirement.REQUIRED, allow_credentials=allowed
    )
    _keep_challenge(_SIGN_IN, options.challenge)
    result: dict[str, Any] = json.loads(options_to_json(options))
    return result


def authenticate(credential: dict[str, Any]) -> User:
    """The account the passkey belongs to. Unknown, revoked or disabled all answer passkey_failed."""
    rp_id, origin = _relying_party()
    challenge = _take_challenge(_SIGN_IN)
    raw = credential.get("rawId")
    try:
        credential_id = base64url_to_bytes(raw) if isinstance(raw, str) else b""
    except ValueError:
        credential_id = b""
    found = select(Passkey).where(Passkey.credential_id == credential_id)
    passkey = db().scalar(found) if credential_id else None
    if passkey is None:
        raise AccountError("passkey_failed")
    try:
        verified = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
            credential_public_key=passkey.public_key,
            credential_current_sign_count=passkey.sign_count,
            require_user_verification=True,
        )
    except WebAuthnException:
        raise AccountError("passkey_failed") from None
    user = db().get(User, passkey.user_id)
    if user is None or user.disabled_at is not None:
        raise AccountError("passkey_failed")
    passkey.sign_count = verified.new_sign_count
    passkey.backed_up = verified.credential_backed_up
    passkey.last_used_at = utcnow()
    return user


def _owned(user: User, passkey_id: str) -> Passkey:
    try:
        key = uuid.UUID(passkey_id)
    except ValueError:
        raise AccountError("not_found") from None
    passkey = db().scalar(select(Passkey).where(Passkey.id == key, Passkey.user_id == user.id))
    if passkey is None:
        raise AccountError("not_found")
    return passkey


def rename(user: User, passkey_id: str, name: str) -> Passkey:
    name = name.strip()
    if not name or len(name) > 64:
        raise AccountError("invalid_name")
    passkey = _owned(user, passkey_id)
    passkey.name = name
    return passkey


def remove(user: User, passkey_id: str) -> str:
    passkey = _owned(user, passkey_id)
    name = passkey.name
    db().delete(passkey)
    return name


def as_json(passkey: Passkey) -> dict[str, Any]:
    return {
        "id": str(passkey.id),
        "name": passkey.name,
        "provider": PROVIDERS.get(passkey.aaguid, ""),
        "synced": passkey.backed_up,
        "created_at": passkey.created_at.isoformat(),
        "last_used_at": passkey.last_used_at.isoformat() if passkey.last_used_at else None,
    }
