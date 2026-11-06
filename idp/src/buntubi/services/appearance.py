"""
A person's appearance (fluixi-ui's `AppearanceProvider` axes), kept on their account so it follows
them between the provider and the products. A deployment sets a default per axis and may lock it:
a locked axis ignores the person's choice, which is kept for when the lock is lifted.
"""

import json
import re
from typing import Any

from buntubi.config import SKINS, get_settings
from buntubi.db import db

SCHEMES = ("system", "light", "dark")
CORNERS = ("default", "round")
TRANSPARENCY_PRESETS = ("solid", "medium", "liquid", "ultra")
OPACITY_RANGE = (0.2, 1.0)
AXES = ("skin", "scheme", "accent", "corner", "transparency", "backdrop")
_NAME = re.compile(r"^[a-z][a-z0-9-]{0,31}$")


class AppearanceError(ValueError):
    """A choice the platform does not offer."""


def clean(axis: str, value: Any) -> Any:
    """The value for one axis, or AppearanceError. None clears the person's own choice."""
    if value is None:
        return None
    if axis == "skin" and value in SKINS:
        return value
    if axis == "scheme" and value in SCHEMES:
        return value
    if axis == "corner" and value in CORNERS:
        return value
    if axis in ("accent", "backdrop") and isinstance(value, str) and _NAME.match(value):
        return value
    if axis == "transparency":
        if value in TRANSPARENCY_PRESETS:
            return value
        # An exact opacity; a bool is not a number here.
        if (
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and OPACITY_RANGE[0] <= value <= OPACITY_RANGE[1]
        ):
            return round(float(value), 2)
    raise AppearanceError(f"invalid_{axis}")


def parse_rules(raw: str) -> dict[str, dict[str, Any]]:
    """The deployment's `{axis: {"default": ..., "locked": bool}}`, checked; empty text is none."""
    if not raw.strip():
        return {}
    try:
        rules = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError(f"not JSON: {error}") from error
    if not isinstance(rules, dict):
        raise ValueError("expected an object by axis")
    out: dict[str, dict[str, Any]] = {}
    for axis, rule in rules.items():
        if axis not in AXES or not isinstance(rule, dict) or set(rule) - {"default", "locked"}:
            raise ValueError(f"{axis}: expected one of {', '.join(AXES)}, each with default and locked")
        try:
            default = clean(axis, rule.get("default"))
        except AppearanceError as error:
            raise ValueError(f"{axis}: {error}") from error
        locked = rule.get("locked", False)
        if not isinstance(locked, bool) or (locked and default is None):
            raise ValueError(f"{axis}: a locked axis needs a default")
        out[axis] = {"default": default, "locked": locked}
    return out


def rules() -> dict[str, dict[str, Any]]:
    return parse_rules(get_settings().appearance)


def check(data: dict[str, Any]) -> dict[str, Any]:
    """The axes to store from a request: each known axis checked, a locked one refused."""
    locked = {axis for axis, rule in rules().items() if rule["locked"]}
    out: dict[str, Any] = {}
    for axis, value in data.items():
        if axis not in AXES:
            raise AppearanceError("unknown_axis")
        if axis in locked:
            raise AppearanceError(f"{axis}_locked")
        out[axis] = clean(axis, value)
    return out


def store(user: Any, values: dict[str, Any]) -> bool:
    """Merges `values` into the person's choices (None removes one); whether anything changed."""
    own = dict(user.appearance or {})
    for axis, value in values.items():
        if value is None:
            own.pop(axis, None)
        else:
            own[axis] = value
    changed = own != (user.appearance or {})
    if changed:
        user.appearance = own
        db().flush()
    return changed


def effective(user: Any) -> dict[str, Any]:
    """What applies to the person: a locked axis is the deployment's, else their choice, else the default."""
    own = user.appearance or {}
    out: dict[str, Any] = {}
    for axis in AXES:
        rule = rules().get(axis, {"default": None, "locked": False})
        value = rule["default"] if rule["locked"] else own.get(axis, rule["default"])
        if value is not None:
            out[axis] = value
    return out


def locks() -> list[str]:
    return sorted(axis for axis, rule in rules().items() if rule["locked"])


def state(user: Any) -> dict[str, Any]:
    """What an app or a page shows of the person's appearance: in force, their own, and the locks."""
    return {"appearance": effective(user), "own": dict(user.appearance or {}), "locked": locks()}


def update(user: Any, data: dict[str, Any]) -> dict[str, Any]:
    """Applies a request: checked, stored, and told to the person's organizations when it changed."""
    from buntubi.services import audit, webhooks  # the services import each other through plugins

    if store(user, check(data)):
        audit.record("appearance_updated", user=user)
        webhooks.profile_changed(user)
    return state(user)
