"""A postal address on each person, in the parts of the OIDC address claim.

Revision ID: e7a3c9d14b52
Revises: d4f1b8e2a693
Created: 2026-10-11 20:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e7a3c9d14b52"
down_revision: str | None = "d4f1b8e2a693"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TEXT = (
    ("address_street", 300),
    ("address_locality", 100),
    ("address_region", 100),
    ("address_postal_code", 20),
)


def upgrade() -> None:
    for name, length in _TEXT:
        op.add_column("users", sa.Column(name, sa.String(length), nullable=False, server_default=""))
    op.add_column("users", sa.Column("address_country", sa.String(2), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "address_country")
    for name, _ in reversed(_TEXT):
        op.drop_column("users", name)
