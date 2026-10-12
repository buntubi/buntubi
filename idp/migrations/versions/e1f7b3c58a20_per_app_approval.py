"""Reviews approve each app: its own sensitive scopes, and the hosts of its redirect addresses.

Existing apps keep what they had: each gets the sensitive scopes its organization was approved
for that it already holds, and a reviewed app the hosts of its current redirect addresses.

Revision ID: e1f7b3c58a20
Revises: d9a4c2e17f63
Created: 2026-10-12 16:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e1f7b3c58a20"
down_revision: str | None = "d9a4c2e17f63"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("approved_scopes", postgresql.ARRAY(sa.String(100)), nullable=False, server_default="{}"),
    )
    op.add_column(
        "clients",
        sa.Column("approved_redirect_hosts", postgresql.ARRAY(sa.String(255)), nullable=False, server_default="{}"),
    )
    op.execute(
        """
        update clients c set approved_scopes = array(
            select unnest(o.approved_scopes)
            intersect
            select unnest(string_to_array(c.scope, ' '))
        )
        from organizations o where o.id = c.organization_id
        """
    )
    op.execute(
        """
        update clients c set approved_redirect_hosts = array(
            select distinct lower(substring(u from '^[a-zA-Z][a-zA-Z0-9+.-]*://(?:[^@/]*@)?([^/:?#]+)'))
            from unnest(c.redirect_uris) u
            where substring(u from '^[a-zA-Z][a-zA-Z0-9+.-]*://(?:[^@/]*@)?([^/:?#]+)') is not null
        )
        where c.review_status = 'approved'
        """
    )


def downgrade() -> None:
    op.drop_column("clients", "approved_redirect_hosts")
    op.drop_column("clients", "approved_scopes")
