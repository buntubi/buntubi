"""Alembic, pointed at the app's metadata and its database URL."""

import os

from alembic import context
from pydantic import ValidationError
from sqlalchemy import create_engine

from buntubi import models  # noqa: F401  (registers every table)
from buntubi.config import get_settings
from buntubi.db import Base

config = context.config


def database_url() -> str:
    """IDP_DATABASE_URL from the environment, else idp/.env as the provider reads it."""
    url = os.environ.get("IDP_DATABASE_URL")
    if url:
        return url
    try:
        return get_settings().database_url
    except ValidationError:
        raise RuntimeError(
            "Set IDP_DATABASE_URL, or the provider's settings in idp/.env, to run migrations."
        ) from None


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
