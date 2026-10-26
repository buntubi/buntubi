"""The platform terms each account accepted, and when.

Revision ID: c2f6a8d1e047
Revises: b7e3c1a9d524
Created: 2026-10-26 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c2f6a8d1e047"
down_revision: str | None = "b7e3c1a9d524"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("terms_version", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "terms_accepted_at")
    op.drop_column("users", "terms_version")
