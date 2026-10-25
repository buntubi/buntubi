"""Opening sign-up from an app (`prompt=create`) and naming the address to sign in with (`login_hint`)."""

from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from flask.testing import FlaskClient

from buntubi.services import mail

from conftest import REDIRECT, add_client, authorize_query, page_config, pkce, sign_up


def _kept_return(browser: FlaskClient) -> str:
    with browser.session_transaction() as session:
        values = [value for value in session.values() if isinstance(value, str)]
    kept = [value for value in values if value.startswith("/oauth/authorize")]
    assert kept, "no way back to the app was kept"
    return kept[0]


def test_discovery_offers_prompt_create(browser: FlaskClient) -> None:
    assert "create" in browser.get("/.well-known/openid-configuration").json["prompt_values_supported"]


def test_prompt_create_opens_sign_up_and_keeps_the_way_back(app: Flask, browser: FlaskClient) -> None:
    add_client(app, first_party=True)
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, prompt="create")))
    assert reply.status_code == 302 and urlparse(reply.location).path == "/signup"
    back = parse_qs(urlparse(_kept_return(browser)).query)
    assert "prompt" not in back, "coming back from sign-up must not open it again"
    assert back["client_id"] == ["spa"] and back["state"] == ["s1"]


def test_prompt_create_with_a_session_carries_on_to_the_app(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, prompt="create")))
    assert urlparse(reply.location).path != "/signup", "someone signed in already has an account"


def test_prompt_create_with_none_is_refused(app: Flask, browser: FlaskClient) -> None:
    add_client(app, first_party=True)
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, prompt="none create")))
    params = parse_qs(urlparse(reply.location).query)
    assert reply.location.startswith(REDIRECT)
    assert params["error"] == ["invalid_request"] and params["state"] == ["s1"]


def test_login_hint_fills_the_email_on_sign_in_and_sign_up(app: Flask, browser: FlaskClient) -> None:
    add_client(app, first_party=True)
    _, challenge = pkce()
    for prompt, page in (("", "/signin"), ("create", "/signup")):
        extra = {"login_hint": "Awa@Example.test", **({"prompt": prompt} if prompt else {})}
        reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, **extra)))
        target = urlparse(reply.location)
        assert target.path == page
        assert page_config(browser, f"{target.path}?{target.query}")["props"]["email"] == "awa@example.test"


def test_a_login_hint_that_is_not_an_address_is_ignored(browser: FlaskClient) -> None:
    for hint in ("not an address", "a@b", "x" * 300 + "@example.test", "awa@example.test\n"):
        assert page_config(browser, "/signin?" + urlencode({"login_hint": hint}))["props"]["email"] is None
