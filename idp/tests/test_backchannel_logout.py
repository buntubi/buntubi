"""Back-channel logout: an app that took part in a session is sent a logout token when it ends."""

from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from joserfc import jwt
from joserfc.jwk import KeySet
from test_authorization_code import exchange, get_code

from buntubi.services import backchannel, mail

from conftest import ISSUER, add_client, api, pkce, sign_up

HOOK = "https://app.test/auth/backchannel-logout"


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(backchannel, "deliver", lambda uri, token: calls.append((uri, token)))
    return calls


def _claims(browser: FlaskClient, token: str) -> tuple[dict[str, Any], dict[str, Any]]:
    keys = KeySet.import_key_set(browser.get("/.well-known/jwks.json").json)
    parsed = jwt.decode(token, keys)
    return dict(parsed.header), dict(parsed.claims)


def test_signing_out_tells_the_app_with_a_logout_token(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], sent: list[tuple[str, str]]
) -> None:
    add_client(app, backchannel_logout_uri=HOOK)
    csrf = sign_up(browser, outbox)
    get_code(browser, csrf, pkce()[1])
    me = browser.get("/api/account").json["user"]["id"]

    assert api(browser, "DELETE", "/api/accounts", None, csrf).status_code == 200
    assert [uri for uri, _ in sent] == [HOOK]
    header, claims = _claims(browser, sent[0][1])
    assert header["typ"] == "logout+jwt"
    assert claims["iss"] == ISSUER and claims["aud"] in ("spa", ["spa"]) and claims["sub"] == me
    assert claims["sid"] and "nonce" not in claims
    assert "http://schemas.openid.net/event/backchannel-logout" in claims["events"]


def test_an_app_without_a_back_channel_is_not_told(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], sent: list[tuple[str, str]]
) -> None:
    add_client(app)
    csrf = sign_up(browser, outbox)
    get_code(browser, csrf, pkce()[1])
    api(browser, "DELETE", "/api/accounts", None, csrf)
    assert sent == []


def test_discovery_says_it_is_supported(browser: FlaskClient) -> None:
    metadata = browser.get("/.well-known/openid-configuration").json
    assert (
        metadata["backchannel_logout_supported"] is True
        and metadata["backchannel_logout_session_supported"] is True
    )


def test_an_app_that_only_holds_an_access_token_is_told_too(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], sent: list[tuple[str, str]]
) -> None:
    # Exchanged codes are gone and no refresh token was asked for: the access token remembers.
    add_client(app, backchannel_logout_uri=HOOK, scope="openid profile email")
    csrf = sign_up(browser, outbox)
    verifier, challenge = pkce()
    assert exchange(browser, get_code(browser, csrf, challenge), verifier).status_code == 200
    api(browser, "DELETE", "/api/accounts", None, csrf)
    assert [uri for uri, _ in sent] == [HOOK]


def test_the_id_token_names_the_session_the_logout_names(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], sent: list[tuple[str, str]]
) -> None:
    add_client(app, backchannel_logout_uri=HOOK)
    csrf = sign_up(browser, outbox)
    verifier, challenge = pkce()
    tokens = exchange(browser, get_code(browser, csrf, challenge), verifier).json
    keys = KeySet.import_key_set(browser.get("/.well-known/jwks.json").json)
    sid = jwt.decode(tokens["id_token"], keys).claims["sid"]
    api(browser, "DELETE", "/api/accounts", None, csrf)
    assert _claims(browser, sent[0][1])[1]["sid"] == sid
