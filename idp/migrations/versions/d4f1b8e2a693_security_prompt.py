"""Users remember answering the passkey or two-step offer made after signing up.

Revision ID: d4f1b8e2a693
Revises: c8d2a5f71e94
Created: 2026-10-11 18:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4f1b8e2a693"
down_revision: str | None = "c8d2a5f71e94"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("security_prompt_answered_at", sa.DateTime(timezone=True), nullable=True))
    # Accounts made before the offer existed are not sent to it.
    op.execute("UPDATE users SET security_prompt_answered_at = now()")


def downgrade() -> None:
    op.drop_column("users", "security_prompt_answered_at")
