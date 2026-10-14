"""
What a person changes about themselves in the account area: their profile, their photo, and
their address, which changes only once the new one is proven.
"""

from __future__ import annotations

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select

from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import EmailToken, User, UserPicture
from buntubi.security import passwords
from buntubi.security.tokens import hash_token, new_token
from buntubi.services import mail
from buntubi.services.accounts import TEXT, AccountError, _replace_token

CHANGE_EMAIL = "change_email"
PICTURE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
# Made small in the browser first: a 256 px square is a few tens of kilobytes.
PICTURE_MAX_BYTES = 200_000


def update(
    user: User,
    *,
    given_name: str | None = None,
    family_name: str | None = None,
    phone: str | None = None,
    country: str | None = None,
    locale: str | None = None,
) -> None:
    """Sets what is given; an empty phone or country clears it."""
    if given_name is not None:
        user.given_name = given_name.strip()[:100]
    if family_name is not None:
        user.family_name = family_name.strip()[:100]
    if phone is not None:
        user.phone = phone or None
    if country is not None:
        user.country = country.upper() or None
    if locale is not None:
        user.locale = locale


# Each part of an address and its longest length; the street can hold several lines.
ADDRESS_PARTS = {"street_address": 300, "locality": 100, "region": 100, "postal_code": 20, "country": 2}


def address_of(user: User) -> dict[str, str | None]:
    return {
        "street_address": user.address_street,
        "locality": user.address_locality,
        "region": user.address_region,
        "postal_code": user.address_postal_code,
        "country": user.address_country,
    }


def set_address(user: User, parts: dict[str, str]) -> None:
    """Sets the parts given; an empty one clears it. Lengths and the country are checked first."""
    for key, value in parts.items():
        if key not in ADDRESS_PARTS or len(value) > ADDRESS_PARTS[key]:
            raise AccountError("invalid_address")
    if (
        "country" in parts
        and parts["country"]
        and not (len(parts["country"]) == 2 and parts["country"].isalpha())
    ):
        raise AccountError("invalid_country")
    columns = {
        "street_address": "address_street",
        "locality": "address_locality",
        "region": "address_region",
        "postal_code": "address_postal_code",
    }
    for key, column in columns.items():
        if key in parts:
            setattr(user, column, parts[key].strip())
    if "country" in parts:
        user.address_country = parts["country"].strip().upper() or None


def address_claim(user: User) -> dict[str, str] | None:
    """The OIDC address claim: the parts that are set, and `formatted` from them; None when empty."""
    parts = {k: v for k, v in address_of(user).items() if v}
    if not parts:
        return None
    city = " ".join(p for p in (parts.get("postal_code"), parts.get("locality")) if p)
    lines = [parts.get("street_address", ""), city, parts.get("region", ""), parts.get("country", "")]
    return {**parts, "formatted": "\n".join(line for line in lines if line)}


def set_picture(user: User, content_type: str, data: bytes) -> None:
    if content_type not in PICTURE_TYPES:
        raise AccountError("unsupported_picture")
    if not data or len(data) > PICTURE_MAX_BYTES:
        raise AccountError("picture_too_large")
    row = db().get(UserPicture, user.id)
    if row is None:
        row = UserPicture(user_id=user.id, content_type=content_type, data=data)
        db().add(row)
    else:
        row.content_type, row.data, row.updated_at = content_type, data, utcnow()
    db().flush()
    # The version in the address lets apps and browsers keep the old one cached forever.
    user.picture = f"{get_settings().issuer}/avatars/{user.id}?v={int(row.updated_at.timestamp())}"


def remove_picture(user: User) -> None:
    row = db().get(UserPicture, user.id)
    if row is not None:
        db().delete(row)
    user.picture = None


def pending_email(user: User) -> str | None:
    row = _live_change(user)
    return row.payload if row else None


def request_email_change(user: User, email: str, password: str, confirm_url: str) -> str:
    """
    Sends a link to the new address and warns the current one. Nothing changes until the link
    is opened. The password proves it is the account's owner asking, not someone at an open
    session. Returns the normalized new address.
    """
    if user.password_hash is None or not passwords.verify_password(user.password_hash, password):
        raise AccountError("wrong_password")
    try:
        address = validate_email(email.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise AccountError("invalid_email") from None
    if address == user.email:
        raise AccountError("same_email")
    if db().scalar(select(User.id).where(User.email == address)) is not None:
        raise AccountError("email_taken")
    token = new_token()
    _replace_token(user, CHANGE_EMAIL, token, payload=address)
    text = TEXT[user.locale] if user.locale in TEXT else TEXT["fr"]
    body_text, body_html = mail.render(
        text.change_subject, text.change_lines, link=(text.change_action, f"{confirm_url}?token={token}")
    )
    mail.send(mail.Message(address, text.change_subject, body_text, body_html))
    notice = [line.replace("{email}", address) for line in text.change_notice_lines]
    notice_text, notice_html = mail.render(text.change_notice_subject, notice)
    mail.send(mail.Message(user.email, text.change_notice_subject, notice_text, notice_html))
    return address


def confirm_email_change(user: User, token: str) -> str:
    """The link from the new address was opened by the account's owner: the address changes."""
    row = db().scalar(
        select(EmailToken)
        .where(
            EmailToken.user_id == user.id,
            EmailToken.purpose == CHANGE_EMAIL,
            EmailToken.token_hash == hash_token(token),
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > utcnow(),
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if row is None or row.payload is None:
        raise AccountError("link_expired")
    if db().scalar(select(User.id).where(User.email == row.payload)) is not None:
        raise AccountError("email_taken")
    row.used_at = utcnow()
    user.email = row.payload
    user.email_verified_at = utcnow()
    return user.email


def cancel_email_change(user: User) -> None:
    row = _live_change(user)
    if row is not None:
        row.used_at = utcnow()


def _live_change(user: User) -> EmailToken | None:
    return db().scalar(
        select(EmailToken).where(
            EmailToken.user_id == user.id,
            EmailToken.purpose == CHANGE_EMAIL,
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > utcnow(),
        )
    )
