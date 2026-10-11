"""Back-channel logout: where a client is told that a session it took part in ended.

Revision ID: b6e1f4a8c357
Revises: a4d7e2c91f08
Created: 2026-10-11 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b6e1f4a8c357"
down_revision: str | None = "a4d7e2c91f08"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("backchannel_logout_uri", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "backchannel_logout_uri")
