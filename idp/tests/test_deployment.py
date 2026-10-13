"""How the provider runs in production: it refuses settings that only make sense on a developer's
machine, sees the client's address through the proxies it is told to trust and no further, and
tells browsers to keep to HTTPS."""

from typing import Any

import pytest
from flask import jsonify, request

from idp.app import create_app
from idp.config import Settings, get_settings

PUBLIC = {
    "issuer": "https://id.acme.example",
    "email_test_mode": False,
    "secure_cookies": True,
    "rate_limit_storage": "memory://",
}


def _settings(**changes: Any) -> Settings:
    return get_settings().model_copy(update={**PUBLIC, **changes})


@pytest.mark.parametrize(
    ("changes", "named"),
    [
        ({"email_test_mode": True}, "IDP_EMAIL_TEST_MODE"),
        ({"secure_cookies": False}, "IDP_SECURE_COOKIES"),
        ({"issuer": "http://id.acme.example"}, "IDP_ISSUER"),
        ({"issuer": "http://localhost.acme.example"}, "IDP_ISSUER"),
    ],
)
def test_a_public_provider_refuses_development_settings(changes: dict[str, Any], named: str) -> None:
    with pytest.raises(RuntimeError, match=named):
        create_app(_settings(**changes))


def test_limits_in_memory_must_be_chosen() -> None:
    chosen = _settings()
    assert "rate_limit_storage" in chosen.model_fields_set
    create_app(chosen)
    fields = {k: v for k, v in {**get_settings().model_dump(), **PUBLIC}.items() if k != "rate_limit_storage"}
    defaulted = Settings.model_construct(_fields_set=set(fields), **fields, rate_limit_storage="memory://")
    with pytest.raises(RuntimeError, match="IDP_RATE_LIMIT_STORAGE"):
        create_app(defaulted)


def test_the_development_defaults_still_start() -> None:
    assert get_settings().local
    create_app(get_settings())


def _seen(trusted: int, forwarded: str) -> Any:
    app = create_app(_settings(trusted_proxies=trusted))

    @app.get("/_seen")
    def seen() -> Any:
        return jsonify(ip=request.remote_addr, scheme=request.scheme)

    return (
        app.test_client()
        .get(
            "/_seen",
            headers={"X-Forwarded-For": forwarded, "X-Forwarded-Proto": "https"},
            environ_base={"REMOTE_ADDR": "10.0.0.2"},
        )
        .json
    )


def test_the_client_address_comes_through_trusted_proxies_only() -> None:
    assert _seen(0, "203.0.113.9") == {"ip": "10.0.0.2", "scheme": "http"}, "no proxy: headers ignored"
    assert _seen(1, "203.0.113.9") == {"ip": "203.0.113.9", "scheme": "https"}
    # A client writing its own X-Forwarded-For gets only the address the proxy appended.
    assert _seen(1, "1.2.3.4, 203.0.113.9")["ip"] == "203.0.113.9"


def test_https_is_kept_by_the_browser() -> None:
    app = create_app(_settings())
    assert app.test_client().get("/signin").headers["Strict-Transport-Security"] == "max-age=31536000"
    local = create_app(get_settings())
    assert "Strict-Transport-Security" not in local.test_client().get("/signin").headers


def test_the_health_check_says_only_up_or_down(app: Any) -> None:
    reply = app.test_client().get("/healthz")
    assert (reply.status_code, reply.get_data(as_text=True)) == (200, "ok")
