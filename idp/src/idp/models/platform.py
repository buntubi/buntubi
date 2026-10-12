"""
The developer platform: organizations and their members, the secrets and API keys that belong to
them, the people allowed to try a sandbox app, and the catalog of scopes apps can ask for.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from idp.db import Base, IdMixin, TimestampMixin, utcnow

if TYPE_CHECKING:
    from idp.models.users import User

ENVIRONMENTS = ("sandbox", "live")
# public: any app; sensitive: a live app needs the platform owner's review;
# restricted: the platform's own apps only.
SENSITIVITIES = ("public", "sensitive", "restricted")
# Strongest first. What each may do is decided in services/platform.py.
ROLES = ("owner", "manager", "developer", "reviewer", "viewer")
# ga: generally available; beta: live, may still change; sandbox: not live yet.
AVAILABILITIES = ("ga", "beta", "sandbox")
PRODUCT_AUTH = ("oauth2", "oidc", "api_key", "webhooks")
APP_KINDS = ("consumer", "business", "web", "mobile", "backend", "internal")
PLATFORMS = ("web", "ios", "android", "backend")
# pending: waiting for the platform owner; approved, rejected: decided.
REVIEW_DECISIONS = ("pending", "approved", "rejected")


class Organization(IdMixin, TimestampMixin, Base):
    """A team that builds on the platform: it holds the apps, API keys and test users, and its members."""

    __tablename__ = "organizations"
    # One platform organization at most (migration b4e8c1f07a92): declared here too, so a migration
    # generated from the models does not drop it.
    __table_args__ = (
        Index("uq_organizations_platform", "is_platform", unique=True, postgresql_where=text("is_platform")),
    )

    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(500), default="")
    support_email: Mapped[str | None] = mapped_column(String(320))
    suspended_at: Mapped[datetime | None]
    suspended_reason: Mapped[str | None] = mapped_column(String(500))
    # Sensitive scopes the platform owner approved for this organization, in a review: its live apps and
    # live keys may carry them without asking again.
    approved_scopes: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list, server_default="{}")
    # The platform owner's own organization: it holds the platform's apps (the console, the
    # portal, the products the deployment runs), the only ones an admin may make first-party.
    # One at most.
    is_platform: Mapped[bool] = mapped_column(default=False, server_default="false")

    test_users: Mapped[list["OrganizationTestUser"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    members: Mapped[list["OrganizationMember"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    invitations: Mapped[list["Invitation"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )

    @property
    def is_suspended(self) -> bool:
        return self.suspended_at is not None


class Invitation(IdMixin, Base):
    """
    Someone asked to join an organization before they had an account. Accepted when an account
    proves the address (a verified sign-in), until it expires; withdrawn by deleting it.
    """

    __tablename__ = "invitations"
    __table_args__ = (UniqueConstraint("organization_id", "email"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[str] = mapped_column(String(12))
    app_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), default=list, server_default="{}"
    )
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    expires_at: Mapped[datetime]
    accepted_at: Mapped[datetime | None]

    organization: Mapped[Organization] = relationship(back_populates="invitations")


class OrganizationMember(IdMixin, Base):
    """Someone who works in an organization, with a role; there is always at least one owner."""

    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(12))
    # The apps a developer, reviewer or viewer works on; empty means all of them. Owners and
    # admins always see every app.
    app_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), default=list, server_default="{}"
    )
    added_at: Mapped[datetime] = mapped_column(default=utcnow)

    organization: Mapped[Organization] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class OrganizationTestUser(IdMixin, Base):
    """Someone allowed to sign in to the organization's sandbox apps, by email."""

    __tablename__ = "organization_test_users"
    __table_args__ = (UniqueConstraint("organization_id", "email"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320))
    added_at: Mapped[datetime] = mapped_column(default=utcnow)

    organization: Mapped[Organization] = relationship(back_populates="test_users")


class AppReview(IdMixin, Base):
    """
    One request to put an app live with sensitive scopes, and the platform owner's answer. Kept
    after the decision: an app's reviews are its history, what was asked each time and why.
    """

    __tablename__ = "app_reviews"

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    submitted_at: Mapped[datetime] = mapped_column(default=utcnow)
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    # The sensitive scopes not yet approved for the organization when it was submitted.
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    # Why the app needs each scope and where people meet it, by scope.
    justifications: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    # How a reviewer can try the app: test account, steps.
    instructions: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[str] = mapped_column(String(16), default="pending")
    note: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime | None]
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    submitted_by: Mapped["User | None"] = relationship(foreign_keys=[submitted_by_id])
    decided_by: Mapped["User | None"] = relationship(foreign_keys=[decided_by_id])


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
    A key an organization's server sends to the platform APIs: `sk_test_...` in the sandbox,
    `sk_live_...` live. Kept as a hash; the full key is shown once, at creation.
    """

    __tablename__ = "api_keys"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
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

    organization: Mapped[Organization] = relationship()

    def is_active(self, now: datetime) -> bool:
        return self.revoked_at is None and (self.expires_at is None or self.expires_at > now)


class ApiProduct(Base):
    """
    An API developers add to their apps, as the catalog presents it: a name, what it does, how
    to call it, and the scopes it brings. Its approval rule follows from those scopes.
    """

    __tablename__ = "api_products"

    slug: Mapped[str] = mapped_column(String(40), primary_key=True)
    # {"fr": "...", "en": "..."}
    names: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    descriptions: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    category: Mapped[str] = mapped_column(String(40), default="", server_default="")
    auth: Mapped[list[str]] = mapped_column(ARRAY(String(16)), default=list, server_default="{}")
    availability: Mapped[str] = mapped_column(String(8), default="ga", server_default="ga")
    docs_url: Mapped[str | None] = mapped_column(String(2048))
    # Catalog order, smallest first.
    position: Mapped[int] = mapped_column(default=0, server_default="0")
    # The plugin that declares it, or None for one made in the console.
    managed_by: Mapped[str | None] = mapped_column(String(64))
    # Set when its plugin stops declaring it: kept for the apps that use it, offered to no new one.
    deprecated_at: Mapped[datetime | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=utcnow)


class Scope(Base):
    """A permission an app can ask for, with the words the consent screen shows for it."""

    __tablename__ = "scopes"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    sensitivity: Mapped[str] = mapped_column(String(12), default="public")
    # {"fr": "...", "en": "..."}
    descriptions: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    # For platform API scopes: which API it opens. Empty for the OpenID Connect scopes.
    resource: Mapped[str] = mapped_column(String(64), default="")
    # The product this scope belongs to; none for the platform's own scopes.
    product: Mapped[str | None] = mapped_column(
        ForeignKey("api_products.slug", ondelete="SET NULL"), index=True
    )
    notes: Mapped[str] = mapped_column(Text, default="")
    # The plugin that declares it, or None for one made in the console.
    managed_by: Mapped[str | None] = mapped_column(String(64))
    # Set when its plugin stops declaring it: apps holding it keep it, no app may add it.
    deprecated_at: Mapped[datetime | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
