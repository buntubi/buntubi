"""The database: one engine per app, one session per request, closed when the request ends."""

import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime

from flask import Flask, g
from sqlalchemy import DateTime, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.types import Uuid

# Stable constraint names, so Alembic migrations name the same constraint the same way everywhere.
NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)
    type_annotation_map = {datetime: DateTime(timezone=True), uuid.UUID: Uuid}


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)


_factory: sessionmaker[Session] | None = None


def init_db(app: Flask, url: str) -> None:
    global _factory
    engine = create_engine(url, pool_pre_ping=True)
    _factory = sessionmaker(engine, expire_on_commit=False)
    app.extensions["buntubi.engine"] = engine

    @app.teardown_appcontext
    def _close(_exc: BaseException | None) -> None:
        session = g.pop("db_session", None)
        if session is not None:
            session.close()


def db() -> Session:
    """This request's session."""
    if "db_session" not in g:
        if _factory is None:
            raise RuntimeError("init_db() has not run")
        g.db_session = _factory()
    session: Session = g.db_session
    return session


@contextmanager
def transaction() -> Iterator[Session]:
    """Commits on success, rolls back on any error."""
    session = db()
    try:
        yield session
        session.commit()
    except BaseException:
        session.rollback()
        raise
