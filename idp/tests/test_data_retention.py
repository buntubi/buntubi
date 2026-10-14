"""What the provider keeps about a person, and for how long: the export carries every category,
a deleted account leaves a trail without who it was whichever way it was deleted, and pruning
removes only what has stopped working."""

from datetime import timedelta
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Text, cast, select, update
from test_offline_access import _renew, _sign_out, _tokens

from buntubi import plugins
from buntubi.db import db, utcnow
from buntubi.models import AuditEvent, Identity, LoginSession, RefreshToken, User
from buntubi.plugins import Plugin
from buntubi.services import audit, mail, retention

from conftest import add_client, api, sign_up

EMAIL = "awa@example.test"


class Listener(Plugin):
    id = "listener"
    version = "1"

    def __init__(self) -> None:
        self.events: list[str] = []

    def on_event(self, name: str, payload: dict[str, Any]) -> None:
        self.events.append(name)


@pytest.fixture
def listener() -> Any:
    plugin = Listener()
    plugins.use([plugin])
    yield plugin
    plugins.use([])


def _user_id(app: Flask) -> Any:
    with app.app_context():
        return db().scalar(select(User.id).where(User.email == EMAIL))


def test_the_export_carries_every_category(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    csrf = sign_up(browser, outbox)
    with app.app_context():
        db().add(Identity(user_id=_user_id(app), provider="google", subject="g-1", email="awa@gmail.example"))
        db().commit()
    data = api(browser, "GET", "/api/account/export", None, csrf).json
    for key in ("profile", "pending_email", "linked_accounts", "two_step", "passkeys", "devices"):
        assert key in data, key
    for key in ("connected_apps", "organizations", "activity", "developer_since"):
        assert key in data, key
    assert data["linked_accounts"][0]["provider"] == "google"
    assert data["two_step"] == {"authenticator_app_since": None, "backup_codes_left": 0}


def test_deleting_from_the_command_line_tells_apps_and_plugins_and_forgets_who(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], listener: Listener
) -> None:
    sign_up(browser, outbox)
    user_id = _user_id(app)
    with app.app_context():
        mine = list(db().scalars(select(AuditEvent.id).where(AuditEvent.user_id == user_id)))
        assert mine and db().scalar(select(AuditEvent.ip).where(AuditEvent.id == mine[0])), (
            "a trail with addresses"
        )
        audit.record("member.invited", email=EMAIL, organization="x")  # another row naming them
        db().commit()

    result = app.test_cli_runner().invoke(args=["users", "delete", EMAIL, "--yes"])
    assert result.exit_code == 0, result.output
    assert "user.deleted" in listener.events, "plugins hear of it"

    with app.app_context():
        for row in db().scalars(select(AuditEvent).where(AuditEvent.id.in_(mine))):
            assert (row.user_id, row.ip, row.user_agent, row.details) == (None, None, None, {}), row.event
        assert not db().scalar(select(AuditEvent.id).where(cast(AuditEvent.details, Text).contains(EMAIL)))
        deleted = db().scalar(select(AuditEvent).where(AuditEvent.event == "account.deleted"))
        assert deleted is not None and deleted.details == {"source": "cli", "account": str(user_id)}


def test_deleting_your_own_account_forgets_who_too(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message], listener: Listener
) -> None:
    csrf = sign_up(browser, outbox)
    assert api(browser, "DELETE", "/api/account", {"email": EMAIL}, csrf).status_code == 200
    with app.app_context():
        assert not db().scalar(select(AuditEvent.id).where(cast(AuditEvent.details, Text).contains(EMAIL)))
        assert not db().scalar(
            select(AuditEvent.id).where(AuditEvent.ip.is_not(None), AuditEvent.user_id.is_(None))
        )
    assert "user.deleted" in listener.events


def test_pruning_removes_only_what_stopped_working(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    add_client(app, first_party=True)
    csrf = sign_up(browser, outbox)
    online = _tokens(browser, "spa", "openid profile")
    offline = _tokens(browser, "spa", "openid profile offline_access")
    _sign_out(browser, csrf)
    now = utcnow()
    with app.app_context():
        db().execute(update(LoginSession).values(revoked_at=now - timedelta(days=40)))
        db().add(AuditEvent(event="old", at=now - timedelta(days=400)))
        db().add(AuditEvent(event="recent", at=now - timedelta(days=10)))
        db().commit()
        removed = retention.prune()
        assert removed["login_sessions"] == 1 and removed["audit_events"] == 1
        assert db().scalar(select(AuditEvent.id).where(AuditEvent.event == "recent"))
    assert _renew(app, "spa", online["refresh_token"]) == 400, "online access did not come back unbound"
    assert _renew(app, "spa", offline["refresh_token"]) == 200, "offline access outlives the sign-in"


def test_a_family_with_a_live_token_keeps_its_old_ones(
    app: Flask, browser: FlaskClient, outbox: list[mail.Message]
) -> None:
    # A copied token must still be recognized while its family lives, to revoke the family.
    add_client(app, first_party=True)
    sign_up(browser, outbox)
    first = _tokens(browser, "spa", "openid profile offline_access")["refresh_token"]
    renewed = (
        app.test_client()
        .post(
            "/oauth/token", data={"grant_type": "refresh_token", "refresh_token": first, "client_id": "spa"}
        )
        .json["refresh_token"]
    )
    past = utcnow() - timedelta(days=3)
    with app.app_context():
        old = db().scalar(select(RefreshToken).where(RefreshToken.rotated_at.is_not(None)))
        assert old is not None
        old.expires_at, old.rotated_at = past, past
        db().commit()
        retention.prune()
    assert _renew(app, "spa", first) == 400
    assert _renew(app, "spa", renewed) == 400, "the replay was recognized and ended the family"
