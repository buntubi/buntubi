"""The operator's commands for admins: create, list, promote, demote."""

from flask import Flask

from idp.db import db
from idp.models import AuditEvent, User
from idp.services import mail

from conftest import sign_up


def run(app: Flask, *args: str, input: str | None = None) -> str:
    result = app.test_cli_runner().invoke(args=list(args), input=input)
    return result.output


def test_admin_create_makes_a_verified_superadmin(app: Flask) -> None:
    out = run(
        app,
        "admin",
        "create",
        "--email",
        "Owner@Example.com",
        "--given-name",
        "Ibra",
        "--family-name",
        "Owner",
        "--password",
        "a long owner passphrase",
    )
    assert "Created owner@example.com, superadmin." in out
    assert "/account" in out, "says what comes next"
    with app.app_context():
        user = db().query(User).filter_by(email="owner@example.com").one()
        assert user.is_admin and user.is_superadmin and user.email_verified and user.password_hash
        assert db().query(AuditEvent).filter_by(event="admin.account_created").count() == 1

    again = run(
        app,
        "admin",
        "create",
        "--email",
        "owner@example.com",
        "--given-name",
        "x",
        "--family-name",
        "y",
        "--password",
        "a long owner passphrase",
    )
    assert "users promote owner@example.com" in again


def test_admin_create_checks_what_sign_up_checks(app: Flask) -> None:
    bad_email = run(
        app,
        "admin",
        "create",
        "--email",
        "not an email",
        "--given-name",
        "x",
        "--family-name",
        "y",
        "--password",
        "a long owner passphrase",
    )
    assert "not a valid email" in bad_email
    short = run(
        app,
        "admin",
        "create",
        "--email",
        "owner@example.com",
        "--given-name",
        "x",
        "--family-name",
        "y",
        "--password",
        "short",
    )
    assert "10 to 256 characters" in short


def test_the_password_is_asked_twice_and_hidden(app: Flask) -> None:
    out = run(
        app,
        "admin",
        "create",
        "--email",
        "owner@example.com",
        "--given-name",
        "x",
        "--family-name",
        "y",
        input="a long owner passphrase\na long owner passphrase\n",
    )
    assert "Created owner@example.com" in out
    assert "a long owner passphrase" not in out


def test_listing_promoting_and_demoting(app: Flask, outbox: list[mail.Message]) -> None:
    assert "No admin" in run(app, "users", "admins")
    sign_up(app.test_client(), outbox, email="dev@example.test")
    promoted = run(app, "users", "promote", "dev@example.test")
    assert "is an admin" in promoted and "two-step sign-in" in promoted
    listed = run(app, "users", "admins")
    assert "dev@example.test" in listed and "two-step OFF" in listed

    demoted = run(app, "users", "demote", "dev@example.test")
    assert "no longer an admin" in demoted and "No admin remains" in demoted
    with app.app_context():
        events = {e.event for e in db().query(AuditEvent)}
        assert {"admin.role_granted", "admin.role_removed"} <= events
    assert "no account" in run(app, "users", "demote", "nobody@example.test")


def test_users_delete_removes_accounts_and_the_organizations_they_alone_ran(app: Flask, outbox: list) -> None:
    from test_platform_gates import sandbox_app

    from idp.models import Client, Organization

    sandbox_app(app, outbox)
    browser = app.test_client()
    sign_up(browser, outbox, "keep@example.test")

    listed = run(app, "users", "delete", "dev@*", input="n\n")
    assert "dev@example.test" in listed and "Shop" in listed, "lists what will go"
    assert "Aborted" in listed
    with app.app_context():
        assert db().query(User).filter_by(email="dev@example.test").count() == 1, "nothing without a yes"

    out = run(app, "users", "delete", "dev@*", "--yes")
    assert "Deleted 1 accounts and 1 organizations." in out
    with app.app_context():
        assert db().query(User).filter_by(email="dev@example.test").count() == 0
        assert db().query(Organization).count() == 0
        assert db().query(Client).filter(Client.organization_id.isnot(None)).count() == 0, (
            "its apps went with it"
        )
        assert db().query(User).filter_by(email="keep@example.test").count() == 1
        assert db().query(AuditEvent).filter_by(event="account.deleted").count() == 1


def test_users_delete_keeps_an_admin_and_needs_a_match(app: Flask, outbox: list) -> None:
    run(
        app,
        "admin",
        "create",
        "--email",
        "owner@example.test",
        "--given-name",
        "A",
        "--family-name",
        "B",
        "--password",
        "a long owner passphrase",
    )
    assert "every admin" in run(app, "users", "delete", "owner@example.test", "--yes")
    assert "no account matches" in run(app, "users", "delete", "nobody@*", "--yes")
    with app.app_context():
        assert db().query(User).filter_by(email="owner@example.test").count() == 1
