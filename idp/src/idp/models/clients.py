"""
Applications that sign people in through the provider. Implements Authlib's ClientMixin, strictly:
redirect URIs match exactly, public clients have no secret, a secret is only ever kept hashed.

A developer's app belongs to an organization and starts in the sandbox; the owner's own apps have no
organization and are live from the start.
"""

import uuid
from datetime import datetime
from typing import Any, Literal

from authlib.oauth2.rfc6749 import ClientMixin, list_to_scope, scope_to_list
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from idp.db import Base, IdMixin, TimestampMixin, utcnow
from idp.models.platform import ClientSecret, Organization
from idp.security.tokens import matches

ClientType = Literal["public", "confidential"]

GRANT_TYPES = (
    "authorization_code",
    "refresh_token",
    "client_credentials",
    "urn:ietf:params:oauth:grant-type:device_code",
)
AUTH_METHODS = ("none", "client_secret_basic", "client_secret_post")


class Client(IdMixin, TimestampMixin, Base, ClientMixin):  # type: ignore[misc]
    __tablename__ = "clients"

    client_id: Mapped[str] = mapped_column(String(64), unique=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    # "sandbox": only the organization's members and test users can sign in; "live": anyone.
    environment: Mapped[str] = mapped_column(String(8), default="sandbox", server_default="live")
    # Going live with a sensitive scope waits for the platform owner: "none", "pending", "approved",
    # "rejected".
    review_status: Mapped[str] = mapped_column(String(10), default="none", server_default="none")
    review_note: Mapped[str] = mapped_column(String(1000), default="", server_default="")
    reviewed_at: Mapped[datetime | None]
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    homepage_url: Mapped[str | None] = mapped_column(String(2048))
    privacy_url: Mapped[str | None] = mapped_column(String(2048))
    terms_url: Mapped[str | None] = mapped_column(String(2048))
    # What the developer said they are building, shown in the portal and to reviewers.
    kind: Mapped[str] = mapped_column(String(16), default="web", server_default="web")
    description: Mapped[str] = mapped_column(String(500), default="", server_default="")
    category: Mapped[str] = mapped_column(String(40), default="", server_default="")
    platforms: Mapped[list[str]] = mapped_column(ARRAY(String(16)), default=list, server_default="{}")
    client_type: Mapped[str] = mapped_column(String(16), default="public")
    name: Mapped[str] = mapped_column(String(120))
    redirect_uris: Mapped[list[str]] = mapped_column(ARRAY(String(2048)), default=list)
    post_logout_redirect_uris: Mapped[list[str]] = mapped_column(ARRAY(String(2048)), default=list)
    grant_types: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), default=lambda: ["authorization_code", "refresh_token"]
    )
    scope: Mapped[str] = mapped_column(String(1000), default="openid profile email")
    token_endpoint_auth_method: Mapped[str] = mapped_column(String(32), default="none")
    # A first-party application skips the consent screen.
    first_party: Mapped[bool] = mapped_column(Boolean, default=False)
    # How the sign-in screens look for this client: {"name", "logo", "accent", "skin"}.
    brand: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    disabled_at: Mapped[datetime | None]

    # Confidential clients only; a public client (a SPA or a mobile app) cannot keep a secret.
    secrets: Mapped[list[ClientSecret]] = relationship(cascade="all, delete-orphan")
    organization: Mapped[Organization | None] = relationship()

    @property
    def is_live(self) -> bool:
        return self.environment == "live"

    @property
    def is_public(self) -> bool:
        return self.client_type == "public"

    # ── Authlib ClientMixin ─────────────────────────────────────────────────────────────────────
    def get_client_id(self) -> str:
        return self.client_id

    def get_default_redirect_uri(self) -> str | None:
        # Only when exactly one is registered; with several, the request must name one.
        return self.redirect_uris[0] if len(self.redirect_uris) == 1 else None

    def get_allowed_scope(self, scope: str) -> str:
        if not scope:
            return ""
        allowed = set(scope_to_list(self.scope))
        return list_to_scope([s for s in scope_to_list(scope) if s in allowed])

    def check_redirect_uri(self, redirect_uri: str) -> bool:
        return redirect_uri in self.redirect_uris

    def check_client_secret(self, client_secret: str) -> bool:
        now = utcnow()
        for secret in self.secrets:
            if secret.is_active(now) and matches(client_secret, secret.secret_hash):
                secret.last_used_at = now
                return True
        return False

    def check_endpoint_auth_method(self, method: str, endpoint: str) -> bool:
        if self.is_public:
            return method == "none"
        # Either way of sending the secret: in the Authorization header or in the form body.
        return method in ("client_secret_basic", "client_secret_post")

    def check_response_type(self, response_type: str) -> bool:
        # The authorization code flow only: no implicit or hybrid responses.
        return response_type == "code" and "authorization_code" in self.grant_types

    def check_grant_type(self, grant_type: str) -> bool:
        if grant_type == "client_credentials" and self.is_public:
            return False
        return grant_type in self.grant_types
