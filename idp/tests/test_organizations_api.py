"""
The organizations API products call as the signed-in person (`/v1/organizations`): the same rules
as the developer portal, two scopes, and a token bound to one organization reaches that one only.
"""

from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_organization_tokens import join, organization, tokens_for

from buntubi.db import db
from buntubi.models import ApiProduct, Scope
from buntubi.services import mail

from conftest import add_client, sign_up

BOTH = "openid organizations:read organizations:manage"


def bearer(browser: FlaskClient, csrf: str, scope: str = BOTH, **extra: str) -> dict[str, str]:
    return {"Authorization": "Bearer " + tokens_for(browser, csrf, scope=scope, **extra)["access_token"]}


# Set by a test that checks every answer against the published description.
CHECK: list[Any] = []


def call(browser: FlaskClient, token: dict[str, str], method: str, path: str, body: Any = None) -> Any:
    reply = browser.open(f"/v1{path}", method=method, json=body, headers=token)
    for check in CHECK:
        check(method, reply, f"/v1{path}")
    return reply


@pytest.fixture
def awa(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> str:
    add_client(app, scope=BOTH, first_party=True, organization_usage="optional")
    return sign_up(browser, outbox)


def person(app: Flask, outbox: list[mail.Message], email: str) -> tuple[FlaskClient, str]:
    other = FlaskClient(app, use_cookies=True)
    return other, sign_up(other, outbox, email=email)


def test_the_catalogue_lists_the_api_and_its_scopes(app: Flask) -> None:
    with app.app_context():
        product = db().get(ApiProduct, "organizations")
        assert product is not None and product.auth == ["oauth2"]
        scopes = db().scalars(select(Scope).where(Scope.product == "organizations")).all()
        # Reading shows other people's names and addresses: an app is reviewed before it may.
        assert {(s.name, s.sensitivity) for s in scopes} == {
            ("organizations:read", "sensitive"),
            ("organizations:manage", "sensitive"),
        }


def test_reading_needs_a_scope_and_changing_needs_manage(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, scope="openid organizations:read", first_party=True)
    csrf = sign_up(browser, outbox)
    token = bearer(browser, csrf, scope="openid organizations:read")
    assert call(browser, token, "GET", "/organizations").status_code == 200
    created = call(browser, token, "POST", "/organizations", {"name": "ACME"})
    assert created.status_code == 403 and created.json["error"] == "insufficient_scope"
    assert browser.get("/v1/organizations").status_code == 401


def test_a_person_runs_an_organization_end_to_end(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], awa: str
) -> None:
    token = bearer(browser, awa)
    created = call(browser, token, "POST", "/organizations", {"name": "ACME"})
    assert created.status_code == 201 and created.json["organization"]["role"] == "owner"
    org = created.json["organization"]["id"]
    assert [o["id"] for o in call(browser, token, "GET", "/organizations").json["items"]] == [org]
    renamed = call(browser, token, "PATCH", f"/organizations/{org}", {"name": "ACME Studio"})
    assert renamed.json["organization"]["name"] == "ACME Studio"

    invited = call(browser, token, "POST", f"/organizations/{org}/members", {"email": "nobody@example.test"})
    assert invited.status_code == 202 and invited.json["invitation"]["role"] == "member"
    person(app, outbox, "omar@example.test")
    added = call(
        browser,
        token,
        "POST",
        f"/organizations/{org}/members",
        {"email": "omar@example.test", "role": "admin"},
    )
    assert added.status_code == 201 and added.json["member"]["role"] == "admin"
    omar = added.json["member"]["id"]
    members = call(browser, token, "GET", f"/organizations/{org}/members").json
    assert sorted(m["email"] for m in members["items"]) == ["awa@example.test", "omar@example.test"]
    assert [i["email"] for i in members["invitations"]] == ["nobody@example.test"]
    assert "portal_role" not in members["items"][0], "the portal's own role stays in the portal"

    changed = call(browser, token, "PATCH", f"/organizations/{org}/members/{omar}", {"role": "billing"})
    assert changed.json["member"]["role"] == "billing"
    withdrawn = call(
        browser, token, "DELETE", f"/organizations/{org}/invitations/{invited.json['invitation']['id']}"
    )
    assert withdrawn.status_code == 200

    # Ownership goes to Omar; Awa stays on as an admin, then leaves.
    handed = call(browser, token, "POST", f"/organizations/{org}/transfer", {"member": omar})
    assert handed.status_code == 200
    roles = {
        m["email"]: m["role"]
        for m in call(browser, token, "GET", f"/organizations/{org}/members").json["items"]
    }
    assert roles == {"awa@example.test": "admin", "omar@example.test": "owner"}
    assert call(browser, token, "POST", f"/organizations/{org}/leave").status_code == 200
    assert call(browser, token, "GET", f"/organizations/{org}").status_code == 404


def test_the_rules_are_the_providers(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], awa: str
) -> None:
    org = organization(app, "awa@example.test", "ACME")
    token = bearer(browser, awa)
    # The last owner cannot leave, nor be made something else.
    assert call(browser, token, "POST", f"/organizations/{org}/leave").json["error"] == "last_owner"

    admin_browser, admin_csrf = person(app, outbox, "lea@example.test")
    join(app, org, "lea@example.test", "admin")
    admin = bearer(admin_browser, admin_csrf)
    made = call(
        admin_browser,
        admin,
        "POST",
        f"/organizations/{org}/members",
        {"email": "x@example.test", "role": "owner"},
    )
    assert made.status_code == 403, "only an owner makes an owner"
    handed = call(admin_browser, admin, "POST", f"/organizations/{org}/transfer", {"member": "anyone"})
    assert handed.status_code == 403, "only an owner hands ownership over"
    assert call(admin_browser, admin, "DELETE", f"/organizations/{org}").status_code == 403

    guest_browser, guest_csrf = person(app, outbox, "nia@example.test")
    join(app, org, "nia@example.test", "guest")
    guest = bearer(guest_browser, guest_csrf)
    seen = call(guest_browser, guest, "GET", f"/organizations/{org}")
    assert seen.status_code == 200 and seen.json["organization"]["role"] == "guest", (
        "a guest sees where they are"
    )
    assert call(guest_browser, guest, "GET", f"/organizations/{org}/members").status_code == 403
    invited = call(guest_browser, guest, "POST", f"/organizations/{org}/members", {"email": "y@example.test"})
    assert invited.status_code == 403
    guests_id = next(
        m["id"]
        for m in call(browser, token, "GET", f"/organizations/{org}/members").json["items"]
        if m["email"] == "nia@example.test"
    )
    assert (
        call(browser, token, "POST", f"/organizations/{org}/transfer", {"member": guests_id}).status_code
        == 422
    )


def test_a_token_bound_to_an_organization_reaches_that_one_only(
    app: Flask, browser: FlaskClient, awa: str
) -> None:
    acme = organization(app, "awa@example.test", "ACME")
    globex = organization(app, "awa@example.test", "Globex")
    token = bearer(browser, awa, organization=acme)
    assert [o["id"] for o in call(browser, token, "GET", "/organizations").json["items"]] == [acme]
    assert call(browser, token, "GET", f"/organizations/{acme}").status_code == 200
    for method, path in (("GET", ""), ("PATCH", ""), ("GET", "/members"), ("DELETE", "")):
        reply = call(
            browser,
            token,
            method,
            f"/organizations/{globex}{path}",
            {"name": "x"} if method == "PATCH" else None,
        )
        assert reply.status_code == 404, (method, path)
    assert call(browser, token, "POST", "/organizations", {"name": "Initech"}).status_code == 403


def test_the_description_lists_the_api(browser: FlaskClient) -> None:
    paths = browser.get("/openapi.json").json["paths"]
    assert {"/v1/organizations", "/v1/organizations/{organization_id}/members"} <= paths.keys()


def test_every_answer_matches_the_description(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], awa: str
) -> None:
    import re

    from test_openapi import Checker

    spec = browser.get("/openapi.json").json
    checker = Checker(spec)

    def check(method: str, reply: Any, concrete: str) -> None:
        for described in spec["paths"]:
            if re.fullmatch(re.sub(r"\{\w+\}", r"[^/]+", described), concrete):
                checker(method, described, reply)
                return
        raise AssertionError(f"no description for {concrete}")

    CHECK.append(check)
    try:
        test_a_person_runs_an_organization_end_to_end(app, browser, outbox, awa)
    finally:
        CHECK.clear()
    assert len(checker.checked) == 11
