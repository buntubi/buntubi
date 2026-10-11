"""The account area's Devices and Connected apps: listing them, and ending one."""

from datetime import timedelta

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select

from idp.db import db, utcnow
from idp.models import AccessTokenRecord, Client, Consent, RefreshToken, User
from idp.services import mail

from conftest import PASSWORD, add_client, api, page_config, sign_up


def _sign_in(client: FlaskClient) -> None:
    csrf = page_config(client, "/signin")["csrf"]
    body = {"email": "awa@example.test", "password": PASSWORD}
    assert api(client, "POST", "/api/session", body, csrf).status_code == 200


def test_devices_list_and_sign_out_one_or_the_others(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    phone, tablet = app.test_client(), app.test_client()
    for client in (phone, tablet):
        _sign_in(client)
    listed = browser.get("/api/account/devices").json["devices"]
    assert len(listed) == 3 and sum(d["here"] for d in listed) == 1
    here = next(d for d in listed if d["here"])
    assert (
        api(browser, "DELETE", f"/api/account/devices/{here['id']}", None, csrf).json["error"]
        == "this_device"
    )

    other = next(d for d in listed if not d["here"])
    assert api(browser, "DELETE", f"/api/account/devices/{other['id']}", None, csrf).status_code == 200
    assert len(browser.get("/api/account/devices").json["devices"]) == 2
    assert api(browser, "POST", "/api/account/devices/sign-out-others", {}, csrf).status_code == 200
    assert [d["here"] for d in browser.get("/api/account/devices").json["devices"]] == [True]
    assert phone.get("/api/account").status_code == 401 and tablet.get("/api/account").status_code == 401
    kinds = [e["kind"] for e in browser.get("/api/account/activity").json["events"]]
    assert kinds[:2] == ["signed_out_others", "device_signed_out"]


def test_connected_apps_list_and_remove_access(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    add_client(app, client_id="kora", name="Kora Sync")
    add_client(app, client_id="home", name="Home", first_party=True)
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@example.test"))
        kora = db().scalar(select(Client).where(Client.client_id == "kora"))
        home = db().scalar(select(Client).where(Client.client_id == "home"))
        assert user and kora and home
        now = utcnow()
        db().add(Consent(user_id=user.id, client_id=kora.id, scopes=["openid", "profile", "email"]))
        family = kora.id
        db().add(
            RefreshToken(
                token_hash="h" * 64,
                family_id=family,
                client_id=kora.id,
                user_id=user.id,
                scope="openid",
                auth_time=now,
                expires_at=now + timedelta(days=1),
            )
        )
        for client, jti in ((kora, "a1"), (home, "b1")):
            db().add(
                AccessTokenRecord(
                    jti=jti,
                    client_id=client.id,
                    user_id=user.id,
                    refresh_family_id=family if client is kora else None,
                    scope="openid",
                    expires_at=now + timedelta(hours=1),
                )
            )
        db().commit()

    apps = browser.get("/api/account/apps").json["apps"]
    assert {a["id"]: a["platform"] for a in apps} == {"kora": False, "home": True}
    kora_app = next(a for a in apps if a["id"] == "kora")
    assert [s["name"] for s in kora_app["scopes"]] == ["profile", "email"] and kora_app["last_used_at"]

    assert api(browser, "DELETE", "/api/account/apps/home", None, csrf).json["error"] == "platform_app"
    assert api(browser, "DELETE", "/api/account/apps/kora", None, csrf).status_code == 200
    assert [a["id"] for a in browser.get("/api/account/apps").json["apps"]] == ["home"]
    with app.app_context():
        assert db().scalar(select(RefreshToken.revoked_at)) is not None
        assert (
            db().scalar(select(AccessTokenRecord.revoked_at).where(AccessTokenRecord.jti == "a1")) is not None
        )
        assert db().scalar(select(AccessTokenRecord.revoked_at).where(AccessTokenRecord.jti == "b1")) is None
    assert browser.get("/api/account/activity").json["events"][0]["kind"] == "app_access_removed"
