"""Organizations replace projects; members with roles replace the single owner.

Revision ID: c3d81f0a5e27
Revises: b51b57ac0269
Created: 2026-10-07 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3d81f0a5e27"
down_revision: str | None = "b51b57ac0269"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, old name, new name) for every constraint and index that names a project.
RENAMED = [
    ("organizations", "pk_projects", "pk_organizations"),
    ("organization_test_users", "pk_project_test_users", "pk_organization_test_users"),
    (
        "organization_test_users",
        "uq_project_test_users_project_id",
        "uq_organization_test_users_organization_id",
    ),
    (
        "organization_test_users",
        "fk_project_test_users_project_id_projects",
        "fk_organization_test_users_organization_id_organizations",
    ),
    ("api_keys", "fk_api_keys_project_id_projects", "fk_api_keys_organization_id_organizations"),
    ("clients", "fk_clients_project_id_projects", "fk_clients_organization_id_organizations"),
]
INDEXES = [
    ("ix_project_test_users_project_id", "ix_organization_test_users_organization_id"),
    ("ix_api_keys_project_id", "ix_api_keys_organization_id"),
    ("ix_clients_project_id", "ix_clients_organization_id"),
]
DEVELOPER_SCOPE = (
    '{"fr": "Gérer vos organisations de développeur", "en": "Manage your developer organizations"}',
    '{"fr": "Gérer vos projets de développeur", "en": "Manage your developer projects"}',
)


def upgrade() -> None:
    op.rename_table("projects", "organizations")
    op.rename_table("project_test_users", "organization_test_users")
    for table in ("organization_test_users", "api_keys", "clients"):
        op.alter_column(table, "project_id", new_column_name="organization_id")
    for table, old, new in RENAMED:
        op.execute(f"alter table {table} rename constraint {old} to {new}")
    for old, new in INDEXES:
        op.execute(f"alter index {old} rename to {new}")

    op.create_table(
        "organization_members",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=12), nullable=False),
        sa.Column("app_ids", postgresql.ARRAY(sa.Uuid()), server_default="{}", nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_organization_members_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_organization_members_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organization_members")),
        sa.UniqueConstraint(
            "organization_id", "user_id", name=op.f("uq_organization_members_organization_id")
        ),
    )
    op.create_index(
        op.f("ix_organization_members_organization_id"),
        "organization_members",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_members_user_id"), "organization_members", ["user_id"], unique=False
    )
    op.execute(
        "insert into organization_members (id, organization_id, user_id, role, added_at)"
        " select gen_random_uuid(), id, owner_id, 'owner', created_at from organizations"
    )
    op.drop_index("ix_projects_owner_id", table_name="organizations")
    op.drop_constraint("fk_projects_owner_id_users", "organizations", type_="foreignkey")
    op.drop_column("organizations", "owner_id")
    op.execute(f"update scopes set descriptions = '{DEVELOPER_SCOPE[0]}' where name = 'developer'")


def downgrade() -> None:
    op.execute(f"update scopes set descriptions = '{DEVELOPER_SCOPE[1]}' where name = 'developer'")
    op.add_column("organizations", sa.Column("owner_id", sa.Uuid(), nullable=True))
    op.execute(
        "update organizations o set owner_id = ("
        " select user_id from organization_members m"
        " where m.organization_id = o.id and m.role = 'owner' order by m.added_at limit 1)"
    )
    op.execute("delete from organizations where owner_id is null")
    op.alter_column("organizations", "owner_id", nullable=False)
    op.create_foreign_key(
        "fk_projects_owner_id_users", "organizations", "users", ["owner_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_projects_owner_id", "organizations", ["owner_id"], unique=False)
    op.drop_index(op.f("ix_organization_members_user_id"), table_name="organization_members")
    op.drop_index(op.f("ix_organization_members_organization_id"), table_name="organization_members")
    op.drop_table("organization_members")

    for old, new in INDEXES:
        op.execute(f"alter index {new} rename to {old}")
    for table, old, new in RENAMED:
        op.execute(f"alter table {table} rename constraint {new} to {old}")
    for table in ("organization_test_users", "api_keys", "clients"):
        op.alter_column(table, "organization_id", new_column_name="project_id")
    op.rename_table("organization_test_users", "project_test_users")
    op.rename_table("organizations", "projects")
