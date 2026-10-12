"""What a developer can make the provider's pages do: a redirect address is where the consent page
sends the browser, so only https, http on this machine, or a native app's own scheme. The same
rule as the portal's form (isRedirectUri in @idp/sdk/schemas/apps)."""

from typing import Any

import pytest
from flask import Flask
from test_developer_api import call, developer_token, new_organization

from idp.services import mail

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
