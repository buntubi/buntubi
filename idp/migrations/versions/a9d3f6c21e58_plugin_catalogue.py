"""Plugin catalogue: which plugin declares a product or a scope, and when it stopped.

Revision ID: a9d3f6c21e58
Revises: f2c8a1d93b47
Created: 2026-10-09 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a9d3f6c21e58"
down_revision: str | None = "f2c8a1d93b47"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("api_products", "scopes"):
        op.add_column(table, sa.Column("managed_by", sa.String(length=64), nullable=True))
        op.add_column(table, sa.Column("deprecated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    for table in ("api_products", "scopes"):
        op.drop_column(table, "deprecated_at")
        op.drop_column(table, "managed_by")
