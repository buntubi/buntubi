"""API products: the catalog of APIs, the scopes each brings, the products each app uses.

Revision ID: e7b5c2d84a19
Revises: d4a2e9b17c30
Created: 2026-10-07 16:00:00
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e7b5c2d84a19"
down_revision: str | None = "d4a2e9b17c30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

IDENTITY_SCOPES = ("openid", "profile", "email", "phone", "offline_access")


def upgrade() -> None:
    op.create_table(
        "api_products",
        sa.Column("slug", sa.String(length=40), nullable=False),
        sa.Column("names", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("descriptions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("category", sa.String(length=40), server_default="", nullable=False),
        sa.Column("auth", postgresql.ARRAY(sa.String(length=16)), server_default="{}", nullable=False),
        sa.Column("availability", sa.String(length=8), server_default="ga", nullable=False),
        sa.Column("docs_url", sa.String(length=2048), nullable=True),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("slug", name=op.f("pk_api_products")),
    )
    op.add_column("scopes", sa.Column("product", sa.String(length=40), nullable=True))
    op.create_index(op.f("ix_scopes_product"), "scopes", ["product"], unique=False)
    op.create_foreign_key(
        op.f("fk_scopes_product_api_products"),
        "scopes",
        "api_products",
        ["product"],
        ["slug"],
        ondelete="SET NULL",
    )
    op.add_column(
        "clients",
        sa.Column("products", postgresql.ARRAY(sa.String(length=40)), server_default="{}", nullable=False),
    )

    products = sa.table(
        "api_products",
        sa.column("slug", sa.String),
        sa.column("names", postgresql.JSONB),
        sa.column("descriptions", postgresql.JSONB),
        sa.column("category", sa.String),
        sa.column("auth", postgresql.ARRAY(sa.String)),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        products,
        [
            {
                "slug": "identity",
                "names": {"fr": "API Identité", "en": "Identity API"},
                "descriptions": {
                    "fr": "Connecter les utilisateurs et lire l’identité qu’ils autorisent.",
                    "en": "Sign users in and read the identity they authorize.",
                },
                "category": "identity",
                "auth": ["oauth2", "oidc"],
                "created_at": datetime.now(UTC),
            }
        ],
    )
    names = ", ".join(f"'{name}'" for name in IDENTITY_SCOPES)
    op.execute(f"update scopes set product = 'identity' where name in ({names})")


def downgrade() -> None:
    op.drop_column("clients", "products")
    op.drop_constraint(op.f("fk_scopes_product_api_products"), "scopes", type_="foreignkey")
    op.drop_index(op.f("ix_scopes_product"), table_name="scopes")
    op.drop_column("scopes", "product")
    op.drop_table("api_products")
