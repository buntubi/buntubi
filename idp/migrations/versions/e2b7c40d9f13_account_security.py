"""The account area's security page: when the password last changed, and the browser behind each audit event.

Revision ID: e2b7c40d9f13
Revises: d8e3b51f2a60
Created: 2026-10-10 20:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e2b7c40d9f13"
down_revision: str | None = "d8e3b51f2a60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("audit_events", sa.Column("user_agent", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_events", "user_agent")
    op.drop_column("users", "password_changed_at")
