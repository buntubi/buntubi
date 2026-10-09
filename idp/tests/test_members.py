"""Organization members: roles decide what a member may do, app lists what a member sees."""

from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from test_developer_api import LIVE_FIELDS, call, developer_token
from test_platform_gates import authorize, sandbox_app

from idp.services import mail

from conftest import REDIRECT, sign_up


def colleague(app: Flask, outbox: list[mail.Message], email: str) -> tuple[FlaskClient, dict[str, str]]:
    browser = app.test_client()
    bearer = developer_token(app, browser, outbox, email)
    call(browser, bearer, "POST", "/terms")
    return browser, bearer


def add(browser: FlaskClient, bearer: dict[str, str], organization_id: str, **body: Any) -> Any:
    return call(browser, bearer, "POST", f"/organizations/{organization_id}/members", body)


def test_the_creator_is_the_owner_and_members_need_an_account(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, _ = sandbox_app(app, outbox)
    listed = call(dev_browser, dev, "GET", "/organizations").json["items"]
    assert [o["role"] for o in listed] == ["owner"]

    assert add(dev_browser, dev, organization_id, email="nobody@example.test").json == {
        "error": "no_such_account"
    }
    colleague(app, outbox, "ana@example.test")
    added = add(dev_browser, dev, organization_id, email="ANA@example.test", role="developer")
    assert added.status_code == 201
    assert added.json["member"]["email"] == "ana@example.test" and added.json["member"]["role"] == "developer"
    again = add(dev_browser, dev, organization_id, email="ana@example.test")
    assert again.status_code == 409 and again.json["error"] == "already_member"

    members = call(dev_browser, dev, "GET", f"/organizations/{organization_id}").json["members"]
    assert sorted((m["email"], m["role"]) for m in members) == [
        ("ana@example.test", "developer"),
        ("dev@example.test", "owner"),
    ]


def test_roles_decide_what_a_member_may_do(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, client_id = sandbox_app(app, outbox)
    ana_browser, ana = colleague(app, outbox, "ana@example.test")
    vic_browser, vic = colleague(app, outbox, "vic@example.test")
    add(dev_browser, dev, organization_id, email="ana@example.test", role="developer")
    add(dev_browser, dev, organization_id, email="vic@example.test", role="viewer")
    org = f"/organizations/{organization_id}"

    # A developer builds and tests, and stops short of members, publishing and live keys.
    assert call(ana_browser, ana, "GET", org).json["organization"]["role"] == "developer"
    assert (
        call(
            ana_browser, ana, "POST", f"{org}/apps", {"name": "Ana's", "redirect_uris": [REDIRECT]}
        ).status_code
        == 201
    )
    assert call(ana_browser, ana, "PATCH", f"/apps/{client_id}", {"name": "Renamed"}).status_code == 200
    assert call(ana_browser, ana, "POST", f"{org}/keys", {"name": "CI"}).status_code == 201
    for method, path, body in (
        ("POST", f"{org}/keys", {"name": "Prod", "environment": "live"}),
        ("POST", f"{org}/members", {"email": "vic@example.test"}),
        ("PATCH", org, {"name": "Mine now"}),
        ("POST", f"/apps/{client_id}/publish", None),
        ("DELETE", f"/apps/{client_id}", None),
        ("DELETE", org, None),
    ):
        reply = call(ana_browser, ana, method, path, body)
        assert reply.status_code == 403 and reply.json == {"error": "forbidden", "role": "developer"}, (
            method,
            path,
        )

    # A viewer reads.
    assert call(vic_browser, vic, "GET", f"/apps/{client_id}").json["role"] == "viewer"
    assert call(vic_browser, vic, "PATCH", f"/apps/{client_id}", {"name": "x"}).status_code == 403
    assert call(vic_browser, vic, "POST", f"{org}/test-users", {"email": "t@example.test"}).status_code == 403

    # An admin manages members but cannot make an owner.
    call(
        dev_browser,
        dev,
        "PATCH",
        f"{org}/members/{member_id(dev_browser, dev, org, 'ana')}",
        {"role": "admin"},
    )
    assert call(ana_browser, ana, "POST", f"/apps/{client_id}/publish").status_code != 403
    promote = call(
        ana_browser,
        ana,
        "PATCH",
        f"{org}/members/{member_id(dev_browser, dev, org, 'vic')}",
        {"role": "owner"},
    )
    assert promote.status_code == 403


def member_id(browser: FlaskClient, bearer: dict[str, str], org: str, name: str) -> str:
    members = call(browser, bearer, "GET", org).json["members"]
    found: str = next(m["id"] for m in members if m["email"].startswith(name + "@"))
    return found


def test_a_member_limited_to_some_apps_sees_only_those(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, client_id = sandbox_app(app, outbox)
    org = f"/organizations/{organization_id}"
    other_id = call(
        dev_browser, dev, "POST", f"{org}/apps", {"name": "Other", "redirect_uris": [REDIRECT]}
    ).json["app"]["client_id"]
    ana_browser, ana = colleague(app, outbox, "ana@example.test")
    added = add(dev_browser, dev, organization_id, email="ana@example.test", apps=[client_id])
    assert added.json["member"]["apps"] == [client_id]
    sign_up(app.test_client(), outbox, email="bo@example.test")
    unknown = add(dev_browser, dev, organization_id, email="bo@example.test", apps=["app_nope"])
    assert unknown.json == {"error": "unknown_app", "apps": ["app_nope"]}

    assert [a["client_id"] for a in call(ana_browser, ana, "GET", org).json["apps"]] == [client_id]
    assert call(ana_browser, ana, "GET", f"/apps/{other_id}").status_code == 404
    made = call(ana_browser, ana, "POST", f"{org}/apps", {"name": "Ana's", "redirect_uris": [REDIRECT]}).json[
        "app"
    ]
    assert call(ana_browser, ana, "GET", f"/apps/{made['client_id']}").status_code == 200

    # Owners and admins see every app whatever the list says.
    call(dev_browser, dev, "PATCH", f"{org}/members/{added.json['member']['id']}", {"role": "admin"})
    assert len(call(ana_browser, ana, "GET", org).json["apps"]) == 3


def test_an_organization_always_keeps_an_owner(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, _ = sandbox_app(app, outbox)
    org = f"/organizations/{organization_id}"
    mine = member_id(dev_browser, dev, org, "dev")
    assert call(dev_browser, dev, "DELETE", f"{org}/members/{mine}").json == {"error": "last_owner"}
    assert call(dev_browser, dev, "PATCH", f"{org}/members/{mine}", {"role": "admin"}).json == {
        "error": "last_owner"
    }

    ana_browser, ana = colleague(app, outbox, "ana@example.test")
    add(dev_browser, dev, organization_id, email="ana@example.test", role="owner")
    assert call(dev_browser, dev, "DELETE", f"{org}/members/{mine}").json == {"removed": True}
    assert call(dev_browser, dev, "GET", org).status_code == 404
    assert [m["email"] for m in call(ana_browser, ana, "GET", org).json["members"]] == ["ana@example.test"]


def test_members_try_sandbox_apps_and_lose_them_when_they_leave(
    app: Flask, outbox: list[mail.Message]
) -> None:
    dev_browser, dev, organization_id, client_id = sandbox_app(app, outbox)
    org = f"/organizations/{organization_id}"
    visitor = app.test_client()
    sign_up(visitor, outbox, email="ana@example.test")
    assert authorize(visitor, client_id)[0].status_code == 403

    add(dev_browser, dev, organization_id, email="ana@example.test", role="viewer")
    allowed, _ = authorize(visitor, client_id)
    assert allowed.status_code == 302 and allowed.location.startswith("/consent")

    call(dev_browser, dev, "DELETE", f"{org}/members/{member_id(dev_browser, dev, org, 'ana')}")
    assert authorize(visitor, client_id)[0].status_code == 403


def test_live_fields_still_apply_to_publishing(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, organization_id, client_id = sandbox_app(app, outbox)
    call(
        dev_browser, dev, "PATCH", f"/organizations/{organization_id}", {"support_email": "help@shop.example"}
    )
    call(dev_browser, dev, "PATCH", f"/apps/{client_id}", LIVE_FIELDS)
    assert call(dev_browser, dev, "POST", f"/apps/{client_id}/publish").json["state"] == "live"


def test_each_member_says_whether_two_step_sign_in_is_on(app: Flask, outbox: list[mail.Message]) -> None:
    # The team list shows it: a member without a second factor is the weak point of an organization.
    dev_browser, dev, organization_id, _ = sandbox_app(app, outbox)
    colleague(app, outbox, "ana@example.test")
    add(dev_browser, dev, organization_id, email="ana@example.test", role="developer")
    members = call(dev_browser, dev, "GET", f"/organizations/{organization_id}").json["members"]
    assert {m["email"]: m["two_step"] for m in members} == {
        "ana@example.test": False,
        "dev@example.test": False,
    }
