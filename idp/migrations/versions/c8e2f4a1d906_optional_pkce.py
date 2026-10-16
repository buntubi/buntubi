"""PKCE is optional for confidential clients: an authorization code may have no challenge.

Revision ID: c8e2f4a1d906
Revises: b6e1d0c4f357
Created: 2026-10-16 09:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8e2f4a1d906"
down_revision: str | None = "b6e1d0c4f357"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("authorization_codes", "code_challenge", existing_type=sa.String(128), nullable=True)
    op.alter_column("authorization_codes", "code_challenge_method", existing_type=sa.String(10), nullable=True)


def downgrade() -> None:
    # Codes live minutes: the ones without a challenge are dropped rather than given a false one.
    op.execute("DELETE FROM authorization_codes WHERE code_challenge IS NULL")
    op.alter_column("authorization_codes", "code_challenge_method", existing_type=sa.String(10), nullable=False)
    op.alter_column("authorization_codes", "code_challenge", existing_type=sa.String(128), nullable=False)
