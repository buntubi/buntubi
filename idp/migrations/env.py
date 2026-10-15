"""Alembic, pointed at the app's metadata and its database URL."""

import os

from alembic import context
from sqlalchemy import create_engine

from buntubi import models  # noqa: F401  (registers every table)
from buntubi.db import Base

config = context.config


def database_url() -> str:
    url = os.environ.get("IDP_DATABASE_URL")
    if not url:
        raise RuntimeError("Set IDP_DATABASE_URL to run migrations.")
    return url


def run() -> None:
    if context.is_offline_mode():
        context.configure(
            url=database_url(), target_metadata=Base.metadata, literal_binds=True, compare_type=True
        )
        with context.begin_transaction():
            context.run_migrations()
        return
    engine = create_engine(database_url())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


run()
