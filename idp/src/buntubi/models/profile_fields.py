"""What a platform asks of the people who sign up, beyond name and email, and how firmly."""

import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from buntubi.db import Base, IdMixin, utcnow

# OpenID Connect profile claims kept as columns on users, under their claim names.
STANDARD_FIELDS = ("birthdate", "gender", "middle_name", "nickname", "website", "zoneinfo")
# hidden: neither asked nor released; optional: in the account area; required: asked at sign-up too.
FIELD_MODES = ("hidden", "optional", "required")
GENDERS = ("female", "male", "other")
# A platform's own fields: what each holds, as platform.toml declares it.
PLATFORM_FIELD_TYPES = ("text", "number", "date", "boolean", "choice", "choices")
# A platform field's key, as the claim and the API name it.
PLATFORM_FIELD_KEY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


class ProfileField(IdMixin, Base):
    """
    A field the platform configured: a standard one (`type` None) or one of its own. A standard
    field without a row is hidden.
    """

    __tablename__ = "profile_fields"

    key: Mapped[str] = mapped_column(String(64), unique=True)
    mode: Mapped[str] = mapped_column(String(10))
    type: Mapped[str | None] = mapped_column(String(10))
    # {"fr": ..., "en": ...}; choices: [{"value": ..., "label": {"fr": ..., "en": ...}}].
    labels: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    choices: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, server_default="[]")
    # Where it shows among the platform's fields: the order platform.toml lists them in.
    position: Mapped[int] = mapped_column(default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)


class ProfileValue(IdMixin, Base):
    """One person's value for one of the platform's own fields."""

    __tablename__ = "profile_values"
    __table_args__ = (UniqueConstraint("user_id", "key"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(40))
    value: Mapped[Any] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
