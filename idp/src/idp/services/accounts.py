"""
Accounts: sign-up, the email code, password sign-in, forgot and reset.

Nothing here tells a caller whether an address has an account: sign-in fails the same way (and
takes as long) for an unknown address as for a wrong password, and "forgot" always answers the
same. Every secret sent by email is stored hashed, expires, and works once.
"""

from dataclasses import dataclass
from datetime import timedelta

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select, update

from idp import plugins
from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import AccessTokenRecord, EmailToken, LoginSession, RefreshToken, User
from idp.security import passwords
from idp.security.tokens import hash_token, matches, new_numeric_code, new_token
from idp.services import mail

VERIFY_EMAIL = "verify_email"
RESET_PASSWORD = "reset_password"  # noqa: S105  (a purpose, not a secret)
MAX_CODE_ATTEMPTS = 5


@dataclass(frozen=True)
class EmailText:
    verify_subject: str
    verify_lines: list[str]
    reset_subject: str
    reset_lines: list[str]
    reset_action: str
    invite_subject: str
    invite_lines: list[str]
    invite_action: str
    change_subject: str
    change_lines: list[str]
    change_action: str
    change_notice_subject: str
    change_notice_lines: list[str]


# Draft wording, to be rewritten before launch.
TEXT = {
    "fr": EmailText(
        verify_subject="Votre code de vérification",
        verify_lines=["Saisissez ce code pour vérifier votre adresse e-mail. Il reste valable une heure."],
        reset_subject="Réinitialiser votre mot de passe",
        reset_lines=[
            "Ouvrez ce lien pour choisir un nouveau mot de passe. Il reste valable une heure.",
            "Si vous n'avez rien demandé, ignorez ce message.",
        ],
        reset_action="Choisir un nouveau mot de passe",
        invite_subject="Votre compte vous attend",
        invite_lines=[
            "Un compte a été créé pour vous.",
            "Ouvrez ce lien pour choisir votre mot de passe. Il reste valable sept jours.",
            "Si vous ne vous attendiez pas à ce message, ignorez-le.",
        ],
        invite_action="Choisir mon mot de passe",
        change_subject="Confirmez votre nouvelle adresse",
        change_lines=[
            "Ouvrez ce lien pour vous connecter désormais avec cette adresse. Il reste valable une heure.",
            "Si vous n'avez rien demandé, ignorez ce message.",
        ],
        change_action="Confirmer cette adresse",
        change_notice_subject="Changement d'adresse demandé",
        change_notice_lines=[
            "Quelqu'un a demandé à remplacer l'adresse de votre compte par {email}.",
            "Elle ne changera que si le lien envoyé à cette adresse est ouvert. Si ce n'est pas vous, "
            "changez votre mot de passe.",
        ],
    ),
    "en": EmailText(
        verify_subject="Your verification code",
        verify_lines=["Enter this code to verify your email address. It stays valid for one hour."],
        reset_subject="Reset your password",
        reset_lines=[
            "Open this link to choose a new password. It stays valid for one hour.",
            "If you didn't ask for this, ignore this message.",
        ],
        reset_action="Choose a new password",
        invite_subject="Your account is ready",
        invite_lines=[
            "An account was created for you.",
            "Open this link to choose your password. It stays valid for seven days.",
            "If you weren't expecting this, ignore this message.",
        ],
        invite_action="Choose my password",
        change_subject="Confirm your new address",
        change_lines=[
            "Open this link to sign in with this address from now on. It stays valid for one hour.",
            "If you didn't ask for this, ignore this message.",
        ],
        change_action="Confirm this address",
        change_notice_subject="Address change requested",
        change_notice_lines=[
            "Someone asked to replace your account's address with {email}.",
            "It changes only if the link sent to that address is opened. "
            "If it wasn't you, change your password.",
        ],
    ),
}


class AccountError(Exception):
    """A refusal the UI shows, by code: 'email_taken', 'weak_password', 'invalid_code', ..."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class NewAccount:
    email: str
    password: str
    given_name: str
    family_name: str
    locale: str


def normalize_email(email: str) -> str:
    return email.strip().lower()


def register(data: NewAccount) -> User:
    email = normalize_email(data.email)
    try:
        email = validate_email(email, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise AccountError("invalid_email") from None
    if not passwords.is_acceptable(data.password):
        raise AccountError("weak_password")
    if db().scalar(select(User.id).where(User.email == email)) is not None:
        raise AccountError("email_taken")
    user = User(
        email=email,
        password_hash=passwords.hash_password(data.password),
        given_name=data.given_name.strip()[:100],
        family_name=data.family_name.strip()[:100],
        locale=data.locale if data.locale in TEXT else "fr",
    )
    db().add(user)
    db().flush()
    send_verification_code(user)
    plugins.emit("account.created", {"user": str(user.id), "email": user.email})
    return user


# An invitation waits longer than a reset: the person did not ask for it and may read it late.
INVITATION_TTL = 7 * 24 * 3600


def create_by_admin(
    email: str,
    given_name: str,
    family_name: str,
    locale: str,
    reset_url: str,
    password: str | None = None,
) -> User:
    """
    An account made by an admin. Without a password, the person gets a link to choose one, which
    also proves the address. With one, the account is ready: the address counts as verified, no
    email is sent, and the person signs in with it.
    """
    if password is not None and not passwords.is_acceptable(password):
        raise AccountError("weak_password")
    try:
        address = validate_email(email, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise AccountError("invalid_email") from None
    if db().scalar(select(User.id).where(User.email == address)) is not None:
        raise AccountError("email_taken")
    user = User(
        email=address,
        password_hash=passwords.hash_password(password) if password is not None else None,
        email_verified_at=utcnow() if password is not None else None,
        given_name=given_name.strip()[:100],
        family_name=family_name.strip()[:100],
        locale=locale if locale in TEXT else "fr",
    )
    db().add(user)
    db().flush()
    plugins.emit("account.created", {"user": str(user.id), "email": user.email})
    if password is not None:
        return user
    token = new_token()
    _replace_token(user, RESET_PASSWORD, token, ttl=INVITATION_TTL)
    text = TEXT[user.locale]
    body_text, body_html = mail.render(
        text.invite_subject, text.invite_lines, link=(text.invite_action, f"{reset_url}?token={token}")
    )
    mail.send(mail.Message(user.email, text.invite_subject, body_text, body_html))
    return user


def send_password_reset(user: User, reset_url: str) -> None:
    """A reset link for this account, as the console sends it on the person's behalf."""
    if user.disabled_at is not None:
        raise AccountError("account_disabled")
    token = new_token()
    _replace_token(user, RESET_PASSWORD, token)
    text = TEXT[user.locale]
    body_text, body_html = mail.render(
        text.reset_subject, text.reset_lines, link=(text.reset_action, f"{reset_url}?token={token}")
    )
    mail.send(mail.Message(user.email, text.reset_subject, body_text, body_html))


def user_by_email(email: str) -> User | None:
    return db().scalar(select(User).where(User.email == normalize_email(email)))


def authenticate(email: str, password: str) -> User | None:
    """The user, or None: unknown address, wrong password and disabled account look alike."""
    user = db().scalar(select(User).where(User.email == normalize_email(email)))
    ok = passwords.verify_password(user.password_hash if user else None, password)
    if not ok or user is None or user.disabled_at is not None:
        return None
    return user


def send_verification_code(user: User) -> None:
    code = new_numeric_code()
    _replace_token(user, VERIFY_EMAIL, code)
    text = TEXT[user.locale]
    body_text, body_html = mail.render(text.verify_subject, text.verify_lines, code=code)
    mail.send(mail.Message(user.email, text.verify_subject, body_text, body_html))


def verify_email(user: User, code: str) -> None:
    token = _live_token(user, VERIFY_EMAIL)
    if token is None:
        raise AccountError("code_expired")
    if token.attempts >= MAX_CODE_ATTEMPTS:
        raise AccountError("too_many_attempts")
    if not matches(code.strip(), token.token_hash):
        token.attempts += 1
        raise AccountError("invalid_code")
    token.used_at = utcnow()
    user.email_verified_at = utcnow()


def request_password_reset(email: str, reset_url: str) -> None:
    """Sends a link if the address has an account; answers the same either way."""
    user = db().scalar(select(User).where(User.email == normalize_email(email)))
    if user is None or user.disabled_at is not None:
        return
    send_password_reset(user, reset_url)


def reset_password(token: str, new_password: str) -> User:
    if not passwords.is_acceptable(new_password):
        raise AccountError("weak_password")
    row = db().scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(token),
            EmailToken.purpose == RESET_PASSWORD,
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > utcnow(),
        )
    )
    if row is None:
        raise AccountError("link_expired")
    user = db().get(User, row.user_id)
    if user is None or user.disabled_at is not None:
        raise AccountError("link_expired")
    row.used_at = utcnow()
    user.password_hash = passwords.hash_password(new_password)
    user.password_changed_at = utcnow()
    sign_out_everywhere(user)
    # Proving the inbox also proves the address.
    if user.email_verified_at is None:
        user.email_verified_at = utcnow()
    return user


def change_password(user: User, current: str, new_password: str, keep: LoginSession | None) -> None:
    """
    The owner, signed in, sets a new password. With `keep`, every other session and the tokens
    issued from them end; this one and its apps stay signed in.
    """
    if user.password_hash is None or not passwords.verify_password(user.password_hash, current):
        raise AccountError("wrong_password")
    if not passwords.is_acceptable(new_password):
        raise AccountError("weak_password")
    if passwords.verify_password(user.password_hash, new_password):
        raise AccountError("same_password")
    user.password_hash = passwords.hash_password(new_password)
    user.password_changed_at = utcnow()
    if keep is not None:
        sign_out_others(user, keep)


def sign_out_others(user: User, keep: LoginSession) -> None:
    """
    Ends every session but `keep`, and the refresh tokens from them with their access tokens. A
    bare access token is not tied to a session and runs out on its own.
    """
    now = utcnow()
    db().execute(
        update(LoginSession)
        .where(LoginSession.user_id == user.id, LoginSession.id != keep.id, LoginSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    families = select(RefreshToken.family_id).where(
        RefreshToken.user_id == user.id, RefreshToken.session_id.is_distinct_from(keep.id)
    )
    db().execute(
        update(AccessTokenRecord)
        .where(
            AccessTokenRecord.user_id == user.id,
            AccessTokenRecord.revoked_at.is_(None),
            AccessTokenRecord.refresh_family_id.in_(families),
        )
        .values(revoked_at=now)
    )
    db().execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user.id,
            RefreshToken.session_id.is_distinct_from(keep.id),
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


def sign_out_everywhere(user: User) -> None:
    """Ends every session and token of this user: whoever knew the old password is out."""
    now = utcnow()
    for model in (LoginSession, RefreshToken, AccessTokenRecord):
        db().execute(
            update(model).where(model.user_id == user.id, model.revoked_at.is_(None)).values(revoked_at=now)
        )


def _replace_token(
    user: User, purpose: str, secret: str, ttl: int | None = None, payload: str | None = None
) -> None:
    now = utcnow()
    db().execute(
        update(EmailToken)
        .where(EmailToken.user_id == user.id, EmailToken.purpose == purpose, EmailToken.used_at.is_(None))
        .values(used_at=now)
    )
    db().add(
        EmailToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=hash_token(secret),
            expires_at=now + timedelta(seconds=ttl or get_settings().email_token_ttl),
            payload=payload,
        )
    )


def _live_token(user: User, purpose: str) -> EmailToken | None:
    return db().scalar(
        select(EmailToken)
        .where(
            EmailToken.user_id == user.id,
            EmailToken.purpose == purpose,
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > utcnow(),
        )
        .order_by(EmailToken.created_at.desc())
    )
