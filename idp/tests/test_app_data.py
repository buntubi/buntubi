"""What an app keeps about a person for itself: its own object, through its own credentials."""

from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_flows import basic

from buntubi.db import db, utcnow
from buntubi.models import Client, ClientSecret, Consent, User
from buntubi.security.tokens import hash_token
from buntubi.services import mail

from conftest import api, page_config, sign_up

SECRET = "a-long-random-test-secret"


def add_app(client_id: str, *, first_party: bool, scope: str = "app_data") -> None:
    db().add(
        Client(
            client_id=client_id,
            name=client_id.title(),
            first_party=first_party,
            client_type="confidential",
            environment="live",
            secrets=[ClientSecret(secret_hash=hash_token(f"{SECRET}-{client_id}"), prefix=client_id[:10])],
            redirect_uris=[],
            grant_types=["client_credentials"],
            scope=scope,
            token_endpoint_auth_method="client_secret_basic",
        )
    )


def as_app(browser: FlaskClient, client_id: str, method: str, path: str, body: Any = None) -> Any:
    token = browser.post(
        "/oauth/token",
        data={"grant_type": "client_credentials", "scope": "app_data"},
        headers=basic(client_id, f"{SECRET}-{client_id}"),
    )
    assert token.status_code == 200, token.json
    return browser.open(
        path, method=method, json=body, headers={"Authorization": f"Bearer {token.json['access_token']}"}
    )


def _awa(app: Flask) -> User:
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert user is not None
        return user


def test_an_app_keeps_its_own_object_about_a_person(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    with app.app_context():
        add_app("crm", first_party=True)
        db().commit()
    path = f"/v1/app/users/{_awa(app).id}/data"
    assert as_app(browser, "crm", "GET", path).json == {"data": {}, "updated_at": None}
    put = as_app(browser, "crm", "PUT", path, {"plan": "pro", "seats": 3})
    assert put.status_code == 200 and put.json["data"] == {"plan": "pro", "seats": 3}
    patched = as_app(browser, "crm", "PATCH", path, {"seats": None, "tags": ["vip"]})
    assert patched.json["data"] == {"plan": "pro", "tags": ["vip"]}
    assert as_app(browser, "crm", "PUT", path, ["not", "an", "object"]).json["error"] == "invalid_data"
    too_big = as_app(browser, "crm", "PUT", path, {"blob": "x" * 20_000})
    assert too_big.status_code == 413 and too_big.json["error"] == "data_too_large"
    # In the person's export, under the app's name; never in the account summary.
    csrf = page_config(browser, "/account")["csrf"]
    export = browser.get("/api/account/export").get_json(force=True)
    assert export["app_data"][0]["app"] == "Crm" and export["app_data"][0]["data"]["plan"] == "pro"
    assert "app_data" not in browser.get("/api/account").json["user"]
    assert as_app(browser, "crm", "DELETE", path).json == {"removed": True}
    assert as_app(browser, "crm", "GET", path).json["data"] == {}
    assert csrf


def test_an_app_reaches_only_the_people_who_use_it(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox)
    with app.app_context():
        add_app("shop", first_party=False)
        add_app("other", first_party=False)
        db().commit()
    user = _awa(app)
    path = f"/v1/app/users/{user.id}/data"
    assert as_app(browser, "shop", "GET", path).status_code == 404, "no consent yet"
    assert as_app(browser, "shop", "GET", "/v1/app/users/not-an-id/data").status_code == 404
    with app.app_context():
        shop = db().scalar(select(Client).where(Client.client_id == "shop"))
        assert shop is not None
        db().add(Consent(user_id=user.id, client_id=shop.id, scopes=["openid"], granted_at=utcnow()))
        db().commit()
    assert as_app(browser, "shop", "PUT", path, {"note": "mine"}).status_code == 200
    # Another app sees neither the person nor the first app's object.
    assert as_app(browser, "other", "GET", path).status_code == 404


def test_without_the_app_token_it_answers_401(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    # Signed in as the person, with the page's session: still not the app's token.
    assert api(browser, "GET", f"/v1/app/users/{_awa(app).id}/data", None, csrf).status_code == 401
