"""
A person's appearance on their account: checked per axis, a deployment's lock refuses a change to
its axis and wins over the stored choice, and a change is a `member.updated` event for first-party
apps (their organizations hear the person's own choices).
"""

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from buntubi.db import db
from buntubi.models import User, WebhookEvent
from buntubi.services import appearance, mail
from buntubi.services import platform as p

from conftest import api, sign_up


def test_a_person_sets_checks_and_clears_their_choices(
    browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    assert api(browser, "GET", "/api/account/appearance", None, csrf).json["appearance"] == {}
    done = api(
        browser,
        "PATCH",
        "/api/account/appearance",
        {"skin": "glass", "transparency": 0.5, "corner": "round", "backdrop": "tahoe"},
        csrf,
    )
    assert done.status_code == 200
    assert done.json["appearance"] == {
        "skin": "glass",
        "corner": "round",
        "transparency": 0.5,
        "backdrop": "tahoe",
    }
    for bad in (
        {"skin": "neon"},
        {"transparency": 0.05},
        {"transparency": True},
        {"corner": "sharp"},
        {"colour": "red"},
    ):
        assert api(browser, "PATCH", "/api/account/appearance", bad, csrf).status_code == 400, bad
    cleared = api(browser, "PATCH", "/api/account/appearance", {"transparency": None}, csrf)
    assert "transparency" not in cleared.json["appearance"]


def test_a_locked_axis_is_the_deployments_and_cannot_be_changed(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], monkeypatch: pytest.MonkeyPatch
) -> None:
    csrf = sign_up(browser, outbox)
    api(browser, "PATCH", "/api/account/appearance", {"corner": "default", "skin": "paper"}, csrf)
    monkeypatch.setattr(
        appearance,
        "rules",
        lambda: {
            "corner": {"default": "round", "locked": True},
            "skin": {"default": "soft", "locked": False},
        },
    )
    got = api(browser, "GET", "/api/account/appearance", None, csrf).json
    # The lock wins over what the person stored, which is kept.
    assert got["appearance"] == {"corner": "round", "skin": "paper"}
    assert got["own"]["corner"] == "default" and got["locked"] == ["corner"]
    refused = api(browser, "PATCH", "/api/account/appearance", {"corner": "default"}, csrf)
    assert refused.status_code == 400


def test_the_deployment_setting_is_checked() -> None:
    ok = appearance.parse_rules(
        '{"corner": {"default": "round", "locked": true}, "backdrop": {"default": "tahoe"}}'
    )
    assert ok["corner"] == {"default": "round", "locked": True}
    for bad in (
        '{"corner": {"locked": true}}',
        '{"corner": {"default": "sharp"}}',
        '{"size": {}}',
        "[]",
        "{",
    ):
        with pytest.raises(ValueError):
            appearance.parse_rules(bad)


def test_a_change_is_an_event_in_each_organization_with_the_choices(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    with app.app_context():
        awa = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert awa is not None
        acme = p.create_organization(awa, "ACME", "", None)
        db().commit()
        acme_id = acme.id
    assert api(browser, "PATCH", "/api/account/appearance", {"skin": "glass"}, csrf).status_code == 200
    # The same choices again change nothing: no second event.
    api(browser, "PATCH", "/api/account/appearance", {"skin": "glass"}, csrf)
    with app.app_context():
        updated = (
            db()
            .scalars(
                select(WebhookEvent).where(
                    WebhookEvent.organization_id == acme_id, WebhookEvent.type == "member.updated"
                )
            )
            .all()
        )
        assert len(updated) == 1
        assert updated[0].data["member"]["profile"]["appearance"] == {"skin": "glass"}
