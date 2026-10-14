"""Client secrets and API keys: issued once, kept hashed, rotated without a gap."""

from datetime import timedelta

from flask import Flask

from buntubi.db import db, utcnow
from buntubi.models import ApiKey, Client, Organization, OrganizationMember, Scope, User
from buntubi.services.credentials import (
    find_api_key,
    issue_api_key,
    issue_client_secret,
    rotate_client_secret,
)


def make_client(app: Flask) -> Client:
    client = Client(client_id="srv", name="Server", client_type="confidential", redirect_uris=[])
    db().add(client)
    return client


def test_a_rotated_secret_keeps_working_for_the_grace_period(app: Flask) -> None:
    with app.app_context():
        client = make_client(app)
        first = issue_client_secret(client)
        assert first.startswith("cs_") and client.secrets[0].prefix == first[:10]
        assert client.secrets[0].secret_hash != first, "kept hashed"
        second = rotate_client_secret(client)
        assert client.check_client_secret(first) and client.check_client_secret(second)

        old = next(s for s in client.secrets if s.expires_at is not None)
        old.expires_at = utcnow() - timedelta(seconds=1)
        assert not client.check_client_secret(first)
        assert client.check_client_secret(second)
        db().rollback()


def test_a_revoked_secret_stops_at_once(app: Flask) -> None:
    with app.app_context():
        client = make_client(app)
        secret = issue_client_secret(client)
        client.secrets[0].revoked_at = utcnow()
        assert not client.check_client_secret(secret)
        db().rollback()


def test_api_keys_name_their_environment_and_are_found_by_hash(app: Flask) -> None:
    with app.app_context():
        owner = User(email="dev@example.test")
        db().add(owner)
        db().flush()
        organization = Organization(name="Shop", members=[OrganizationMember(user_id=owner.id, role="owner")])
        db().add(organization)
        db().flush()
        row, key = issue_api_key(organization, "sandbox", "CI", ["read"], owner.id)
        live_row, live_key = issue_api_key(organization, "live", "Prod", [], owner.id)
        db().flush()
        assert key.startswith("sk_test_") and live_key.startswith("sk_live_")
        assert row.prefix == key[:14] and row.key_hash != key
        found = find_api_key(key)
        assert found is not None and found.id == row.id
        assert find_api_key(key + "x") is None
        assert find_api_key("cs_" + key[8:]) is None, "wrong prefix never reaches the database"
        live_row.revoked_at = utcnow()
        assert find_api_key(live_key) is None
        db().rollback()


def test_the_scope_catalog_is_seeded(app: Flask) -> None:
    with app.app_context():
        scopes = {s.name: s.sensitivity for s in db().query(Scope)}
        assert scopes["openid"] == "public" and scopes["admin"] == "restricted"
        assert scopes["developer"] == "restricted"
        assert db().query(ApiKey).count() == 0
