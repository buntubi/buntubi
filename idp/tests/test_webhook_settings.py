"""
An app's webhook: its address and signing secret through the developer API (the secret shown
once, at creation and at each rotation), its delivery log, and the platform file for the
platform's own apps. A public provider takes no address an outside app could point inward.
"""

from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_developer_api import call, developer_token, new_organization

from buntubi.config import Settings
from buntubi.db import db
from buntubi.models import Client, WebhookDelivery
from buntubi.security import crypto
from buntubi.services import mail, webhooks

from conftest import Endpoint

HOOK = "https://shop.example/hooks"


def new_app(browser: FlaskClient, bearer: dict[str, str], **extra: Any) -> Any:
    organization_id = new_organization(browser, bearer)
    return call(
        browser,
        bearer,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://shop.example/cb"], **extra},
    )


@pytest.fixture
def dev(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> dict[str, str]:
    bearer = developer_token(app, browser, outbox, "dev@example.test")
    assert call(browser, bearer, "POST", "/terms").json == {"developer": True}
    return bearer


@pytest.fixture
def public(monkeypatch: pytest.MonkeyPatch) -> None:
    """A provider on the internet, not on this machine."""
    monkeypatch.setattr(Settings, "local", property(lambda self: False))


def test_the_secret_is_made_with_the_address_and_shown_once(
    app: Flask, browser: FlaskClient, dev: dict[str, str]
) -> None:
    created = new_app(browser, dev, webhook_url=HOOK)
    assert created.status_code == 201, created.json
    app_json = created.json["app"]
    assert app_json["webhook_url"] == HOOK and app_json["webhook_events"] == "linked"
    secret = created.json["webhook_secret"]
    assert secret.startswith("whsec_")
    client_id = app_json["client_id"]
    again = call(browser, dev, "GET", f"/apps/{client_id}").json
    assert "webhook_secret" not in again and secret not in str(again)

    rotated = call(browser, dev, "POST", f"/apps/{client_id}/webhook-secret")
    assert rotated.status_code == 200 and rotated.json["webhook_secret"] not in ("", secret)
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == client_id))
        assert client is not None and client.webhook_secret is not None
        assert crypto.unseal(client.webhook_secret) == rotated.json["webhook_secret"]

    removed = call(browser, dev, "PATCH", f"/apps/{client_id}", {"webhook_url": None})
    assert removed.json["app"]["webhook_url"] is None
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == client_id))
        assert client is not None and client.webhook_secret is None, "no address, no secret kept"


def test_an_app_cannot_ask_for_every_organization(browser: FlaskClient, dev: dict[str, str]) -> None:
    created = new_app(browser, dev, webhook_url=HOOK)
    client_id = created.json["app"]["client_id"]
    refused = call(browser, dev, "PATCH", f"/apps/{client_id}", {"webhook_events": "all"})
    assert refused.status_code == 422


@pytest.mark.parametrize(
    "address",
    [
        "http://shop.example/hooks",
        "https://localhost/hooks",
        "https://127.0.0.1/hooks",
        "https://10.0.0.5/hooks",
        "https://[::1]/hooks",
        "https://169.254.169.254/latest",
        "https://user:pw@shop.example/hooks",
        "https://shop.example/hooks#part",
        "https://metadata.internal/hooks",
    ],
)
def test_a_public_provider_refuses_an_address_pointing_inward(
    browser: FlaskClient, dev: dict[str, str], public: None, address: str
) -> None:
    assert new_app(browser, dev, webhook_url=address).status_code == 422, address


def test_on_this_machine_a_local_address_is_fine(browser: FlaskClient, dev: dict[str, str]) -> None:
    created = new_app(browser, dev, webhook_url="http://localhost:3300/hooks")
    assert created.status_code == 201, created.json


def test_a_name_that_resolves_inward_is_not_sent_to(
    app: Flask,
    browser: FlaskClient,
    dev: dict[str, str],
    endpoint: Endpoint,
    public: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created = new_app(browser, dev, webhook_url=HOOK)
    client_id = created.json["app"]["client_id"]
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == client_id))
        assert client is not None
        client.webhook_events = "all"
        db().commit()
        organization_id = client.organization_id
        assert organization_id is not None
        webhooks.emit(organization_id, webhooks.Event.ORGANIZATION_UPDATED, {})
        db().commit()
    monkeypatch.setattr(webhooks, "_addresses", lambda host: ["10.1.2.3"])
    with app.app_context():
        webhooks.deliver_due()
        delivery = db().scalar(select(WebhookDelivery))
        assert delivery is not None and delivery.last_error == "address_not_allowed"
    assert endpoint.calls == []


def test_the_delivery_log_and_a_redelivery(
    app: Flask,
    browser: FlaskClient,
    dev: dict[str, str],
    endpoint: Endpoint,
) -> None:
    created = new_app(browser, dev, webhook_url=HOOK)
    client_id = created.json["app"]["client_id"]
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == client_id))
        assert client is not None and client.organization_id is not None
        client.webhook_events = "all"
        db().commit()
        webhooks.emit(client.organization_id, webhooks.Event.ORGANIZATION_UPDATED, {})
        db().commit()
    endpoint.answers = [500]
    with app.app_context():
        webhooks.deliver_due()
    log = call(browser, dev, "GET", f"/apps/{client_id}/webhook-deliveries").json["items"]
    assert [(d["event_type"], d["status"], d["last_status"], d["attempts"]) for d in log] == [
        ("organization.updated", "pending", 500, 1)
    ]
    again = call(browser, dev, "POST", f"/apps/{client_id}/webhook-deliveries/{log[0]['id']}/redeliver")
    assert again.status_code == 200 and again.json["delivery"]["status"] == "pending"


def test_the_platform_file_sets_a_products_webhook(app: Flask, tmp_path: Path) -> None:
    from test_setup import superadmin

    superadmin(app)
    env = tmp_path / "product.env"
    env.write_text("WEBHOOK_SECRET=\n")
    (tmp_path / "platform.toml").write_text(
        """
[[apps]]
client_id = "product"
name = "Product"
redirect_uris = ["https://product.example/cb"]
webhook_url = "https://product.example/hooks"
webhook_events = "all"
webhook_secret = { file = "product.env", key = "WEBHOOK_SECRET" }
"""
    )
    result = app.test_cli_runner().invoke(
        args=["platform", "setup", "--file", str(tmp_path / "platform.toml")]
    )
    assert result.exit_code == 0, result.output
    written = env.read_text().split("WEBHOOK_SECRET=")[1].strip()
    assert written.startswith("whsec_") and written not in result.output
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == "product"))
        assert client is not None and client.webhook_events == "all" and client.webhook_secret is not None
        assert crypto.unseal(client.webhook_secret) == written
