"""The authorization code flow under attack: codes replayed, redeemed by the wrong client or for
the wrong address, without their verifier, after they expire, twice at once; redirect addresses
that only look registered; response types this provider does not offer."""

import threading
from datetime import timedelta
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select, update
from test_authorization_code import exchange, get_code

from buntubi.db import db, utcnow
from buntubi.models import AuthorizationCode
from buntubi.services import mail, sessions

from conftest import ISSUER, REDIRECT, add_client, api, authorize_query, pkce, sign_up

OTHER_REDIRECT = "http://localhost:9000/other"


def _code(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], **client: Any
) -> tuple[str, str, str]:
    """A fresh code for the `spa` client: (code, verifier, csrf)."""
    add_client(app, **client)
    csrf = sign_up(browser, outbox)
    verifier, challenge = pkce()
    return get_code(browser, csrf, challenge), verifier, csrf


def _token(browser: FlaskClient, **form: str) -> Any:
    return browser.post("/oauth/token", data={"grant_type": "authorization_code", **form})


def test_a_code_works_once(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    code, verifier, _ = _code(app, browser, outbox)
    assert exchange(browser, code, verifier).status_code == 200
    again = exchange(browser, code, verifier)
    assert again.status_code == 400 and again.json["error"] == "invalid_grant"


def test_a_replayed_code_revokes_the_tokens_it_gave(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # RFC 9700 4.4.1 and OAuth 2.1: a code used twice means it leaked; what it gave is withdrawn.
    code, verifier, _ = _code(app, browser, outbox)
    first = exchange(browser, code, verifier).json
    exchange(browser, code, verifier)
    renewed = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": first["refresh_token"], "client_id": "spa"},
    )
    assert renewed.status_code == 400, "the refresh token from the first use still works"
    userinfo = browser.get("/oauth/userinfo", headers={"Authorization": f"Bearer {first['access_token']}"})
    assert userinfo.status_code == 401, "the access token from the first use still works"


def test_a_code_belongs_to_its_client(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    code, verifier, _ = _code(app, browser, outbox)
    add_client(app, client_id="other", name="Other app")
    stolen = _token(browser, code=code, redirect_uri=REDIRECT, client_id="other", code_verifier=verifier)
    assert stolen.status_code == 400 and stolen.json["error"] == "invalid_grant"


def test_a_code_belongs_to_its_redirect_address(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    code, verifier, _ = _code(app, browser, outbox, redirect_uris=[REDIRECT, OTHER_REDIRECT])
    elsewhere = _token(
        browser, code=code, redirect_uri=OTHER_REDIRECT, client_id="spa", code_verifier=verifier
    )
    assert elsewhere.status_code == 400 and elsewhere.json["error"] == "invalid_grant"
    missing = _token(browser, code=code, client_id="spa", code_verifier=verifier)
    assert missing.status_code == 400, "the redirect address was in the request, so it is required"


@pytest.mark.parametrize("verifier", ["", "x" * 43, "wrong-but-long-enough-" * 3])
def test_a_code_needs_its_own_verifier(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], verifier: str
) -> None:
    code, _, _ = _code(app, browser, outbox)
    form = {"code": code, "redirect_uri": REDIRECT, "client_id": "spa"}
    if verifier:
        form["code_verifier"] = verifier
    refused = _token(browser, **form)
    assert refused.status_code == 400 and refused.json["error"] in ("invalid_grant", "invalid_request")


def test_an_expired_code_is_refused(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    code, verifier, _ = _code(app, browser, outbox)
    with app.app_context():
        db().execute(update(AuthorizationCode).values(expires_at=utcnow() - timedelta(seconds=1)))
        db().commit()
    late = exchange(browser, code, verifier)
    assert late.status_code == 400 and late.json["error"] == "invalid_grant"


def test_a_code_redeemed_twice_at_once_gives_tokens_once(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    code, verifier, _ = _code(app, browser, outbox)
    answers: list[int] = []
    start = threading.Barrier(2)

    def redeem() -> None:
        start.wait()
        answers.append(exchange(app.test_client(), code, verifier).status_code)

    threads = [threading.Thread(target=redeem) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(answers) == [200, 400], answers
    with app.app_context():
        kept = db().scalar(select(AuthorizationCode))
        assert kept is not None and kept.used_at is not None, "kept, marked used, to recognise a replay"


@pytest.mark.parametrize(
    "redirect_uri",
    [
        REDIRECT + "/",
        REDIRECT + "?next=https://evil.example",
        REDIRECT + "#x",
        REDIRECT.upper(),
        REDIRECT.replace("http://", "https://"),
        REDIRECT + "/../evil",
        "http://localhost:9000@evil.example/callback",
        "http://evil.example/callback?localhost:9000/callback",
    ],
)
def test_a_redirect_address_must_match_exactly(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], redirect_uri: str
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    reply = browser.get(
        "/oauth/authorize?" + urlencode(authorize_query(challenge, redirect_uri=redirect_uri))
    )
    assert reply.status_code == 400, (redirect_uri, reply.status_code, reply.location)
    assert not reply.location


@pytest.mark.parametrize("response_type", ["token", "id_token", "code id_token", "code token", "none"])
def test_only_the_code_flow_is_offered(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], response_type: str
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    reply = browser.get(
        "/oauth/authorize?" + urlencode(authorize_query(challenge, response_type=response_type))
    )
    location = reply.location or ""
    assert "access_token" not in location and "id_token=" not in location and "code=" not in location
    if location:
        assert parse_qs(urlparse(location).query).get("error") == ["unsupported_response_type"]


def test_the_answer_names_the_issuer(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    # RFC 9207: an app that talks to several providers checks `iss` to resist mix-up attacks.
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    params = parse_qs(urlparse(reply.location).query)
    assert params.get("iss") == [ISSUER] and params.get("state") == ["s1"]
    metadata = browser.get("/.well-known/openid-configuration").json
    assert metadata.get("authorization_response_iss_parameter_supported") is True


@pytest.mark.parametrize(
    "path",
    ["//evil.example", "/\\evil.example", "https://evil.example", "/\t/evil.example", "/\n/evil.example"],
)
def test_a_return_address_stays_on_this_site(path: str) -> None:
    # Browsers drop tabs and line breaks from addresses, so "/\t/x" is followed as "//x".
    assert not sessions.is_local_path(path)


def test_declining_gives_no_code(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    add_client(app)
    csrf = sign_up(browser, outbox)
    _, challenge = pkce()
    query = authorize_query(challenge)
    browser.get("/oauth/authorize?" + urlencode(query))
    declined = api(browser, "POST", "/oauth/authorize?" + urlencode(query), {"approve": False}, csrf)
    params = parse_qs(urlparse(declined.json["redirect"]).query)
    assert params["error"] == ["access_denied"] and "code" not in params
    assert params["state"] == ["s1"] and params["iss"] == [ISSUER]
