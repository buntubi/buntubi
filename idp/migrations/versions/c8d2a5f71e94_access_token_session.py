"""Access tokens remember the sign-in they came from, so its end reaches the client.

Revision ID: c8d2a5f71e94
Revises: b6e1f4a8c357
Created: 2026-10-11 15:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8d2a5f71e94"
down_revision: str | None = "b6e1f4a8c357"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("access_tokens", sa.Column("session_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_access_tokens_session_id_login_sessions",
        "access_tokens",
        "login_sessions",
        ["session_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_access_tokens_session_id", "access_tokens", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_access_tokens_session_id", table_name="access_tokens")
    op.drop_constraint("fk_access_tokens_session_id_login_sessions", "access_tokens", type_="foreignkey")
    op.drop_column("access_tokens", "session_id")
