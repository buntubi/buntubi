"""Where the platform meets sign-in: the sandbox gate, consent, the env claim, API key checks."""

import base64
import json
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from flask.testing import FlaskClient
from test_developer_api import call, developer_token
from test_flows import add_service, basic, secret_of

from idp.db import db, utcnow
from idp.models import ApiKey, Project
from idp.services import mail

from conftest import REDIRECT, api, authorize_query, page_config, pkce, sign_up


def sandbox_app(app: Flask, outbox: list[mail.Message]) -> tuple[FlaskClient, dict[str, str], str, str]:
    """A developer (dev@example.test) with a project and a public sandbox app redirecting to REDIRECT."""
    dev_browser = app.test_client()
    dev = developer_token(app, dev_browser, outbox, "dev@example.test")
    call(dev_browser, dev, "POST", "/terms")
    project_id = call(dev_browser, dev, "POST", "/projects", {"name": "Shop"}).json["project"]["id"]
    client_id = call(
        dev_browser,
        dev,
        "POST",
        f"/projects/{project_id}/apps",
        {"name": "Shop web", "redirect_uris": [REDIRECT], "scopes": ["profile", "email"]},
    ).json["app"]["client_id"]
    return dev_browser, dev, project_id, client_id


def authorize(browser: FlaskClient, client_id: str, **extra: str) -> tuple[Any, str]:
    verifier, challenge = pkce()
    query = authorize_query(challenge, client_id=client_id, **{"scope": "openid profile email", **extra})
    return browser.get("/oauth/authorize?" + urlencode(query)), verifier


def config_of(response: Any) -> dict[str, Any]:
    html = response.get_data(as_text=True)
    start = html.index('id="idp-config">') + len('id="idp-config">')
    config: dict[str, Any] = json.loads(html[start : html.index("</script>", start)])
    return config


def test_a_sandbox_app_is_closed_to_everyone_but_its_test_users(
    app: Flask, outbox: list[mail.Message]
) -> None:
    dev_browser, dev, project_id, client_id = sandbox_app(app, outbox)
    visitor = app.test_client()
    sign_up(visitor, outbox, email="visitor@example.test")

    blocked, _ = authorize(visitor, client_id)
    assert blocked.status_code == 403
    config = config_of(blocked)
    assert config["element"] == "idp-blocked" and config["props"]["client"]["name"] == "Shop web"
    silent, _ = authorize(visitor, client_id, prompt="none")
    assert parse_qs(urlparse(silent.location).query)["error"] == ["access_denied"]

    call(dev_browser, dev, "POST", f"/projects/{project_id}/test-users", {"email": "visitor@example.test"})
    allowed, _ = authorize(visitor, client_id)
    assert allowed.status_code == 302 and urlparse(allowed.location).path == "/consent"
    consent = visitor.get(allowed.location)
    assert config_of(consent)["props"]["client"]["verified"] is False


def test_the_owner_may_try_their_sandbox_app_and_tokens_say_sandbox(
    app: Flask, outbox: list[mail.Message]
) -> None:
    dev_browser, _, _, client_id = sandbox_app(app, outbox)
    first, verifier = authorize(dev_browser, client_id)
    assert urlparse(first.location).path == "/consent"
    csrf = page_config(dev_browser, first.location)["csrf"]
    query = urlparse(first.location).query
    decision = api(dev_browser, "POST", f"/oauth/authorize?{query}", {"approve": True}, csrf)
    code = parse_qs(urlparse(decision.json["redirect"]).query)["code"][0]
    tokens = dev_browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    ).json
    payload = tokens["access_token"].split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    assert claims["env"] == "sandbox" and claims["client_id"] == client_id


def test_platform_apis_check_api_keys_by_introspection(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, project_id, _ = sandbox_app(app, outbox)
    key = call(dev_browser, dev, "POST", f"/projects/{project_id}/keys", {"name": "CI"}).json["api_key"]
    add_service(app)
    add_service(app, client_id="stranger", first_party=False)
    browser = app.test_client()

    def check(api_key: str, client: str = "service", **extra: str) -> Any:
        return browser.post(
            "/oauth/introspect", data={"token": api_key, **extra}, headers=basic(client, secret_of(client))
        ).json

    seen = check(key)
    assert seen["active"] is True and seen["token_type"] == "api_key"
    assert seen["env"] == "sandbox" and seen["project_id"] == project_id
    assert check(key, client="stranger") == {"active": False}, "only the owner's resource servers"
    assert check(key + "x") == {"active": False}
    with app.app_context():
        row = db().query(ApiKey).one()
        assert row.last_used_at is not None
        row.allowed_ips = ["10.0.0.0/8"]
        db().commit()
    assert check(key) == {"active": False}, "limited to some networks, no address given"
    assert check(key, client_ip="10.1.2.3")["active"] is True
    assert check(key, client_ip="192.168.1.1") == {"active": False}

    with app.app_context():
        db().get(Project, project_id).suspended_at = utcnow()  # type: ignore[union-attr]
        db().commit()
    assert check(key, client_ip="10.1.2.3") == {"active": False}, "a suspended project's keys stop"
    with app.app_context():
        project = db().get(Project, project_id)
        assert project is not None
        project.suspended_at = None
        db().query(ApiKey).one().revoked_at = utcnow()
        db().commit()
    assert check(key, client_ip="10.1.2.3") == {"active": False}


def test_a_device_cannot_be_approved_for_a_sandbox_app_by_a_stranger(
    app: Flask, outbox: list[mail.Message]
) -> None:
    dev_browser, dev, project_id, _ = sandbox_app(app, outbox)
    tv = call(
        dev_browser,
        dev,
        "POST",
        f"/projects/{project_id}/apps",
        {"name": "TV", "grant_types": ["urn:ietf:params:oauth:grant-type:device_code"]},
    ).json["app"]["client_id"]
    started = (
        app.test_client().post("/oauth/device_authorization", data={"client_id": tv, "scope": "openid"}).json
    )
    visitor = app.test_client()
    csrf = sign_up(visitor, outbox, email="visitor@example.test")
    refused = api(visitor, "POST", "/api/device", {"user_code": started["user_code"], "approve": True}, csrf)
    assert refused.status_code == 403 and refused.json == {"error": "app_in_sandbox"}


def tokens_through_consent(browser: FlaskClient, client_id: str) -> dict[str, Any]:
    """Signs a signed-in browser through consent for the app and returns its tokens."""
    first, verifier = authorize(browser, client_id, scope="openid profile email offline_access")
    csrf = page_config(browser, first.location)["csrf"]
    decision = api(
        browser, "POST", f"/oauth/authorize?{urlparse(first.location).query}", {"approve": True}, csrf
    )
    code = parse_qs(urlparse(decision.json["redirect"]).query)["code"][0]
    reply = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    assert reply.status_code == 200, reply.json
    tokens: dict[str, Any] = reply.json
    return tokens


def refresh(browser: FlaskClient, client_id: str, token: str) -> Any:
    return browser.post(
        "/oauth/token", data={"grant_type": "refresh_token", "refresh_token": token, "client_id": client_id}
    )


def signed_in_tester(app: Flask, outbox: list[mail.Message]) -> tuple[Any, ...]:
    dev_browser, dev, project_id, client_id = sandbox_app(app, outbox)
    with app.app_context():
        from idp.models import Client

        db().query(Client).filter_by(client_id=client_id).one().scope = "openid profile email offline_access"
        db().commit()
    call(dev_browser, dev, "POST", f"/projects/{project_id}/test-users", {"email": "tester@example.test"})
    tester = app.test_client()
    sign_up(tester, outbox, email="tester@example.test")
    tokens = tokens_through_consent(tester, client_id)
    assert "refresh_token" in tokens
    return dev_browser, dev, project_id, client_id, tester, tokens


def test_removing_a_test_user_ends_their_tokens_at_once(app: Flask, outbox: list[mail.Message]) -> None:
    dev_browser, dev, project_id, client_id, tester, tokens = signed_in_tester(app, outbox)
    bearer = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert tester.get("/oauth/userinfo", headers=bearer).status_code == 200
    add_service(app)

    call(dev_browser, dev, "DELETE", f"/projects/{project_id}/test-users/tester@example.test")
    assert tester.get("/oauth/userinfo", headers=bearer).status_code == 401
    seen = app.test_client().post(
        "/oauth/introspect",
        data={"token": tokens["access_token"]},
        headers=basic("service", secret_of("service")),
    )
    assert seen.json == {"active": False}
    assert refresh(tester, client_id, tokens["refresh_token"]).status_code == 400


def test_refresh_checks_the_sandbox_rule_by_itself(app: Flask, outbox: list[mail.Message]) -> None:
    _, _, project_id, client_id, tester, tokens = signed_in_tester(app, outbox)
    # Taken off without the revocation that normally comes with it: the refresh must still refuse.
    with app.app_context():
        from idp.models import ProjectTestUser

        db().query(ProjectTestUser).filter_by(email="tester@example.test").delete()
        db().commit()
    assert refresh(tester, client_id, tokens["refresh_token"]).status_code == 400


def test_suspending_a_project_revokes_the_tokens_its_apps_hold(
    app: Flask, outbox: list[mail.Message]
) -> None:
    _, _, project_id, _, tester, tokens = signed_in_tester(app, outbox)
    with app.app_context():
        from idp.services import platform

        project = db().get(Project, project_id)
        assert project is not None
        platform.suspend(project, "abuse")
        db().commit()
    assert (
        tester.get(
            "/oauth/userinfo", headers={"Authorization": f"Bearer {tokens['access_token']}"}
        ).status_code
        == 401
    )
