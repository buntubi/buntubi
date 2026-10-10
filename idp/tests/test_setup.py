"""First install: `flask platform setup` from a platform file."""

from pathlib import Path

import pytest
from flask import Flask
from sqlalchemy import select

from idp.db import db
from idp.models import Client, Organization, User
from idp.security import passwords
from idp.services import setup

FILE = """
[[apps]]
client_id = "console"
name = "Console"
redirect_uris = ["https://console.example/auth/callback"]
scope = "openid profile email admin"
secret = { file = "console/.env", key = "CONSOLE_CLIENT_SECRET" }

[[apps]]
client_id = "tool"
name = "Tool"
type = "public"
redirect_uris = ["https://tool.example/cb"]
first_party = false
"""


def superadmin(app: Flask) -> None:
    with app.app_context():
        db().add(
            User(
                email="root@example.test",
                password_hash=passwords.hash_password("correct horse battery"),
                roles=["admin", "superadmin"],
            )
        )
        db().commit()


def test_setup_needs_a_superadmin(app: Flask, tmp_path: Path) -> None:
    (tmp_path / "platform.toml").write_text(FILE)
    result = app.test_cli_runner().invoke(
        args=["platform", "setup", "--file", str(tmp_path / "platform.toml")]
    )
    assert result.exit_code != 0 and "flask admin create" in result.output


def test_setup_creates_the_platform_and_writes_secrets_to_files(app: Flask, tmp_path: Path) -> None:
    superadmin(app)
    env = tmp_path / "console" / ".env"
    env.parent.mkdir()
    env.write_text("IDP_URL=https://id.example\nCONSOLE_CLIENT_SECRET=\n")
    (tmp_path / "platform.toml").write_text(FILE)
    runner = app.test_cli_runner()
    result = runner.invoke(args=["platform", "setup", "--file", str(tmp_path / "platform.toml")])
    assert result.exit_code == 0, result.output
    written = env.read_text()
    secret = written.split("CONSOLE_CLIENT_SECRET=")[1].strip()
    assert secret.startswith("cs_") and secret not in result.output, "the secret goes to the file only"
    assert written.startswith("IDP_URL=https://id.example\n"), "the rest of the file stays"
    with app.app_context():
        organization = db().scalar(select(Organization).where(Organization.is_platform))
        assert organization is not None and [m.user.email for m in organization.members] == [
            "root@example.test"
        ]
        console = db().scalar(select(Client).where(Client.client_id == "console"))
        tool = db().scalar(select(Client).where(Client.client_id == "tool"))
        assert console is not None and console.first_party and console.environment == "live"
        assert tool is not None and not tool.first_party and tool.organization_id == organization.id
        console.name = "Renamed in the console"
        db().commit()

    again = runner.invoke(args=["platform", "setup", "--file", str(tmp_path / "platform.toml")])
    assert "kept      console" in again.output and env.read_text() == written, "nothing rewritten"
    with app.app_context():
        console = db().scalar(select(Client).where(Client.client_id == "console"))
        assert console is not None and console.name == "Renamed in the console", (
            "a change made in a screen stays"
        )

    rotated = runner.invoke(
        args=["platform", "setup", "--file", str(tmp_path / "platform.toml"), "--rotate-secrets"]
    )
    assert rotated.exit_code == 0 and env.read_text() != written


def test_a_bad_file_says_what_is_wrong(tmp_path: Path) -> None:
    path = tmp_path / "platform.toml"
    path.write_text(
        '[[apps]]\nclient_id = "x"\nname = "X"\ntype = "public"\nsecret = { file = "a", key = "B" }\n'
    )
    with pytest.raises(setup.SetupError, match="a public app has no secret"):
        setup.read(path)


def test_admin_check_says_whether_there_is_a_superadmin(app: Flask) -> None:
    runner = app.test_cli_runner()
    assert runner.invoke(args=["admin", "check"]).exit_code == 1
    superadmin(app)
    found = runner.invoke(args=["admin", "check"])
    assert found.exit_code == 0 and "root@example.test" in found.output
