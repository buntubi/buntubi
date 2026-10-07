"""
The admin API, which the owner console calls: an overview, app reviews, organizations and their
suspension, the scope catalog, clients, users and the audit trail. Callers present an access
token with the `admin` scope, issued to a user with the admin role who signed in with a second
factor; all three are checked on every request.
"""

import json
import uuid
from collections.abc import Callable
from datetime import datetime
from functools import wraps
from typing import Any, Literal, NoReturn, TypeVar

from authlib.integrations.flask_oauth2 import current_token
from flask import Blueprint, Response, abort, jsonify, request
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import func, select

from idp.db import db, utcnow
from idp.models import AuditEvent, Client, Organization, Scope, User
from idp.models.clients import GRANT_TYPES
from idp.oauth.server import require_token
from idp.services import audit, mfa
from idp.services import platform as p
from idp.services.accounts import sign_out_everywhere
from idp.services.credentials import issue_client_secret, rotate_client_secret
from idp.services.platform import PlatformError
from idp.web.validation import parse

bp = Blueprint("admin", __name__, url_prefix="/admin/api")

F = TypeVar("F", bound=Callable[..., Any])
PAGE_SIZE = 50


def refuse(code: str, status: int, **details: Any) -> NoReturn:
    """Stops the request with a JSON refusal the console can word."""
    abort(Response(json.dumps({"error": code, **details}), status=status, mimetype="application/json"))


@bp.errorhandler(PlatformError)
def _platform_refusal(error: PlatformError) -> tuple[Response, int]:
    db().rollback()
    return jsonify(error=error.code, **error.details), error.status


def admin_only(view: F) -> F:
    @require_token("admin")
    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        user = current_token.user
        if user is None or not user.is_admin or user.disabled_at is not None:
            refuse("not_admin", 403)
        # The console is held to a second factor at sign-in, whatever the client asked for.
        if "mfa" not in (current_token.claims.claims.get("amr") or []):
            refuse("mfa_required", 403)
        return view(*args, admin=user, **kwargs)

    return wrapper


class Brand(BaseModel):
    logo: HttpUrl | None = None
    accent: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    skin: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,32}$")
    tagline: str | None = Field(default=None, max_length=120)


class ClientIn(BaseModel):
    client_id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{1,63}$")
    name: str = Field(min_length=1, max_length=120)
    client_type: Literal["public", "confidential"] = "public"
    redirect_uris: list[HttpUrl] = []
    post_logout_redirect_uris: list[HttpUrl] = []
    grant_types: list[Literal[GRANT_TYPES]] = ["authorization_code", "refresh_token"]  # type: ignore[valid-type]
    scope: str = "openid profile email"
    first_party: bool = False
    brand: Brand = Brand()


class ClientPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    redirect_uris: list[HttpUrl] | None = None
    post_logout_redirect_uris: list[HttpUrl] | None = None
    scope: str | None = None
    first_party: bool | None = None
    brand: Brand | None = None
    disabled: bool | None = None


def _client_json(client: Client) -> dict[str, Any]:
    return {
        "client_id": client.client_id,
        "name": client.name,
        "client_type": client.client_type,
        "redirect_uris": client.redirect_uris,
        "post_logout_redirect_uris": client.post_logout_redirect_uris,
        "grant_types": client.grant_types,
        "scope": client.scope,
        "first_party": client.first_party,
        "brand": client.brand,
        "disabled": client.disabled_at is not None,
        "organization_id": str(client.organization_id) if client.organization_id else None,
        "environment": client.environment,
        "review_status": client.review_status,
        "created_at": client.created_at.isoformat(),
    }


def _user_json(user: User) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "email": user.email,
        "email_verified": user.email_verified,
        "given_name": user.given_name,
        "family_name": user.family_name,
        "roles": user.roles,
        "developer": user.developer_since is not None,
        "mfa": mfa.is_enabled(user),
        "disabled": user.disabled_at is not None,
        "created_at": user.created_at.isoformat(),
    }


def _client_or_404(client_id: str) -> Client:
    client = db().scalar(select(Client).where(Client.client_id == client_id))
    if client is None:
        abort(404)
    return client


def _user_or_404(user_id: str) -> User:
    try:
        user = db().get(User, uuid.UUID(user_id))
    except ValueError:
        user = None
    if user is None:
        abort(404)
    return user


@bp.get("/clients")
@admin_only
def list_clients(admin: User) -> Response:
    clients = db().scalars(select(Client).order_by(Client.created_at)).all()
    return jsonify(items=[_client_json(c) for c in clients])


@bp.post("/clients")
@admin_only
def create_client(admin: User) -> Any:
    data = parse(ClientIn)
    if db().scalar(select(Client.id).where(Client.client_id == data.client_id)) is not None:
        return jsonify(error="client_id_taken"), 409
    if data.client_type == "public" and "client_credentials" in data.grant_types:
        return jsonify(error="public_client_cannot_use_client_credentials"), 422
    confidential = data.client_type == "confidential"
    client = Client(
        client_id=data.client_id,
        name=data.name,
        client_type=data.client_type,
        # The owner's own apps: no organization, live from the start.
        environment="live",
        redirect_uris=[str(u) for u in data.redirect_uris],
        post_logout_redirect_uris=[str(u) for u in data.post_logout_redirect_uris],
        grant_types=list(data.grant_types),
        scope=data.scope,
        token_endpoint_auth_method="client_secret_basic" if confidential else "none",
        first_party=data.first_party,
        brand=data.brand.model_dump(mode="json", exclude_none=True),
    )
    db().add(client)
    secret = issue_client_secret(client) if confidential else None
    db().flush()
    audit.record("admin.client_created", user=admin, client=client)
    db().commit()
    # The secret is returned this once and never again.
    return jsonify(client=_client_json(client), client_secret=secret), 201


@bp.patch("/clients/<client_id>")
@admin_only
def update_client(client_id: str, admin: User) -> Response:
    client = _client_or_404(client_id)
    patch = parse(ClientPatch)
    if patch.name is not None:
        client.name = patch.name
    if patch.redirect_uris is not None:
        client.redirect_uris = [str(u) for u in patch.redirect_uris]
    if patch.post_logout_redirect_uris is not None:
        client.post_logout_redirect_uris = [str(u) for u in patch.post_logout_redirect_uris]
    if patch.scope is not None:
        client.scope = patch.scope
    if patch.first_party is not None:
        client.first_party = patch.first_party
    if patch.brand is not None:
        client.brand = patch.brand.model_dump(mode="json", exclude_none=True)
    if patch.disabled is not None:
        client.disabled_at = utcnow() if patch.disabled else None
    audit.record("admin.client_updated", user=admin, client=client, fields=sorted(patch.model_fields_set))
    db().commit()
    return jsonify(client=_client_json(client))


@bp.post("/clients/<client_id>/secret")
@admin_only
def rotate_secret(client_id: str, admin: User) -> Any:
    client = _client_or_404(client_id)
    if client.is_public:
        return jsonify(error="public_client_has_no_secret"), 422
    secret = rotate_client_secret(client)
    audit.record("admin.client_secret_rotated", user=admin, client=client)
    db().commit()
    return jsonify(client_secret=secret)


@bp.get("/users")
@admin_only
def list_users(admin: User) -> Response:
    query = select(User).order_by(User.created_at.desc()).limit(PAGE_SIZE)
    if search := request.args.get("q", "").strip().lower():
        query = query.where(User.email.contains(search, autoescape=True))
    if before := request.args.get("before"):
        try:
            query = query.where(User.created_at < datetime.fromisoformat(before))
        except ValueError:
            abort(400)
    users = db().scalars(query).all()
    return jsonify(items=[_user_json(u) for u in users])


@bp.get("/users/<user_id>")
@admin_only
def get_user(user_id: str, admin: User) -> Response:
    return jsonify(user=_user_json(_user_or_404(user_id)))


@bp.post("/users/<user_id>/disable")
@admin_only
def disable_user(user_id: str, admin: User) -> Any:
    user = _user_or_404(user_id)
    if user.id == admin.id:
        return jsonify(error="cannot_disable_yourself"), 422
    user.disabled_at = utcnow()
    sign_out_everywhere(user)
    audit.record("admin.user_disabled", user=admin, target=str(user.id))
    db().commit()
    return jsonify(user=_user_json(user))


@bp.post("/users/<user_id>/enable")
@admin_only
def enable_user(user_id: str, admin: User) -> Response:
    user = _user_or_404(user_id)
    user.disabled_at = None
    audit.record("admin.user_enabled", user=admin, target=str(user.id))
    db().commit()
    return jsonify(user=_user_json(user))


@bp.get("/audit")
@admin_only
def audit_trail(admin: User) -> Response:
    query = select(AuditEvent).order_by(AuditEvent.at.desc()).limit(PAGE_SIZE)
    if user_id := request.args.get("user"):
        query = query.where(AuditEvent.user_id == _user_or_404(user_id).id)
    events = db().scalars(query).all()
    return jsonify(
        items=[
            {
                "event": e.event,
                "user_id": str(e.user_id) if e.user_id else None,
                "client_id": str(e.client_id) if e.client_id else None,
                "ip": e.ip,
                "details": e.details,
                "at": e.at.isoformat(),
            }
            for e in events
        ]
    )


# ── Overview ──────────────────────────────────────────────────────────────────────────────────


def _count(model: Any, *where: Any) -> int:
    return int(db().scalar(select(func.count()).select_from(model).where(*where)) or 0)


@bp.get("/overview")
@admin_only
def overview(admin: User) -> Response:
    return jsonify(
        users=_count(User),
        developers=_count(User, User.developer_since.is_not(None)),
        organizations=_count(Organization),
        suspended_organizations=_count(Organization, Organization.suspended_at.is_not(None)),
        live_apps=_count(Client, Client.organization_id.is_not(None), Client.environment == "live"),
        sandbox_apps=_count(Client, Client.organization_id.is_not(None), Client.environment == "sandbox"),
        pending_reviews=_count(Client, Client.review_status == "pending"),
    )


# ── Reviews ───────────────────────────────────────────────────────────────────────────────────


def _review_json(client: Client) -> dict[str, Any]:
    organization = client.organization
    owner = _first_owner(organization) if organization else None
    return {
        **_client_json(client),
        "homepage_url": client.homepage_url,
        "privacy_url": client.privacy_url,
        "terms_url": client.terms_url,
        "sensitive_scopes": [
            name
            for name in client.scope.split()
            if (scope := db().get(Scope, name)) is not None and scope.sensitivity == "sensitive"
        ],
        "organization": {
            "id": str(organization.id),
            "name": organization.name,
            "support_email": organization.support_email,
        }
        if organization
        else None,
        "owner": {"email": owner.email, "name": owner.name} if owner else None,
        "requested_at": client.updated_at.isoformat(),
    }


class ReviewIn(BaseModel):
    approve: bool
    note: str = Field(default="", max_length=1000)


@bp.get("/reviews")
@admin_only
def list_reviews(admin: User) -> Response:
    return jsonify(items=[_review_json(c) for c in p.pending_reviews()])


@bp.post("/apps/<client_id>/review")
@admin_only
def review_app(client_id: str, admin: User) -> Response:
    client = _client_or_404(client_id)
    data = parse(ReviewIn)
    if not data.approve and not data.note.strip():
        refuse("note_required", 422)
    p.review(client, admin, data.approve, data.note.strip())
    audit.record("admin.app_reviewed", user=admin, client=client, approved=data.approve)
    db().commit()
    return jsonify(app=_review_json(client))


# ── Organizations ──────────────────────────────────────────────────────────────────────────────────


def _first_owner(organization: Organization) -> User | None:
    """The organization's earliest owner, who answers for it in the console."""
    owners = sorted(p.owners_of(organization), key=lambda m: m.added_at)
    return owners[0].user if owners else None


def _organization_json(organization: Organization) -> dict[str, Any]:
    owner = _first_owner(organization)
    return {
        "id": str(organization.id),
        "name": organization.name,
        "owner": {"id": str(owner.id), "email": owner.email} if owner else None,
        "members": len(organization.members),
        "support_email": organization.support_email,
        "approved_scopes": organization.approved_scopes,
        "apps": _count(Client, Client.organization_id == organization.id),
        "suspended": organization.is_suspended,
        "suspended_reason": organization.suspended_reason,
        "created_at": organization.created_at.isoformat(),
    }


def _organization_or_404(organization_id: str) -> Organization:
    try:
        organization = db().get(Organization, uuid.UUID(organization_id))
    except ValueError:
        organization = None
    if organization is None:
        refuse("not_found", 404)
    return organization


class SuspendIn(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


@bp.get("/organizations")
@admin_only
def list_organizations(admin: User) -> Response:
    query = select(Organization).order_by(Organization.created_at.desc()).limit(PAGE_SIZE)
    if search := request.args.get("q", "").strip():
        query = query.where(func.lower(Organization.name).contains(search.lower(), autoescape=True))
    return jsonify(items=[_organization_json(x) for x in db().scalars(query)])


@bp.post("/organizations/<organization_id>/suspend")
@admin_only
def suspend_organization(organization_id: str, admin: User) -> Response:
    organization = _organization_or_404(organization_id)
    p.suspend(organization, parse(SuspendIn).reason)
    audit.record("admin.organization_suspended", user=admin, organization=str(organization.id))
    db().commit()
    return jsonify(organization=_organization_json(organization))


@bp.post("/organizations/<organization_id>/restore")
@admin_only
def restore_organization(organization_id: str, admin: User) -> Response:
    organization = _organization_or_404(organization_id)
    p.restore(organization)
    audit.record("admin.organization_restored", user=admin, organization=str(organization.id))
    db().commit()
    return jsonify(organization=_organization_json(organization))


# ── Scope catalog ─────────────────────────────────────────────────────────────────────────────


class Descriptions(BaseModel):
    fr: str = Field(min_length=1, max_length=200)
    en: str = Field(min_length=1, max_length=200)


class ScopeIn(BaseModel):
    name: str = Field(pattern=r"^[a-z][a-z0-9_.:-]{1,63}$")
    sensitivity: Literal["public", "sensitive", "restricted"] = "public"
    descriptions: Descriptions
    resource: str = Field(default="", max_length=64)
    notes: str = Field(default="", max_length=2000)


class ScopePatch(BaseModel):
    sensitivity: Literal["public", "sensitive", "restricted"] | None = None
    descriptions: Descriptions | None = None
    resource: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=2000)


def _scope_json(scope: Scope) -> dict[str, Any]:
    return {
        "name": scope.name,
        "sensitivity": scope.sensitivity,
        "descriptions": scope.descriptions,
        "resource": scope.resource,
        "notes": scope.notes,
    }


@bp.get("/scopes")
@admin_only
def list_scopes(admin: User) -> Response:
    return jsonify(items=[_scope_json(s) for s in db().scalars(select(Scope).order_by(Scope.name))])


@bp.post("/scopes")
@admin_only
def create_scope(admin: User) -> tuple[Response, int]:
    data = parse(ScopeIn)
    if db().get(Scope, data.name) is not None:
        refuse("scope_exists", 409)
    scope = Scope(
        name=data.name,
        sensitivity=data.sensitivity,
        descriptions=data.descriptions.model_dump(),
        resource=data.resource,
        notes=data.notes,
    )
    db().add(scope)
    audit.record("admin.scope_created", user=admin, scope=data.name)
    db().commit()
    return jsonify(scope=_scope_json(scope)), 201


@bp.patch("/scopes/<name>")
@admin_only
def update_scope(name: str, admin: User) -> Response:
    scope = db().get(Scope, name)
    if scope is None:
        refuse("not_found", 404)
    patch = parse(ScopePatch)
    if patch.sensitivity is not None:
        scope.sensitivity = patch.sensitivity
    if patch.descriptions is not None:
        scope.descriptions = patch.descriptions.model_dump()
    if patch.resource is not None:
        scope.resource = patch.resource
    if patch.notes is not None:
        scope.notes = patch.notes
    audit.record("admin.scope_updated", user=admin, scope=name, fields=sorted(patch.model_fields_set))
    db().commit()
    return jsonify(scope=_scope_json(scope))
