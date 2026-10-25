"""Deployment-wide settings that platform.toml sets and the provider reads, one row per key."""

from datetime import datetime
from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from buntubi.db import Base, IdMixin, utcnow

# The social providers offered (a list of ids) and whether people may make an account (a bool).
SOCIAL_PROVIDERS_SETTING = "social.providers"
SIGNUP_OPEN_SETTING = "signup.open"


class PlatformSetting(IdMixin, Base):
    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(64), unique=True)
    value: Mapped[Any] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
