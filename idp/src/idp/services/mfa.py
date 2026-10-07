"""
Two-step sign-in with an authenticator app, and backup codes for when the phone is gone.

Enrolment is two calls: `begin` returns the secret to scan, `confirm` takes a first code from the
app and only then turns the second step on, returning ten backup codes shown once. A code works
once: the TOTP step is remembered, a backup code is marked used.
"""

from dataclasses import dataclass

import segno
from sqlalchemy import delete, select

from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import BackupCode, TotpCredential, User
from idp.security import totp
from idp.security.crypto import seal, unseal
from idp.security.tokens import hash_token, matches, new_user_code, normalize_user_code
from idp.services.accounts import AccountError

BACKUP_CODES = 10


@dataclass(frozen=True)
class Enrolment:
    secret: str
    uri: str
    # The URI as a QR code, an SVG data URI the page can show directly.
    qr: str


def credential(user: User) -> TotpCredential | None:
    return db().scalar(select(TotpCredential).where(TotpCredential.user_id == user.id))


def is_enabled(user: User) -> bool:
    found = credential(user)
    return found is not None and found.confirmed_at is not None


def begin(user: User) -> Enrolment:
    """A fresh secret, replacing an unconfirmed one. Refused while one is active."""
    found = credential(user)
    if found is not None and found.confirmed_at is not None:
        raise AccountError("mfa_already_enabled")
    secret = totp.new_secret()
    if found is None:
        db().add(TotpCredential(user_id=user.id, secret_encrypted=seal(secret)))
    else:
        found.secret_encrypted = seal(secret)
        found.last_used_step = None
    uri = totp.provisioning_uri(secret, user.email, get_settings().brand_name)
    qr = segno.make(uri, error="m").svg_data_uri(scale=5, border=2)
    return Enrolment(secret=secret, uri=uri, qr=qr)


def confirm(user: User, code: str) -> list[str]:
    """Turns the second step on with a first valid code; returns the backup codes."""
    found = credential(user)
    if found is None or found.confirmed_at is not None:
        raise AccountError("mfa_not_started")
    step = totp.matching_step(unseal(found.secret_encrypted), code, found.last_used_step)
    if step is None:
        raise AccountError("invalid_code")
    found.last_used_step = step
    found.confirmed_at = utcnow()
    return _new_backup_codes(user)


def verify(user: User, code: str) -> str:
    """Checks a code from the app or a backup code; returns which ("otp" or "backup")."""
    found = credential(user)
    if found is None or found.confirmed_at is None:
        raise AccountError("mfa_not_enabled")
    step = totp.matching_step(unseal(found.secret_encrypted), code, found.last_used_step)
    if step is not None:
        found.last_used_step = step
        return "otp"
    typed = normalize_user_code(code)
    for row in db().scalars(
        select(BackupCode).where(BackupCode.user_id == user.id, BackupCode.used_at.is_(None))
    ):
        if matches(typed, row.code_hash):
            row.used_at = utcnow()
            return "backup"
    raise AccountError("invalid_code")


def regenerate_backup_codes(user: User, code: str) -> list[str]:
    verify(user, code)
    return _new_backup_codes(user)


def disable(user: User, code: str) -> None:
    verify(user, code)
    db().execute(delete(BackupCode).where(BackupCode.user_id == user.id))
    db().execute(delete(TotpCredential).where(TotpCredential.user_id == user.id))


def remaining_backup_codes(user: User) -> int:
    rows = db().scalars(
        select(BackupCode.id).where(BackupCode.user_id == user.id, BackupCode.used_at.is_(None))
    )
    return len(rows.all())


def _new_backup_codes(user: User) -> list[str]:
    db().execute(delete(BackupCode).where(BackupCode.user_id == user.id))
    codes = [new_user_code() for _ in range(BACKUP_CODES)]
    for code in codes:
        db().add(BackupCode(user_id=user.id, code_hash=hash_token(code)))
    return codes
