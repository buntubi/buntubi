"""
A product's own server reads the organizations it hears of with its credentials, to repair its
copy: shaped as in the events, with the latest event number. A person's token reads nothing here.
"""

from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_flows import basic
from test_organizations_api import BOTH, bearer

from buntubi.db import db
from buntubi.models import Client, ClientSecret, User
from buntubi.security.tokens import hash_token
from buntubi.services import mail, webhooks
from buntubi.services import platform as p

from conftest import add_client, sign_up

SECRET = "a-long-random-test-secret"


def add_app(client_id: str, *, first_party: bool = True, webhook_events: str = "linked") -> None:
    db().add(
        Client(
            client_id=client_id,
            name=client_id,
            first_party=first_party,
            client_type="confidential",
            environment="live",
            secrets=[ClientSecret(secret_hash=hash_token(f"{SECRET}-{client_id}"), prefix=client_id[:10])],
            redirect_uris=[],
            grant_types=["client_credentials"],
            scope="organizations:read",
            token_endpoint_auth_method="client_secret_basic",
            webhook_events=webhook_events,
        )
    )


def as_app(browser: FlaskClient, client_id: str, path: str) -> Any:
    token = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "scope": "organizations:read"},
        headers=basic(client_id, f"{SECRET}-{client_id}"),
    )
    assert token.status_code == 200, token.json
    return browser.get(path, headers={"Authorization": f"Bearer {token.json['access_token']}"})


@pytest.fixture
def setup(app: Flask, outbox: list[mail.Message]) -> dict[str, str]:
    """Awa owns ACME, where Omar is a member, and Initech. The sync app works with ACME only."""
    sign_up(app.test_client(), outbox)
    sign_up(app.test_client(), outbox, email="omar@example.test")
    with app.app_context():
        awa = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert awa is not None
        acme = p.create_organization(awa, "ACME", "", None)
        initech = p.create_organization(awa, "Initech", "", None)
        p.add_member(acme.members[0], "omar@example.test", "member", None, [])
        add_app("sync")
        add_app("outsider", first_party=False)
        add_app("everything", webhook_events="all")
        db().flush()
        for client_id, organization in (("sync", acme), ("outsider", initech)):
            client = db().scalar(select(Client).where(Client.client_id == client_id))
            assert client is not None
            webhooks.link(client.id, organization.id)
        db().commit()
        return {"acme": str(acme.id), "initech": str(initech.id)}


def test_an_app_reads_the_organizations_it_hears_of(browser: FlaskClient, setup: dict[str, str]) -> None:
    listed = as_app(browser, "sync", "/v1/app/organizations")
    assert listed.status_code == 200, listed.json
    assert listed.json["items"] == [{"id": setup["acme"], "name": "ACME", "suspended": False, "sequence": 2}]

    one = as_app(browser, "sync", f"/v1/app/organizations/{setup['acme']}").json
    assert one["organization"] == {"id": setup["acme"], "name": "ACME", "suspended": False}
    assert [(m["email"], m["role"]) for m in one["members"]] == [
        ("awa@example.test", "owner"),
        ("omar@example.test", "member"),
    ]
    assert set(one["members"][0]) == {"id", "user_id", "email", "role"}
    assert one["sequence"] == 2


def test_an_organization_the_app_does_not_hear_of_does_not_exist(
    browser: FlaskClient, setup: dict[str, str]
) -> None:
    assert as_app(browser, "sync", f"/v1/app/organizations/{setup['initech']}").status_code == 404
    assert as_app(browser, "sync", "/v1/app/organizations/not-an-id").status_code == 404
    # Linked, but no one there let a third-party app act for them.
    assert as_app(browser, "outsider", "/v1/app/organizations").json["items"] == []


def test_an_app_subscribed_to_all_reads_all(browser: FlaskClient, setup: dict[str, str]) -> None:
    names = [o["name"] for o in as_app(browser, "everything", "/v1/app/organizations").json["items"]]
    assert names == ["ACME", "Initech"]


def test_a_persons_token_reads_nothing_here(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, scope=BOTH, first_party=True)
    token = bearer(browser, sign_up(browser, outbox))
    assert browser.get("/v1/app/organizations", headers=token).status_code == 403
