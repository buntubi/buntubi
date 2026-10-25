"""What a platform asks of the people who sign up, beyond name and email, and how firmly."""

from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from buntubi.db import Base, IdMixin, utcnow

# OpenID Connect profile claims kept as columns on users, under their claim names.
STANDARD_FIELDS = ("birthdate", "gender", "middle_name", "nickname", "website", "zoneinfo")
# hidden: neither asked nor released; optional: in the account area; required: asked at sign-up too.
FIELD_MODES = ("hidden", "optional", "required")
GENDERS = ("female", "male", "other")


class ProfileField(IdMixin, Base):
    """A field the platform configured. A standard field without a row is hidden."""

    __tablename__ = "profile_fields"

    key: Mapped[str] = mapped_column(String(64), unique=True)
    mode: Mapped[str] = mapped_column(String(10))
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
