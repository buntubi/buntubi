"""
Organization events for the products, sent as signed webhooks.

An event is written in the transaction of the change it tells of (an outbox), numbered per
organization so a product applies them in order and sees a gap. A delivery is one event for one
app, tried until it is answered with a 2xx or given up on. The organization id is kept without a
foreign key: an organization's deletion is an event too, and outlives it.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from buntubi.db import Base, IdMixin, utcnow
from buntubi.models.clients import Client


class AppOrganization(Base):
    """An app works with an organization: it was given a token naming it. Its webhooks follow."""

    __tablename__ = "app_organizations"

    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    linked_at: Mapped[datetime] = mapped_column(default=utcnow)


class OrganizationEventSequence(Base):
    """The last event number of an organization."""

    __tablename__ = "organization_event_sequences"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    last: Mapped[int] = mapped_column(BigInteger, default=0)


class WebhookEvent(IdMixin, Base):
    __tablename__ = "webhook_events"
    __table_args__ = (UniqueConstraint("organization_id", "sequence"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    sequence: Mapped[int] = mapped_column(BigInteger)
    # organization.created, member.added, ... (services/webhooks.py EVENTS).
    type: Mapped[str] = mapped_column(String(40))
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, index=True)


class WebhookDelivery(IdMixin, Base):
    __tablename__ = "webhook_deliveries"
    __table_args__ = (
        UniqueConstraint("event_id", "client_id"),
        Index("ix_webhook_deliveries_due", "status", "next_attempt_at"),
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("webhook_events.id", ondelete="CASCADE"), index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    # pending: to try at next_attempt_at; delivered: answered 2xx; failed: given up after a day.
    status: Mapped[str] = mapped_column(String(10), default="pending")
    attempts: Mapped[int] = mapped_column(default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_attempt_at: Mapped[datetime | None]
    last_status: Mapped[int | None]
    last_error: Mapped[str | None] = mapped_column(Text)
    delivered_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    event: Mapped[WebhookEvent] = relationship()
    client: Mapped[Client] = relationship()
