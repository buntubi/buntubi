"""
First install, from a deployment's `platform.toml`: the platform organization, the platform's own
apps, the profile fields it asks for, and the catalogue its plugins declare. The superadmin is
made by `flask admin create`.

Running it again adds what is missing and leaves the rest alone: an app changed in the console
or the portal keeps its changes. A new confidential app's secret goes into the env file the
entry names, never to the terminal.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy import select

from buntubi.db import db
from buntubi.models import Client
from buntubi.models.clients import GRANT_TYPES
from buntubi.models.profile_fields import FIELD_MODES, STANDARD_FIELDS
from buntubi.models.settings import SIGNUP_OPEN_SETTING, SOCIAL_PROVIDERS_SETTING
from buntubi.plugins import SLUG
from buntubi.services import audit, platform_settings, profile_fields, webhooks
from buntubi.services import platform as p
from buntubi.services.credentials import issue_client_secret, rotate_client_secret
from buntubi.social import SOCIAL_PROVIDERS


class SetupError(ValueError):
    pass


@dataclass(frozen=True)
class SecretTarget:
    file: Path
    key: str


@dataclass(frozen=True)
class AppSpec:
    client_id: str
    name: str
    client_type: str = "confidential"
    redirect_uris: tuple[str, ...] = ()
    post_logout_redirect_uris: tuple[str, ...] = ()
    grant_types: tuple[str, ...] = ("authorization_code", "refresh_token")
    scope: str = "openid profile email"
    first_party: bool = True
    homepage_url: str | None = None
    backchannel_logout_uri: str | None = None
    # "none", "optional" or "required": whether its tokens name an organization (models/clients.py).
    # Left out, the app keeps what it has.
    organization_usage: str | None = None
    # Where its organization events go, which ("linked" or "all"), and where its signing secret
    # is written. The file wins for what it names, as for the back-channel address.
    webhook_url: str | None = None
    webhook_events: str | None = None
    webhook_secret: SecretTarget | None = None
    secret: SecretTarget | None = None
    # The sign-in look of a mounted UI plugin, kept in the app's brand. Left out, it keeps its own.
    look: str | None = None
    # Which of the deployment's social providers its sign-in offers (None: every one), and whether
    # it lets people make an account. Left out, the app keeps what it has.
    social_providers: tuple[str, ...] | None = None
    signup_open: bool | None = None
    # Which of `STATED` the file names: those win on an app that exists, the rest stay as they are.
    stated: frozenset[str] = frozenset()


# Settings the file restates on every run; the name stays as a screen left it.
STATED = ("redirect_uris", "post_logout_redirect_uris", "grant_types", "scope", "homepage_url")


@dataclass
class SetupReport:
    created: list[str] = field(default_factory=list)
    kept: list[str] = field(default_factory=list)
    secrets: list[str] = field(default_factory=list)


def read(path: Path) -> list[AppSpec]:
    """The apps a platform file declares. Secret files are relative to it."""
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    specs: list[AppSpec] = []
    for index, entry in enumerate(data.get("apps", [])):
        specs.append(_spec(entry, path.parent, f"apps[{index}]"))
    ids = [spec.client_id for spec in specs]
    if len(ids) != len(set(ids)):
        raise SetupError("two apps share a client_id")
    return specs


def read_profile(path: Path) -> dict[str, str]:
    """The profile field modes the file's `[profile]` table sets, one key per field."""
    with path.open("rb") as handle:
        table = tomllib.load(handle).get("profile", {})
    if not isinstance(table, dict):
        raise SetupError('profile is a table: [profile] then birthdate = "optional"')
    for key, mode in table.items():
        if key not in STANDARD_FIELDS:
            raise SetupError(f"profile.{key}: not a profile field ({', '.join(STANDARD_FIELDS)})")
        if mode not in FIELD_MODES:
            raise SetupError(f"profile.{key}: the mode is {', '.join(FIELD_MODES)}")
    return dict(table)


@dataclass(frozen=True)
class Access:
    """`[social]` and `[signup]`: the providers offered and whether sign-up is open."""

    social_providers: tuple[str, ...] | None = None
    signup_open: bool | None = None


def read_access(path: Path) -> Access:
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    social_table, signup_table = data.get("social", {}), data.get("signup", {})
    if not isinstance(social_table, dict) or not isinstance(signup_table, dict):
        raise SetupError("social and signup are tables: [social] providers = [...], [signup] open = true")
    providers = social_table.get("providers")
    if providers is not None:
        providers = _providers(providers, "social.providers")
    open_ = signup_table.get("open")
    if open_ is not None and not isinstance(open_, bool):
        raise SetupError("signup.open is true or false")
    return Access(providers, open_)


def apply_access(access: Access) -> list[str]:
    """Stores what the file names; what it leaves out keeps its value. Commits."""
    changed = []
    if access.social_providers is not None and platform_settings.put(
        SOCIAL_PROVIDERS_SETTING, list(access.social_providers)
    ):
        changed.append("social.providers")
    if access.signup_open is not None and platform_settings.put(SIGNUP_OPEN_SETTING, access.signup_open):
        changed.append("signup.open")
    if changed:
        audit.record("platform.access_changed", settings=changed)
    db().commit()
    return changed


def _providers(value: Any, where: str) -> tuple[str, ...]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise SetupError(f"{where} is a list of provider ids")
    unknown = [item for item in value if item not in SOCIAL_PROVIDERS]
    if unknown:
        raise SetupError(f"{where}: unknown providers {unknown} ({', '.join(SOCIAL_PROVIDERS)})")
    return tuple(value)


def apply_profile(wanted: dict[str, str]) -> list[str]:
    """Stores the modes the file names; the fields it leaves out keep theirs. Commits."""
    changed = profile_fields.set_modes(wanted)
    if changed:
        audit.record("platform.profile_fields_changed", fields={key: wanted[key] for key in changed})
    db().commit()
    return changed


def _spec(entry: dict[str, Any], base: Path, where: str) -> AppSpec:
    for required in ("client_id", "name"):
        if not isinstance(entry.get(required), str) or not entry[required]:
            raise SetupError(f"{where}: {required} is required")
    client_type = entry.get("type", "confidential")
    if client_type not in ("public", "confidential"):
        raise SetupError(f"{where}: type is public or confidential")
    grants = tuple(entry.get("grant_types", ("authorization_code", "refresh_token")))
    unknown = [grant for grant in grants if grant not in GRANT_TYPES]
    if unknown:
        raise SetupError(f"{where}: unknown grant types {unknown}")
    usage = entry.get("organization_usage")
    if usage not in (None, "none", "optional", "required"):
        raise SetupError(f"{where}: organization_usage is none, optional or required")
    webhook_events = entry.get("webhook_events")
    if webhook_events not in (None, "linked", "all"):
        raise SetupError(f"{where}: webhook_events is linked or all")
    webhook_secret = entry.get("webhook_secret")
    webhook_target = None
    if webhook_secret is not None:
        if not (
            isinstance(webhook_secret, dict) and webhook_secret.get("file") and webhook_secret.get("key")
        ):
            raise SetupError(f"{where}: webhook_secret = {{ file = ..., key = ... }}")
        if not entry.get("webhook_url"):
            raise SetupError(f"{where}: a webhook secret needs a webhook_url")
        webhook_target = SecretTarget((base / webhook_secret["file"]).resolve(), webhook_secret["key"])
    look = entry.get("look")
    if look is not None and not (isinstance(look, str) and SLUG.match(look)):
        raise SetupError(f"{where}: look is a lowercase slug, the name a UI plugin gives it")
    social_providers = entry.get("social_providers")
    if social_providers is not None:
        social_providers = _providers(social_providers, f"{where}: social_providers")
    signup_open = entry.get("signup")
    if signup_open is not None and not isinstance(signup_open, bool):
        raise SetupError(f"{where}: signup is true or false")
    secret = entry.get("secret")
    target = None
    if secret is not None:
        if client_type != "confidential":
            raise SetupError(f"{where}: a public app has no secret")
        if not (isinstance(secret, dict) and secret.get("file") and secret.get("key")):
            raise SetupError(f"{where}: secret = {{ file = ..., key = ... }}")
        target = SecretTarget((base / secret["file"]).resolve(), secret["key"])
    return AppSpec(
        client_id=entry["client_id"],
        name=entry["name"],
        client_type=client_type,
        redirect_uris=tuple(entry.get("redirect_uris", ())),
        post_logout_redirect_uris=tuple(entry.get("post_logout_redirect_uris", ())),
        grant_types=grants,
        scope=entry.get("scope", "openid profile email"),
        first_party=bool(entry.get("first_party", True)),
        homepage_url=entry.get("homepage_url"),
        backchannel_logout_uri=entry.get("backchannel_logout_uri"),
        organization_usage=usage,
        webhook_url=entry.get("webhook_url"),
        webhook_events=webhook_events,
        webhook_secret=webhook_target,
        secret=target,
        stated=frozenset(key for key in STATED if key in entry),
        look=look,
        social_providers=social_providers,
        signup_open=signup_open,
    )


def apply(
    specs: list[AppSpec], *, rotate_secrets: bool = False, rotate: frozenset[str] = frozenset()
) -> SetupReport:
    """
    Creates the platform organization and the apps it lacks, and brings the others to what the
    file says. New secrets for every app with `rotate_secrets`, for those named in `rotate`
    otherwise. Commits.
    """
    unknown = rotate - {spec.client_id for spec in specs}
    if unknown:
        raise SetupError(f"not in the file: {', '.join(sorted(unknown))}")
    report = SetupReport()
    organization = p.platform_organization()
    for spec in specs:
        client = db().scalar(select(Client).where(Client.client_id == spec.client_id))
        secret: str | None = None
        if client is None:
            confidential = spec.client_type == "confidential"
            client = Client(
                client_id=spec.client_id,
                name=spec.name,
                client_type=spec.client_type,
                organization=organization,
                environment="live",
                redirect_uris=list(spec.redirect_uris),
                post_logout_redirect_uris=list(spec.post_logout_redirect_uris),
                grant_types=list(spec.grant_types),
                scope=spec.scope,
                token_endpoint_auth_method="client_secret_basic" if confidential else "none",
                first_party=spec.first_party,
                homepage_url=spec.homepage_url,
                backchannel_logout_uri=spec.backchannel_logout_uri,
                organization_usage=spec.organization_usage or "none",
                social_providers=list(spec.social_providers) if spec.social_providers is not None else None,
                signup_open=spec.signup_open is not False,
            )
            db().add(client)
            secret = issue_client_secret(client) if confidential else None
            db().flush()
            audit.record("platform.app_created", client=client, source="setup")
            report.created.append(spec.client_id)
        else:
            report.kept.append(spec.client_id)
            # Where the app hears of logouts is the deployment's to say, so the file wins.
            if spec.backchannel_logout_uri and client.backchannel_logout_uri != spec.backchannel_logout_uri:
                client.backchannel_logout_uri = spec.backchannel_logout_uri
            if spec.organization_usage is not None:
                client.organization_usage = spec.organization_usage
            if spec.social_providers is not None:
                client.social_providers = list(spec.social_providers)
            if spec.signup_open is not None:
                client.signup_open = spec.signup_open
            for key in spec.stated:
                value = getattr(spec, key)
                setattr(client, key, list(value) if isinstance(value, tuple) else value)
            if (rotate_secrets or spec.client_id in rotate) and spec.secret is not None:
                secret = rotate_client_secret(client)
        if secret is not None and spec.secret is not None:
            write_env(spec.secret.file, spec.secret.key, secret)
            report.secrets.append(f"{spec.client_id} -> {spec.secret.file.name}:{spec.secret.key}")
        if spec.look is not None:
            client.brand = {**(client.brand or {}), "look": spec.look}
        _apply_webhook(client, spec, rotate_secrets or spec.client_id in rotate, report)
    db().commit()
    return report


def _apply_webhook(client: Client, spec: AppSpec, rotate_secrets: bool, report: SetupReport) -> None:
    """The webhook the file names; its secret is made once (or rotated) and written to its file."""
    if spec.webhook_url is not None:
        client.webhook_url = spec.webhook_url
    if spec.webhook_events is not None:
        client.webhook_events = spec.webhook_events
    if spec.webhook_secret is None or client.webhook_url is None:
        return
    if client.webhook_secret is None or rotate_secrets:
        secret = webhooks.set_secret(client)
        write_env(spec.webhook_secret.file, spec.webhook_secret.key, secret)
        report.secrets.append(
            f"{spec.client_id} webhook -> {spec.webhook_secret.file.name}:{spec.webhook_secret.key}"
        )


def write_env(file: Path, key: str, value: str) -> None:
    """Sets `key` in a dotenv file, replacing its line or adding one; a new file is private."""
    lines = file.read_text().splitlines() if file.exists() else []
    line = f"{key}={value}"
    for index, existing in enumerate(lines):
        if existing.split("=", 1)[0].strip() == key:
            lines[index] = line
            break
    else:
        lines.append(line)
    fresh = not file.exists()
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text("\n".join(lines) + "\n")
    if fresh:
        os.chmod(file, 0o600)
