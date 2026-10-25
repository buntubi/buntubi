"""Social sign-in: deployment settings, each app's providers and sign-up, identities' last use.

Revision ID: b7e3c1a9d524
Revises: a4d8e2f6c913
Created: 2026-10-25 22:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b7e3c1a9d524"
down_revision: str | None = "a4d8e2f6c913"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "platform_settings",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_platform_settings")),
        sa.UniqueConstraint("key", name=op.f("uq_platform_settings_key")),
    )
    op.add_column("clients", sa.Column("social_providers", postgresql.ARRAY(sa.String(length=32)), nullable=True))
    op.add_column("clients", sa.Column("signup_open", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("identities", sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("identities", "last_used_at")
    op.drop_column("clients", "signup_open")
    op.drop_column("clients", "social_providers")
    op.drop_table("platform_settings")
