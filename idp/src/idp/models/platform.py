"""
The developer platform: projects owned by developers, the secrets and API keys that belong to
them, the people allowed to try a sandbox app, and the catalog of scopes apps can ask for.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from idp.db import Base, IdMixin, TimestampMixin, utcnow

ENVIRONMENTS = ("sandbox", "live")
# public: any app; sensitive: a live app needs the owner's review; restricted: owner's apps only.
SENSITIVITIES = ("public", "sensitive", "restricted")


class Project(IdMixin, TimestampMixin, Base):
    """What a developer builds: it holds their apps and API keys."""

    __tablename__ = "projects"

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(500), default="")
    support_email: Mapped[str | None] = mapped_column(String(320))
    suspended_at: Mapped[datetime | None]
    suspended_reason: Mapped[str | None] = mapped_column(String(500))

    test_users: Mapped[list["ProjectTestUser"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def is_suspended(self) -> bool:
        return self.suspended_at is not None


class ProjectTestUser(IdMixin, Base):
    """Someone allowed to sign in to the project's sandbox apps, by email."""

    __tablename__ = "project_test_users"
    __table_args__ = (UniqueConstraint("project_id", "email"),)

    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320))
    added_at: Mapped[datetime] = mapped_column(default=utcnow)

    project: Mapped[Project] = relationship(back_populates="test_users")


class ClientSecret(IdMixin, Base):
    """One of a confidential client's secrets. Several can be live at once, so a rotation has no gap."""

    __tablename__ = "client_secrets"

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    secret_hash: Mapped[str] = mapped_column(String(64), unique=True)
    # The first characters, shown in the portal so a secret can be told apart from its siblings.
    prefix: Mapped[str] = mapped_column(String(12))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_used_at: Mapped[datetime | None]
    expires_at: Mapped[datetime | None]
    revoked_at: Mapped[datetime | None]

    def is_active(self, now: datetime) -> bool:
        return self.revoked_at is None and (self.expires_at is None or self.expires_at > now)


class ApiKey(IdMixin, Base):
    """
    A key a project's server sends to the platform APIs: `sk_test_...` in the sandbox,
    `sk_live_...` live. Kept as a hash; the full key is shown once, at creation.
    """

    __tablename__ = "api_keys"

    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    environment: Mapped[str] = mapped_column(String(8))
    name: Mapped[str] = mapped_column(String(80))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    prefix: Mapped[str] = mapped_column(String(20))
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    # CIDR blocks the key works from; empty means anywhere.
    allowed_ips: Mapped[list[str]] = mapped_column(ARRAY(String(43)), default=list)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_used_at: Mapped[datetime | None]
    expires_at: Mapped[datetime | None]
    revoked_at: Mapped[datetime | None]

    project: Mapped[Project] = relationship()

    def is_active(self, now: datetime) -> bool:
        return self.revoked_at is None and (self.expires_at is None or self.expires_at > now)


class Scope(Base):
    """A permission an app can ask for, with the words the consent screen shows for it."""

    __tablename__ = "scopes"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    sensitivity: Mapped[str] = mapped_column(String(12), default="public")
    # {"fr": "...", "en": "..."}
    descriptions: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    # For platform API scopes: which API it opens. Empty for the OpenID Connect scopes.
    resource: Mapped[str] = mapped_column(String(64), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
