"""Wrong passwords are counted per account, to pause password sign-in after too many.

Revision ID: c6e2a9d4b718
Revises: b3d7f1a68e25
Created: 2026-10-12 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c6e2a9d4b718"
down_revision: str | None = "b3d7f1a68e25"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_failures", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("password_failed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_failed_at")
    op.drop_column("users", "password_failures")
