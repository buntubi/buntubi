"""Session Management: authorization answers carry session_state, the check page recomputes it."""

import hashlib
from urllib.parse import parse_qs, urlencode, urlparse

from flask import Flask
from flask.testing import FlaskClient

from buntubi.services import mail
from buntubi.services.session_check import COOKIE

from conftest import REDIRECT, add_client, api, authorize_query, page_config, pkce, sign_up


def browser_state(browser: FlaskClient) -> str:
    cookie = browser.get_cookie(COOKIE)
    return cookie.value if cookie else ""


def check(browser: FlaskClient, session_state: str, origin: str = "http://localhost:9000") -> str:
    """What the check page answers, computed the way its script does."""
    salt = session_state.split(".")[1]
    digest = hashlib.sha256(f"spa {origin} {browser_state(browser)} {salt}".encode()).hexdigest()
    return "unchanged" if f"{digest}.{salt}" == session_state else "changed"


def silent(browser: FlaskClient) -> dict[str, list[str]]:
    _, challenge = pkce()
    reply = browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge, prompt="none")))
    assert reply.status_code == 302 and reply.location.startswith(REDIRECT)
    return parse_qs(urlparse(reply.location).query)


def test_the_provider_advertises_the_check_page(browser: FlaskClient) -> None:
    discovery = browser.get("/.well-known/openid-configuration").json
    assert discovery["check_session_iframe"].endswith("/oauth/check-session")
    page = browser.get("/oauth/check-session")
    assert "frame-ancestors *" in page.headers["Content-Security-Policy"]
    assert "X-Frame-Options" not in page.headers
    assert '<script src="/oauth/check-session.js">' in page.get_data(as_text=True)
    script = browser.get("/oauth/check-session.js")
    assert script.mimetype == "text/javascript" and COOKIE in script.get_data(as_text=True)


def test_an_app_told_nobody_is_signed_in_sees_a_later_sign_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    refused = silent(browser)
    assert refused["error"] == ["login_required"]
    nobody = refused["session_state"][0]
    assert browser_state(browser) == ""
    assert check(browser, nobody) == "unchanged"
    assert check(browser, nobody, origin="https://elsewhere.example") == "changed"

    sign_up(browser, outbox)
    assert browser_state(browser) != ""
    assert check(browser, nobody) == "changed"


def test_a_signed_in_app_sees_a_sign_out_and_a_new_sign_in(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    csrf = sign_up(browser, outbox)
    granted = silent(browser)
    assert "code" in granted
    signed_in = granted["session_state"][0]
    assert check(browser, signed_in) == "unchanged"
    first = browser_state(browser)

    api(browser, "DELETE", "/api/session", None, csrf)
    assert browser_state(browser) == ""
    assert check(browser, signed_in) == "changed"

    csrf = page_config(browser, "/signin")["csrf"]
    api(
        browser,
        "POST",
        "/api/session",
        {"email": "awa@example.test", "password": "correct horse battery"},
        csrf,
    )
    assert browser_state(browser) not in ("", first), "a new login is a new browser state"
    assert check(browser, signed_in) == "changed"
