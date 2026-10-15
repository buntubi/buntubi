"""
Tokens bound to one organization: an app asks for one with `organization`, or requires one and the
person picks it; the tokens then name it and the person's role there, consent is given per
organization, and a person taken out of it, or an organization suspended, gets no new token and
fails introspection.
"""

from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from joserfc import jwt
from joserfc.jwk import KeySet
from sqlalchemy import select
from test_flows import SECRET, add_service, basic

from buntubi.db import db
from buntubi.models import OrganizationMember, User
from buntubi.services import mail
from buntubi.services import platform as p

from conftest import REDIRECT, add_client, api, authorize_query, page_config, pkce, sign_up


def organization(app: Flask, email: str, name: str) -> str:
    """An organization the account with `email` owns."""
    with app.app_context():
        user = db().scalar(select(User).where(User.email == email))
        assert user is not None
        created = p.create_organization(user, name, "", None)
        db().commit()
        return str(created.id)


def join(app: Flask, organization_id: str, email: str, role: str) -> None:
    """Puts the account with `email` in the organization, with `role`, past the API's rules."""
    with app.app_context():
        user = db().scalar(select(User).where(User.email == email))
        assert user is not None
        db().add(OrganizationMember(organization_id=organization_id, user_id=user.id, role=role))
        db().commit()


def authorize(browser: FlaskClient, challenge: str, **extra: str) -> Any:
    return browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, **extra)))


def code_from(browser: FlaskClient, csrf: str, challenge: str, **extra: str) -> str:
    """Through consent when it is asked, to the code."""
    first = authorize(browser, challenge, **extra)
    assert first.status_code == 302, first.get_data(as_text=True)[:300]
    target = urlparse(first.location)
    if target.path == "/consent":
        query = urlencode(authorize_query(challenge, **extra))
        decision = api(browser, "POST", "/oauth/authorize?" + query, {"approve": True}, csrf)
        assert decision.status_code == 200, decision.json
        target = urlparse(decision.json["redirect"])
    params = parse_qs(target.query)
    assert "code" in params, params
    return params["code"][0]


def tokens_for(browser: FlaskClient, csrf: str, **extra: str) -> dict[str, Any]:
    verifier, challenge = pkce()
    code = code_from(browser, csrf, challenge, **extra)
    reply = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "spa",
            "code_verifier": verifier,
        },
    )
    assert reply.status_code == 200, reply.json
    body: dict[str, Any] = reply.json
    return body


def claims(browser: FlaskClient, token: str) -> dict[str, Any]:
    keys = KeySet.import_key_set(browser.get("/.well-known/jwks.json").json)
    found: dict[str, Any] = jwt.decode(token, keys).claims
    return found


def error_of(reply: Any) -> str | None:
    assert reply.status_code == 302, reply.get_data(as_text=True)[:300]
    return parse_qs(urlparse(reply.location).query).get("error", [None])[0]


@pytest.fixture
def awa(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> str:
    """Awa signed in, owner of ACME; the CSRF token of her session."""
    csrf = sign_up(browser, outbox)
    organization(app, "awa@example.test", "ACME")
    return csrf


def acme(app: Flask) -> str:
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        return str(p.memberships_of(user)[0].organization_id)


def test_an_app_without_organizations_refuses_the_parameter(
    app: Flask, browser: FlaskClient, awa: str
) -> None:
    add_client(app)
    _, challenge = pkce()
    assert error_of(authorize(browser, challenge, organization=acme(app))) == "invalid_request"


def test_the_tokens_name_the_organization_and_the_role_there(
    app: Flask, browser: FlaskClient, awa: str
) -> None:
    add_client(app, organization_usage="optional")
    org = acme(app)
    tokens = tokens_for(browser, awa, organization=org)
    access = claims(browser, tokens["access_token"])
    identity = claims(browser, tokens["id_token"])
    assert (access["org_id"], access["org_role"]) == (org, "owner")
    assert (identity["org_id"], identity["org_role"]) == (org, "owner")

    renewed = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"], "client_id": "spa"},
    )
    assert renewed.status_code == 200, renewed.json
    assert claims(browser, renewed.json["access_token"])["org_id"] == org


def test_without_the_parameter_an_optional_app_gets_person_tokens(
    app: Flask, browser: FlaskClient, awa: str
) -> None:
    add_client(app, organization_usage="optional")
    access = claims(browser, tokens_for(browser, awa)["access_token"])
    assert "org_id" not in access and "org_role" not in access


def test_consent_is_given_per_organization(app: Flask, browser: FlaskClient, awa: str) -> None:
    add_client(app, organization_usage="optional")
    first = acme(app)
    tokens_for(browser, awa, organization=first)
    _, challenge = pkce()
    assert urlparse(authorize(browser, challenge, organization=first).location).path != "/consent"
    second = organization(app, "awa@example.test", "Globex")
    _, challenge = pkce()
    assert urlparse(authorize(browser, challenge, organization=second).location).path == "/consent"


def test_an_organization_the_person_is_not_in_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], awa: str
) -> None:
    add_client(app, organization_usage="optional")
    other = FlaskClient(app, use_cookies=True)
    sign_up(other, outbox, email="omar@example.test")
    theirs = organization(app, "omar@example.test", "Initech")
    _, challenge = pkce()
    assert error_of(authorize(browser, challenge, organization=theirs)) == "access_denied"
    _, challenge = pkce()
    assert error_of(authorize(browser, challenge, organization="not-an-id")) == "access_denied"


def test_a_guest_gets_tokens_with_the_guest_role(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], awa: str
) -> None:
    add_client(app, organization_usage="optional")
    org = acme(app)
    guest = FlaskClient(app, use_cookies=True)
    csrf = sign_up(guest, outbox, email="nia@example.test")
    join(app, org, "nia@example.test", "guest")
    assert claims(guest, tokens_for(guest, csrf, organization=org)["access_token"])["org_role"] == "guest"


def test_a_required_organization_is_picked(app: Flask, browser: FlaskClient, awa: str) -> None:
    add_client(app, organization_usage="required")
    # One organization: no question to ask.
    assert claims(browser, tokens_for(browser, awa)["access_token"])["org_id"] == acme(app)
    # Two: the person picks one, then comes back to the same request with it.
    organization(app, "awa@example.test", "Globex")
    _, challenge = pkce()
    asked = authorize(browser, challenge)
    assert asked.status_code == 302 and urlparse(asked.location).path == "/organization"
    listed = page_config(browser, "/organization")["props"]["organizations"]
    assert sorted(o["name"] for o in listed) == ["ACME", "Globex"]
    globex = next(o["id"] for o in listed if o["name"] == "Globex")
    picked = api(browser, "POST", f"/api/organization/{globex}", {}, awa)
    resumed = urlparse(picked.json["redirect"])
    assert resumed.path == "/oauth/authorize" and parse_qs(resumed.query)["organization"] == [globex]
    assert parse_qs(resumed.query)["code_challenge"] == [challenge]
    # The consent screen says which organization the access is for.
    consent = browser.get(resumed.path + "?" + resumed.query)
    assert urlparse(consent.location).path == "/consent"
    assert page_config(browser, consent.location)["props"]["organization"] == "Globex"
    _, challenge = pkce()
    assert error_of(authorize(browser, challenge, prompt="none")) == "interaction_required"


def test_the_picker_resumes_only_a_waiting_request_with_ones_own_organization(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], awa: str
) -> None:
    add_client(app, organization_usage="required")
    organization(app, "awa@example.test", "Globex")
    other = FlaskClient(app, use_cookies=True)
    sign_up(other, outbox, email="omar@example.test")
    theirs = organization(app, "omar@example.test", "Initech")
    # Nothing waiting: nothing to resume.
    assert api(browser, "POST", f"/api/organization/{acme(app)}", {}, awa).status_code == 404
    _, challenge = pkce()
    authorize(browser, challenge)
    assert api(browser, "POST", f"/api/organization/{theirs}", {}, awa).status_code == 404


def test_a_required_organization_with_none_to_pick_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, organization_usage="required")
    sign_up(browser, outbox)
    _, challenge = pkce()
    assert error_of(authorize(browser, challenge)) == "access_denied"


def test_leaving_the_organization_ends_its_tokens(app: Flask, browser: FlaskClient, awa: str) -> None:
    add_client(app, organization_usage="optional")
    add_service(app)
    org = acme(app)
    tokens = tokens_for(browser, awa, organization=org)
    seen = browser.post(
        "/oauth/introspect", data={"token": tokens["access_token"]}, headers=basic("service", SECRET)
    )
    assert (seen.json["active"], seen.json["org_id"], seen.json["org_role"]) == (True, org, "owner")

    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        member = p.memberships_of(user)[0]
        member.role = "member"
        db().commit()
    # Introspection says the role as it is, not as it was when the token was issued.
    seen = browser.post(
        "/oauth/introspect", data={"token": tokens["access_token"]}, headers=basic("service", SECRET)
    )
    assert seen.json["org_role"] == "member"

    with app.app_context():
        db().delete(db().get(OrganizationMember, member.id))
        db().commit()
    seen = browser.post(
        "/oauth/introspect", data={"token": tokens["access_token"]}, headers=basic("service", SECRET)
    )
    assert seen.json == {"active": False}
    renewed = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"], "client_id": "spa"},
    )
    assert renewed.status_code == 400


def test_a_suspended_organization_gets_no_token(app: Flask, browser: FlaskClient, awa: str) -> None:
    add_client(app, organization_usage="optional")
    org = acme(app)
    tokens = tokens_for(browser, awa, organization=org)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        p.memberships_of(user)[0].organization.suspended_at = p.utcnow()
        db().commit()
    _, challenge = pkce()
    assert error_of(authorize(browser, challenge, organization=org)) == "access_denied"
    renewed = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"], "client_id": "spa"},
    )
    assert renewed.status_code == 400
