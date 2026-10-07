"""The OpenAPI description: valid, complete, and true to what the endpoints answer."""

import re
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from jsonschema import Draft202012Validator
from openapi_spec_validator import validate
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012
from test_console_api import admin_call, app_waiting_for_review, setup_people
from test_developer_api import LIVE_FIELDS, call
from test_flows import add_service, basic, secret_of

from idp.services import mail
from idp.web.openapi import DESCRIBED_PREFIXES, INTERNAL

from conftest import REDIRECT, add_client, authorize_query, pkce, sign_up


@pytest.fixture
def spec(browser: FlaskClient) -> dict[str, Any]:
    response = browser.get("/openapi.json")
    assert response.status_code == 200
    document: dict[str, Any] = response.json
    return document


class Checker:
    """Validates a response body against the schema the description gives its operation and status."""

    def __init__(self, spec: dict[str, Any]) -> None:
        self.spec = spec
        resource = Resource.from_contents(spec, default_specification=DRAFT202012)
        self.registry = Registry().with_resource("urn:idp-openapi", resource)
        self.checked: set[tuple[str, str, str]] = set()

    def __call__(self, method: str, path: str, response: Any) -> Any:
        status = str(response.status_code)
        operation = self.spec["paths"][path][method.lower()]
        assert status in operation["responses"], f"{method} {path} answered {status}, not described"
        content = operation["responses"][status].get("content")
        if content is not None:
            schema = {
                "$ref": f"urn:idp-openapi#/paths/{escape(path)}/{method.lower()}/responses/{status}"
                "/content/application~1json/schema"
            }
            Draft202012Validator(schema, registry=self.registry).validate(response.json)
        self.checked.add((method.upper(), path, status))
        return response.json


def escape(path: str) -> str:
    return path.replace("~", "~0").replace("/", "~1")


def test_the_description_is_valid_openapi(spec: dict[str, Any]) -> None:
    validate(spec)
    assert spec["openapi"] == "3.1.0"
    flows = spec["components"]["securitySchemes"]["oauth2"]["flows"]
    assert flows["authorizationCode"]["authorizationUrl"].endswith("/oauth/authorize")


def test_every_public_route_is_described_and_nothing_else(app: Flask, spec: dict[str, Any]) -> None:
    routes = set()
    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith(DESCRIBED_PREFIXES):
            continue
        path = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", rule.rule)
        for method in rule.methods - {"HEAD", "OPTIONS"}:
            if (method, rule.rule) not in INTERNAL:
                routes.add((method, path))
    described = {(m.upper(), p) for p, ops in spec["paths"].items() for m in ops}
    assert routes - described == set(), "routes without a description"
    assert described - routes == set(), "descriptions without a route"


def test_developer_and_admin_answers_match_the_description(
    app: Flask, outbox: list[mail.Message], spec: dict[str, Any], platform_scopes: None
) -> None:
    check = Checker(spec)
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)

    def template(concrete: str) -> str:
        """The described path a concrete one belongs to: /developer/api/apps/app_x is /apps/{client_id}."""
        for described in spec["paths"]:
            if re.fullmatch(re.sub(r"\{\w+\}", r"[^/]+", described), concrete):
                return str(described)
        raise AssertionError(f"no description for {concrete}")

    def dev_call(method: str, path: str, body: Any = None) -> Any:
        return check(method, template("/developer/api" + path), call(dev_browser, dev, method, path, body))

    dev_call("GET", "/me")
    organization = dev_call("POST", "/organizations", {"name": "Shop", "support_email": "help@shop.example"})[
        "organization"
    ]
    dev_call("GET", "/organizations")
    dev_call("PATCH", f"/organizations/{organization['id']}", {"description": "A shop"})
    created = dev_call(
        "POST",
        f"/organizations/{organization['id']}/apps",
        {
            "name": "Server",
            "client_type": "confidential",
            "redirect_uris": ["https://shop.example/cb"],
            "scopes": ["profile", "billing.write"],
            **LIVE_FIELDS,
        },
    )
    client_id = created["app"]["client_id"]
    dev_call("GET", f"/apps/{client_id}")
    dev_call("GET", f"/apps/{client_id}/overview")
    dev_call("PATCH", f"/apps/{client_id}", {"name": "Server app"})
    rotated = dev_call("POST", f"/apps/{client_id}/secrets")
    dev_call("DELETE", f"/apps/{client_id}/secrets/{rotated['app']['secrets'][0]['id']}")
    dev_call("POST", f"/apps/{client_id}/publish")
    key = dev_call(
        "POST", f"/organizations/{organization['id']}/keys", {"name": "CI", "scopes": ["billing.read"]}
    )
    dev_call("POST", f"/organizations/{organization['id']}/test-users", {"email": "t@example.test"})
    sign_up(app.test_client(), outbox, email="member@example.test")
    member = dev_call(
        "POST",
        f"/organizations/{organization['id']}/members",
        {"email": "member@example.test", "role": "viewer"},
    )["member"]
    dev_call("PATCH", f"/organizations/{organization['id']}/members/{member['id']}", {"apps": [client_id]})
    dev_call("DELETE", f"/organizations/{organization['id']}/members/{member['id']}")
    dev_call("GET", f"/organizations/{organization['id']}")
    dev_call("DELETE", f"/organizations/{organization['id']}/test-users/t@example.test")
    dev_call("DELETE", f"/organizations/{organization['id']}/keys/{key['key']['id']}")
    dev_call("GET", "/organizations/not-a-organization")

    def admin(method: str, path: str, body: Any = None) -> Any:
        return check(
            method, template("/admin/api" + path), admin_call(owner_browser, owner, method, path, body)
        )

    admin("GET", "/overview")
    admin("GET", "/reviews")
    admin("POST", f"/apps/{client_id}/review", {"approve": True})
    admin("GET", "/organizations")
    admin("POST", f"/organizations/{organization['id']}/suspend", {"reason": "check"})
    admin("POST", f"/organizations/{organization['id']}/restore")
    users = admin("GET", "/users")["items"]
    admin("GET", f"/users/{users[0]['id']}")
    admin("GET", "/scopes")
    admin("GET", "/clients")
    admin("GET", "/audit")
    dev_call("DELETE", f"/apps/{client_id}")
    dev_call("DELETE", f"/organizations/{organization['id']}")
    assert len(check.checked) >= 25


def test_oauth_answers_match_the_description(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], spec: dict[str, Any]
) -> None:
    check = Checker(spec)
    check("GET", "/.well-known/openid-configuration", browser.get("/.well-known/openid-configuration"))
    check("GET", "/.well-known/jwks.json", browser.get("/.well-known/jwks.json"))

    add_client(app, first_party=True, scope="openid profile email offline_access")
    from conftest import sign_up

    sign_up(browser, outbox)
    verifier, challenge = pkce()
    query = authorize_query(challenge, scope="openid profile email offline_access")
    code = parse_qs(urlparse(browser.get("/oauth/authorize?" + urlencode(query)).location).query)["code"][0]
    tokens = check(
        "POST",
        "/oauth/token",
        browser.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT,
                "client_id": "spa",
                "code_verifier": verifier,
            },
        ),
    )
    check(
        "POST",
        "/oauth/token",
        browser.post("/oauth/token", data={"grant_type": "authorization_code", "code": "x"}),
    )
    bearer = {"Authorization": f"Bearer {tokens['access_token']}"}
    check("GET", "/oauth/userinfo", browser.get("/oauth/userinfo", headers=bearer))
    add_service(app)
    check(
        "POST",
        "/oauth/introspect",
        browser.post(
            "/oauth/introspect",
            data={"token": tokens["access_token"]},
            headers=basic("service", secret_of("service")),
        ),
    )
    add_client(app, client_id="tv", grant_types=["urn:ietf:params:oauth:grant-type:device_code"])
    check(
        "POST",
        "/oauth/device_authorization",
        browser.post("/oauth/device_authorization", data={"client_id": "tv"}),
    )
    check(
        "POST",
        "/oauth/revoke",
        browser.post("/oauth/revoke", data={"token": tokens["refresh_token"], "client_id": "spa"}),
    )
    assert len(check.checked) == 8


def test_review_flow_shapes(
    app: Flask, outbox: list[mail.Message], spec: dict[str, Any], platform_scopes: None
) -> None:
    check = Checker(spec)
    owner_browser, owner, dev_browser, dev = setup_people(app, outbox)
    _, client_id = app_waiting_for_review(dev_browser, dev, ["phone"])
    reviews = admin_call(owner_browser, owner, "GET", "/reviews")
    check("GET", "/admin/api/reviews", reviews)
    rejected = admin_call(
        owner_browser, owner, "POST", f"/apps/{client_id}/review", {"approve": False, "note": "why"}
    )
    check("POST", "/admin/api/apps/{client_id}/review", rejected)
