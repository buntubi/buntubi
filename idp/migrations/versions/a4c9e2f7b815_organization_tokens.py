"""Tokens bound to an organization: the app's setting, the organization on codes, tokens and consents.

Consent is given per organization; existing consents were given as a person and stay so.

Revision ID: a4c9e2f7b815
Revises: f3b8d1e6a492
Created: 2026-10-15 20:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a4c9e2f7b815"
down_revision: str | None = "f3b8d1e6a492"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _organization(table: str) -> sa.Column:  # type: ignore[type-arg]
    return sa.Column(
        "organization_id",
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey(
            "organizations.id", name=f"fk_{table}_organization_id_organizations", ondelete="CASCADE"
        ),
        nullable=True,
    )


def upgrade() -> None:
    op.add_column(
        "clients", sa.Column("organization_usage", sa.String(8), nullable=False, server_default="none")
    )
    for table in ("authorization_codes", "refresh_tokens", "access_tokens", "consents"):
        op.add_column(table, _organization(table))
    for table in ("refresh_tokens", "access_tokens"):
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])
    op.drop_constraint("uq_consents_user_id", "consents", type_="unique")
    op.create_unique_constraint(
        "uq_consents_user_id",
        "consents",
        ["user_id", "client_id", "organization_id"],
        postgresql_nulls_not_distinct=True,
    )


def downgrade() -> None:
    op.drop_constraint("uq_consents_user_id", "consents", type_="unique")
    op.execute("DELETE FROM consents WHERE organization_id IS NOT NULL")
    op.create_unique_constraint("uq_consents_user_id", "consents", ["user_id", "client_id"])
    for table in ("refresh_tokens", "access_tokens"):
        op.drop_index(f"ix_{table}_organization_id", table)
    for table in ("authorization_codes", "refresh_tokens", "access_tokens", "consents"):
        op.drop_column(table, "organization_id")
    op.drop_column("clients", "organization_usage")
