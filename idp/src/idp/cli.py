"""
Operator commands: `flask keys generate`, `flask clients create`, `flask users promote`.
A client secret is printed once, at creation, and never stored in the clear.
"""

from flask import Flask
from sqlalchemy import select

from idp.config import get_settings
from idp.db import db
from idp.models import Client, User
from idp.models.clients import AUTH_METHODS, GRANT_TYPES
from idp.security.keys import generate_key
from idp.services.credentials import issue_client_secret


def register(app: Flask) -> None:
    import click

    @app.cli.group()
    def keys() -> None:
        """Token signing keys."""

    @keys.command("generate")
    def keys_generate() -> None:
        """Add a signing key; the newest signs, the others still verify."""
        path = generate_key(get_settings().signing_keys_dir)
        click.echo(f"Wrote {path.name}. Restart the provider to start signing with it.")

    @app.cli.group()
    def clients() -> None:
        """OAuth clients."""

    @clients.command("create")
    @click.option("--client-id", required=True)
    @click.option("--name", required=True)
    @click.option("--redirect-uri", "redirect_uris", multiple=True, required=True)
    @click.option("--post-logout-redirect-uri", "logout_uris", multiple=True)
    @click.option("--type", "client_type", type=click.Choice(["public", "confidential"]), default="public")
    @click.option("--grant-type", "grant_types", multiple=True, type=click.Choice(GRANT_TYPES))
    @click.option("--scope", default="openid profile email offline_access")
    @click.option("--first-party", is_flag=True, help="Skip the consent screen.")
    def clients_create(
        client_id: str,
        name: str,
        redirect_uris: tuple[str, ...],
        logout_uris: tuple[str, ...],
        client_type: str,
        grant_types: tuple[str, ...],
        scope: str,
        first_party: bool,
    ) -> None:
        """Register a client. A confidential client's secret is shown once."""
        if db().scalar(select(Client.id).where(Client.client_id == client_id)) is not None:
            raise click.ClickException(f"{client_id} already exists")
        confidential = client_type == "confidential"
        method = "client_secret_basic" if confidential else "none"
        assert method in AUTH_METHODS
        client = Client(
            client_id=client_id,
            name=name,
            client_type=client_type,
            environment="live",
            redirect_uris=list(redirect_uris),
            post_logout_redirect_uris=list(logout_uris),
            grant_types=list(grant_types) or ["authorization_code", "refresh_token"],
            scope=scope,
            token_endpoint_auth_method=method,
            first_party=first_party,
        )
        db().add(client)
        secret = issue_client_secret(client) if confidential else None
        db().commit()
        click.echo(f"Created {client_id} ({client_type}).")
        if secret:
            click.echo(f"Secret (shown once, store it now): {secret}")

    @app.cli.group()
    def users() -> None:
        """Accounts."""

    @users.command("promote")
    @click.argument("email")
    def users_promote(email: str) -> None:
        """Give an existing account the admin role."""
        user = db().scalar(select(User).where(User.email == email.strip().lower()))
        if user is None:
            raise click.ClickException("no account with that email")
        if "admin" not in user.roles:
            user.roles = [*user.roles, "admin"]
        db().commit()
        click.echo(f"{user.email} is an admin.")
