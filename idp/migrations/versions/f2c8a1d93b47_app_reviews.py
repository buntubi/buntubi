"""App reviews: each request to go live with sensitive scopes, its justifications and its answer.

Revision ID: f2c8a1d93b47
Revises: e7b5c2d84a19
Created: 2026-10-08 08:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f2c8a1d93b47"
down_revision: str | None = "e7b5c2d84a19"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_by_id", sa.Uuid(), nullable=True),
        sa.Column("scopes", postgresql.ARRAY(sa.String(length=64)), nullable=False),
        sa.Column("justifications", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("decision", sa.String(length=16), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["client_id"], ["clients.id"], name=op.f("fk_app_reviews_client_id_clients"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["decided_by_id"],
            ["users.id"],
            name=op.f("fk_app_reviews_decided_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["submitted_by_id"],
            ["users.id"],
            name=op.f("fk_app_reviews_submitted_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_app_reviews")),
    )
    op.create_index(op.f("ix_app_reviews_client_id"), "app_reviews", ["client_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_app_reviews_client_id"), table_name="app_reviews")
    op.drop_table("app_reviews")
