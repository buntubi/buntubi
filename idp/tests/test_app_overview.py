"""An app's details and its way to live: stage, checklist, and where each scope stands."""

from typing import Any

from flask import Flask
from test_console_api import admin_call, setup_people
from test_developer_api import LIVE_FIELDS, call, new_organization

from idp.services import mail


def states(overview: dict[str, Any]) -> dict[str, str]:
    return {check["key"]: check["state"] for check in overview["checks"]}


def test_details_are_kept_and_the_checklist_follows_the_app(app: Flask, outbox: list[mail.Message]) -> None:
    _, _, browser, dev = setup_people(app, outbox)
    organization_id = new_organization(browser, dev)
    created = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {
            "name": "Atelier",
            "kind": "consumer",
            "category": "Productivity",
            "platforms": ["web", "ios", "web"],
            "redirect_uris": ["https://atelier.example/cb"],
            "scopes": ["profile"],
        },
    ).json["app"]
    assert (created["kind"], created["category"], created["platforms"]) == (
        "consumer",
        "Productivity",
        ["ios", "web"],
    )
    assert (
        call(
            browser, dev, "POST", f"/organizations/{organization_id}/apps", {"name": "x", "kind": "toaster"}
        ).status_code
        == 422
    )
    client_id = created["client_id"]

    first = call(browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert first["stage"] == "draft"
    assert states(first) == {
        "basic_info": "todo",
        "redirect_uri": "done",
        "policies": "todo",
        "support_email": "todo",
        "permissions": "done",
        "review": "todo",
    }
    checks = {check["key"]: check for check in first["checks"]}
    assert checks["basic_info"]["items"] == ["description", "logo"] and not checks["basic_info"]["required"]
    assert (
        checks["policies"]["items"] == ["homepage_url", "privacy_url", "terms_url"]
        and checks["policies"]["required"]
    )
    assert first["scopes"] == {"live": [], "waiting": [], "sandbox": ["openid", "profile"]}

    call(
        browser, dev, "PATCH", f"/organizations/{organization_id}", {"support_email": "help@atelier.example"}
    )
    call(
        browser,
        dev,
        "PATCH",
        f"/apps/{client_id}",
        {"description": "Book a session", **LIVE_FIELDS},
    )
    call(browser, dev, "POST", f"/apps/{client_id}/publish")
    live = call(browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert live["stage"] == "live" and set(states(live).values()) == {"done"}
    assert live["scopes"]["live"] == ["openid", "profile"]


def test_a_sensitive_scope_shows_as_waiting_until_reviewed(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    organization_id = new_organization(dev_browser, dev, support_email="help@shop.example")
    client_id = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://shop.example/cb"], "scopes": ["phone"], **LIVE_FIELDS},
    ).json["app"]["client_id"]
    call(dev_browser, dev, "POST", f"/apps/{client_id}/publish")

    waiting = call(dev_browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert waiting["stage"] == "in_review" and waiting["scopes"]["waiting"] == ["phone"]
    assert states(waiting)["permissions"] == "warn" and states(waiting)["review"] == "warn"

    admin_call(
        owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": False, "note": "Why phone?"}
    )
    rejected = call(dev_browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert rejected["stage"] == "changes_requested"
    assert next(c for c in rejected["checks"] if c["key"] == "review")["items"] == ["rejected"]
