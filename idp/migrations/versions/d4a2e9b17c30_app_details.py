"""App details: what is being built, a description, a category and its platforms.

Revision ID: d4a2e9b17c30
Revises: c3d81f0a5e27
Created: 2026-10-07 14:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'd4a2e9b17c30'
down_revision: str | None = 'c3d81f0a5e27'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('kind', sa.String(length=16), server_default='web', nullable=False))
    op.add_column('clients', sa.Column('description', sa.String(length=500), server_default='', nullable=False))
    op.add_column('clients', sa.Column('category', sa.String(length=40), server_default='', nullable=False))
    op.add_column('clients', sa.Column('platforms', postgresql.ARRAY(sa.String(length=16)), server_default='{}', nullable=False))


def downgrade() -> None:
    op.drop_column('clients', 'platforms')
    op.drop_column('clients', 'category')
    op.drop_column('clients', 'description')
    op.drop_column('clients', 'kind')
