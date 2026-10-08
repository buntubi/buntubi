"""The owner's side of the platform: reviews, suspensions, the scope catalog, refusals."""

from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from test_developer_api import LIVE_FIELDS, call, developer_token
from test_flows import admin_token

from idp.db import db
from idp.models import Scope
from idp.services import mail


def admin_call(browser: FlaskClient, bearer: dict[str, str], method: str, path: str, body: Any = None) -> Any:
    return browser.open("/admin/api" + path, method=method, json=body, headers=bearer)


def setup_people(
    app: Flask, outbox: list[mail.Message]
) -> tuple[FlaskClient, dict[str, str], FlaskClient, dict[str, str]]:
    """An owner with the admin role and a second factor, and a developer who accepted the terms."""
    owner_browser = app.test_client()
    owner = {"Authorization": f"Bearer {admin_token(app, owner_browser, outbox, make_admin=True)}"}
    dev_browser = app.test_client()
    dev = developer_token(app, dev_browser, outbox, "dev@example.test")
    call(dev_browser, dev, "POST", "/terms")
    return owner_browser, owner, dev_browser, dev


def app_waiting_for_review(
    dev_browser: FlaskClient, dev: dict[str, str], scopes: list[str]
) -> tuple[str, str]:
    organization_id = call(
        dev_browser, dev, "POST", "/organizations", {"name": "Shop", "support_email": "help@shop.example"}
    )
    organization_id = organization_id.json["organization"]["id"]
    client_id = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": "Web", "redirect_uris": ["https://shop.example/cb"], "scopes": scopes, **LIVE_FIELDS},
    ).json["app"]["client_id"]
    explained = {"justifications": {scope: f"Why {scope}" for scope in scopes}}
    assert call(dev_browser, dev, "POST", f"/apps/{client_id}/publish", explained).json["state"] == "pending"
    return organization_id, client_id


def test_a_rejection_needs_a_note_and_reaches_the_developer(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    _, client_id = app_waiting_for_review(dev_browser, dev, ["phone"])

    reviews = admin_call(owner_browser, owner, "GET", "/reviews").json["items"]
    assert [r["client_id"] for r in reviews] == [client_id]
    assert reviews[0]["sensitive_scopes"] == ["phone"]
    assert reviews[0]["owner"]["email"] == "dev@example.test"

    bare = admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": False})
    assert bare.status_code == 422 and bare.json == {"error": "note_required"}
    rejected = admin_call(
        owner_browser,
        owner,
        "POST",
        f"/apps/{client_id}/review",
        {"approve": False, "note": "Say why you need it."},
    )
    assert rejected.json["app"]["review_status"] == "rejected"
    seen = call(dev_browser, dev, "GET", f"/apps/{client_id}").json["app"]
    assert seen["review_status"] == "rejected" and seen["review_note"] == "Say why you need it."
    assert seen["environment"] == "sandbox"
    again = admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": True})
    assert again.status_code == 409, "only a pending app can be reviewed"


def test_an_approval_puts_the_app_live_and_approves_the_scope_for_live_keys(
    app: Flask, outbox: list[mail.Message], platform_scopes: None
) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    organization_id, client_id = app_waiting_for_review(dev_browser, dev, ["billing.write"])
    refused = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/keys",
        {"name": "Prod", "environment": "live", "scopes": ["billing.write"]},
    )
    assert refused.json == {"error": "review_required", "scopes": ["billing.write"]}

    approved = admin_call(owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": True})
    assert approved.json["app"]["environment"] == "live"
    assert admin_call(owner_browser, owner, "GET", "/reviews").json["items"] == []
    organizations = admin_call(owner_browser, owner, "GET", "/organizations").json["items"]
    assert organizations[0]["approved_scopes"] == ["billing.write"]

    live_key = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/keys",
        {"name": "Prod", "environment": "live", "scopes": ["billing.write"]},
    )
    assert live_key.status_code == 201 and live_key.json["api_key"].startswith("sk_live_")


def test_a_suspended_organization_stops_working_at_once(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    organization_id = call(dev_browser, dev, "POST", "/organizations", {"name": "Spam"}).json["organization"][
        "id"
    ]
    created = call(
        dev_browser,
        dev,
        "POST",
        f"/organizations/{organization_id}/apps",
        {
            "name": "Bot",
            "client_type": "confidential",
            "redirect_uris": ["https://spam.example/cb"],
            "grant_types": ["client_credentials"],
        },
    ).json
    token = {
        "grant_type": "client_credentials",
        "client_id": created["app"]["client_id"],
        "client_secret": created["client_secret"],
    }
    assert dev_browser.post("/oauth/token", data=token).status_code == 200

    reason = admin_call(
        owner_browser, owner, "POST", f"/organizations/{organization_id}/suspend", {"reason": ""}
    )
    assert reason.status_code == 422, "a suspension says why"
    suspended = admin_call(
        owner_browser, owner, "POST", f"/organizations/{organization_id}/suspend", {"reason": "Abuse"}
    )
    assert suspended.json["organization"]["suspended"] is True
    # 400, not 401: the secret came in the form body, not the Authorization header (RFC 6749 5.2).
    stopped = dev_browser.post("/oauth/token", data=token)
    assert stopped.status_code == 400 and stopped.json["error"] == "invalid_client"
    assert call(dev_browser, dev, "POST", f"/organizations/{organization_id}/apps", {"name": "x"}).json == {
        "error": "organization_suspended"
    }

    admin_call(owner_browser, owner, "POST", f"/organizations/{organization_id}/restore")
    assert dev_browser.post("/oauth/token", data=token).status_code == 200


def test_the_scope_catalog(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, _, _ = setup_people(app, outbox)
    body = {
        "name": "orders.read",
        "sensitivity": "public",
        "resource": "orders",
        "descriptions": {"fr": "Voir vos commandes", "en": "See your orders"},
    }
    try:
        assert admin_call(owner_browser, owner, "POST", "/scopes", body).status_code == 201
        assert admin_call(owner_browser, owner, "POST", "/scopes", body).json == {"error": "scope_exists"}
        patched = admin_call(
            owner_browser, owner, "PATCH", "/scopes/orders.read", {"sensitivity": "sensitive"}
        )
        assert patched.json["scope"]["sensitivity"] == "sensitive"
        names = [s["name"] for s in admin_call(owner_browser, owner, "GET", "/scopes").json["items"]]
        assert "orders.read" in names and "openid" in names
    finally:
        with app.app_context():
            db().query(Scope).filter(Scope.name == "orders.read").delete()
            db().commit()


def test_refusals_say_why(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    no_role = {"Authorization": f"Bearer {admin_token(app, browser, outbox, make_admin=False)}"}
    assert admin_call(browser, no_role, "GET", "/overview").json == {"error": "not_admin"}
    other = app.test_client()
    token = admin_token(app, other, outbox, make_admin=True, with_mfa=False, email="second@example.test")
    no_mfa = {"Authorization": f"Bearer {token}"}
    assert admin_call(other, no_mfa, "GET", "/overview").json == {"error": "mfa_required"}


def test_the_overview_counts(app: Flask, outbox: list[mail.Message]) -> None:
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    call(dev_browser, dev, "POST", "/organizations", {"name": "Shop"})
    counts = admin_call(owner_browser, owner, "GET", "/overview").json
    assert counts["users"] == 2 and counts["developers"] == 1 and counts["organizations"] == 1
    assert counts["pending_reviews"] == 0
