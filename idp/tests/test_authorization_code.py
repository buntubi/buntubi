"""The authorization code flow end to end, and the ways it must refuse."""

from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from flask.testing import FlaskClient
from joserfc import jwt
from joserfc.jwk import KeySet

from idp.services import mail

from conftest import (
    ISSUER,
    PASSWORD,
    REDIRECT,
    add_client,
    api,
    authorize_query,
    nonce_for,
    page_config,
    pkce,
    sign_up,
)


def get_code(browser: FlaskClient, csrf: str, challenge: str) -> str:
    query = authorize_query(challenge)
    first = browser.get("/oauth/authorize?" + urlencode(query))
    assert first.status_code == 302 and urlparse(first.location).path == "/consent", (
        first.status_code,
        first.get_data(as_text=True)[:300],
    )
    decision = api(browser, "POST", "/oauth/authorize?" + urlencode(query), {"approve": True}, csrf)
    assert decision.status_code == 200, decision.json
    target = urlparse(decision.json["redirect"])
    params = parse_qs(target.query)
    assert f"{target.scheme}://{target.netloc}{target.path}" == REDIRECT
    assert params["state"] == ["s1"]
    return params["code"][0]


def exchange(browser: FlaskClient, code: str, verifier: str) -> Any:
    return browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "spa",
            "code_verifier": verifier,
        },
    )


def test_full_flow(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    add_client(app)
    csrf = sign_up(browser, outbox)
    verifier, challenge = pkce()
    code = get_code(browser, csrf, challenge)

    tokens = exchange(browser, code, verifier)
    assert tokens.status_code == 200, tokens.json
    body = tokens.json
    assert {"access_token", "id_token", "refresh_token", "expires_in"} <= body.keys()

    keys = KeySet.import_key_set(browser.get("/.well-known/jwks.json").json)
    id_token = jwt.decode(body["id_token"], keys)
    assert (
        id_token.claims["iss"] == ISSUER
        and id_token.claims["aud"] in ("spa", ["spa"])
        and id_token.claims["nonce"] == nonce_for(challenge)
    )
    assert id_token.header.get("kid"), "the ID token names its key"
    access = jwt.decode(body["access_token"], keys)
    assert access.header["typ"] == "at+jwt" and access.claims["client_id"] == "spa"
    assert access.claims["sub"] == id_token.claims["sub"]

    info = browser.get("/oauth/userinfo", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert (
        info.status_code == 200
        and info.json["email"] == "awa@example.test"
        and info.json["email_verified"] is True
    )

    # Refresh rotates; presenting the old one again ends the whole family.
    rotated = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": body["refresh_token"], "client_id": "spa"},
    )
    assert rotated.status_code == 200, rotated.json
    newer = rotated.json["refresh_token"]
    assert newer != body["refresh_token"]
    reused = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": body["refresh_token"], "client_id": "spa"},
    )
    assert reused.status_code == 400
    after_reuse = browser.post(
        "/oauth/token", data={"grant_type": "refresh_token", "refresh_token": newer, "client_id": "spa"}
    )
    assert after_reuse.status_code == 400
    revoked_access = browser.get(
        "/oauth/userinfo", headers={"Authorization": f"Bearer {rotated.json['access_token']}"}
    )
    assert revoked_access.status_code == 401

    # The code works once (what a replay revokes: test_authorization_code_attacks).
    assert exchange(browser, code, verifier).status_code == 400


def test_a_wrong_password_and_an_unknown_email_look_alike(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    other = app.test_client()
    csrf = page_config(other, "/signin")["csrf"]
    wrong = api(
        other, "POST", "/api/session", {"email": "awa@example.test", "password": "not the password"}, csrf
    )
    unknown = api(
        other, "POST", "/api/session", {"email": "nobody@example.test", "password": "not the password"}, csrf
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json == unknown.json == {"error": "invalid_credentials"}
    right = api(other, "POST", "/api/session", {"email": "AWA@example.test", "password": PASSWORD}, csrf)
    assert right.status_code == 200 and "redirect" in right.json


def test_state_changes_need_the_csrf_token(browser: FlaskClient) -> None:
    page_config(browser, "/signin")
    assert api(browser, "POST", "/api/session", {"email": "a@b.c", "password": "x"}).status_code == 403
    assert (
        api(browser, "POST", "/api/session", {"email": "a@b.c", "password": "x"}, "forged").status_code == 403
    )


def test_pkce_is_required_and_must_be_s256(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    missing = authorize_query(challenge)
    del missing["code_challenge"], missing["code_challenge_method"]
    plain = authorize_query(challenge, code_challenge_method="plain")
    for query in (missing, plain):
        reply = browser.get("/oauth/authorize?" + urlencode(query))
        # Refused, either directly or by redirecting with the error; never with a code.
        assert "code=" not in (reply.location or "")
        assert reply.status_code == 400 or "error=invalid_request" in (reply.location or "")


def test_an_unregistered_redirect_uri_is_never_followed(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    reply = browser.get(
        "/oauth/authorize?" + urlencode(authorize_query(challenge, redirect_uri="https://evil.example/cb"))
    )
    assert reply.status_code == 400
    assert "evil.example" not in (reply.location or "")


def test_a_first_party_client_skips_consent(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    assert reply.status_code == 302 and reply.location.startswith(REDIRECT + "?code=")


def test_signing_in_resumes_the_authorization_request(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    api(browser, "DELETE", "/api/session", None, page_config(browser, "/signin")["csrf"])
    _, challenge = pkce()
    first = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    assert urlparse(first.location).path == "/signin"
    csrf = page_config(browser, "/signin")["csrf"]
    signed_in = api(
        browser, "POST", "/api/session", {"email": "awa@example.test", "password": PASSWORD}, csrf
    )
    assert signed_in.json["redirect"].startswith("/oauth/authorize?")
    resumed = browser.get(signed_in.json["redirect"])
    assert resumed.location.startswith(REDIRECT + "?code=")
