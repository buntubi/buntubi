"""
What signing in produces: browser sessions, authorization codes, tokens and consents.

Every code and refresh token is stored as a hash. Access tokens are signed JWTs (RFC 9068), so a
resource server checks them against the JWKS; each is still recorded by its jti, for introspection,
revocation and the admin view.
"""

import uuid
from datetime import datetime

from authlib.oauth2.rfc6749 import AuthorizationCodeMixin, TokenMixin
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from buntubi.db import Base, IdMixin, utcnow
from buntubi.models.clients import Client
from buntubi.models.users import User


class LoginSession(IdMixin, Base):
    """A browser signed in to the provider. The cookie holds only this row's id."""

    __tablename__ = "login_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    # How the user proved who they are ("pwd", "google", "otp"): the OIDC amr claim.
    auth_methods: Mapped[list[str]] = mapped_column(ARRAY(String(16)), default=list)
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(512))

    user: Mapped[User] = relationship()

    def is_active(self, now: datetime) -> bool:
        return self.revoked_at is None and self.expires_at > now


class AuthorizationCode(IdMixin, Base, AuthorizationCodeMixin):  # type: ignore[misc]
    __tablename__ = "authorization_codes"

    code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("login_sessions.id", ondelete="SET NULL"))
    redirect_uri: Mapped[str] = mapped_column(String(2048))
    scope: Mapped[str] = mapped_column(String(1000))
    nonce: Mapped[str | None] = mapped_column(String(255))
    code_challenge: Mapped[str] = mapped_column(String(128))
    code_challenge_method: Mapped[str] = mapped_column(String(10))
    auth_time: Mapped[datetime]
    auth_methods: Mapped[list[str]] = mapped_column(ARRAY(String(16)), default=list)
    expires_at: Mapped[datetime]
    # Kept once used, with what it gave, so a replay can take that back (RFC 9700 4.4.1).
    used_at: Mapped[datetime | None]
    issued_jti: Mapped[str | None] = mapped_column(String(64))
    issued_family_id: Mapped[uuid.UUID | None]

    user: Mapped[User] = relationship()
    client: Mapped[Client] = relationship()

    # ── Authlib AuthorizationCodeMixin ──────────────────────────────────────────────────────────
    def get_redirect_uri(self) -> str:
        return self.redirect_uri

    def get_scope(self) -> str:
        return self.scope

    def get_nonce(self) -> str | None:
        return self.nonce

    def get_auth_time(self) -> int:
        return int(self.auth_time.timestamp())

    def get_amr(self) -> list[str]:
        return self.auth_methods

    def get_acr(self) -> str:
        return "0"


class RefreshToken(IdMixin, Base, TokenMixin):  # type: ignore[misc]
    """
    Rotated on every use. All tokens descending from one sign-in share a family: presenting a token
    that was already rotated means it was copied, and the whole family is revoked.
    """

    __tablename__ = "refresh_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("login_sessions.id", ondelete="SET NULL"))
    scope: Mapped[str] = mapped_column(String(1000))
    auth_time: Mapped[datetime]
    issued_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime]
    rotated_at: Mapped[datetime | None]
    revoked_at: Mapped[datetime | None]

    user: Mapped[User] = relationship()
    client: Mapped[Client] = relationship()

    # ── Authlib TokenMixin ──────────────────────────────────────────────────────────────────────
    def check_client(self, client: Client) -> bool:
        return self.client_id == client.id

    def get_scope(self) -> str:
        return self.scope

    def get_expires_in(self) -> int:
        return max(0, int((self.expires_at - self.issued_at).total_seconds()))

    def is_expired(self) -> bool:
        return self.expires_at <= utcnow()

    def is_revoked(self) -> bool:
        return self.revoked_at is not None or self.rotated_at is not None


class AccessTokenRecord(Base):
    """An access token that was issued, by jti. The token itself is never stored."""

    __tablename__ = "access_tokens"

    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    refresh_family_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    # The sign-in it came from: whose end the client hears of (back-channel logout).
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("login_sessions.id", ondelete="SET NULL"), index=True
    )
    scope: Mapped[str] = mapped_column(String(1000))
    issued_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(index=True)
    revoked_at: Mapped[datetime | None]

    def check_client(self, client: Client) -> bool:
        return self.client_id == client.id


class Consent(IdMixin, Base):
    """The scopes a user agreed to give a client. A request asking for more asks again."""

    __tablename__ = "consents"
    __table_args__ = (UniqueConstraint("user_id", "client_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    granted_at: Mapped[datetime] = mapped_column(default=utcnow)
