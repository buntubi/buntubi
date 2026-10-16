"""organizations:read is sensitive: it shows the other members' names and addresses.

Revision ID: e7a2c5d9b041
Revises: d5a7c3e9f218
Created: 2026-10-16 18:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "e7a2c5d9b041"
down_revision: str | None = "d5a7c3e9f218"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE scopes SET sensitivity = 'sensitive' WHERE name = 'organizations:read'")


def downgrade() -> None:
    op.execute("UPDATE scopes SET sensitivity = 'public' WHERE name = 'organizations:read'")
