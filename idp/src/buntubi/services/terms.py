"""
The platform's terms: which version people must accept, whether an account has, recording it.
Asked only when the deployment sets a version and has a terms address to show.
"""

from __future__ import annotations

from typing import Any

from buntubi.config import get_settings
from buntubi.db import utcnow
from buntubi.models import User
from buntubi.services import audit, platform_settings
from buntubi.services.accounts import AccountError


def current() -> dict[str, str] | None:
    """The version to accept and where to read it; None when nobody is asked."""
    version = platform_settings.terms_version()
    url = get_settings().brand_terms_url
    return {"version": version, "url": url} if version and url else None


def needed(user: User) -> bool:
    """Whether this account has yet to accept the current version."""
    wanted = current()
    return wanted is not None and user.terms_version != wanted["version"]


def check(data: dict[str, Any]) -> str | None:
    """The version accepted in a form (`accept_terms: true`), refused as `terms_required` without it."""
    wanted = current()
    if wanted is None:
        return None
    if data.get("accept_terms") is not True:
        raise AccountError("terms_required")
    return wanted["version"]


def record(user: User, version: str | None) -> None:
    if version is None:
        return
    user.terms_version, user.terms_accepted_at = version, utcnow()
    audit.record("terms_accepted", user=user, version=version)
