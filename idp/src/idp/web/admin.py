"""
The admin API: clients, users and the audit trail. Callers present an access token with the
`admin` scope, issued to a user with the admin role; both are checked on every request.
"""

import uuid
from collections.abc import Callable
from datetime import datetime
from functools import wraps
from typing import Any, Literal, TypeVar

from authlib.integrations.flask_oauth2 import current_token
from flask import Blueprint, Response, abort, jsonify, request
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import select

from idp.db import db, utcnow
from idp.models import AuditEvent, Client, User
from idp.models.clients import GRANT_TYPES
from idp.oauth.server import require_token
from idp.services import audit
from idp.services.accounts import sign_out_everywhere
from idp.services.credentials import issue_client_secret, rotate_client_secret
from idp.web.validation import parse

bp = Blueprint("admin", __name__, url_prefix="/admin/api")

F = TypeVar("F", bound=Callable[..., Any])
PAGE_SIZE = 50


def admin_only(view: F) -> F:
    @require_token("admin")
    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        user = current_token.user
        if user is None or not user.is_admin or user.disabled_at is not None:
            abort(403)
        # The console is held to a second factor at sign-in, whatever the client asked for.
        if "mfa" not in (current_token.claims.claims.get("amr") or []):
            abort(403)
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
        # The owner's own apps: no project, live from the start.
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
