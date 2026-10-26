"""What each app keeps about a person for itself, and the scope its server uses for it.

Revision ID: f2a7c9e4b638
Revises: e8c4a2d6f915
Created: 2026-10-26 20:00:00
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f2a7c9e4b638"
down_revision: str | None = "e8c4a2d6f915"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DESCRIPTIONS = {
    "fr": "Garder ses propres informations sur les personnes qui utilisent l’application",
    "en": "Keep its own information about the people who use the app",
}


def upgrade() -> None:
    op.create_table(
        "app_user_data",
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"], ["clients.id"], name=op.f("fk_app_user_data_client_id_clients"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_app_user_data_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_app_user_data")),
        sa.UniqueConstraint("client_id", "user_id", name=op.f("uq_app_user_data_client_id")),
    )
    op.create_index(op.f("ix_app_user_data_client_id"), "app_user_data", ["client_id"])
    op.create_index(op.f("ix_app_user_data_user_id"), "app_user_data", ["user_id"])
    op.execute(
        "insert into scopes (name, sensitivity, descriptions, resource, product, notes, created_at) "
        f"values ('app_data', 'public', '{json.dumps(DESCRIPTIONS, ensure_ascii=False)}'::jsonb, "
        "'', 'identity', '', now()) on conflict (name) do nothing"
    )


def downgrade() -> None:
    op.execute("delete from scopes where name = 'app_data' and managed_by is null")
    op.drop_index(op.f("ix_app_user_data_user_id"), table_name="app_user_data")
    op.drop_index(op.f("ix_app_user_data_client_id"), table_name="app_user_data")
    op.drop_table("app_user_data")
