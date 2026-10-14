"""What a developer can make the provider's pages do: a redirect address is where the consent page
sends the browser, so only https, http on this machine, or a native app's own scheme. The same
rule as the portal's form (isRedirectUri in @buntu/sdk/schemas/apps)."""

import json
from typing import Any
from urllib.parse import urlencode, urlparse

import pytest
from flask import Flask
from flask.testing import FlaskClient
from test_developer_api import call, developer_token, new_organization

from idp.services import mail

from conftest import add_client, authorize_query, page_config, pkce, sign_up

REFUSED = [
    "javascript:alert(document.domain)//",
    "JavaScript://shop.example/%0aalert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "http://shop.example/cb",
    "https://shop.example/cb#done",
    " https://shop.example/cb",
    "https://shop.example/c\nb",
    "https:///cb",
    "myapp:/callback",
]
ACCEPTED = [
    "https://shop.example/cb",
    "https://shop.example",
    "http://localhost:8080/cb",
    "http://127.0.0.1/cb",
    "http://[::1]:3000/cb",
    "com.example.app:/callback",
]


@pytest.fixture
def developer(app: Flask, outbox: list[mail.Message]) -> Any:
    browser = app.test_client()
    bearer = developer_token(app, browser, outbox, "dev@example.test")
    call(browser, bearer, "POST", "/terms")
    organization_id = new_organization(browser, bearer)

    def make(uri: str, field: str = "redirect_uris") -> Any:
        return call(
            browser, bearer, "POST", f"/organizations/{organization_id}/apps", {"name": "Web", field: [uri]}
        )

    return make


@pytest.mark.parametrize("uri", REFUSED)
@pytest.mark.parametrize("field", ["redirect_uris", "post_logout_redirect_uris"])
def test_an_address_the_browser_should_not_go_to_is_refused(developer: Any, uri: str, field: str) -> None:
    assert developer(uri, field).status_code == 422, uri


@pytest.mark.parametrize("uri", ACCEPTED)
def test_https_this_machine_and_app_schemes_are_kept_exactly(developer: Any, uri: str) -> None:
    made = developer(uri)
    assert made.status_code == 201, made.json
    assert made.json["app"]["redirect_uris"] == [uri], "compared exactly at sign-in, so stored exactly"


def test_an_app_name_cannot_close_the_page_config(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # The page reads its data from a JSON script element; a name holding </script> must stay text.
    hostile = "</script><script>alert(1)</script><!--"
    add_client(app, name=hostile)
    sign_up(browser, outbox)
    _, challenge = pkce()
    query = authorize_query(challenge, prompt="consent")
    consent = browser.get(
        urlparse(browser.get("/oauth/authorize?" + urlencode(query)).location).path + "?" + urlencode(query)
    )
    html = consent.get_data(as_text=True)
    assert "<script>alert(1)" not in html and "</script><script>" not in html
    assert "\\u003c/script\\u003e" in html, "escaped inside the JSON"
    config = json.dumps(page_config(browser, "/consent?" + urlencode(query)))
    assert json.dumps(hostile)[1:-1] in config, "and read back as the name it is"
