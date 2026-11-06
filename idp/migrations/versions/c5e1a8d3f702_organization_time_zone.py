"""An organization's time zone: its deadlines and schedules, and its members' default.

Revision ID: c5e1a8d3f702
Revises: f2a7c9e4b638
Created: 2026-11-06 10:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c5e1a8d3f702"
down_revision: str | None = "f2a7c9e4b638"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("time_zone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "time_zone")
