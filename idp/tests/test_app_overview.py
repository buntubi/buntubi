"""An app's details and its way to live: stage, checklist, and where each scope stands."""

from typing import Any

from flask import Flask
from test_console_api import admin_call, setup_people
from test_developer_api import LIVE_FIELDS, call, new_organization

from buntubi.services import mail


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
        "products": "todo",
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
        {"description": "Book a session", "products": ["identity"], **LIVE_FIELDS},
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
    call(
        dev_browser,
        dev,
        "POST",
        f"/apps/{client_id}/publish",
        {"justifications": {"phone": "Booking reminders"}},
    )

    waiting = call(dev_browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert waiting["stage"] == "in_review" and waiting["scopes"]["waiting"] == ["phone"]
    assert states(waiting)["permissions"] == "warn" and states(waiting)["review"] == "warn"

    admin_call(
        owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": False, "note": "Why phone?"}
    )
    rejected = call(dev_browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert rejected["stage"] == "changes_requested"
    assert next(c for c in rejected["checks"] if c["key"] == "review")["items"] == ["rejected"]


def test_products_group_scopes_and_apps_choose_them(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    catalog = call(dev_browser, dev, "GET", "/products").json["items"]
    identity = next(p for p in catalog if p["slug"] == "identity")
    assert identity["names"]["en"] == "Identity API" and identity["auth"] == ["oauth2", "oidc"]
    assert [s["name"] for s in identity["scopes"]] == [
        "address",
        "email",
        "offline_access",
        "openid",
        "phone",
        "platform_profile",
        "profile",
    ]
    assert identity["approval"] == "review"

    created = admin_call(
        owner_browser,
        owner,
        "POST",
        "/products",
        {
            "slug": "content",
            "names": {"fr": "API Contenu", "en": "Content API"},
            "descriptions": {"fr": "Contenu", "en": "Content"},
            "availability": "beta",
        },
    )
    assert created.status_code == 201 and created.json["product"]["approval"] == "none"
    duplicate = {"slug": "content", "names": {"fr": "A", "en": "A"}, "descriptions": {"fr": "A", "en": "A"}}
    assert admin_call(owner_browser, owner, "POST", "/products", duplicate).json == {
        "error": "product_exists"
    }

    organization_id = new_organization(dev_browser, dev)
    refused = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "x", "redirect_uris": ["https://x.example/cb"], "products": ["content", "nope"]},
    )
    assert refused.json == {"error": "unknown_product", "products": ["nope"]}
    made = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {
            "name": "x",
            "redirect_uris": ["https://x.example/cb"],
            "products": ["identity", "content", "identity"],
        },
    ).json["app"]
    assert made["products"] == ["content", "identity"]
    assert admin_call(owner_browser, owner, "PATCH", "/scopes/email", {"product": "nope"}).status_code == 422


def test_a_code_flow_app_keeps_a_redirect_uri(app: Flask, outbox: list[mail.Message]) -> None:
    _, _, browser, dev = setup_people(app, outbox)
    organization_id = new_organization(browser, dev)
    client_id = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://web.example/cb"]},
    ).json["app"]["client_id"]
    emptied = call(browser, dev, "PATCH", f"/apps/{client_id}", {"redirect_uris": []})
    assert emptied.status_code == 422 and emptied.json == {"error": "redirect_uri_required"}
    assert call(browser, dev, "GET", f"/apps/{client_id}").json["app"]["redirect_uris"] == [
        "https://web.example/cb"
    ]


def test_an_app_is_created_before_its_redirect_uri_and_the_checklist_asks_for_it(
    app: Flask, outbox: list[mail.Message]
) -> None:
    # The create flow asks for none: redirect addresses are set on the credentials page.
    _, _, browser, dev = setup_people(app, outbox)
    organization_id = new_organization(browser, dev)
    created = call(
        browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Atelier", "client_type": "confidential"},
    )
    assert created.status_code == 201, created.json
    client_id = created.json["app"]["client_id"]
    overview = call(browser, dev, "GET", f"/apps/{client_id}/overview").json
    assert states(overview)["redirect_uri"] == "todo"
    call(browser, dev, "PATCH", f"/apps/{client_id}", {"redirect_uris": ["https://atelier.example/cb"]})
    assert states(call(browser, dev, "GET", f"/apps/{client_id}/overview").json)["redirect_uri"] == "done"
