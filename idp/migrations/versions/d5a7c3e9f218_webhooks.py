"""Organization events for the products: the outbox, numbers per organization, deliveries, the
webhook settings of an app, and which organizations each app works with.

Apps already given tokens naming an organization are linked to it.

Revision ID: d5a7c3e9f218
Revises: c8e2f4a1d906
Created: 2026-10-16 08:23:09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d5a7c3e9f218"
down_revision: str | None = "c8e2f4a1d906"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organization_event_sequences",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("last", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("organization_id", name=op.f("pk_organization_event_sequences")),
    )
    op.create_table(
        "webhook_events",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("sequence", sa.BigInteger(), nullable=False),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_webhook_events")),
        sa.UniqueConstraint("organization_id", "sequence", name=op.f("uq_webhook_events_organization_id")),
    )
    op.create_index(op.f("ix_webhook_events_created_at"), "webhook_events", ["created_at"], unique=False)
    op.create_index(
        op.f("ix_webhook_events_organization_id"), "webhook_events", ["organization_id"], unique=False
    )
    op.create_table(
        "app_organizations",
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name=op.f("fk_app_organizations_client_id_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_app_organizations_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("client_id", "organization_id", name=op.f("pk_app_organizations")),
    )
    op.create_index(
        op.f("ix_app_organizations_organization_id"), "app_organizations", ["organization_id"], unique=False
    )
    op.create_table(
        "webhook_deliveries",
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name=op.f("fk_webhook_deliveries_client_id_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["webhook_events.id"],
            name=op.f("fk_webhook_deliveries_event_id_webhook_events"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_webhook_deliveries")),
        sa.UniqueConstraint("event_id", "client_id", name=op.f("uq_webhook_deliveries_event_id")),
    )
    op.create_index(
        op.f("ix_webhook_deliveries_client_id"), "webhook_deliveries", ["client_id"], unique=False
    )
    op.create_index(
        "ix_webhook_deliveries_due", "webhook_deliveries", ["status", "next_attempt_at"], unique=False
    )
    op.create_index(op.f("ix_webhook_deliveries_event_id"), "webhook_deliveries", ["event_id"], unique=False)
    op.add_column("clients", sa.Column("webhook_url", sa.String(length=2048), nullable=True))
    op.add_column("clients", sa.Column("webhook_secret", sa.LargeBinary(), nullable=True))
    op.add_column(
        "clients", sa.Column("webhook_events", sa.String(length=8), server_default="linked", nullable=False)
    )
    op.execute(
        "INSERT INTO app_organizations (client_id, organization_id, linked_at) "
        "SELECT client_id, organization_id, min(issued_at) FROM ("
        "  SELECT client_id, organization_id, issued_at FROM refresh_tokens WHERE organization_id IS NOT NULL"
        "  UNION ALL"
        "  SELECT client_id, organization_id, issued_at FROM access_tokens WHERE organization_id IS NOT NULL"
        ") issued GROUP BY client_id, organization_id"
    )


def downgrade() -> None:
    op.drop_column("clients", "webhook_events")
    op.drop_column("clients", "webhook_secret")
    op.drop_column("clients", "webhook_url")
    op.drop_index(op.f("ix_webhook_deliveries_event_id"), table_name="webhook_deliveries")
    op.drop_index("ix_webhook_deliveries_due", table_name="webhook_deliveries")
    op.drop_index(op.f("ix_webhook_deliveries_client_id"), table_name="webhook_deliveries")
    op.drop_table("webhook_deliveries")
    op.drop_index(op.f("ix_app_organizations_organization_id"), table_name="app_organizations")
    op.drop_table("app_organizations")
    op.drop_index(op.f("ix_webhook_events_organization_id"), table_name="webhook_events")
    op.drop_index(op.f("ix_webhook_events_created_at"), table_name="webhook_events")
    op.drop_table("webhook_events")
    op.drop_table("organization_event_sequences")
