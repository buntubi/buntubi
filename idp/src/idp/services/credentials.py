"""
Issuing what lets software in: client secrets and API keys. Each is random, prefixed so a leaked
one is recognisable (`cs_`, `sk_test_`, `sk_live_`), stored as a SHA-256 hash, and returned in
full exactly once.
"""

import uuid
from datetime import timedelta

from sqlalchemy import select

from idp.db import db, utcnow
from idp.models import ApiKey, Client, ClientSecret, Project
from idp.security.tokens import hash_token, new_token

# After a rotation the previous secret keeps working this long, so deployments can catch up.
ROTATION_GRACE = timedelta(hours=24)
KEY_PREFIX = {"sandbox": "sk_test_", "live": "sk_live_"}


def issue_client_secret(client: Client) -> str:
    secret = f"cs_{new_token()}"
    client.secrets.append(ClientSecret(secret_hash=hash_token(secret), prefix=secret[:10]))
    return secret


def rotate_client_secret(client: Client) -> str:
    """A new secret; the active ones expire after the grace period, or sooner if already set."""
    now = utcnow()
    for secret in client.secrets:
        if secret.is_active(now):
            secret.expires_at = min(secret.expires_at or now + ROTATION_GRACE, now + ROTATION_GRACE)
    return issue_client_secret(client)


def issue_api_key(
    project: Project, environment: str, name: str, scopes: list[str], created_by: uuid.UUID | None
) -> tuple[ApiKey, str]:
    key = f"{KEY_PREFIX[environment]}{new_token()}"
    row = ApiKey(
        project_id=project.id,
        environment=environment,
        name=name,
        key_hash=hash_token(key),
        prefix=key[: len(KEY_PREFIX[environment]) + 6],
        scopes=scopes,
        created_by_id=created_by,
    )
    db().add(row)
    return row, key


def find_api_key(key: str) -> ApiKey | None:
    """The active key this string is, if any."""
    if not key.startswith(tuple(KEY_PREFIX.values())):
        return None
    row = db().scalar(select(ApiKey).where(ApiKey.key_hash == hash_token(key)))
    return row if row is not None and row.is_active(utcnow()) else None
