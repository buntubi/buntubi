from collections.abc import Iterator

import pytest
from flask.testing import FlaskClient
from pydantic import ValidationError

from buntubi.config import Settings, get_settings

from conftest import page_config


@pytest.fixture
def branded(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("IDP_BRAND_NAME", "Kora")
    monkeypatch.setenv("IDP_BRAND_ACCENT", "#5b5bd6")
    monkeypatch.setenv("IDP_BRAND_TERMS_URL", "https://kora.example/terms")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_brand_json_lists_the_fields_that_are_set(branded: None, browser: FlaskClient) -> None:
    response = browser.get("/.well-known/brand.json")
    assert response.status_code == 200
    assert response.get_json() == {
        "name": "Kora",
        "accent": "#5b5bd6",
        "terms_url": "https://kora.example/terms",
    }
    assert response.cache_control.public


def test_sign_in_falls_back_to_the_platform_brand(branded: None, browser: FlaskClient) -> None:
    assert page_config(browser, "/signin")["brand"] == {"name": "Kora", "accent": "#5b5bd6"}


def test_an_unset_brand_is_empty(browser: FlaskClient) -> None:
    get_settings.cache_clear()
    assert browser.get("/.well-known/brand.json").get_json() == {}


def test_accent_must_be_a_hex_colour(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("IDP_BRAND_ACCENT", "blue")
    with pytest.raises(ValidationError):
        Settings()  # type: ignore[call-arg]
