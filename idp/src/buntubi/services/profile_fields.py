"""
The profile fields a platform asks for, beyond name and email: the standard OpenID Connect ones
and its own. Which are hidden, optional or required, and the one check every value goes through,
at sign-up, at the sign-in that asks for a missing one, and in the account area alike.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import date
from typing import Any
from urllib.parse import urlsplit
from zoneinfo import available_timezones

from sqlalchemy import select

from buntubi import plugins
from buntubi.db import db, utcnow
from buntubi.models import Client, ProfileField, ProfileValue, User
from buntubi.models.profile_fields import FIELD_MODES, GENDERS, STANDARD_FIELDS
from buntubi.services.accounts import AccountError

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def modes() -> dict[str, str]:
    """Every standard field and its mode; one the platform never configured is hidden."""
    configured = {
        row.key: row.mode for row in db().scalars(select(ProfileField).where(ProfileField.type.is_(None)))
    }
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


# ── The platform's own fields ──────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class PlatformField:
    key: str
    type: str
    mode: str
    labels: dict[str, str]
    choices: tuple[dict[str, Any], ...] = ()

    def as_json(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "type": self.type,
            "mode": self.mode,
            "label": self.labels,
            "choices": list(self.choices),
        }


def platform_fields() -> list[PlatformField]:
    """The platform's own fields people see, in the order platform.toml lists them."""
    rows = db().scalars(
        select(ProfileField)
        .where(ProfileField.type.is_not(None), ProfileField.mode != "hidden")
        .order_by(ProfileField.position)
    )
    return [PlatformField(r.key, str(r.type), r.mode, dict(r.labels), tuple(r.choices)) for r in rows]


def set_platform_fields(fields: list[PlatformField]) -> list[str]:
    """
    Stores the fields platform.toml declares, in its order. One it no longer lists keeps its row
    and its values, hidden. Returns the keys changed.
    """
    rows = {r.key: r for r in db().scalars(select(ProfileField).where(ProfileField.type.is_not(None)))}
    changed: list[str] = []
    for position, field in enumerate(fields):
        row = rows.pop(field.key, None)
        wanted = {
            "mode": field.mode,
            "type": field.type,
            "labels": dict(field.labels),
            "choices": list(field.choices),
            "position": position,
        }
        if row is None:
            db().add(ProfileField(key=field.key, updated_at=utcnow(), **wanted))
        elif any(getattr(row, name) != value for name, value in wanted.items()):
            for name, value in wanted.items():
                setattr(row, name, value)
        else:
            continue
        changed.append(field.key)
    for row in rows.values():
        if row.mode != "hidden":
            row.mode = "hidden"
            changed.append(row.key)
    return changed


def clean_platform(field: PlatformField, raw: Any) -> Any:
    """The value to store, None for an empty one. Refused as `invalid_<key>`."""
    if raw is None or raw == "" or raw == []:
        return None
    if field.type == "text" and isinstance(raw, str):
        value = raw.strip()
        if len(value) <= 500 and not _CONTROL.search(value):
            return value or None
    elif field.type == "number" and isinstance(raw, int | float) and not isinstance(raw, bool):
        if math.isfinite(raw):
            return raw
    elif field.type == "date" and isinstance(raw, str) and _DATE.match(raw.strip()):
        try:
            return date.fromisoformat(raw.strip()).isoformat()
        except ValueError:
            pass
    elif (field.type == "boolean" and isinstance(raw, bool)) or (
        field.type == "choice" and isinstance(raw, str) and raw in _choice_values(field)
    ):
        return raw
    elif field.type == "choices" and isinstance(raw, list) and all(isinstance(v, str) for v in raw):
        allowed = _choice_values(field)
        if set(raw) <= set(allowed):
            return [value for value in allowed if value in raw]
    raise AccountError(f"invalid_{field.key}")


def check_platform(data: dict[str, Any], *, user: User | None, signing_up: bool = False) -> dict[str, Any]:
    """
    The values to store for the platform fields `data` names. A field not shown is refused as
    `unknown_field`; a required one cannot be emptied, and at sign-up must be given. A plugin may
    refuse a value with its own code (`Plugin.profile_field_refusal`).
    """
    fields = {field.key: field for field in platform_fields()}
    for key in data:
        if key not in fields:
            raise AccountError("unknown_field")
    values = {key: clean_platform(fields[key], raw) for key, raw in data.items()}
    for key, value in values.items():
        if value is not None and (refusal := plugins.profile_field_refusal(user, key, value)):
            raise AccountError(refusal)
    for key, field in fields.items():
        given = key in values
        if field.mode == "required" and (given or signing_up) and values.get(key) is None:
            raise AccountError(f"{key}_required")
    return values


def store_platform(user: User, values: dict[str, Any]) -> None:
    """Sets the values given; None removes one. The user must have an id (flushed)."""
    if not values:
        return
    rows = {r.key: r for r in db().scalars(select(ProfileValue).where(ProfileValue.user_id == user.id))}
    for key, value in values.items():
        row = rows.get(key)
        if value is None:
            if row is not None:
                db().delete(row)
        elif row is None:
            db().add(ProfileValue(user_id=user.id, key=key, value=value, updated_at=utcnow()))
        else:
            row.value = value


def platform_values(user: User) -> dict[str, Any]:
    """The person's values for the platform fields people see, as the API and the claim give them."""
    shown_keys = [field.key for field in platform_fields()]
    if not shown_keys:
        return {}
    rows = db().scalars(
        select(ProfileValue).where(ProfileValue.user_id == user.id, ProfileValue.key.in_(shown_keys))
    )
    found = {row.key: row.value for row in rows}
    return {key: found[key] for key in shown_keys if key in found}


def missing_required(user: User, client: Client | None = None) -> list[str]:
    """
    The fields this account has no value for, among those the platform requires and, with
    `client`, those that app needs. A field the platform does not show is never asked.
    """
    needed = set(client.required_fields) if client is not None else set()
    standard = [
        key
        for key, mode in shown().items()
        if (mode == "required" or key in needed) and getattr(user, key) is None
    ]
    have = platform_values(user)
    own = [
        field.key
        for field in platform_fields()
        if (field.mode == "required" or field.key in needed) and field.key not in have
    ]
    return standard + own


def offered() -> list[dict[str, Any]]:
    """The fields an app can ask for: every one the platform shows, the platform's with their labels."""
    return [{"key": key, "label": None} for key in shown()] + [
        {"key": field.key, "label": field.labels} for field in platform_fields()
    ]


def _choice_values(field: PlatformField) -> list[str]:
    return [
        str(choice["value"]) for choice in field.choices if isinstance(choice, dict) and "value" in choice
    ]
