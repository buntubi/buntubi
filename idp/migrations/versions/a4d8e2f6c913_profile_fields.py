"""The standard profile claims on users, and the platform's choice for each.

Revision ID: a4d8e2f6c913
Revises: e7a2c5d9b041
Created: 2026-10-25 10:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a4d8e2f6c913"
down_revision: str | None = "e7a2c5d9b041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = (
    ("birthdate", sa.Date()),
    ("gender", sa.String(length=10)),
    ("middle_name", sa.String(length=80)),
    ("nickname", sa.String(length=80)),
    ("website", sa.String(length=500)),
    ("zoneinfo", sa.String(length=64)),
)


def upgrade() -> None:
    for name, kind in COLUMNS:
        op.add_column("users", sa.Column(name, kind, nullable=True))
    op.create_table(
        "profile_fields",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("mode", sa.String(length=10), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_profile_fields")),
        sa.UniqueConstraint("key", name=op.f("uq_profile_fields_key")),
    )


def downgrade() -> None:
    op.drop_table("profile_fields")
    for name, _ in reversed(COLUMNS):
        op.drop_column("users", name)
