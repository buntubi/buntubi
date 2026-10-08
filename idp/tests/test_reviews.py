"""An app's reviews: what each submission asked and why, the answer, and the history they leave."""

from flask import Flask
from flask.testing import FlaskClient
from test_console_api import admin_call, setup_people
from test_developer_api import LIVE_FIELDS, call

from idp.services import mail


def sensitive_app(dev_browser: FlaskClient, dev: dict[str, str]) -> str:
    organization = call(
        dev_browser, dev, "POST", "/organizations", {"name": "Shop", "support_email": "help@shop.example"}
    )
    organization_id = organization.json["organization"]["id"]
    return str(
        call(
            dev_browser,
            dev,
            "POST",
            f"/organizations/{organization_id}/apps",
            {
                "name": "Web",
                "redirect_uris": ["https://shop.example/cb"],
                "scopes": ["profile", "phone"],
                **LIVE_FIELDS,
            },
        ).json["app"]["client_id"]
    )


def test_a_submission_explains_each_sensitive_scope_and_can_be_updated(
    app: Flask, outbox: list[mail.Message]
) -> None:
    _, _, dev_browser, dev = setup_people(app, outbox)
    client_id = sensitive_app(dev_browser, dev)
    publish = f"/apps/{client_id}/publish"

    blank = call(dev_browser, dev, "POST", publish, {"justifications": {"phone": "  "}})
    assert blank.status_code == 422 and blank.json == {"error": "justification_required", "scopes": ["phone"]}

    body = {
        "justifications": {"phone": "Reminders before a session", "email": "ignored"},
        "instructions": "Log in as test@shop.example",
    }
    assert call(dev_browser, dev, "POST", publish, body).json["state"] == "pending"
    again = {"justifications": {"phone": "SMS reminders the day before"}}
    assert call(dev_browser, dev, "POST", publish, again).json["state"] == "pending"

    history = call(dev_browser, dev, "GET", f"/apps/{client_id}/reviews").json["items"]
    assert len(history) == 1, "a submission sent again while pending updates it"
    review = history[0]
    assert review["scopes"] == ["phone"] and review["justifications"] == {
        "phone": "SMS reminders the day before"
    }
    assert review["decision"] == "pending" and review["submitted_by"]["email"] == "dev@example.test"
    assert "decided_by" not in review


def test_the_answer_is_kept_and_a_rejected_app_can_try_again(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    client_id = sensitive_app(dev_browser, dev)
    explained = {"justifications": {"phone": "Reminders"}, "instructions": "Use the demo account"}
    call(dev_browser, dev, "POST", f"/apps/{client_id}/publish", explained)

    detail = admin_call(owner_browser, owner, "GET", f"/apps/{client_id}/review").json["app"]
    assert detail["history"][0]["instructions"] == "Use the demo account"
    rejected = admin_call(
        owner_browser,
        owner,
        "POST",
        f"/apps/{client_id}/review",
        {"approve": False, "note": "Show the reminder screen"},
    )
    assert rejected.status_code == 200
    assert (
        admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": True}).status_code
        == 409
    )

    call(
        dev_browser,
        dev,
        "POST",
        f"/apps/{client_id}/publish",
        {"justifications": {"phone": "Reminders, see screen 3"}},
    )
    admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": True})

    history = call(dev_browser, dev, "GET", f"/apps/{client_id}/reviews").json["items"]
    assert [(r["decision"], r["note"]) for r in history] == [
        ("approved", ""),
        ("rejected", "Show the reminder screen"),
    ]
    assert all(r["decided_at"] for r in history) and all("decided_by" not in r for r in history)
    staff = admin_call(owner_browser, owner, "GET", f"/apps/{client_id}/review").json["app"]["history"]
    assert staff[0]["decided_by"] is not None
    assert call(dev_browser, dev, "GET", f"/apps/{client_id}").json["app"]["environment"] == "live"
