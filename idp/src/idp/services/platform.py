"""
The developer platform's rules: who owns what, how much of it, which scopes an app or a key may
carry, and what an app needs before it goes live. The HTTP layer (web/developer.py) only parses
and answers; every decision is here.

Ownership is checked by query: a project that is not the caller's is not found, the same answer
as one that does not exist.
"""

import uuid
from dataclasses import dataclass, field

from authlib.oauth2.rfc6749 import list_to_scope, scope_to_list
from sqlalchemy import func, select

from idp.db import db, utcnow
from idp.models import ApiKey, Client, Project, ProjectTestUser, Scope, User
from idp.security.tokens import new_token
from idp.services.accounts import AccountError, normalize_email
from idp.services.credentials import issue_api_key, issue_client_secret

MAX_PROJECTS = 10
MAX_APPS = 20
MAX_TEST_USERS = 100
MAX_KEYS = 20

# What a developer's app may do. The device flow suits TVs and terminals; client credentials
# only a confidential app, which can keep a secret.
PUBLIC_GRANTS = ("authorization_code", "refresh_token", "urn:ietf:params:oauth:grant-type:device_code")
CONFIDENTIAL_GRANTS = (*PUBLIC_GRANTS, "client_credentials")


class PlatformError(AccountError):
    """A refusal the portal shows, by code; `status` is the HTTP answer."""

    def __init__(self, code: str, status: int = 400, **details: object) -> None:
        super().__init__(code)
        self.status = status
        self.details = details


# ── Developers ────────────────────────────────────────────────────────────────────────────────


def become_developer(user: User) -> None:
    if not user.email_verified:
        raise PlatformError("email_not_verified", 403)
    if user.developer_since is None:
        user.developer_since = utcnow()


def require_developer(user: User) -> None:
    if user.developer_since is None:
        raise PlatformError("terms_required", 403)


# ── Projects ──────────────────────────────────────────────────────────────────────────────────


def projects_of(user: User) -> list[Project]:
    return list(db().scalars(select(Project).where(Project.owner_id == user.id).order_by(Project.created_at)))


def project_of(user: User, project_id: str) -> Project:
    try:
        key = uuid.UUID(project_id)
    except ValueError:
        raise PlatformError("not_found", 404) from None
    project = db().scalar(select(Project).where(Project.id == key, Project.owner_id == user.id))
    if project is None:
        raise PlatformError("not_found", 404)
    return project


def writable(project: Project) -> Project:
    if project.is_suspended:
        raise PlatformError("project_suspended", 403)
    return project


def create_project(user: User, name: str, description: str, support_email: str | None) -> Project:
    count = db().scalar(select(func.count()).select_from(Project).where(Project.owner_id == user.id)) or 0
    if count >= MAX_PROJECTS:
        raise PlatformError("too_many_projects", 409, limit=MAX_PROJECTS)
    project = Project(
        owner_id=user.id,
        name=name,
        description=description,
        support_email=normalize_email(support_email) if support_email else None,
    )
    db().add(project)
    db().flush()
    return project


# ── Scopes ────────────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ScopeCheck:
    granted: list[str]
    sensitive: list[str] = field(default_factory=list)


def check_scopes(requested: list[str], *, for_key: bool) -> ScopeCheck:
    """
    The catalog decides: an unknown or restricted scope is refused. An app asks for sign-in scopes
    and platform scopes; a key, being server to server, only platform scopes.
    """
    wanted = sorted(set(requested))
    rows = {s.name: s for s in db().scalars(select(Scope).where(Scope.name.in_(wanted)))}
    unknown = [name for name in wanted if name not in rows]
    if unknown:
        raise PlatformError("unknown_scope", 422, scopes=unknown)
    restricted = [name for name in wanted if rows[name].sensitivity == "restricted"]
    if restricted:
        raise PlatformError("restricted_scope", 422, scopes=restricted)
    if for_key:
        not_platform = [name for name in wanted if not rows[name].resource]
        if not_platform:
            raise PlatformError("not_a_platform_scope", 422, scopes=not_platform)
    return ScopeCheck(wanted, [name for name in wanted if rows[name].sensitivity == "sensitive"])


# ── Apps ──────────────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class NewApp:
    name: str
    client_type: str
    redirect_uris: list[str]
    post_logout_redirect_uris: list[str]
    scopes: list[str]
    grant_types: list[str]
    homepage_url: str | None = None
    privacy_url: str | None = None
    terms_url: str | None = None
    brand: dict[str, object] = field(default_factory=dict)


def apps_of(project: Project) -> list[Client]:
    return list(
        db().scalars(select(Client).where(Client.project_id == project.id).order_by(Client.created_at))
    )


def app_of(user: User, client_id: str) -> Client:
    client: Client | None = db().scalar(
        select(Client)
        .join(Project, Client.project_id == Project.id)
        .where(Client.client_id == client_id, Project.owner_id == user.id)
    )
    if client is None:
        raise PlatformError("not_found", 404)
    return client


def create_app(project: Project, data: NewApp) -> tuple[Client, str | None]:
    count = db().scalar(select(func.count()).select_from(Client).where(Client.project_id == project.id)) or 0
    if count >= MAX_APPS:
        raise PlatformError("too_many_apps", 409, limit=MAX_APPS)
    scopes = check_scopes(["openid", *data.scopes], for_key=False)
    confidential = data.client_type == "confidential"
    allowed = CONFIDENTIAL_GRANTS if confidential else PUBLIC_GRANTS
    if not set(data.grant_types) <= set(allowed):
        raise PlatformError("grant_not_allowed", 422, allowed=list(allowed))
    if "authorization_code" in data.grant_types and not data.redirect_uris:
        raise PlatformError("redirect_uri_required", 422)
    client = Client(
        client_id=f"app_{new_token()[:22]}",
        project_id=project.id,
        name=data.name,
        client_type=data.client_type,
        environment="sandbox",
        redirect_uris=data.redirect_uris,
        post_logout_redirect_uris=data.post_logout_redirect_uris,
        grant_types=data.grant_types,
        scope=list_to_scope(scopes.granted),
        token_endpoint_auth_method="client_secret_basic" if confidential else "none",
        first_party=False,
        homepage_url=data.homepage_url,
        privacy_url=data.privacy_url,
        terms_url=data.terms_url,
        brand=data.brand,
    )
    db().add(client)
    secret = issue_client_secret(client) if confidential else None
    db().flush()
    return client, secret


def set_app_scopes(client: Client, scopes: list[str]) -> None:
    checked = check_scopes(["openid", *scopes], for_key=False)
    client.scope = list_to_scope(checked.granted)
    # A live app that adds a sensitive scope its project was not approved for goes back to review.
    unapproved = set(checked.sensitive) - set(client.project.approved_scopes if client.project else [])
    if client.is_live and unapproved:
        client.environment = "sandbox"
        client.review_status = "pending"


def missing_for_live(client: Client, project: Project) -> list[str]:
    """What a live app must show its users: where it lives, its policies, its face, a contact."""
    missing = [
        name
        for name, value in (
            ("homepage_url", client.homepage_url),
            ("privacy_url", client.privacy_url),
            ("terms_url", client.terms_url),
            ("logo", client.brand.get("logo")),
            ("support_email", project.support_email),
        )
        if not value
    ]
    return missing


def publish(client: Client, project: Project) -> str:
    """
    Asks for the app to go live. Public scopes only: live at once. A sensitive scope: pending,
    until the owner approves it. Returns the app's state afterwards.
    """
    if client.is_live:
        return "live"
    missing = missing_for_live(client, project)
    if missing:
        raise PlatformError("missing_for_live", 422, fields=missing)
    sensitive = check_scopes(scope_to_list(client.scope) or [], for_key=False).sensitive
    if set(sensitive) - set(project.approved_scopes):
        client.review_status = "pending"
        return "pending"
    client.environment = "live"
    return "live"


# ── Reviews and suspensions (the owner's side) ────────────────────────────────────────────────


def pending_reviews() -> list[Client]:
    return list(
        db().scalars(select(Client).where(Client.review_status == "pending").order_by(Client.updated_at))
    )


def review(client: Client, reviewer: User, approve: bool, note: str) -> None:
    """The owner's answer. Approving puts the app live and approves its sensitive scopes for the project."""
    if client.review_status != "pending" or client.project is None:
        raise PlatformError("not_pending", 409)
    client.review_status = "approved" if approve else "rejected"
    client.review_note = note
    client.reviewed_at = utcnow()
    client.reviewed_by_id = reviewer.id
    if approve:
        sensitive = check_scopes(scope_to_list(client.scope) or [], for_key=False).sensitive
        project = client.project
        project.approved_scopes = sorted(set(project.approved_scopes) | set(sensitive))
        client.environment = "live"


def suspend(project: Project, reason: str) -> None:
    project.suspended_at = project.suspended_at or utcnow()
    project.suspended_reason = reason


def restore(project: Project) -> None:
    project.suspended_at = None
    project.suspended_reason = None


# ── Test users ────────────────────────────────────────────────────────────────────────────────


def add_test_user(project: Project, email: str) -> ProjectTestUser:
    address = normalize_email(email)
    existing = db().scalar(
        select(ProjectTestUser).where(
            ProjectTestUser.project_id == project.id, ProjectTestUser.email == address
        )
    )
    if existing is not None:
        return existing
    if len(project.test_users) >= MAX_TEST_USERS:
        raise PlatformError("too_many_test_users", 409, limit=MAX_TEST_USERS)
    row = ProjectTestUser(email=address)
    project.test_users.append(row)
    return row


def is_test_user(project: Project, user: User) -> bool:
    return any(row.email == user.email for row in project.test_users)


# ── API keys ──────────────────────────────────────────────────────────────────────────────────


def keys_of(project: Project) -> list[ApiKey]:
    return list(
        db().scalars(select(ApiKey).where(ApiKey.project_id == project.id).order_by(ApiKey.created_at))
    )


def create_key(
    project: Project, user: User, name: str, environment: str, scopes: list[str]
) -> tuple[ApiKey, str]:
    active = [key for key in keys_of(project) if key.is_active(utcnow())]
    if len(active) >= MAX_KEYS:
        raise PlatformError("too_many_keys", 409, limit=MAX_KEYS)
    checked = check_scopes(scopes, for_key=True)
    # A live key carries a sensitive scope only once the project was approved for it.
    unapproved = sorted(set(checked.sensitive) - set(project.approved_scopes))
    if environment == "live" and unapproved:
        raise PlatformError("review_required", 422, scopes=unapproved)
    return issue_api_key(project, environment, name, checked.granted, user.id)


def key_of(project: Project, key_id: str) -> ApiKey:
    try:
        key = uuid.UUID(key_id)
    except ValueError:
        raise PlatformError("not_found", 404) from None
    row = db().scalar(select(ApiKey).where(ApiKey.id == key, ApiKey.project_id == project.id))
    if row is None:
        raise PlatformError("not_found", 404)
    return row
