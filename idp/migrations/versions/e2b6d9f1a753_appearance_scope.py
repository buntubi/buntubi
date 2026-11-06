"""The `appearance` scope: a first-party app reads and changes the person's appearance.

Revision ID: e2b6d9f1a753
Revises: d7a3b9e5c418
Created: 2026-11-06 15:00:00
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e2b6d9f1a753"
down_revision: str | None = "d7a3b9e5c418"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
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
                "name": "appearance",
                "sensitivity": "public",
                "descriptions": {
                    "fr": "Lire et changer votre apparence (style, mode, couleur, coins, transparence, fond)",
                    "en": "Read and change your appearance (style, mode, accent, corners, transparency, backdrop)",
                },
                "resource": "",
                "product": None,
                "notes": "Only first-party apps may use it (web/appearance.py).",
                "created_at": datetime.now(UTC),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM scopes WHERE name = 'appearance'")
