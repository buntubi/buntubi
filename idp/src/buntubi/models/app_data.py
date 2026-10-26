"""What an app keeps about a person for itself: one free JSON object per app and person."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from buntubi.db import Base, IdMixin, utcnow


class AppUserData(IdMixin, Base):
    """Read and written by the app only, through the API; gone with the app or the account."""

    __tablename__ = "app_user_data"
    __table_args__ = (UniqueConstraint("client_id", "user_id"),)

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
