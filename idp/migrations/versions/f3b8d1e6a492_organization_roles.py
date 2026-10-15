"""Organization roles shared by every product, and the developer portal's own role beside them.

A membership and an invitation get `portal_role`. Existing ones move: manager becomes admin;
developer, reviewer and viewer become member with that portal role. Owners stay owners.

Revision ID: f3b8d1e6a492
Revises: e1f7b3c58a20
Created: 2026-10-15 18:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3b8d1e6a492"
down_revision: str | None = "e1f7b3c58a20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES = ("organization_members", "invitations")


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(table, sa.Column("portal_role", sa.String(12), nullable=True))
        op.execute(f"UPDATE {table} SET role = 'admin' WHERE role = 'manager'")
        op.execute(
            f"UPDATE {table} SET portal_role = role, role = 'member' "
            "WHERE role IN ('developer', 'reviewer', 'viewer')"
        )


def downgrade() -> None:
    for table in _TABLES:
        op.execute(f"UPDATE {table} SET role = 'manager' WHERE role IN ('admin', 'billing')")
        # Without a portal role a member had no equivalent; viewer is the nearest, and a guest too.
        op.execute(
            f"UPDATE {table} SET role = COALESCE(portal_role, 'viewer') WHERE role IN ('member', 'guest')"
        )
        op.drop_column(table, "portal_role")
