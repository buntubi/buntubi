"""Passkey challenges already answered, so a replayed session cookie cannot reuse one.

Revision ID: d9a4c2e17f63
Revises: c6e2a9d4b718
Created: 2026-10-12 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d9a4c2e17f63"
down_revision: str | None = "c6e2a9d4b718"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "used_challenges",
        sa.Column("challenge_hash", sa.String(64), primary_key=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )


def downgrade() -> None:
    op.drop_table("used_challenges")
