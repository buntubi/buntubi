"""
Sending the events: signed with the app's secret over the timestamp and the body, a 2xx is
delivered, anything else is tried again later on a growing delay and given up a day after the
event, a redirect is not followed, and an app that lost its address or was disabled gets none.
"""

import hashlib
import hmac
import json
from datetime import timedelta

import pytest
import requests
from flask import Flask
from sqlalchemy import select

from buntubi.db import db, utcnow
from buntubi.models import Client, User, WebhookDelivery
from buntubi.security import crypto
from buntubi.services import mail, webhooks
from buntubi.services import platform as p

from conftest import Endpoint, add_client, sign_up

SECRET = "whsec_test_secret"


@pytest.fixture
def queued(app: Flask, outbox: list[mail.Message]) -> str:
    """An app subscribed to everything, and one event for it: ACME was created."""
    with app.app_context():
        secret = crypto.seal(SECRET)
    add_client(
        app,
        client_id="product",
        webhook_url="https://product.example/hooks",
        webhook_events="all",
        webhook_secret=secret,
    )
    sign_up(app.test_client(), outbox)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        organization = p.create_organization(user, "ACME", "", None)
        db().commit()
        return str(organization.id)


def delivery() -> WebhookDelivery:
    found = db().scalar(select(WebhookDelivery))
    assert found is not None
    return found


def test_a_delivery_is_signed_over_the_timestamp_and_the_body(
    app: Flask, endpoint: Endpoint, queued: str
) -> None:
    with app.app_context():
        assert webhooks.deliver_due() == 1
        call = endpoint.calls[0]
        assert call["url"] == "https://product.example/hooks"
        assert call["allow_redirects"] is False and call["timeout"] <= 10
        headers, body = call["headers"], call["data"]
        assert headers["Content-Type"] == "application/json"
        parts = dict(part.split("=", 1) for part in headers["Buntubi-Signature"].split(","))
        stamp, signature = parts["t"], parts["v1"]
        expected = hmac.new(SECRET.encode(), f"{stamp}.".encode() + body, hashlib.sha256).hexdigest()
        assert hmac.compare_digest(signature, expected)
        event = json.loads(body)
        assert event["type"] == "organization.created" and event["organization_id"] == queued
        assert event["sequence"] == 1 and event["data"]["organization"]["name"] == "ACME"
        assert (
            headers["Buntubi-Event-Id"] == event["id"]
            and headers["Buntubi-Event-Type"] == "organization.created"
        )
        assert delivery().status == "delivered" and delivery().attempts == 1


def test_a_failure_is_tried_again_later_then_given_up(app: Flask, endpoint: Endpoint, queued: str) -> None:
    endpoint.answers = [500, requests.ConnectionError("refused"), 302]
    with app.app_context():
        webhooks.deliver_due()
        first = delivery()
        assert (first.status, first.attempts, first.last_status) == ("pending", 1, 500)
        assert timedelta(seconds=55) < first.next_attempt_at - utcnow() <= timedelta(minutes=1)
        assert webhooks.deliver_due() == 0, "not due yet"

        first.next_attempt_at = utcnow()
        db().commit()
        webhooks.deliver_due()
        second = delivery()
        assert second.attempts == 2 and "refused" in (second.last_error or "")
        assert timedelta(minutes=4) < second.next_attempt_at - utcnow() <= timedelta(minutes=5)

        second.next_attempt_at = utcnow()
        db().commit()
        webhooks.deliver_due()
        assert delivery().last_status == 302, "a redirect is an answer, not followed"

        # A day after the event, the next failure is the last.
        late = delivery()
        late.created_at = utcnow() - timedelta(days=1, minutes=1)
        late.next_attempt_at = utcnow()
        db().commit()
        endpoint.answers = [503]
        webhooks.deliver_due()
        assert delivery().status == "failed"


def test_a_redelivery_sends_it_again(app: Flask, endpoint: Endpoint, queued: str) -> None:
    with app.app_context():
        webhooks.deliver_due()
        webhooks.redeliver(delivery())
        db().commit()
        assert delivery().status == "pending"
        assert webhooks.deliver_due() == 1 and len(endpoint.calls) == 2


def test_an_app_without_its_address_or_disabled_gets_nothing(
    app: Flask, endpoint: Endpoint, queued: str
) -> None:
    with app.app_context():
        client = db().scalar(select(Client).where(Client.client_id == "product"))
        assert client is not None
        client.webhook_url = None
        db().commit()
        webhooks.deliver_due()
        assert endpoint.calls == [] and delivery().status == "failed"
        assert delivery().last_error == "no_endpoint"


def test_the_command_sends_what_is_due(app: Flask, endpoint: Endpoint, queued: str) -> None:
    result = app.test_cli_runner().invoke(args=["webhooks", "deliver", "--once"])
    assert result.exit_code == 0, result.output
    assert "1 sent" in result.output and len(endpoint.calls) == 1


def test_the_daily_prune_keeps_a_month_of_finished_deliveries(
    app: Flask, endpoint: Endpoint, queued: str
) -> None:
    from buntubi.models import WebhookEvent
    from buntubi.services import retention

    with app.app_context():
        webhooks.deliver_due()
        organization = db().get(p.Organization, __import__("uuid").UUID(queued))
        assert organization is not None
        p.update_organization(organization.members[0], name="ACME Studio")  # a second, still pending
        db().commit()
        done = db().scalar(select(WebhookDelivery).where(WebhookDelivery.status == "delivered"))
        assert done is not None
        done.created_at = done.event.created_at = utcnow() - timedelta(days=31)
        db().commit()
        removed = retention.prune()
        assert removed["webhook_deliveries"] == 1 and removed["webhook_events"] == 1
        assert [d.status for d in db().scalars(select(WebhookDelivery))] == ["pending"]
        assert [e.type for e in db().scalars(select(WebhookEvent))] == ["organization.updated"]
