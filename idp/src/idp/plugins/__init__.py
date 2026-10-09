"""
Plugins: what a company that deploys the provider brings of its own. API products and scopes,
claims in its tokens, refusals, go-live checks, reactions to events, its own API, and what the
console and the developer portal show for it.

A plugin subclasses `Plugin`, overriding only the hooks it needs, and is published under the
entry point group `idp.plugins`. `IDP_PLUGINS` names the ones a deployment runs, in order. They
run in process: the operator installs them, so they are trusted code, and a hook in token
issuance is a call rather than a network round trip.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from importlib.metadata import entry_points
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from flask import Blueprint

    from idp.models import Client, User

log = logging.getLogger(__name__)

ENTRY_POINT_GROUP = "idp.plugins"

# Claims a plugin may not set: the provider decides who, for whom, and until when.
REGISTERED_CLAIMS = frozenset(
    {
        "iss",
        "sub",
        "aud",
        "exp",
        "iat",
        "nbf",
        "jti",
        "scope",
        "client_id",
        "azp",
        "env",
        "auth_time",
        "amr",
        "sid",
    }
)


@dataclass(frozen=True)
class Localized:
    fr: str
    en: str

    def as_dict(self) -> dict[str, str]:
        return {"fr": self.fr, "en": self.en}


@dataclass(frozen=True)
class Product:
    """An API developers add to their apps."""

    slug: str
    names: Localized
    descriptions: Localized
    # The API's identifier: an access token holding one of its scopes is minted for it (`aud`).
    resource: str
    category: str = ""
    # How it is called: `oauth2`, `oidc`, `api_key` (server to server), `webhooks`.
    auth: tuple[str, ...] = ("oauth2",)
    availability: str = "ga"
    docs_url: str | None = None
    position: int = 0


@dataclass(frozen=True)
class ScopeSpec:
    """A permission, with the words the consent screen shows for it."""

    name: str
    descriptions: Localized
    sensitivity: str = "public"
    # The product it belongs to; its API comes from there.
    product: str | None = None
    notes: str = ""


@dataclass(frozen=True)
class Catalogue:
    products: tuple[Product, ...] = ()
    scopes: tuple[ScopeSpec, ...] = ()


@dataclass(frozen=True)
class LiveCheck:
    """A line a plugin adds to an app's way to live."""

    key: str
    label: Localized
    # `done`, `warn` (needs attention) or `todo`.
    state: str
    items: list[str] = field(default_factory=list)
    # Publishing refuses while it is not done.
    required: bool = False


class Plugin:
    """Every hook is a no-op; a plugin overrides what it contributes."""

    #: Stable, short, lowercase: rows it manages carry it, and its API is mounted under it.
    id: str = ""
    version: str = "0"

    def catalogue(self) -> Catalogue:
        return Catalogue()

    def token_claims(self, client: Client, user: User | None, scopes: list[str]) -> dict[str, Any]:
        return {}

    def scope_refusal(self, client: Client, scopes: list[str]) -> str | None:
        """A reason to refuse giving these scopes to this app, or None."""
        return None

    def live_checks(self, client: Client) -> list[LiveCheck]:
        return []

    def on_event(self, name: str, payload: dict[str, Any]) -> None:
        return None

    def blueprint(self) -> Blueprint | None:
        """The plugin's own API, mounted at `/api/plugins/<id>/`."""
        return None

    def ui(self) -> dict[str, Any]:
        """What the console and the portal show for it; free-form, read by their UI plugins."""
        return {}


_active: list[Plugin] = []


def load(names: list[str]) -> list[Plugin]:
    """The plugins `names` asks for, from the installed entry points. An unknown name is an error."""
    found = {point.name: point for point in entry_points(group=ENTRY_POINT_GROUP)}
    plugins: list[Plugin] = []
    for name in names:
        point = found.get(name)
        if point is None:
            raise RuntimeError(f"plugin {name!r} is not installed (entry point group {ENTRY_POINT_GROUP!r})")
        made = point.load()
        plugin = made() if isinstance(made, type) else made
        if not isinstance(plugin, Plugin):
            raise RuntimeError(f"plugin {name!r} is not an idp.plugins.Plugin")
        if plugin.id != name:
            raise RuntimeError(f"plugin {name!r} calls itself {plugin.id!r}")
        plugins.append(plugin)
    return plugins


def use(plugins: list[Plugin]) -> None:
    """The plugins this process runs. Set once, at start."""
    _active[:] = plugins


def active() -> list[Plugin]:
    return list(_active)


def token_claims(client: Client, user: User | None, scopes: list[str]) -> dict[str, Any]:
    """Every plugin's claims, in order; a registered claim is dropped and logged."""
    claims: dict[str, Any] = {}
    for plugin in _active:
        for key, value in plugin.token_claims(client, user, scopes).items():
            if key in REGISTERED_CLAIMS:
                log.warning("plugin %s tried to set the registered claim %s", plugin.id, key)
                continue
            claims[key] = value
    return claims


def scope_refusal(client: Client, scopes: list[str]) -> str | None:
    """The first refusal any plugin gives."""
    for plugin in _active:
        reason = plugin.scope_refusal(client, scopes)
        if reason:
            return reason
    return None


def live_checks(client: Client) -> list[LiveCheck]:
    return [check for plugin in _active for check in plugin.live_checks(client)]


def emit(name: str, payload: dict[str, Any]) -> None:
    """Tell every plugin. A failing listener is logged and does not stop the others."""
    for plugin in _active:
        try:
            plugin.on_event(name, payload)
        except Exception:
            log.exception("plugin %s failed on %s", plugin.id, name)
