"""
First install, from a deployment's `platform.toml`: the platform organization, the platform's own
apps, and the catalogue its plugins declare. The superadmin is made by `flask admin create`.

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
from buntubi.services import audit
from buntubi.services import platform as p
from buntubi.services.credentials import issue_client_secret, rotate_client_secret


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
    secret: SecretTarget | None = None


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
        secret=target,
    )


def apply(specs: list[AppSpec], *, rotate_secrets: bool = False) -> SetupReport:
    """Creates the platform organization and the apps it lacks. Commits."""
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
            if rotate_secrets and spec.secret is not None:
                secret = rotate_client_secret(client)
        if secret is not None and spec.secret is not None:
            write_env(spec.secret.file, spec.secret.key, secret)
            report.secrets.append(f"{spec.client_id} -> {spec.secret.file.name}:{spec.secret.key}")
    db().commit()
    return report


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
