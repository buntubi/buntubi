"""
A first-party app reads and changes the signed-in person's appearance with the `appearance` scope
(`/v1/appearance`); a third-party app is refused, whatever its token holds.
"""

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from test_organization_tokens import tokens_for

from buntubi.db import db
from buntubi.models import User, WebhookEvent
from buntubi.services import mail
from buntubi.services import platform as p

from conftest import add_client, sign_up

SCOPE = "openid appearance"


def call(
    browser: FlaskClient, csrf: str, method: str, body: dict[str, object] | None = None, scope: str = SCOPE
):
    token = tokens_for(browser, csrf, scope=scope)["access_token"]
    return browser.open(
        "/v1/appearance", method=method, json=body, headers={"Authorization": f"Bearer {token}"}
    )


def test_a_first_party_app_reads_and_changes_the_appearance(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, scope=SCOPE, first_party=True)
    csrf = sign_up(browser, outbox)
    with app.app_context():
        awa = db().scalar(select(User).where(User.email == "awa@example.test"))
        assert awa is not None
        acme = p.create_organization(awa, "ACME", "", None)
        db().commit()
        acme_id = acme.id
    assert call(browser, csrf, "GET").json["appearance"] == {}
    done = call(browser, csrf, "PATCH", {"skin": "glass", "corner": "round"})
    assert done.status_code == 200 and done.json["appearance"] == {"skin": "glass", "corner": "round"}
    assert call(browser, csrf, "PATCH", {"skin": "neon"}).status_code == 400
    assert call(browser, csrf, "PATCH", None).status_code == 400
    with app.app_context():
        heard = (
            db()
            .scalars(
                select(WebhookEvent).where(
                    WebhookEvent.organization_id == acme_id, WebhookEvent.type == "member.updated"
                )
            )
            .all()
        )
        assert [e.data["member"]["profile"]["appearance"] for e in heard] == [
            {"skin": "glass", "corner": "round"}
        ]


def test_a_third_party_app_is_refused(app: Flask, browser: FlaskClient, outbox: list[mail.Message]) -> None:
    add_client(app, scope=SCOPE, first_party=False)
    csrf = sign_up(browser, outbox)
    assert call(browser, csrf, "GET").status_code == 403
    assert call(browser, csrf, "PATCH", {"skin": "glass"}).status_code == 403
