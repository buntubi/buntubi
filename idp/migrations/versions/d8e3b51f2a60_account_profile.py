"""The account area's profile: a person's photo, and the new address an email change waits on.

Revision ID: d8e3b51f2a60
Revises: c7a2d94e1b36
Created: 2026-10-10 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d8e3b51f2a60"
down_revision: str | None = "c7a2d94e1b36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("email_tokens", sa.Column("payload", sa.String(length=320), nullable=True))
    op.create_table(
        "user_pictures",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_pictures")
    op.drop_column("email_tokens", "payload")
