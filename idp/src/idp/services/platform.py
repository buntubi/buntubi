"""
The developer platform's rules: who owns what, how much of it, which scopes an app or a key may
carry, and what an app needs before it goes live. The HTTP layer (web/developer.py) only parses
and answers; every decision is here.

Ownership is checked by query: an organization that is not the caller's is not found, the same answer
as one that does not exist.
"""

import uuid
from dataclasses import dataclass, field

from authlib.oauth2.rfc6749 import list_to_scope, scope_to_list
from sqlalchemy import func, select, update

from idp.db import db, utcnow
from idp.models import (
    AccessTokenRecord,
    ApiKey,
    ApiProduct,
    AppReview,
    Client,
    Organization,
    OrganizationMember,
    OrganizationTestUser,
    RefreshToken,
    Scope,
    User,
)
from idp.security.tokens import new_token
from idp.services.accounts import AccountError, normalize_email
from idp.services.credentials import issue_api_key, issue_client_secret

MAX_ORGANIZATIONS = 10
MAX_APPS = 20
MAX_TEST_USERS = 100
MAX_KEYS = 20
MAX_MEMBERS = 50

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


# ── Organizations and members ─────────────────────────────────────────────────────────────────

# What each role may do. Owners and admins act on every app of the organization; developers,
# reviewers and viewers on the apps their membership lists, or all of them when it lists none.
ABILITIES: dict[str, frozenset[str]] = {
    "owner": frozenset(
        {
            "read",
            "edit_apps",
            "test_users",
            "sandbox_keys",
            "live_keys",
            "publish",
            "members",
            "settings",
            "delete",
        }
    ),
    "admin": frozenset(
        {"read", "edit_apps", "test_users", "sandbox_keys", "live_keys", "publish", "members", "settings"}
    ),
    "developer": frozenset({"read", "edit_apps", "test_users", "sandbox_keys"}),
    "reviewer": frozenset({"read"}),
    "viewer": frozenset({"read"}),
}
ALL_APPS_ROLES = ("owner", "admin")


def can(member: OrganizationMember, ability: str) -> bool:
    return ability in ABILITIES[member.role]


def sees_app(member: OrganizationMember, client: Client) -> bool:
    return member.role in ALL_APPS_ROLES or not member.app_ids or client.id in member.app_ids


def _uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise PlatformError("not_found", 404) from None


def memberships_of(user: User) -> list[OrganizationMember]:
    return list(
        db().scalars(
            select(OrganizationMember)
            .join(Organization, OrganizationMember.organization_id == Organization.id)
            .where(OrganizationMember.user_id == user.id)
            .order_by(Organization.created_at)
        )
    )


def membership(user: User, organization_id: str, ability: str = "read") -> OrganizationMember:
    """
    The caller's place in the organization. Someone outside it gets `not_found`, the same answer
    as an organization that does not exist; a member without the ability, `forbidden`.
    """
    member = db().scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == _uuid(organization_id),
            OrganizationMember.user_id == user.id,
        )
    )
    if member is None:
        raise PlatformError("not_found", 404)
    if not can(member, ability):
        raise PlatformError("forbidden", 403, role=member.role)
    return member


def organization_of(user: User, organization_id: str, ability: str = "read") -> Organization:
    return membership(user, organization_id, ability).organization


def writable(organization: Organization) -> Organization:
    if organization.is_suspended:
        raise PlatformError("organization_suspended", 403)
    return organization


def create_organization(user: User, name: str, description: str, support_email: str | None) -> Organization:
    owned = db().scalar(
        select(func.count())
        .select_from(OrganizationMember)
        .where(OrganizationMember.user_id == user.id, OrganizationMember.role == "owner")
    )
    if (owned or 0) >= MAX_ORGANIZATIONS:
        raise PlatformError("too_many_organizations", 409, limit=MAX_ORGANIZATIONS)
    organization = Organization(
        name=name,
        description=description,
        support_email=normalize_email(support_email) if support_email else None,
    )
    organization.members.append(OrganizationMember(user_id=user.id, role="owner"))
    db().add(organization)
    db().flush()
    return organization


def owners_of(organization: Organization) -> list[OrganizationMember]:
    return [m for m in organization.members if m.role == "owner"]


def _app_ids(organization: Organization, client_ids: list[str]) -> list[uuid.UUID]:
    """The apps a membership is limited to, from their public client ids; all must be this organization's."""
    if not client_ids:
        return []
    found = {
        c.client_id: c.id
        for c in db().scalars(
            select(Client).where(Client.organization_id == organization.id, Client.client_id.in_(client_ids))
        )
    }
    unknown = sorted(set(client_ids) - set(found))
    if unknown:
        raise PlatformError("unknown_app", 422, apps=unknown)
    return [found[c] for c in client_ids]


def _check_role_change(actor: OrganizationMember, role: str) -> None:
    """Only an owner makes or unmakes an owner."""
    if role == "owner" and actor.role != "owner":
        raise PlatformError("forbidden", 403, role=actor.role)


def add_member(actor: OrganizationMember, email: str, role: str, client_ids: list[str]) -> OrganizationMember:
    """Adds someone who already has an account, by email."""
    organization = actor.organization
    _check_role_change(actor, role)
    if len(organization.members) >= MAX_MEMBERS:
        raise PlatformError("too_many_members", 409, limit=MAX_MEMBERS)
    user = db().scalar(select(User).where(User.email == normalize_email(email)))
    if user is None or user.disabled_at is not None:
        raise PlatformError("no_such_account", 422)
    if any(m.user_id == user.id for m in organization.members):
        raise PlatformError("already_member", 409)
    member = OrganizationMember(user_id=user.id, role=role, app_ids=_app_ids(organization, client_ids))
    organization.members.append(member)
    db().flush()
    return member


def member_of(organization: Organization, member_id: str) -> OrganizationMember:
    key = _uuid(member_id)
    member = next((m for m in organization.members if m.id == key), None)
    if member is None:
        raise PlatformError("not_found", 404)
    return member


def change_member(
    actor: OrganizationMember, member: OrganizationMember, role: str | None, client_ids: list[str] | None
) -> None:
    if role is not None and role != member.role:
        _check_role_change(actor, role)
        if member.role == "owner":
            _check_role_change(actor, "owner")
            if len(owners_of(member.organization)) == 1:
                raise PlatformError("last_owner", 409)
        member.role = role
    if client_ids is not None:
        member.app_ids = _app_ids(member.organization, client_ids)
    db().flush()
    _cut_member_access(member.organization)


def remove_member(actor: OrganizationMember, member: OrganizationMember) -> None:
    """Takes someone out; anyone may leave, except the last owner."""
    organization = member.organization
    if member.id != actor.id:
        if not can(actor, "members"):
            raise PlatformError("forbidden", 403, role=actor.role)
        if member.role == "owner":
            _check_role_change(actor, "owner")
    if member.role == "owner" and len(owners_of(organization)) == 1:
        raise PlatformError("last_owner", 409)
    organization.members.remove(member)
    db().flush()
    _cut_member_access(organization)


def _cut_member_access(organization: Organization) -> None:
    """Someone who left, or lost an app, keeps nothing for the organization's sandbox apps."""
    for client in apps_of(organization):
        cut_sandbox_access(client)


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


# ── API products ──────────────────────────────────────────────────────────────────────────────


def products() -> list[ApiProduct]:
    return list(db().scalars(select(ApiProduct).order_by(ApiProduct.position, ApiProduct.slug)))


def scopes_by_product() -> dict[str, list[Scope]]:
    grouped: dict[str, list[Scope]] = {}
    for scope in db().scalars(select(Scope).where(Scope.product.is_not(None)).order_by(Scope.name)):
        assert scope.product is not None
        grouped.setdefault(scope.product, []).append(scope)
    return grouped


def approval_of(scopes: list[Scope]) -> str:
    """What adding a product takes: `none`, an app `review` for a sensitive scope, or `restricted`."""
    sensitivities = {scope.sensitivity for scope in scopes}
    if "restricted" in sensitivities:
        return "restricted"
    return "review" if "sensitive" in sensitivities else "none"


def checked_products(slugs: list[str]) -> list[str]:
    wanted = sorted(set(slugs))
    known = set(db().scalars(select(ApiProduct.slug).where(ApiProduct.slug.in_(wanted))))
    unknown = [slug for slug in wanted if slug not in known]
    if unknown:
        raise PlatformError("unknown_product", 422, products=unknown)
    return wanted


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
    kind: str = "web"
    description: str = ""
    category: str = ""
    platforms: list[str] = field(default_factory=list)
    products: list[str] = field(default_factory=list)


def apps_of(organization: Organization, member: OrganizationMember | None = None) -> list[Client]:
    """The organization's apps; with a member, only those the member works on."""
    apps = db().scalars(
        select(Client).where(Client.organization_id == organization.id).order_by(Client.created_at)
    )
    return [c for c in apps if member is None or sees_app(member, c)]


def app_of(user: User, client_id: str, ability: str = "read") -> tuple[Client, OrganizationMember]:
    """An app the caller works on, and their membership; any other app is not found."""
    found = (
        db()
        .execute(
            select(Client, OrganizationMember)
            .join(OrganizationMember, OrganizationMember.organization_id == Client.organization_id)
            .where(Client.client_id == client_id, OrganizationMember.user_id == user.id)
        )
        .first()
    )
    if found is None:
        raise PlatformError("not_found", 404)
    client, member = found[0], found[1]
    if not sees_app(member, client):
        raise PlatformError("not_found", 404)
    if not can(member, ability):
        raise PlatformError("forbidden", 403, role=member.role)
    return client, member


def create_app(member: OrganizationMember, data: NewApp) -> tuple[Client, str | None]:
    organization = member.organization
    count = (
        db().scalar(select(func.count()).select_from(Client).where(Client.organization_id == organization.id))
        or 0
    )
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
        organization_id=organization.id,
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
        kind=data.kind,
        description=data.description,
        category=data.category,
        platforms=sorted(set(data.platforms)),
        products=checked_products(data.products),
    )
    db().add(client)
    secret = issue_client_secret(client) if confidential else None
    db().flush()
    # A member limited to some apps keeps the one they just made.
    if member.app_ids and member.role not in ALL_APPS_ROLES:
        member.app_ids = [*member.app_ids, client.id]
    return client, secret


def set_redirect_uris(client: Client, uris: list[str]) -> None:
    """The authorization code flow needs somewhere to send the code back to."""
    if "authorization_code" in client.grant_types and not uris:
        raise PlatformError("redirect_uri_required", 422)
    client.redirect_uris = uris


def set_app_scopes(client: Client, scopes: list[str]) -> None:
    checked = check_scopes(["openid", *scopes], for_key=False)
    client.scope = list_to_scope(checked.granted)
    # A live app that adds a sensitive scope its organization was not approved for goes back to review.
    unapproved = set(checked.sensitive) - set(
        client.organization.approved_scopes if client.organization else []
    )
    if client.is_live and unapproved:
        client.environment = "sandbox"
        client.review_status = "pending"
        cut_sandbox_access(client)


def missing_for_live(client: Client, organization: Organization) -> list[str]:
    """What a live app must show its users: where it lives, its policies, its face, a contact."""
    missing = [
        name
        for name, value in (
            ("homepage_url", client.homepage_url),
            ("privacy_url", client.privacy_url),
            ("terms_url", client.terms_url),
            ("logo", client.brand.get("logo")),
            ("support_email", organization.support_email),
        )
        if not value
    ]
    return missing


@dataclass(frozen=True)
class Check:
    """One line of an app's way to live: `done`, `warn` (needs attention) or `todo`."""

    key: str
    state: str
    # What is missing, or the scopes concerned.
    items: list[str] = field(default_factory=list)
    # Publishing refuses while it is not done.
    required: bool = False


def _check(key: str, missing: list[str], *, required: bool = False) -> Check:
    return Check(key, "todo" if missing else "done", missing, required)


@dataclass(frozen=True)
class Overview:
    # draft, in_review, changes_requested or live
    stage: str
    checks: list[Check]
    # live: approved for live users; waiting: sensitive, until a review; sandbox: all of them
    scopes: dict[str, list[str]]


def overview(client: Client, organization: Organization) -> Overview:
    """
    Where an app stands and what it needs before going live: its stage, the checklist, and its
    scopes split into those approved for live, those still waiting for a review, and the sandbox.
    """
    live_missing = missing_for_live(client, organization)
    scopes = scope_to_list(client.scope) or []
    sensitive = check_scopes(scopes, for_key=False).sensitive
    waiting = sorted(set(sensitive) - set(organization.approved_scopes))
    checks = [
        _check(
            "basic_info",
            [
                n
                for n, v in (("description", client.description), ("logo", client.brand.get("logo")))
                if not v
            ],
        ),
        _check(
            "policies",
            [n for n in ("homepage_url", "privacy_url", "terms_url") if n in live_missing],
            required=True,
        ),
        _check("support_email", [n for n in ("support_email",) if n in live_missing], required=True),
    ]
    checks.insert(1, _check("products", [] if client.products else ["products"]))
    if "authorization_code" in client.grant_types:
        checks.insert(
            1, _check("redirect_uri", [] if client.redirect_uris else ["redirect_uris"], required=True)
        )
    if waiting:
        checks.append(Check("permissions", "warn", waiting))
    else:
        checks.append(Check("permissions", "done"))
    review = {"pending": "warn", "rejected": "warn", "approved": "done"}.get(client.review_status, "todo")
    checks.append(Check("review", "done" if client.is_live else review, [client.review_status]))
    stage = (
        "live"
        if client.is_live
        else {"pending": "in_review", "rejected": "changes_requested"}.get(client.review_status, "draft")
    )
    return Overview(
        stage,
        checks,
        {
            "live": [s for s in scopes if s not in waiting] if client.is_live else [],
            "waiting": waiting,
            "sandbox": scopes,
        },
    )


def publish(
    client: Client,
    organization: Organization,
    submitter: User | None = None,
    justifications: dict[str, str] | None = None,
    instructions: str = "",
) -> str:
    """
    Asks for the app to go live. Public scopes only: live at once. A sensitive scope: pending,
    until the platform owner approves it, with a review recording why each scope is needed and
    how to try the app. Sent again while pending, it updates that review. Returns the app's
    state afterwards.
    """
    if client.is_live:
        return "live"
    missing = missing_for_live(client, organization)
    if missing:
        raise PlatformError("missing_for_live", 422, fields=missing)
    sensitive = check_scopes(scope_to_list(client.scope) or [], for_key=False).sensitive
    waiting = sorted(set(sensitive) - set(organization.approved_scopes))
    if not waiting:
        client.environment = "live"
        return "live"
    given = {scope: text.strip() for scope, text in (justifications or {}).items() if scope in waiting}
    unexplained = [scope for scope in waiting if not given.get(scope)]
    if unexplained:
        raise PlatformError("justification_required", 422, scopes=unexplained)
    review = open_review(client) or AppReview(client_id=client.id)
    review.submitted_at = utcnow()
    review.submitted_by_id = submitter.id if submitter else None
    review.scopes = waiting
    review.justifications = given
    review.instructions = instructions.strip()
    db().add(review)
    client.review_status = "pending"
    return "pending"


# ── Reviews and suspensions (the platform owner's side) ────────────────────────────────────────────────


def open_review(client: Client) -> AppReview | None:
    """The app's review still waiting for an answer, if any."""
    return db().scalar(
        select(AppReview).where(AppReview.client_id == client.id, AppReview.decision == "pending")
    )


def reviews_of(client: Client) -> list[AppReview]:
    """The app's reviews, the latest first."""
    return list(
        db().scalars(
            select(AppReview).where(AppReview.client_id == client.id).order_by(AppReview.submitted_at.desc())
        )
    )


def pending_reviews() -> list[Client]:
    return list(
        db().scalars(select(Client).where(Client.review_status == "pending").order_by(Client.updated_at))
    )


def review(client: Client, reviewer: User, approve: bool, note: str) -> None:
    """
    The platform owner's answer. Approving puts the app live and approves its sensitive scopes
    for the organization.
    """
    if client.review_status != "pending" or client.organization is None:
        raise PlatformError("not_pending", 409)
    client.review_status = "approved" if approve else "rejected"
    client.review_note = note
    client.reviewed_at = utcnow()
    client.reviewed_by_id = reviewer.id
    # An app put pending before reviews were kept has no row: the decision makes one.
    record = open_review(client) or AppReview(client_id=client.id, submitted_at=client.updated_at)
    record.decision = client.review_status
    record.note = note
    record.decided_at = client.reviewed_at
    record.decided_by_id = reviewer.id
    db().add(record)
    if approve:
        sensitive = check_scopes(scope_to_list(client.scope) or [], for_key=False).sensitive
        organization = client.organization
        organization.approved_scopes = sorted(set(organization.approved_scopes) | set(sensitive))
        client.environment = "live"


def suspend(organization: Organization, reason: str) -> None:
    """Stops the organization at once: its apps get no new tokens, and the ones they hold are revoked."""
    organization.suspended_at = organization.suspended_at or utcnow()
    organization.suspended_reason = reason
    for client in apps_of(organization):
        _revoke_tokens(client)


def remove_test_user(organization: Organization, email: str) -> None:
    """Takes someone off the sandbox; whatever they hold for its sandbox apps ends now."""
    address = normalize_email(email)
    organization.test_users = [row for row in organization.test_users if row.email != address]
    db().flush()
    for client in apps_of(organization):
        cut_sandbox_access(client)


def restore(organization: Organization) -> None:
    organization.suspended_at = None
    organization.suspended_reason = None


# ── Test users ────────────────────────────────────────────────────────────────────────────────


def add_test_user(organization: Organization, email: str) -> OrganizationTestUser:
    address = normalize_email(email)
    existing = db().scalar(
        select(OrganizationTestUser).where(
            OrganizationTestUser.organization_id == organization.id, OrganizationTestUser.email == address
        )
    )
    if existing is not None:
        return existing
    if len(organization.test_users) >= MAX_TEST_USERS:
        raise PlatformError("too_many_test_users", 409, limit=MAX_TEST_USERS)
    row = OrganizationTestUser(email=address)
    organization.test_users.append(row)
    return row


def is_test_user(organization: Organization, user: User) -> bool:
    return any(row.email == user.email for row in organization.test_users)


def may_sign_in(client: Client, user: User) -> bool:
    """
    A sandbox app is for the members who work on it and the organization's test users; a live app,
    or one of the platform's own, for anyone.
    """
    organization = client.organization
    if organization is None or client.is_live:
        return True
    member = next((m for m in organization.members if m.user_id == user.id), None)
    return (member is not None and sees_app(member, client)) or is_test_user(organization, user)


def cut_sandbox_access(client: Client) -> None:
    """
    Ends what a sandbox app holds for people it no longer admits (a test user removed, a live app
    back in the sandbox): their refresh tokens and access tokens for it, revoked now. An API that
    introspects sees it at once; one that only checks signatures, when the access token expires.
    """
    if client.organization is None or client.is_live:
        return
    holders = set(
        db().scalars(
            select(RefreshToken.user_id).where(
                RefreshToken.client_id == client.id, RefreshToken.revoked_at.is_(None)
            )
        )
    ) | set(
        db().scalars(
            select(AccessTokenRecord.user_id).where(
                AccessTokenRecord.client_id == client.id,
                AccessTokenRecord.revoked_at.is_(None),
                AccessTokenRecord.user_id.is_not(None),
            )
        )
    )
    refused = [
        user.id
        for user in db().scalars(select(User).where(User.id.in_(holders)))
        if not may_sign_in(client, user)
    ]
    if refused:
        _revoke_tokens(client, refused)


def _revoke_tokens(client: Client, user_ids: list[uuid.UUID] | None = None) -> None:
    """Revokes a client's refresh and access tokens: everyone's, or these users'."""
    now = utcnow()
    for model in (RefreshToken, AccessTokenRecord):
        query = update(model).where(model.client_id == client.id, model.revoked_at.is_(None))
        if user_ids is not None:
            query = query.where(model.user_id.in_(user_ids))
        db().execute(query.values(revoked_at=now))


def is_verified(client: Client) -> bool:
    """What consent tells the user: live, so reviewed where its scopes needed it. Platform apps are."""
    return client.organization is None or client.is_live


# ── API keys ──────────────────────────────────────────────────────────────────────────────────


def keys_of(organization: Organization) -> list[ApiKey]:
    return list(
        db().scalars(
            select(ApiKey).where(ApiKey.organization_id == organization.id).order_by(ApiKey.created_at)
        )
    )


def create_key(
    member: OrganizationMember, name: str, environment: str, scopes: list[str]
) -> tuple[ApiKey, str]:
    if not can(member, "live_keys" if environment == "live" else "sandbox_keys"):
        raise PlatformError("forbidden", 403, role=member.role)
    organization = member.organization
    active = [key for key in keys_of(organization) if key.is_active(utcnow())]
    if len(active) >= MAX_KEYS:
        raise PlatformError("too_many_keys", 409, limit=MAX_KEYS)
    checked = check_scopes(scopes, for_key=True)
    # A live key carries a sensitive scope only once the organization was approved for it.
    unapproved = sorted(set(checked.sensitive) - set(organization.approved_scopes))
    if environment == "live" and unapproved:
        raise PlatformError("review_required", 422, scopes=unapproved)
    return issue_api_key(organization, environment, name, checked.granted, member.user_id)


def key_of(organization: Organization, key_id: str) -> ApiKey:
    try:
        key = uuid.UUID(key_id)
    except ValueError:
        raise PlatformError("not_found", 404) from None
    row = db().scalar(select(ApiKey).where(ApiKey.id == key, ApiKey.organization_id == organization.id))
    if row is None:
        raise PlatformError("not_found", 404)
    return row
