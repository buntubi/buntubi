"""Wrong second-factor codes are counted on the account, not in the browser's cookie.

Revision ID: b3d7f1a68e25
Revises: a1c5e9f02d74
Created: 2026-10-12 11:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3d7f1a68e25"
down_revision: str | None = "a1c5e9f02d74"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("second_factor_failures", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column("users", sa.Column("second_factor_failed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "second_factor_failed_at")
    op.drop_column("users", "second_factor_failures")
