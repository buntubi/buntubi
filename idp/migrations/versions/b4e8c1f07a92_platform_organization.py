"""The platform organization: the platform's own apps belong to an organization like any other.

Every client without one moves into it, live, and every admin becomes one of its owners.

Revision ID: b4e8c1f07a92
Revises: a9d3f6c21e58
Created: 2026-10-10 10:00:00
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b4e8c1f07a92"
down_revision: str | None = "a9d3f6c21e58"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizations", sa.Column("is_platform", sa.Boolean(), server_default="false", nullable=False)
    )
    # One platform organization at most.
    op.create_index(
        "uq_organizations_platform",
        "organizations",
        ["is_platform"],
        unique=True,
        postgresql_where=sa.text("is_platform"),
    )
    bind = op.get_bind()
    orphans = bind.execute(sa.text("select count(*) from clients where organization_id is null")).scalar()
    if not orphans:
        return
    platform = uuid.uuid4()
    bind.execute(
        sa.text(
            "insert into organizations"
            " (id, name, description, is_platform, approved_scopes, created_at, updated_at)"
            " values (:id, 'Platform', 'The platform''s own apps.', true, '{}', now(), now())"
        ),
        {"id": platform},
    )
    bind.execute(
        sa.text(
            "insert into organization_members (id, organization_id, user_id, role, app_ids, added_at)"
            " select gen_random_uuid(), :org, id, 'owner', '{}', now() from users where 'admin' = any(roles)"
        ),
        {"org": platform},
    )
    bind.execute(
        sa.text(
            "update clients set organization_id = :org, environment = 'live' where organization_id is null"
        ),
        {"org": platform},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "update clients set organization_id = null"
            " where organization_id in (select id from organizations where is_platform)"
        )
    )
    bind.execute(sa.text("delete from organizations where is_platform"))
    op.drop_index("uq_organizations_platform", table_name="organizations")
    op.drop_column("organizations", "is_platform")
