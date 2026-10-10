"""The organization role `admin` is `manager`: "admin" only names the platform's admins.

Revision ID: c7a2d94e1b36
Revises: b4e8c1f07a92
Created: 2026-10-10 12:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c7a2d94e1b36"
down_revision: str | None = "b4e8c1f07a92"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("update organization_members set role = 'manager' where role = 'admin'")


def downgrade() -> None:
    op.execute("update organization_members set role = 'admin' where role = 'manager'")
