"""Developer platform: projects, client environments and review, client secrets, API keys,
test users, the scope catalog.

Revision ID: 5e1cf5f40f19
Revises: 7af1b6125886
Created: 2026-10-06 15:41:34.131486
"""
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '5e1cf5f40f19'
down_revision: str | None = '7af1b6125886'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('scopes',
    sa.Column('name', sa.String(length=64), nullable=False),
    sa.Column('sensitivity', sa.String(length=12), nullable=False),
    sa.Column('descriptions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('resource', sa.String(length=64), nullable=False),
    sa.Column('notes', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('name', name=op.f('pk_scopes'))
    )
    op.create_table('projects',
    sa.Column('owner_id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('support_email', sa.String(length=320), nullable=True),
    sa.Column('suspended_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('suspended_reason', sa.String(length=500), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name=op.f('fk_projects_owner_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_projects'))
    )
    op.create_index(op.f('ix_projects_owner_id'), 'projects', ['owner_id'], unique=False)
    op.create_table('api_keys',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('environment', sa.String(length=8), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('key_hash', sa.String(length=64), nullable=False),
    sa.Column('prefix', sa.String(length=20), nullable=False),
    sa.Column('scopes', postgresql.ARRAY(sa.String(length=64)), nullable=False),
    sa.Column('allowed_ips', postgresql.ARRAY(sa.String(length=43)), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_api_keys_created_by_id_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_api_keys_project_id_projects'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_api_keys')),
    sa.UniqueConstraint('key_hash', name=op.f('uq_api_keys_key_hash'))
    )
    op.create_index(op.f('ix_api_keys_project_id'), 'api_keys', ['project_id'], unique=False)
    op.create_table('project_test_users',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('added_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_project_test_users_project_id_projects'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_project_test_users')),
    sa.UniqueConstraint('project_id', 'email', name=op.f('uq_project_test_users_project_id'))
    )
    op.create_index(op.f('ix_project_test_users_project_id'), 'project_test_users', ['project_id'], unique=False)
    op.create_table('client_secrets',
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('secret_hash', sa.String(length=64), nullable=False),
    sa.Column('prefix', sa.String(length=12), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_client_secrets_client_id_clients'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_client_secrets')),
    sa.UniqueConstraint('secret_hash', name=op.f('uq_client_secrets_secret_hash'))
    )
    op.create_index(op.f('ix_client_secrets_client_id'), 'client_secrets', ['client_id'], unique=False)
    op.add_column('clients', sa.Column('project_id', sa.Uuid(), nullable=True))
    op.add_column('clients', sa.Column('environment', sa.String(length=8), server_default='live', nullable=False))
    op.add_column('clients', sa.Column('review_status', sa.String(length=10), server_default='none', nullable=False))
    op.add_column('clients', sa.Column('review_note', sa.String(length=1000), server_default='', nullable=False))
    op.add_column('clients', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('clients', sa.Column('reviewed_by_id', sa.Uuid(), nullable=True))
    op.add_column('clients', sa.Column('homepage_url', sa.String(length=2048), nullable=True))
    op.add_column('clients', sa.Column('privacy_url', sa.String(length=2048), nullable=True))
    op.add_column('clients', sa.Column('terms_url', sa.String(length=2048), nullable=True))
    op.create_index(op.f('ix_clients_project_id'), 'clients', ['project_id'], unique=False)
    op.create_foreign_key(op.f('fk_clients_project_id_projects'), 'clients', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(op.f('fk_clients_reviewed_by_id_users'), 'clients', 'users', ['reviewed_by_id'], ['id'], ondelete='SET NULL')
    # Each existing secret becomes the client's first row in client_secrets.
    op.execute(
        "insert into client_secrets (id, client_id, secret_hash, prefix, created_at) "
        "select gen_random_uuid(), id, secret_hash, '', now() from clients where secret_hash is not null"
    )
    op.drop_column('clients', 'secret_hash')
    op.add_column('users', sa.Column('developer_since', sa.DateTime(timezone=True), nullable=True))
    seed_scopes()


SCOPES = [
    ("openid", "public", "Vous identifier", "Know who you are"),
    ("profile", "public", "Voir votre nom et votre photo", "See your name and picture"),
    ("email", "public", "Voir votre adresse e-mail", "See your email address"),
    ("phone", "sensitive", "Voir votre numéro de téléphone", "See your phone number"),
    ("offline_access", "public", "Rester connecté quand vous n’utilisez pas l’application",
     "Stay signed in while you are not using the app"),
    ("admin", "restricted", "Administrer le fournisseur d’identité", "Administer the identity provider"),
    ("developer", "restricted", "Gérer vos projets de développeur", "Manage your developer projects"),
]


def seed_scopes() -> None:
    table = sa.table(
        'scopes',
        sa.column('name', sa.String),
        sa.column('sensitivity', sa.String),
        sa.column('descriptions', postgresql.JSONB),
        sa.column('resource', sa.String),
        sa.column('notes', sa.Text),
        sa.column('created_at', sa.DateTime(timezone=True)),
    )
    now = datetime.now(UTC)
    op.bulk_insert(table, [
        {"name": name, "sensitivity": sensitivity, "descriptions": {"fr": fr, "en": en},
         "resource": "", "notes": "", "created_at": now}
        for name, sensitivity, fr, en in SCOPES
    ])


def downgrade() -> None:
    op.drop_column('users', 'developer_since')
    op.add_column('clients', sa.Column('secret_hash', sa.VARCHAR(length=64), autoincrement=False, nullable=True))
    # Back to one secret per client: the newest active one.
    op.execute(
        "update clients set secret_hash = s.secret_hash from ("
        " select distinct on (client_id) client_id, secret_hash from client_secrets"
        " where revoked_at is null order by client_id, created_at desc"
        ") s where s.client_id = clients.id"
    )
    op.drop_constraint(op.f('fk_clients_reviewed_by_id_users'), 'clients', type_='foreignkey')
    op.drop_constraint(op.f('fk_clients_project_id_projects'), 'clients', type_='foreignkey')
    op.drop_index(op.f('ix_clients_project_id'), table_name='clients')
    op.drop_column('clients', 'terms_url')
    op.drop_column('clients', 'privacy_url')
    op.drop_column('clients', 'homepage_url')
    op.drop_column('clients', 'reviewed_by_id')
    op.drop_column('clients', 'reviewed_at')
    op.drop_column('clients', 'review_note')
    op.drop_column('clients', 'review_status')
    op.drop_column('clients', 'environment')
    op.drop_column('clients', 'project_id')
    op.drop_index(op.f('ix_client_secrets_client_id'), table_name='client_secrets')
    op.drop_table('client_secrets')
    op.drop_index(op.f('ix_project_test_users_project_id'), table_name='project_test_users')
    op.drop_table('project_test_users')
    op.drop_index(op.f('ix_api_keys_project_id'), table_name='api_keys')
    op.drop_table('api_keys')
    op.drop_index(op.f('ix_projects_owner_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_table('scopes')
