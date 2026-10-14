"""People with an account, and the outside identities (Google) linked to them."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from buntubi.db import Base, IdMixin, TimestampMixin


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    # Stored lower-cased, so the unique index is case-insensitive in practice.
    email: Mapped[str] = mapped_column(String(320), unique=True)
    email_verified_at: Mapped[datetime | None]
    # None for an account that only signs in through an outside identity.
    password_hash: Mapped[str | None] = mapped_column(String(255))
    # None: unchanged since the account was made.
    password_changed_at: Mapped[datetime | None]
    # Wrong passwords in a row, and when the last one came (services/accounts.py authenticate).
    password_failures: Mapped[int] = mapped_column(default=0)
    password_failed_at: Mapped[datetime | None]
    # Wrong second-factor codes in a row, and when the last one came (services/mfa.py verify).
    # Kept here, not in the browser's cookie, so replaying an old cookie does not reset them.
    second_factor_failures: Mapped[int] = mapped_column(default=0)
    second_factor_failed_at: Mapped[datetime | None]
    # When they answered the offer of a passkey or two-step after signing up; None: not yet.
    security_prompt_answered_at: Mapped[datetime | None]
    given_name: Mapped[str] = mapped_column(String(100), default="")
    family_name: Mapped[str] = mapped_column(String(100), default="")
    locale: Mapped[str] = mapped_column(String(10), default="fr")
    picture: Mapped[str | None] = mapped_column(String(2048))
    # Two-letter ISO 3166 code, and a phone number in E.164.
    country: Mapped[str | None] = mapped_column(String(2))
    phone: Mapped[str | None] = mapped_column(String(20))
    # A postal address, in the parts of the OIDC address claim. Its country can differ from
    # `country`, which is where the person lives.
    address_street: Mapped[str] = mapped_column(String(300), default="")
    address_locality: Mapped[str] = mapped_column(String(100), default="")
    address_region: Mapped[str] = mapped_column(String(100), default="")
    address_postal_code: Mapped[str] = mapped_column(String(20), default="")
    address_country: Mapped[str | None] = mapped_column(String(2))
    # "admin" opens the admin API. "superadmin", given only from the command line, also gives and
    # takes the admin role in the console, and the console cannot disable or demote it.
    roles: Mapped[list[str]] = mapped_column(ARRAY(String(32)), default=list)
    disabled_at: Mapped[datetime | None]
    # When the user accepted the developer terms, which opens the developer portal.
    developer_since: Mapped[datetime | None]

    identities: Mapped[list["Identity"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def name(self) -> str:
        return f"{self.given_name} {self.family_name}".strip()

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles

    @property
    def is_superadmin(self) -> bool:
        return "superadmin" in self.roles

    def get_user_id(self) -> str:
        """Authlib's name for the subject."""
        return str(self.id)


class Identity(IdMixin, TimestampMixin, Base):
    """An account at another provider (Google) that signs this user in."""

    __tablename__ = "identities"
    __table_args__ = (UniqueConstraint("provider", "subject"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    subject: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(320))

    user: Mapped[User] = relationship(back_populates="identities")
