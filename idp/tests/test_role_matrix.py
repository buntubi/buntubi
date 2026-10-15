"""Every developer route, called by every position in an organization (its role there, and for a
member or billing person their portal role) and by an outsider: what each may do follows the
abilities of the role and the portal role, whatever the portal shows, and another organization's
things answer 404 to someone who is not in it, the same as things that do not exist."""

from typing import Any

import pytest
from flask import Flask
from test_developer_api import call, developer_token, new_organization

from buntubi.services import mail

# Each person's place in organization A: the organization role, then the portal role.
POSITIONS: dict[str, tuple[str, str | None]] = {
    "owner": ("owner", None),
    "admin": ("admin", None),
    "billing": ("billing", None),
    "developer": ("member", "developer"),
    "reviewer": ("member", "reviewer"),
    "viewer": ("member", "viewer"),
    "member": ("member", None),
    "guest": ("guest", None),
}
ROLES = tuple(POSITIONS)


class Person:
    def __init__(self, app: Flask, outbox: list[mail.Message], email: str) -> None:
        self.browser = app.test_client()
        self.bearer = developer_token(app, self.browser, outbox, email)
        assert call(self.browser, self.bearer, "POST", "/terms").status_code == 200

    def __call__(self, method: str, path: str, body: Any = None) -> Any:
        return call(self.browser, self.bearer, method, path, body)


def _app(person: Person, organization_id: str, name: str = "Web") -> str:
    made = person(
        "POST",
        f"/organizations/{organization_id}/apps",
        {"name": name, "client_type": "confidential", "redirect_uris": ["https://shop.example/cb"]},
    )
    assert made.status_code == 201, made.json
    client_id: str = made.json["app"]["client_id"]
    return client_id


@pytest.fixture
def world(app: Flask, outbox: list[mail.Message], platform_scopes: None) -> dict[str, Any]:
    """Organization A with one person per role, and organization B, which none of them is in."""
    people = {role: Person(app, outbox, f"{role}@example.test") for role in ROLES}
    owner = people["owner"]
    org_a = new_organization(owner.browser, owner.bearer)
    for role in ROLES[1:]:
        org_role, portal_role = POSITIONS[role]
        added = owner(
            "POST",
            f"/organizations/{org_a}/members",
            {"email": f"{role}@example.test", "role": org_role, "portal_role": portal_role},
        )
        assert added.status_code == 201, added.json
    stranger = Person(app, outbox, "stranger@example.test")
    org_b = new_organization(stranger.browser, stranger.bearer, name="Other shop")
    b_app = _app(stranger, org_b, "Theirs")
    b_key = stranger(
        "POST", f"/organizations/{org_b}/keys", {"name": "theirs", "scopes": ["billing.read"]}
    ).json
    b_secret = stranger("POST", f"/apps/{b_app}/secrets").json
    stranger("POST", f"/organizations/{org_b}/test-users", {"email": "their.tester@example.test"})
    b_member = next(m["id"] for m in stranger("GET", f"/organizations/{org_b}").json["members"])
    return {
        "people": people,
        "org_a": org_a,
        "org_b": org_b,
        "b_app": b_app,
        "b_key_id": b_key["key"]["id"],
        "b_secret_id": b_secret["secret"]["id"] if "secret" in b_secret else None,
        "b_member": b_member,
    }


# Who may do what inside their own organization, from the role and portal role abilities. A guest
# is let into part of the organization by a product, never into the developer portal.
CAN = {
    "read": set(ROLES) - {"guest"},
    "settings": {"owner", "admin"},
    "members": {"owner", "admin"},
    "edit_apps": {"owner", "admin", "developer"},
    "test_users": {"owner", "admin", "developer"},
    "sandbox_keys": {"owner", "admin", "developer"},
    "live_keys": {"owner", "admin"},
    "publish": {"owner", "admin"},
}


@pytest.mark.parametrize("role", ROLES)
def test_each_role_does_only_what_its_abilities_allow(world: dict[str, Any], role: str) -> None:
    person = world["people"][role]
    owner = world["people"]["owner"]
    org = world["org_a"]
    target = _app(owner, org, f"Target for {role}")

    def allowed(ability: str, reply: Any) -> None:
        if role in CAN[ability]:
            assert reply.status_code < 400, (role, ability, reply.status_code, reply.json)
        else:
            assert reply.status_code == 403 and reply.json["error"] == "forbidden", (
                role,
                ability,
                reply.json,
            )

    allowed("read", person("GET", f"/organizations/{org}"))
    allowed("read", person("GET", f"/apps/{target}"))
    allowed("read", person("GET", f"/apps/{target}/overview"))
    allowed("read", person("GET", f"/apps/{target}/reviews"))
    allowed("settings", person("PATCH", f"/organizations/{org}", {"description": f"by {role}"}))
    allowed("members", person("POST", f"/organizations/{org}/members", {"email": f"new.{role}@example.test"}))
    allowed("edit_apps", person("PATCH", f"/apps/{target}", {"description": f"by {role}"}))
    allowed("edit_apps", person("POST", f"/organizations/{org}/apps", {"name": f"By {role}"}))
    allowed("edit_apps", person("POST", f"/apps/{target}/secrets"))
    allowed(
        "test_users", person("POST", f"/organizations/{org}/test-users", {"email": f"t.{role}@example.test"})
    )
    allowed(
        "sandbox_keys",
        person("POST", f"/organizations/{org}/keys", {"name": role, "scopes": ["billing.read"]}),
    )
    allowed(
        "live_keys",
        person(
            "POST",
            f"/organizations/{org}/keys",
            {"name": f"live {role}", "environment": "live", "scopes": ["billing.read"]},
        ),
    )
    allowed("publish", person("DELETE", f"/apps/{target}"))


@pytest.mark.parametrize("role", ROLES)
def test_another_organization_is_not_found(world: dict[str, Any], role: str) -> None:
    person = world["people"][role]
    org_b, b_app = world["org_b"], world["b_app"]
    attempts = [
        ("GET", f"/organizations/{org_b}", None),
        ("PATCH", f"/organizations/{org_b}", {"description": "taken"}),
        ("DELETE", f"/organizations/{org_b}", None),
        ("POST", f"/organizations/{org_b}/members", {"email": "intruder@example.test"}),
        ("PATCH", f"/organizations/{org_b}/members/{world['b_member']}", {"role": "member"}),
        ("DELETE", f"/organizations/{org_b}/members/{world['b_member']}", None),
        ("POST", f"/organizations/{org_b}/apps", {"name": "Planted"}),
        ("POST", f"/organizations/{org_b}/keys", {"name": "stolen", "scopes": ["billing.read"]}),
        ("DELETE", f"/organizations/{org_b}/keys/{world['b_key_id']}", None),
        ("POST", f"/organizations/{org_b}/test-users", {"email": "me@example.test"}),
        ("DELETE", f"/organizations/{org_b}/test-users/their.tester@example.test", None),
        ("GET", f"/apps/{b_app}", None),
        ("GET", f"/apps/{b_app}/overview", None),
        ("GET", f"/apps/{b_app}/reviews", None),
        ("PATCH", f"/apps/{b_app}", {"redirect_uris": ["https://evil.example/cb"]}),
        ("POST", f"/apps/{b_app}/secrets", None),
        ("POST", f"/apps/{b_app}/publish", None),
        ("DELETE", f"/apps/{b_app}", None),
    ]
    if world["b_secret_id"]:
        attempts.append(("DELETE", f"/apps/{b_app}/secrets/{world['b_secret_id']}", None))
    for method, path, body in attempts:
        reply = person(method, path, body)
        assert reply.status_code == 404 and reply.json["error"] == "not_found", (
            role,
            method,
            path,
            reply.json,
        )


def test_ids_from_one_organization_do_not_work_through_another(world: dict[str, Any]) -> None:
    # The owner of A names B's member, key and secret under A's own addresses.
    owner = world["people"]["owner"]
    org_a = world["org_a"]
    a_app = _app(owner, org_a, "Mine")
    for method, path in [
        ("PATCH", f"/organizations/{org_a}/members/{world['b_member']}"),
        ("DELETE", f"/organizations/{org_a}/members/{world['b_member']}"),
        ("DELETE", f"/organizations/{org_a}/keys/{world['b_key_id']}"),
    ] + ([("DELETE", f"/apps/{a_app}/secrets/{world['b_secret_id']}")] if world["b_secret_id"] else []):
        reply = owner(method, path, {"role": "member"} if method == "PATCH" else None)
        assert reply.status_code == 404, (method, path, reply.json)
    stranger_view = world["people"]["owner"]("GET", f"/organizations/{org_a}").json
    assert all(m["id"] != world["b_member"] for m in stranger_view["members"])


def test_a_member_limited_to_some_apps_cannot_reach_the_others(world: dict[str, Any]) -> None:
    owner = world["people"]["owner"]
    dev = world["people"]["developer"]
    org = world["org_a"]
    mine, theirs = _app(owner, org, "Mine"), _app(owner, org, "Not mine")
    member = next(
        m
        for m in owner("GET", f"/organizations/{org}").json["members"]
        if m["email"] == "developer@example.test"
    )
    limited = owner("PATCH", f"/organizations/{org}/members/{member['id']}", {"apps": [mine]})
    assert limited.status_code == 200, limited.json
    assert dev("GET", f"/apps/{mine}").status_code == 200
    for method, path in [
        ("GET", f"/apps/{theirs}"),
        ("PATCH", f"/apps/{theirs}"),
        ("POST", f"/apps/{theirs}/secrets"),
    ]:
        reply = dev(method, path, {"description": "x"} if method == "PATCH" else None)
        assert reply.status_code == 404, (method, path, reply.json)
    # Naming another organization's app in the list gives nothing either.
    leaked = owner("PATCH", f"/organizations/{org}/members/{member['id']}", {"apps": [world["b_app"]]})
    assert leaked.status_code in (200, 400, 404, 422)
    assert dev("GET", f"/apps/{world['b_app']}").status_code == 404


@pytest.mark.parametrize("role", ["admin", "billing", "developer", "reviewer", "viewer", "member", "guest"])
def test_no_role_can_make_itself_or_anyone_owner_without_being_one(world: dict[str, Any], role: str) -> None:
    owner = world["people"]["owner"]
    person = world["people"][role]
    org = world["org_a"]
    members = owner("GET", f"/organizations/{org}").json["members"]
    me = next(m for m in members if m["email"] == f"{role}@example.test")
    promoted = person("PATCH", f"/organizations/{org}/members/{me['id']}", {"role": "owner"})
    assert promoted.status_code in (403, 422), (role, promoted.json)
    added = person("POST", f"/organizations/{org}/members", {"email": "friend@example.test", "role": "owner"})
    assert added.status_code in (403, 422), (role, added.json)
    owner_row = next(m for m in members if m["email"] == "owner@example.test")
    removed = person("DELETE", f"/organizations/{org}/members/{owner_row['id']}")
    assert removed.status_code in (403, 409), (role, removed.json)


def test_the_last_owner_cannot_leave_or_be_demoted(world: dict[str, Any]) -> None:
    owner = world["people"]["owner"]
    org = world["org_a"]
    me = next(
        m for m in owner("GET", f"/organizations/{org}").json["members"] if m["email"] == "owner@example.test"
    )
    assert owner("DELETE", f"/organizations/{org}/members/{me['id']}").json["error"] == "last_owner"
    assert (
        owner("PATCH", f"/organizations/{org}/members/{me['id']}", {"role": "member"}).json["error"]
        == "last_owner"
    )


@pytest.mark.parametrize("role", ["admin", "billing", "developer", "reviewer", "viewer", "member", "guest"])
def test_only_the_owner_deletes_the_organization(world: dict[str, Any], role: str) -> None:
    person = world["people"][role]
    reply = person("DELETE", f"/organizations/{world['org_a']}")
    assert reply.status_code == 403 and reply.json["error"] == "forbidden"


def test_a_secret_is_shown_once_and_no_answer_carries_a_hash(world: dict[str, Any]) -> None:
    import json as _json

    owner = world["people"]["owner"]
    org = world["org_a"]
    made = owner(
        "POST",
        f"/organizations/{org}/apps",
        {"name": "Server", "client_type": "confidential", "redirect_uris": ["https://shop.example/cb"]},
    ).json
    secret, client_id = made["client_secret"], made["app"]["client_id"]
    rotated = owner("POST", f"/apps/{client_id}/secrets").json["client_secret"]
    key = owner("POST", f"/organizations/{org}/keys", {"name": "ci", "scopes": ["billing.read"]}).json[
        "api_key"
    ]
    later = [
        owner("GET", f"/apps/{client_id}"),
        owner("GET", f"/apps/{client_id}/overview"),
        owner("GET", f"/organizations/{org}"),
        owner("GET", "/organizations"),
    ]
    for reply in later:
        text = _json.dumps(reply.json)
        assert secret not in text and rotated not in text and key not in text, reply.request.path
        assert not any(h in text for h in ("secret_hash", "key_hash", "token_hash", "password_hash")), text[
            :200
        ]


@pytest.mark.parametrize("role", ["owner", "admin", "guest"])
def test_a_portal_role_goes_only_with_member_or_billing(world: dict[str, Any], role: str) -> None:
    owner = world["people"]["owner"]
    reply = owner(
        "POST",
        f"/organizations/{world['org_a']}/members",
        {"email": f"portal.{role}@example.test", "role": role, "portal_role": "developer"},
    )
    assert reply.status_code == 422, (role, reply.json)


def test_the_organization_lists_each_members_role_and_portal_role(world: dict[str, Any]) -> None:
    members = world["people"]["owner"]("GET", f"/organizations/{world['org_a']}").json["members"]
    got = {m["email"].split("@")[0]: (m["role"], m.get("portal_role")) for m in members}
    assert got == {name: POSITIONS[name] for name in ROLES}
