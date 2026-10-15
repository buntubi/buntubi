"""The organizations API in the catalogue: the product and its two scopes.

Revision ID: b6e1d0c4f357
Revises: a4c9e2f7b815
Created: 2026-10-15 22:00:00
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b6e1d0c4f357"
down_revision: str | None = "a4c9e2f7b815"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCOPES = [
    (
        "organizations:read",
        "public",
        "Voir vos organisations, leurs membres et votre rôle",
        "See your organizations, their members and your role",
    ),
    (
        "organizations:manage",
        "sensitive",
        "Gérer vos organisations et leurs membres, selon votre rôle",
        "Manage your organizations and their members, as your role allows",
    ),
]


def upgrade() -> None:
    now = datetime.now(UTC)
    products = sa.table(
        "api_products",
        sa.column("slug", sa.String),
        sa.column("names", postgresql.JSONB),
        sa.column("descriptions", postgresql.JSONB),
        sa.column("category", sa.String),
        sa.column("auth", postgresql.ARRAY(sa.String)),
        sa.column("position", sa.Integer),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        products,
        [
            {
                "slug": "organizations",
                "names": {"fr": "API Organisations", "en": "Organizations API"},
                "descriptions": {
                    "fr": "Les organisations de la personne connectée, leurs membres et invitations, selon son rôle.",
                    "en": "The signed-in person's organizations, their members and invitations, as their role allows.",
                },
                "category": "identity",
                "auth": ["oauth2"],
                "position": 1,
                "created_at": now,
            }
        ],
    )
    scopes = sa.table(
        "scopes",
        sa.column("name", sa.String),
        sa.column("sensitivity", sa.String),
        sa.column("descriptions", postgresql.JSONB),
        sa.column("resource", sa.String),
        sa.column("product", sa.String),
        sa.column("notes", sa.Text),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        scopes,
        [
            {
                "name": name,
                "sensitivity": sensitivity,
                "descriptions": {"fr": fr, "en": en},
                "resource": "",
                "product": "organizations",
                "notes": "",
                "created_at": now,
            }
            for name, sensitivity, fr, en in SCOPES
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM scopes WHERE product = 'organizations'")
    op.execute("DELETE FROM api_products WHERE slug = 'organizations'")
