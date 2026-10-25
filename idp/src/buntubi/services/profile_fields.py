"""
The profile fields a platform asks for, beyond name and email: which are hidden, optional or
required, and the one check every value goes through, at sign-up and in the account area alike.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any
from urllib.parse import urlsplit
from zoneinfo import available_timezones

from sqlalchemy import select

from buntubi.db import db, utcnow
from buntubi.models import ProfileField, User
from buntubi.models.profile_fields import FIELD_MODES, GENDERS, STANDARD_FIELDS
from buntubi.services.accounts import AccountError

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def modes() -> dict[str, str]:
    """Every standard field and its mode; one the platform never configured is hidden."""
    configured = {row.key: row.mode for row in db().scalars(select(ProfileField))}
    return {key: configured.get(key, "hidden") for key in STANDARD_FIELDS}


def shown() -> dict[str, str]:
    """The fields people see, optional or required, and their mode."""
    return {key: mode for key, mode in modes().items() if mode != "hidden"}


def set_modes(wanted: dict[str, str]) -> list[str]:
    """Stores the modes given, keeping the fields left out as they are. Returns the keys changed."""
    for key, mode in wanted.items():
        if key not in STANDARD_FIELDS:
            raise ValueError(f"unknown profile field {key!r}")
        if mode not in FIELD_MODES:
            raise ValueError(f"{key}: the mode is one of {', '.join(FIELD_MODES)}")
    rows = {row.key: row for row in db().scalars(select(ProfileField))}
    changed: list[str] = []
    for key, mode in wanted.items():
        row = rows.get(key)
        if row is None:
            db().add(ProfileField(key=key, mode=mode, updated_at=utcnow()))
        elif row.mode != mode:
            row.mode = mode
        else:
            continue
        changed.append(key)
    return changed


def clean(key: str, raw: Any) -> str | date | None:
    """The value to store for `key`, None for an empty one. Refused as `invalid_<key>`."""
    if not isinstance(raw, str):
        raise AccountError(f"invalid_{key}")
    value = raw.strip()
    if not value:
        return None
    if key == "birthdate":
        return _birthdate(value)
    if key == "gender" and value in GENDERS:
        return value
    if key in ("middle_name", "nickname") and len(value) <= 80 and not _CONTROL.search(value):
        return value
    if key == "website" and _is_web_address(value):
        return value
    if key == "zoneinfo" and value in available_timezones():
        return value
    raise AccountError(f"invalid_{key}")


def check(data: dict[str, Any], *, signing_up: bool = False) -> dict[str, str | date | None]:
    """
    The values to store for the fields `data` names among the ones shown. A hidden field is
    refused as `unknown_field`; a required one cannot be emptied, and at sign-up must be given
    (`<key>_required`).
    """
    shown_now = shown()
    for key in data:
        if key in STANDARD_FIELDS and key not in shown_now:
            raise AccountError("unknown_field")
    values = {key: clean(key, data[key]) for key in shown_now if key in data}
    for key, mode in shown_now.items():
        given = key in values
        if mode == "required" and (given or signing_up) and values.get(key) is None:
            raise AccountError(f"{key}_required")
    return values


def store(user: User, values: dict[str, str | date | None]) -> None:
    for key, value in values.items():
        setattr(user, key, value)


def values_of(user: User, keys: list[str] | dict[str, str]) -> dict[str, str | None]:
    """The stored values of `keys`, as the API and the claims give them."""
    out: dict[str, str | None] = {}
    for key in keys:
        value = getattr(user, key)
        out[key] = value.isoformat() if isinstance(value, date) else value
    return out


def _birthdate(value: str) -> date:
    if _DATE.match(value):
        try:
            born = date.fromisoformat(value)
        except ValueError:
            pass
        else:
            if date(1900, 1, 1) <= born <= utcnow().date():
                return born
    raise AccountError("invalid_birthdate")


def _is_web_address(value: str) -> bool:
    if len(value) > 500 or _CONTROL.search(value) or " " in value:
        return False
    try:
        parts = urlsplit(value)
    except ValueError:
        return False
    return parts.scheme in ("https", "http") and bool(parts.hostname)
