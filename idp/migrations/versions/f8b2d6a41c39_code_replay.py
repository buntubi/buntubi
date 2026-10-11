"""Authorization codes are kept once used, with what they gave, so a replay can revoke it.

Revision ID: f8b2d6a41c39
Revises: e7a3c9d14b52
Created: 2026-10-11 22:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f8b2d6a41c39"
down_revision: str | None = "e7a3c9d14b52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("authorization_codes", sa.Column("used_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("authorization_codes", sa.Column("issued_jti", sa.String(64), nullable=True))
    op.add_column("authorization_codes", sa.Column("issued_family_id", sa.Uuid(), nullable=True))


def downgrade() -> None:
    # Used codes were kept only for replay detection; without the columns they are just stale rows.
    op.execute("DELETE FROM authorization_codes WHERE used_at IS NOT NULL")
    op.drop_column("authorization_codes", "issued_family_id")
    op.drop_column("authorization_codes", "issued_jti")
    op.drop_column("authorization_codes", "used_at")
