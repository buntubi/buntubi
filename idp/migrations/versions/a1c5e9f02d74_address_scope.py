"""The address scope in the catalogue, beside phone: sensitive, part of the identity product.

Revision ID: a1c5e9f02d74
Revises: f8b2d6a41c39
Created: 2026-10-12 09:00:00
"""

import json
from collections.abc import Sequence

from alembic import op

revision: str = "a1c5e9f02d74"
down_revision: str | None = "f8b2d6a41c39"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DESCRIPTIONS = {"fr": "Voir votre adresse postale", "en": "See your postal address"}


def upgrade() -> None:
    op.execute(
        "insert into scopes (name, sensitivity, descriptions, resource, product, notes, created_at) "
        f"values ('address', 'sensitive', '{json.dumps(DESCRIPTIONS, ensure_ascii=False)}'::jsonb, "
        "'', 'identity', '', now()) on conflict (name) do nothing"
    )


def downgrade() -> None:
    op.execute("delete from scopes where name = 'address' and managed_by is null")
