"""
A member's profile in the organization events: a change of name or of a profile field the platform
shows is a `member.updated` event in each of the person's organizations, and only first-party apps
read the profile, in the events and in the app API alike.
"""

import json

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from buntubi.db import db
from buntubi.models import Client, User, WebhookEvent
from buntubi.services import mail, profile_fields, webhooks
from buntubi.services import platform as p

from conftest import add_client, api, sign_up


def test_a_profile_change_is_an_event_in_each_organization_of_the_person(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    with app.app_context():
        profile_fields.set_modes({"zoneinfo": "optional"})
        db().commit()
    csrf = sign_up(browser, outbox)
    with app.app_context():
        awa = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert awa is not None
        acme = p.create_organization(awa, "ACME", "", None)
        globex = p.create_organization(awa, "Globex", "", None)
        db().commit()
        ids = {acme.id, globex.id}

    changed = api(browser, "PATCH", "/api/account/profile", {"zoneinfo": "Africa/Dakar"}, csrf)
    assert changed.status_code == 200, changed.json
    # A change apps hold nothing of (the language) is no event.
    assert api(browser, "PATCH", "/api/account/profile", {"locale": "en"}, csrf).status_code == 200

    with app.app_context():
        updated = db().scalars(select(WebhookEvent).where(WebhookEvent.type == "member.updated")).all()
        assert {event.organization_id for event in updated} == ids
        assert all(event.data["member"]["profile"]["zoneinfo"] == "Africa/Dakar" for event in updated)
        assert updated[0].data["member"]["profile"]["name"]


def test_only_a_first_party_app_reads_a_members_profile(app: Flask, outbox: list[mail.Message]) -> None:
    add_client(app, client_id="own", webhook_url="https://own.example/hooks", first_party=True)
    add_client(app, client_id="other", webhook_url="https://other.example/hooks", first_party=False)
    sign_up(app.test_client(), outbox)
    with app.app_context():
        awa = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert awa is not None
        acme = p.create_organization(awa, "ACME", "", None)
        db().commit()
        event = db().scalar(select(WebhookEvent).where(WebhookEvent.organization_id == acme.id))
        assert event is not None
        clients = {c.client_id: c for c in db().scalars(select(Client))}
        own = json.loads(webhooks.body_of(event, clients["own"]))
        other = json.loads(webhooks.body_of(event, clients["other"]))
        assert "profile" in own["data"]["owner"]
        assert "profile" not in other["data"]["owner"]
        assert {k: v for k, v in own["data"]["owner"].items() if k != "profile"} == other["data"]["owner"]
