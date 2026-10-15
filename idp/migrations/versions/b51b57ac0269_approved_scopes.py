"""Sensitive scopes approved per project, in reviews.

Revision ID: b51b57ac0269
Revises: 5e1cf5f40f19
Created: 2026-10-06 16:30:33.649287
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b51b57ac0269"
down_revision: str | None = "5e1cf5f40f19"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "approved_scopes", postgresql.ARRAY(sa.String(length=64)), server_default="{}", nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "approved_scopes")
