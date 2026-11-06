"""A person's appearance choices: skin, scheme, accent, corners, transparency, backdrop.

Revision ID: d7a3b9e5c418
Revises: c5e1a8d3f702
Created: 2026-11-06 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d7a3b9e5c418"
down_revision: str | None = "c5e1a8d3f702"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("appearance", postgresql.JSONB(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("users", "appearance")
