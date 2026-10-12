"""What a review approves: one app's sensitive scopes, and the hosts its redirect addresses were
on. Another app of the same organization is reviewed for itself; a reviewed app that moves its
sign-in to a new host goes back to review."""

from typing import Any

from flask import Flask
from test_console_api import admin_call, app_waiting_for_review, setup_people
from test_developer_api import LIVE_FIELDS, call

from idp.services import mail


def _approved(app: Flask, outbox: list[mail.Message]) -> tuple[Any, ...]:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    organization_id, client_id = app_waiting_for_review(dev_browser, dev, ["billing.write"])
    approved = admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": True})
    assert approved.json["app"]["environment"] == "live"
    return owner_browser, owner, dev_browser, dev, organization_id, client_id


def _state(dev_browser: Any, dev: dict[str, str], client_id: str) -> tuple[str, str]:
    app_json = call(dev_browser, dev, "GET", f"/apps/{client_id}").json["app"]
    return app_json["environment"], app_json["review_status"]


def test_a_second_app_is_reviewed_for_itself(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    _, _, dev_browser, dev, organization_id, _ = _approved(app, outbox)
    second = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {
            "name": "Second",
            "redirect_uris": ["https://two.example/cb"],
            "scopes": ["billing.write"],
            **LIVE_FIELDS,
        },
    ).json["app"]["client_id"]
    published = call(
        dev_browser, dev, "POST", f"/apps/{second}/publish", {"justifications": {"billing.write": "Why"}}
    )
    assert published.json["state"] == "pending", "approved for the first app, not for this one"
    overview = call(dev_browser, dev, "GET", f"/apps/{second}/overview").json
    assert overview["scopes"]["waiting"] == ["billing.write"]


def test_live_api_keys_still_follow_the_organization(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    _, _, dev_browser, dev, organization_id, _ = _approved(app, outbox)
    key = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/keys",
        {"name": "Prod", "environment": "live", "scopes": ["billing.write"]},
    )
    assert key.status_code == 201, key.json


def test_a_new_path_on_a_reviewed_host_stays_live(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    _, _, dev_browser, dev, _, client_id = _approved(app, outbox)
    moved = call(
        dev_browser,
        dev,
        "PATCH",
        f"/apps/{client_id}",
        {"redirect_uris": ["https://shop.example/cb", "https://shop.example/other/cb"]},
    )
    assert moved.status_code == 200, moved.json
    assert _state(dev_browser, dev, client_id) == ("live", "approved")


def test_a_new_host_sends_a_reviewed_app_back_to_review(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    owner_browser, owner, dev_browser, dev, _, client_id = _approved(app, outbox)
    moved = call(
        dev_browser,
        dev,
        "PATCH",
        f"/apps/{client_id}",
        {"redirect_uris": ["https://shop.example/cb", "https://elsewhere.example/cb"]},
    )
    assert moved.status_code == 200, moved.json
    assert _state(dev_browser, dev, client_id) == ("sandbox", "pending")
    assert [a["client_id"] for a in admin_call(owner_browser, owner, "GET", "/reviews").json["items"]] == [
        client_id
    ]

    again = admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": True})
    assert again.json["app"]["environment"] == "live"
    # Approved with the new host: changing paths on it later is free again.
    call(
        dev_browser,
        dev,
        "PATCH",
        f"/apps/{client_id}",
        {"redirect_uris": ["https://elsewhere.example/next", "https://shop.example/cb"]},
    )
    assert _state(dev_browser, dev, client_id) == ("live", "approved")


def test_a_live_app_never_reviewed_changes_its_hosts_freely(app: Flask, outbox: list[mail.Message]) -> None:
    # Public scopes only: it went live without a review, so there is no review to protect.
    _, _, dev_browser, dev = setup_people(app, outbox)
    organization_id = call(
        dev_browser, dev, "POST", "/organizations", {"name": "Shop", "support_email": "help@shop.example"}
    ).json["organization"]["id"]
    client_id = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://shop.example/cb"], **LIVE_FIELDS},
    ).json["app"]["client_id"]
    assert call(dev_browser, dev, "POST", f"/apps/{client_id}/publish").json["state"] == "live"
    call(dev_browser, dev, "PATCH", f"/apps/{client_id}", {"redirect_uris": ["https://new.example/cb"]})
    assert _state(dev_browser, dev, client_id)[0] == "live"
