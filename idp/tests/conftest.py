"""
Tests run against a real Postgres database (IDP_TEST_DATABASE_URL, default the local idp_test),
migrated once, emptied before each test (the seeded scope catalog stays). Emails are captured instead of sent.
"""

import base64
import hashlib
import json
import os
import re
import secrets
import tempfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import create_engine, text

TEST_DB = os.environ.get("IDP_TEST_DATABASE_URL", "postgresql+psycopg://postgres@localhost:5432/idp_test")
ISSUER = "http://localhost:5002"

os.environ.update(
    IDP_ISSUER=ISSUER,
    IDP_DATABASE_URL=TEST_DB,
    IDP_SECRET_KEY=secrets.token_urlsafe(48),
    IDP_SIGNING_KEYS_DIR=tempfile.mkdtemp(),
    IDP_EMAIL_TEST_MODE="true",
    IDP_SECURE_COOKIES="false",
    IDP_RATE_LIMIT_ENABLED="false",
)

import email_validator  # noqa: E402

# Lets the reserved `.test` domain through, as the library documents for test suites.
email_validator.TEST_ENVIRONMENT = True

from idp.app import create_app  # noqa: E402
from idp.db import db  # noqa: E402
from idp.models import Client  # noqa: E402
from idp.security.keys import generate_key  # noqa: E402
from idp.services import mail  # noqa: E402

generate_key(Path(os.environ["IDP_SIGNING_KEYS_DIR"]))


@pytest.fixture(scope="session")
def app() -> Flask:
    application = create_app()
    application.config.update(TESTING=True)
    return application


@pytest.fixture(autouse=True)
def clean_database() -> Iterator[None]:
    engine = create_engine(TEST_DB)
    with engine.begin() as connection:
        tables = (
            connection.execute(
                text(
                    "select tablename from pg_tables"
                    " where schemaname = 'public' and tablename not in ('alembic_version', 'scopes')"
                )
            )
            .scalars()
            .all()
        )
        connection.execute(text(f"truncate {', '.join(tables)} restart identity cascade"))
    engine.dispose()
    yield


@pytest.fixture
def outbox(monkeypatch: pytest.MonkeyPatch) -> list[mail.Message]:
    sent: list[mail.Message] = []
    monkeypatch.setattr(mail, "send", sent.append)
    return sent


@pytest.fixture
def browser(app: Flask) -> FlaskClient:
    return app.test_client()


def page_config(browser: FlaskClient, path: str) -> dict[str, Any]:
    html = browser.get(path).get_data(as_text=True)
    match = re.search(r'<script type="application/json" id="idp-config">(.*?)</script>', html, re.S)
    assert match, f"no config on {path}"
    config: dict[str, Any] = json.loads(match.group(1))
    return config


def api(
    browser: FlaskClient, method: str, path: str, body: dict[str, Any] | None = None, csrf: str | None = None
) -> Any:
    headers = {"X-CSRF-Token": csrf} if csrf else {}
    return browser.open(path, method=method, json=body, headers=headers)


def pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


REDIRECT = "http://localhost:9000/callback"
PASSWORD = "correct horse battery"


def add_client(app: Flask, **overrides: Any) -> None:
    with app.app_context():
        fields: dict[str, Any] = {
            "client_id": "spa",
            "name": "Test app",
            "client_type": "public",
            "environment": "live",
            "redirect_uris": [REDIRECT],
            "grant_types": ["authorization_code", "refresh_token"],
            "scope": "openid profile email offline_access",
            "token_endpoint_auth_method": "none",
        }
        db().add(Client(**{**fields, **overrides}))
        db().commit()


def sign_up(browser: FlaskClient, outbox: list[mail.Message], email: str = "awa@example.test") -> str:
    csrf = page_config(browser, "/signup")["csrf"]
    reply = api(
        browser,
        "POST",
        "/api/signup",
        {"email": email, "password": PASSWORD, "given_name": "Awa", "family_name": "Diop"},
        csrf,
    )
    assert reply.status_code == 200, reply.json
    assert reply.json["next"] == "verify_email"
    code = re.search(r"\b(\d{6})\b", outbox[-1].text).group(1)  # type: ignore[union-attr]
    verified = api(browser, "POST", "/api/email/verify", {"code": code}, csrf)
    assert verified.status_code == 200, verified.json
    return csrf


def authorize_query(challenge: str, **extra: str) -> dict[str, str]:
    return {
        "response_type": "code",
        "client_id": "spa",
        "redirect_uri": REDIRECT,
        "scope": "openid profile email offline_access",
        "state": "s1",
        "nonce": "n1",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        **extra,
    }
