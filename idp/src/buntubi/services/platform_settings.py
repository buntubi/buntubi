"""The deployment-wide settings platform.toml sets: which social providers, whether sign-up is open."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select

from buntubi.db import db, utcnow
from buntubi.models import PlatformSetting
from buntubi.models.settings import SIGNUP_OPEN_SETTING, SOCIAL_PROVIDERS_SETTING, TERMS_VERSION_SETTING


def get(key: str, default: Any) -> Any:
    row = db().scalar(select(PlatformSetting).where(PlatformSetting.key == key))
    return default if row is None else row.value


def put(key: str, value: Any) -> bool:
    """Stores `value`; False when it was already that."""
    row = db().scalar(select(PlatformSetting).where(PlatformSetting.key == key))
    if row is None:
        db().add(PlatformSetting(key=key, value=value, updated_at=utcnow()))
        return True
    if row.value == value:
        return False
    row.value = value
    return True


def social_providers() -> list[str]:
    """The provider ids the deployment offers, in its order; none until it lists some."""
    value = get(SOCIAL_PROVIDERS_SETTING, [])
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def signup_open() -> bool:
    """Open unless the deployment closed it."""
    return get(SIGNUP_OPEN_SETTING, True) is not False


def terms_version() -> str | None:
    value = get(TERMS_VERSION_SETTING, None)
    return value if isinstance(value, str) and value else None
