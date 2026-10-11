"""Tokens under attack: forged algorithms, foreign keys, wrong types and issuers, tampered and
expired tokens; key rotation; what discovery promises; introspection and revocation across
clients; userinfo per scope."""

import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from joserfc import jwt
from joserfc.jwk import KeySet, RSAKey
from test_flows import SECRET, add_service, basic, secret_of, signed_in_tokens

from idp.oauth.server import key_ring
from idp.security.keys import generate_key
from idp.services import mail

from conftest import ISSUER, REDIRECT, add_client, authorize_query, pkce, sign_up


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _userinfo(browser: FlaskClient, token: str) -> int:
    return browser.get("/oauth/userinfo", headers={"Authorization": f"Bearer {token}"}).status_code


def _claims_of(token: str) -> dict[str, Any]:
    payload = token.split(".")[1]
    claims: dict[str, Any] = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    return claims


def _signed(app: Flask, header: dict[str, Any], claims: dict[str, Any]) -> str:
    """Signed with the provider's real current key: only the header or claims are wrong."""
    with app.app_context():
        key = key_ring().current
        return jwt.encode({"alg": "RS256", "kid": key.kid, **header}, claims, key.key)


# Validation of access tokens


def test_a_token_with_no_signature_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    claims = _claims_of(signed_in_tokens(app, browser, outbox)["access_token"])
    unsigned = (
        f"{_b64(json.dumps({'alg': 'none', 'typ': 'at+jwt'}).encode())}.{_b64(json.dumps(claims).encode())}."
    )
    assert _userinfo(browser, unsigned) == 401


def test_the_public_key_as_an_hmac_secret_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # The classic confusion: HS256 "signed" with the RSA public key, which anyone can fetch.
    tokens = signed_in_tokens(app, browser, outbox)
    claims = _claims_of(tokens["access_token"])
    with app.app_context():
        public = key_ring().current.key.as_pem(private=False)
        kid = key_ring().current.kid
    header = _b64(json.dumps({"alg": "HS256", "typ": "at+jwt", "kid": kid}).encode())
    body = _b64(json.dumps(claims).encode())
    signature = _b64(hmac.new(public, f"{header}.{body}".encode(), hashlib.sha256).digest())
    assert _userinfo(browser, f"{header}.{body}.{signature}") == 401


def test_a_foreign_key_and_an_unknown_kid_are_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    claims = _claims_of(signed_in_tokens(app, browser, outbox)["access_token"])
    foreign = RSAKey.generate_key(2048, private=True)
    with app.app_context():
        kid = key_ring().current.kid
    same_kid = jwt.encode({"alg": "RS256", "typ": "at+jwt", "kid": kid}, claims, foreign)
    unknown_kid = jwt.encode({"alg": "RS256", "typ": "at+jwt", "kid": "nobody"}, claims, foreign)
    no_kid = jwt.encode({"alg": "RS256", "typ": "at+jwt"}, claims, foreign)
    assert _userinfo(browser, same_kid) == 401
    assert _userinfo(browser, unknown_kid) == 401
    assert _userinfo(browser, no_kid) == 401


def test_a_tampered_token_is_refused(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    token = signed_in_tokens(app, browser, outbox)["access_token"]
    header, payload, signature = token.split(".")
    claims = _claims_of(token)
    claims["scope"] = claims["scope"] + " admin"
    assert _userinfo(browser, f"{header}.{_b64(json.dumps(claims).encode())}.{signature}") == 401


@pytest.mark.parametrize(
    "change",
    [
        {"header": {"typ": "JWT"}},
        {"header": {"typ": "logout+jwt"}},
        {"claims": {"iss": "https://evil.example"}},
        {"claims": {"exp": int(time.time()) - 5}},
        {"claims": {"jti": None}},
        {"claims": {"jti": "not-a-recorded-jti"}},
    ],
)
def test_a_validly_signed_token_with_the_wrong_type_or_claims_is_refused(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], change: dict[str, dict[str, Any]]
) -> None:
    claims = _claims_of(signed_in_tokens(app, browser, outbox)["access_token"])
    claims.update(change.get("claims", {}))
    claims = {k: v for k, v in claims.items() if v is not None}
    token = _signed(app, {"typ": "at+jwt", **change.get("header", {})}, claims)
    assert _userinfo(browser, token) == 401


def test_an_id_token_is_not_an_access_token(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    assert _userinfo(browser, tokens["id_token"]) == 401


def test_a_refused_bearer_says_why_in_www_authenticate(app: Flask, browser: FlaskClient) -> None:
    reply = browser.get("/oauth/userinfo", headers={"Authorization": "Bearer nonsense"})
    assert reply.status_code == 401 and "Bearer" in reply.headers.get("WWW-Authenticate", "")


# Signing keys


def test_a_new_key_signs_and_old_tokens_still_verify_until_it_is_removed(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    old = signed_in_tokens(app, browser, outbox)
    keys_dir = Path(os.environ["IDP_SIGNING_KEYS_DIR"])
    old_kid = jwt.decode(
        old["access_token"], KeySet.import_key_set(browser.get("/.well-known/jwks.json").json)
    ).header["kid"]
    time.sleep(1.1)  # keys are ordered by their creation second
    new_path = generate_key(keys_dir)
    try:
        app.extensions.pop("idp.keys", None)  # what a restart does
        jwks = browser.get("/.well-known/jwks.json").json
        kids = [k["kid"] for k in jwks["keys"]]
        assert old_kid in kids and new_path.stem in kids
        assert all(not {"d", "p", "q", "dp", "dq", "qi"} & k.keys() for k in jwks["keys"]), (
            "private parts published"
        )
        assert _userinfo(browser, old["access_token"]) == 200, "a token from the old key still verifies"
        renewed = browser.post(
            "/oauth/token",
            data={"grant_type": "refresh_token", "refresh_token": old["refresh_token"], "client_id": "spa"},
        ).json
        assert jwt.decode(renewed["access_token"], KeySet.import_key_set(jwks)).header["kid"] == new_path.stem
        (keys_dir / f"{old_kid}.json").rename(keys_dir / f"{old_kid}.retired")
        app.extensions.pop("idp.keys", None)
        assert _userinfo(browser, old["access_token"]) == 401, "the removed key no longer verifies"
        assert _userinfo(browser, renewed["access_token"]) == 200
    finally:
        retired = keys_dir / f"{old_kid}.retired"
        if retired.exists():
            retired.rename(keys_dir / f"{old_kid}.json")
        new_path.unlink()
        app.extensions.pop("idp.keys", None)


# Discovery


def test_discovery_promises_only_what_answers(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    meta = browser.get("/.well-known/openid-configuration").json
    assert meta["issuer"] == ISSUER
    for field in (
        "token_endpoint",
        "userinfo_endpoint",
        "jwks_uri",
        "revocation_endpoint",
        "introspection_endpoint",
    ):
        assert meta[field].startswith(ISSUER + "/"), field
    assert browser.get(meta["jwks_uri"].removeprefix(ISSUER)).status_code == 200
    assert meta["response_types_supported"] == ["code"]
    assert "none" not in meta["id_token_signing_alg_values_supported"]
    tokens = signed_in_tokens(app, browser, outbox)
    assert (
        _claims_of(tokens["access_token"])["iss"] == meta["issuer"] == _claims_of(tokens["id_token"])["iss"]
    )


def test_every_claim_userinfo_gives_is_advertised(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    meta = browser.get("/.well-known/openid-configuration").json
    for claim in (
        "email",
        "email_verified",
        "phone_number",
        "phone_number_verified",
        "address",
        "updated_at",
    ):
        assert claim in meta["claims_supported"], claim
    for scope in ("phone", "address", "offline_access"):
        assert scope in meta["scopes_supported"], scope


# Introspection and revocation


def test_introspection_does_not_tell_one_app_about_another_apps_tokens(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    add_service(app, client_id="third", first_party=False)
    look = browser.post(
        "/oauth/introspect",
        data={"token": tokens["access_token"]},
        headers=basic("third", secret_of("third")),
    )
    assert look.status_code == 200 and look.json == {"active": False}


def test_introspection_says_inactive_for_used_refresh_tokens(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    add_service(app)
    browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"], "client_id": "spa"},
    )
    look = browser.post(
        "/oauth/introspect", data={"token": tokens["refresh_token"]}, headers=basic("service", SECRET)
    )
    assert look.json == {"active": False}


def test_an_app_cannot_revoke_another_apps_tokens(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    tokens = signed_in_tokens(app, browser, outbox)
    add_client(app, client_id="rival", name="Rival app")
    browser.post("/oauth/revoke", data={"token": tokens["refresh_token"], "client_id": "rival"})
    browser.post("/oauth/revoke", data={"token": tokens["access_token"], "client_id": "rival"})
    assert _userinfo(browser, tokens["access_token"]) == 200, "another app revoked this access token"
    renewed = browser.post(
        "/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"], "client_id": "spa"},
    )
    assert renewed.status_code == 200, "another app revoked this refresh token"


# Userinfo


@pytest.mark.parametrize(
    ("scope", "present", "absent"),
    [
        ("openid", {"sub"}, {"email", "name", "phone_number", "address"}),
        ("openid email", {"sub", "email", "email_verified"}, {"name", "phone_number"}),
        ("openid profile", {"sub", "name", "locale"}, {"email"}),
    ],
)
def test_userinfo_gives_only_what_the_scope_allows(
    app: Flask,
    browser: FlaskClient,
    outbox: list[mail.Message],
    scope: str,
    present: set[str],
    absent: set[str],
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    verifier, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, scope=scope)))
    code = parse_qs(urlparse(reply.location).query)["code"][0]
    token = browser.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
            "client_id": "spa",
            "code_verifier": verifier,
        },
    ).json["access_token"]
    info = browser.get("/oauth/userinfo", headers={"Authorization": f"Bearer {token}"}).json
    assert present <= info.keys() and not absent & info.keys(), info


def test_userinfo_needs_the_openid_scope(app: Flask, browser: FlaskClient) -> None:
    add_service(app)
    token = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "scope": "read"},
        headers=basic("service", SECRET),
    ).json["access_token"]
    assert _userinfo(browser, token) in (401, 403)
