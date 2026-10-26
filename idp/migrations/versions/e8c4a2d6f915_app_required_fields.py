"""The profile fields each app needs.

Revision ID: e8c4a2d6f915
Revises: d5b9e3f7a281
Created: 2026-10-26 18:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e8c4a2d6f915"
down_revision: str | None = "d5b9e3f7a281"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("required_fields", postgresql.ARRAY(sa.String(length=64)), server_default="{}", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("clients", "required_fields")
