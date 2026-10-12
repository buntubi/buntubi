"""
Operator commands: `flask admin create | check`, `flask platform setup`, `flask keys generate`,
`flask clients create`, `flask users admins | promote | demote | delete`,
`flask plugins list | sync`. A client secret is printed once, at creation, and never stored in
the clear.

A superadmin is made here and nowhere else, before the platform is deployed: the person who
controls the server is the root of trust. The console then lets a superadmin manage the admins.
"""

from fnmatch import fnmatchcase
from pathlib import Path
from urllib.parse import urlparse

from email_validator import EmailNotValidError, validate_email
from flask import Flask
from sqlalchemy import select

from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import Client, Organization, OrganizationMember, User
from idp.models.clients import AUTH_METHODS, GRANT_TYPES
from idp.security import passwords
from idp.security.keys import generate_key
from idp.services import audit, mfa, platform
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
    @click.option(
        "--homepage-url", help="Where the app lives; a first-party app is then listed on account pages."
    )
    def clients_create(
        client_id: str,
        name: str,
        redirect_uris: tuple[str, ...],
        logout_uris: tuple[str, ...],
        client_type: str,
        grant_types: tuple[str, ...],
        scope: str,
        first_party: bool,
        homepage_url: str | None,
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
            organization=platform.platform_organization(),
            environment="live",
            redirect_uris=list(redirect_uris),
            post_logout_redirect_uris=list(logout_uris),
            grant_types=list(grant_types) or ["authorization_code", "refresh_token"],
            scope=scope,
            token_endpoint_auth_method=method,
            first_party=first_party,
            homepage_url=homepage_url,
        )
        db().add(client)
        secret = issue_client_secret(client) if confidential else None
        db().commit()
        click.echo(f"Created {client_id} ({client_type}).")
        if secret:
            click.echo(f"Secret (shown once, store it now): {secret}")

    @clients.command("homepage")
    @click.argument("client_id")
    @click.argument("url", required=False)
    def clients_homepage(client_id: str, url: str | None) -> None:
        """Set where a client lives, or clear it with no URL."""
        client = db().scalar(select(Client).where(Client.client_id == client_id))
        if client is None:
            raise click.ClickException(f"no client {client_id}")
        if url and (urlparse(url).scheme not in ("http", "https") or not urlparse(url).netloc):
            raise click.ClickException("expected an http or https URL")
        client.homepage_url = url or None
        db().commit()
        click.echo(f"{client_id}: {client.homepage_url or 'no homepage'}")

    @app.cli.group()
    def users() -> None:
        """Accounts."""

    def account(email: str) -> User:
        user = db().scalar(select(User).where(User.email == email.strip().lower()))
        if user is None:
            raise click.ClickException("no account with that email")
        return user

    def admins() -> list[User]:
        return [u for u in db().scalars(select(User).order_by(User.created_at)) if u.is_admin]

    @users.command("admins")
    def users_admins() -> None:
        """List the accounts with the admin role, and whether they use two-step sign-in."""
        found = admins()
        if not found:
            click.echo("No admin. Create one with `flask admin create`.")
        for user in found:
            two_step = "two-step on" if mfa.is_enabled(user) else "two-step OFF: the console stays closed"
            state = ", disabled" if user.disabled_at is not None else ""
            click.echo(f"{user.email}  ({two_step}{state})")

    @users.command("promote")
    @click.argument("email")
    @click.option("--super", "superadmin", is_flag=True, help="Superadmin: also manages the admins.")
    def users_promote(email: str, superadmin: bool) -> None:
        """Give an existing account the admin role."""
        user = account(email)
        if not user.is_admin:
            audit.record("admin.role_granted", user=user, source="cli")
        platform.grant_admin(user)
        if superadmin and not user.is_superadmin:
            user.roles = [*user.roles, "superadmin"]
            audit.record("admin.superadmin_granted", user=user, source="cli")
        db().commit()
        click.echo(f"{user.email} is an admin.")
        if not mfa.is_enabled(user):
            click.echo("Turn on two-step sign-in for this account before using the console.")

    @users.command("demote")
    @click.argument("email")
    def users_demote(email: str) -> None:
        """Take the admin role away. The admin API refuses the account from its next request."""
        user = account(email)
        if user.is_admin:
            audit.record("admin.role_removed", user=user, source="cli")
            platform.revoke_admin(user)
        db().commit()
        click.echo(f"{user.email} is no longer an admin.")
        if not admins():
            click.echo("No admin remains. Create one with `flask admin create` when you need the console.")

    @users.command("delete")
    @click.argument("emails", nargs=-1, required=True)
    @click.option("--yes", is_flag=True, help="Delete without asking.")
    def users_delete(emails: tuple[str, ...], yes: bool) -> None:
        """Delete accounts for good, with every organization left without a member.

        Each argument is an address or a pattern with `*` (quote it for the shell). What will go
        is listed first; nothing happens until it is confirmed. The last admin is never deleted.
        """
        everyone = list(db().scalars(select(User).order_by(User.email)))
        found: list[User] = []
        for wanted in emails:
            pattern = wanted.strip().lower()
            matched = [u for u in everyone if fnmatchcase(u.email, pattern)]
            if not matched:
                raise click.ClickException(f"no account matches {wanted}")
            found += [u for u in matched if u not in found]
        ids = {user.id for user in found}
        if admins() and all(user.id in ids for user in admins()):
            raise click.ClickException("that would delete every admin; keep one, or create another first")
        # The organizations whose members are all going: nobody would be left to run them.
        orphaned = [
            organization
            for organization in db().scalars(
                select(Organization)
                .join(OrganizationMember)
                .where(OrganizationMember.user_id.in_(ids))
                .distinct()
            )
            if all(member.user_id in ids for member in organization.members)
        ]
        for user in found:
            click.echo(f"account       {user.email}{'  (admin)' if user.is_admin else ''}")
        for organization in orphaned:
            click.echo(f"organization  {organization.name}  ({organization.id})")
        if not yes:
            click.confirm(f"Delete {len(found)} accounts and {len(orphaned)} organizations?", abort=True)
        for organization in orphaned:
            audit.record(
                "organization.deleted",
                source="cli",
                organization=str(organization.id),
                name=organization.name,
            )
            db().delete(organization)
        for user in found:
            audit.record("account.deleted", source="cli", email=user.email)
            db().delete(user)
        db().commit()
        click.echo(f"Deleted {len(found)} accounts and {len(orphaned)} organizations.")

    @app.cli.group("plugins")
    def plugins_group() -> None:
        """The deployment's plugins (IDP_PLUGINS)."""

    @plugins_group.command("list")
    def plugins_list() -> None:
        """The plugins this deployment runs, and what their catalogue declares."""
        from idp import plugins

        running = plugins.active()
        if not running:
            click.echo("No plugin. Name them in IDP_PLUGINS.")
        for plugin in running:
            catalogue = plugin.catalogue()
            counts = f"{len(catalogue.products)} products, {len(catalogue.scopes)} scopes"
            click.echo(f"{plugin.id} {plugin.version}: {counts}")

    @plugins_group.command("sync")
    def plugins_sync() -> None:
        """Bring products and scopes in line with what the plugins declare. Run it on deploy."""
        from idp import plugins
        from idp.plugins.sync import CatalogueError, sync

        try:
            report = sync(plugins.active())
        except CatalogueError as error:
            raise click.ClickException(str(error)) from error
        if not report:
            click.echo("The catalogue is up to date.")
        for kind in ("added", "updated", "adopted", "restored", "deprecated"):
            for entry in getattr(report, kind):
                click.echo(f"{kind:<10} {entry}")

    @app.cli.group("admin")
    def admin_group() -> None:
        """The owner's account."""

    @admin_group.command("check")
    def admin_check() -> None:
        """Exit with 1 when there is no superadmin yet: for install scripts."""
        found = [u.email for u in db().scalars(select(User)) if u.is_superadmin]
        if not found:
            click.echo("No superadmin yet.")
            raise SystemExit(1)
        click.echo(f"Superadmin: {', '.join(found)}")

    @admin_group.command("create")
    @click.option("--email", prompt=True)
    @click.option("--given-name", prompt="First name")
    @click.option("--family-name", prompt="Last name")
    @click.password_option(prompt="Password (at least 10 characters)")
    def admin_create(email: str, given_name: str, family_name: str, password: str) -> None:
        """Create a superadmin: email verified, admin and superadmin roles. Two-step sign-in comes next."""
        try:
            address = validate_email(email.strip(), check_deliverability=False).normalized.lower()
        except EmailNotValidError as error:
            raise click.ClickException(f"not a valid email: {error}") from None
        if db().scalar(select(User.id).where(User.email == address)) is not None:
            raise click.ClickException(
                f"{address} already has an account: use `flask users promote {address}`"
            )
        if wrong := passwords.problem(password):
            raise click.ClickException(
                "the password is too well known: it appears in breached password lists"
                if wrong == "breached_password"
                else "the password needs 10 to 256 characters"
            )
        user = User(
            email=address,
            password_hash=passwords.hash_password(password),
            given_name=given_name.strip()[:100],
            family_name=family_name.strip()[:100],
            email_verified_at=utcnow(),
            roles=["admin", "superadmin"],
        )
        db().add(user)
        db().flush()
        platform.join_platform(user)
        audit.record("admin.account_created", user=user, source="cli")
        db().commit()
        issuer = get_settings().issuer
        click.echo(f"Created {address}, superadmin.")
        click.echo(f"Next: sign in at {issuer}/account and turn on two-step sign-in; the console needs it.")

    @app.cli.group("platform")
    def platform_group() -> None:
        """First install."""

    @platform_group.command("setup")
    @click.option(
        "--file",
        "path",
        type=click.Path(exists=True, dir_okay=False, path_type=Path),
        default="platform.toml",
        show_default=True,
    )
    @click.option(
        "--rotate-secrets", is_flag=True, help="New secrets for apps that exist, written to their files."
    )
    def platform_setup(path: Path, rotate_secrets: bool) -> None:
        """The platform organization, the apps in the file, the plugins' catalogue. Safe to run again."""
        from idp import plugins
        from idp.plugins.sync import CatalogueError, sync
        from idp.services import setup

        if not any(u.is_superadmin for u in db().scalars(select(User))):
            raise click.ClickException("no superadmin yet: run `flask admin create` first")
        try:
            report = setup.apply(setup.read(path), rotate_secrets=rotate_secrets)
            catalogue = sync(plugins.active())
        except (setup.SetupError, CatalogueError) as error:
            raise click.ClickException(str(error)) from error
        for client_id in report.created:
            click.echo(f"created   {client_id}")
        for client_id in report.kept:
            click.echo(f"kept      {client_id}")
        for target in report.secrets:
            click.echo(f"secret    {target}")
        for kind in ("added", "updated", "adopted", "restored", "deprecated"):
            for entry in getattr(catalogue, kind):
                click.echo(f"{kind:<10}{entry}")
