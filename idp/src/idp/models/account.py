"""
One-time proofs sent by email (a code to verify the address, a link to reset the password), the
device flow's pending requests, two-factor settings, and the audit trail. Secrets are kept hashed;
a TOTP seed, which has to be read back, is kept encrypted.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Integer, LargeBinary, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from idp.db import Base, IdMixin, utcnow
from idp.models.clients import Client


class EmailToken(IdMixin, Base):
    """A code to verify an address, or a link to reset a password. Single use, short-lived."""

    __tablename__ = "email_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # "verify_email" (a 6-digit code typed by the user), "reset_password" or "change_email" (links).
    purpose: Mapped[str] = mapped_column(String(32))
    # What the proof is for beyond the account: the new address of a "change_email".
    payload: Mapped[str | None] = mapped_column(String(320))
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    # A 6-digit code can be guessed: after a few wrong tries it stops working.
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime]
    used_at: Mapped[datetime | None]


class DeviceCode(IdMixin, Base):
    """RFC 8628: a device asks, a person approves on another screen with the user code."""

    __tablename__ = "device_codes"

    device_code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_code: Mapped[str] = mapped_column(String(16), unique=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    scope: Mapped[str] = mapped_column(String(1000))
    # "pending", then "approved" or "denied" by the person; "used" once a token was issued.
    status: Mapped[str] = mapped_column(String(16), default="pending")
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime]
    interval: Mapped[int] = mapped_column(Integer, default=5)
    last_polled_at: Mapped[datetime | None]

    client: Mapped[Client] = relationship()

    # ── Authlib DeviceCredentialMixin ───────────────────────────────────────────────────────────
    def get_client_id(self) -> str:
        return self.client.client_id

    def get_scope(self) -> str:
        return self.scope

    def get_user_code(self) -> str:
        return self.user_code

    def is_expired(self) -> bool:
        return self.expires_at <= utcnow()


class TotpCredential(IdMixin, Base):
    """An authenticator app. Confirmed once the user typed a first valid code."""

    __tablename__ = "totp_credentials"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    secret_encrypted: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    confirmed_at: Mapped[datetime | None]
    # The last time step accepted, so one code cannot be used twice.
    last_used_step: Mapped[int | None] = mapped_column(Integer)


class Passkey(IdMixin, Base):
    """A WebAuthn credential. Only its public key is kept; the private key never leaves the device."""

    __tablename__ = "passkeys"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    credential_id: Mapped[bytes] = mapped_column(LargeBinary, unique=True)
    public_key: Mapped[bytes] = mapped_column(LargeBinary)
    sign_count: Mapped[int] = mapped_column(Integer, default=0)
    transports: Mapped[list[str]] = mapped_column(ARRAY(String(16)), default=list)
    # Which kind of authenticator made it (a password manager, a security key), when it says.
    aaguid: Mapped[str] = mapped_column(String(36), default="")
    # Synced to the person's other devices by their password manager.
    backed_up: Mapped[bool] = mapped_column(default=False)
    name: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_used_at: Mapped[datetime | None]


class BackupCode(IdMixin, Base):
    __tablename__ = "backup_codes"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    used_at: Mapped[datetime | None]


class UsedChallenge(Base):
    """
    A passkey challenge already answered, by hash. The challenge itself rides in the session
    cookie, which can be replayed; this row is what makes an answer work once.
    """

    __tablename__ = "used_challenges"

    challenge_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    used_at: Mapped[datetime] = mapped_column(default=utcnow, index=True)


class UserPicture(Base):
    """A person's photo, made small in the browser before it is sent; served at /avatars/<id>."""

    __tablename__ = "user_pictures"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(32))
    data: Mapped[bytes] = mapped_column(LargeBinary)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow)


class AuditEvent(IdMixin, Base):
    """Who did what, when, from where. Never a secret in `details`."""

    __tablename__ = "audit_events"

    at: Mapped[datetime] = mapped_column(default=utcnow, index=True)
    event: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    client_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"))
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(32)), default=list)
