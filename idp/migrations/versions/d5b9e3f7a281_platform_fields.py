"""A platform's own profile fields, each person's values for them, and the scope releasing them.

Revision ID: d5b9e3f7a281
Revises: c2f6a8d1e047
Created: 2026-10-26 15:00:00
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d5b9e3f7a281"
down_revision: str | None = "c2f6a8d1e047"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DESCRIPTIONS = {
    "fr": "Voir les informations de votre profil sur la plateforme",
    "en": "See your profile information on the platform",
}


def upgrade() -> None:
    op.add_column("profile_fields", sa.Column("type", sa.String(length=10), nullable=True))
    op.add_column(
        "profile_fields",
        sa.Column("labels", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
    )
    op.add_column(
        "profile_fields",
        sa.Column("choices", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
    )
    op.add_column("profile_fields", sa.Column("position", sa.Integer(), server_default="0", nullable=False))
    op.create_table(
        "profile_values",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=40), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_profile_values_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_profile_values")),
        sa.UniqueConstraint("user_id", "key", name=op.f("uq_profile_values_user_id")),
    )
    op.create_index(op.f("ix_profile_values_user_id"), "profile_values", ["user_id"])
    op.execute(
        "insert into scopes (name, sensitivity, descriptions, resource, product, notes, created_at) "
        f"values ('platform_profile', 'public', '{json.dumps(DESCRIPTIONS, ensure_ascii=False)}'::jsonb, "
        "'', 'identity', '', now()) on conflict (name) do nothing"
    )


def downgrade() -> None:
    op.execute("delete from scopes where name = 'platform_profile' and managed_by is null")
    op.drop_index(op.f("ix_profile_values_user_id"), table_name="profile_values")
    op.drop_table("profile_values")
    for column in ("position", "choices", "labels", "type"):
        op.drop_column("profile_fields", column)
