"""
The developer API, which the developer portal calls: organizations and their members, apps,
secrets, test users and API keys. A bearer token with the `developer` scope; every rule lives in
services/platform.py.
Secrets and keys come back in full once, in the answer that creates them.
"""

from collections.abc import Callable
from dataclasses import asdict
from functools import wraps
from typing import Any, Literal, TypeVar

from authlib.integrations.flask_oauth2 import current_token
from authlib.oauth2.rfc6749 import scope_to_list
from flask import Blueprint, Response, abort, jsonify
from pydantic import BaseModel, EmailStr, Field, HttpUrl

from buntubi import plugins
from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import (
    ApiKey,
    ApiProduct,
    Client,
    ClientSecret,
    Invitation,
    OrganizationMember,
    Scope,
    User,
)
from buntubi.oauth.server import require_token
from buntubi.services import audit, mfa
from buntubi.services import platform as p
from buntubi.services.credentials import rotate_client_secret
from buntubi.web.admin import Brand, review_json
from buntubi.web.validation import RedirectUri, parse

bp = Blueprint("developer", __name__, url_prefix="/developer/api")

F = TypeVar("F", bound=Callable[..., Any])


@bp.errorhandler(p.PlatformError)
def _refused(error: p.PlatformError) -> tuple[Response, int]:
    db().rollback()
    return jsonify(error=error.code, **error.details), error.status


def developer(*, terms: bool = True) -> Callable[[F], F]:
    """The caller, as a signed-in user with the `developer` scope (and, by default, the terms)."""

    def decorate(view: F) -> F:
        @require_token("developer")
        @wraps(view)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            user = current_token.user
            if user is None or user.disabled_at is not None:
                abort(403)
            if terms:
                p.require_developer(user)
            return view(*args, me=user, **kwargs)

        return wrapper

    return decorate


# ── Shapes ────────────────────────────────────────────────────────────────────────────────────

Name = Field(min_length=1, max_length=80)


class OrganizationIn(BaseModel):
    name: str = Name
    description: str = Field(default="", max_length=500)
    support_email: EmailStr | None = None


class OrganizationPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    support_email: EmailStr | None = None


Kind = Literal["consumer", "business", "web", "mobile", "backend", "internal"]
Platform = Literal["web", "ios", "android", "backend"]


# Whether the app's tokens name an organization the person acts in (models/clients.py).
OrganizationUsage = Literal["none", "optional", "required"]


class AppIn(BaseModel):
    name: str = Name
    client_type: Literal["public", "confidential"] = "public"
    redirect_uris: list[RedirectUri] = Field(default=[], max_length=10)
    post_logout_redirect_uris: list[RedirectUri] = Field(default=[], max_length=10)
    scopes: list[str] = ["profile", "email"]
    grant_types: list[str] = ["authorization_code", "refresh_token"]
    homepage_url: HttpUrl | None = None
    privacy_url: HttpUrl | None = None
    terms_url: HttpUrl | None = None
    brand: Brand = Brand()
    kind: Kind = "web"
    description: str = Field(default="", max_length=500)
    category: str = Field(default="", max_length=40)
    platforms: list[Platform] = Field(default=[], max_length=4)
    products: list[str] = Field(default=[], max_length=50)
    organization_usage: OrganizationUsage = "none"


class AppPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    redirect_uris: list[RedirectUri] | None = Field(default=None, max_length=10)
    post_logout_redirect_uris: list[RedirectUri] | None = Field(default=None, max_length=10)
    scopes: list[str] | None = None
    homepage_url: HttpUrl | None = None
    privacy_url: HttpUrl | None = None
    terms_url: HttpUrl | None = None
    brand: Brand | None = None
    kind: Kind | None = None
    description: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=40)
    platforms: list[Platform] | None = Field(default=None, max_length=4)
    products: list[str] | None = Field(default=None, max_length=50)
    organization_usage: OrganizationUsage | None = None


class TestUserIn(BaseModel):
    email: EmailStr


class KeyIn(BaseModel):
    name: str = Name
    environment: Literal["sandbox", "live"] = "sandbox"
    scopes: list[str] = []


Role = Literal["owner", "admin", "billing", "member", "guest"]
PortalRole = Literal["developer", "reviewer", "viewer"]


class MemberIn(BaseModel):
    email: EmailStr
    role: Role = "member"
    # The developer portal's own role, for a member or a billing person.
    portal_role: PortalRole | None = None
    # Public client ids of the apps someone with a portal role works on; empty for all.
    apps: list[str] = Field(default=[], max_length=50)


class MemberPatch(BaseModel):
    role: Role | None = None
    # Left out: kept (dropped when the new role holds none). null: removed.
    portal_role: PortalRole | None = None
    apps: list[str] | None = Field(default=None, max_length=50)


def _url(value: HttpUrl | None) -> str | None:
    return str(value) if value is not None else None


def organization_json(member: OrganizationMember) -> dict[str, Any]:
    """The organization as the caller sees it, with their role in it."""
    organization = member.organization
    return {
        "id": str(organization.id),
        "name": organization.name,
        "description": organization.description,
        "support_email": organization.support_email,
        "suspended": organization.is_suspended,
        "platform": organization.is_platform,
        "role": member.role,
        "portal_role": member.portal_role,
        "created_at": organization.created_at.isoformat(),
    }


def invitation_json(invitation: Invitation) -> dict[str, Any]:
    by_id = {c.id: c.client_id for c in p.apps_of(invitation.organization)}
    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role,
        "portal_role": invitation.portal_role,
        "apps": [by_id[a] for a in invitation.app_ids if a in by_id],
        "invited_at": invitation.created_at.isoformat(),
        "expires_at": invitation.expires_at.isoformat(),
    }


def member_json(member: OrganizationMember) -> dict[str, Any]:
    by_id = {c.id: c.client_id for c in p.apps_of(member.organization)}
    return {
        "id": str(member.id),
        "email": member.user.email,
        "name": member.user.name,
        "role": member.role,
        "portal_role": member.portal_role,
        "apps": [by_id[a] for a in member.app_ids if a in by_id],
        "added_at": member.added_at.isoformat(),
        # Whether the account signs in with a second factor: the team list shows who does not.
        "two_step": mfa.is_enabled(member.user),
    }


def secret_json(secret: ClientSecret) -> dict[str, Any]:
    return {
        "id": str(secret.id),
        "prefix": secret.prefix,
        "created_at": secret.created_at.isoformat(),
        "last_used_at": secret.last_used_at.isoformat() if secret.last_used_at else None,
        "expires_at": secret.expires_at.isoformat() if secret.expires_at else None,
        "active": secret.is_active(utcnow()),
    }


def app_json(client: Client) -> dict[str, Any]:
    return {
        "client_id": client.client_id,
        "organization_id": str(client.organization_id),
        "name": client.name,
        "client_type": client.client_type,
        "environment": client.environment,
        "first_party": client.first_party,
        "review_status": client.review_status,
        "review_note": client.review_note,
        "redirect_uris": client.redirect_uris,
        "post_logout_redirect_uris": client.post_logout_redirect_uris,
        "scopes": scope_to_list(client.scope) or [],
        "grant_types": client.grant_types,
        "homepage_url": client.homepage_url,
        "privacy_url": client.privacy_url,
        "terms_url": client.terms_url,
        "brand": client.brand,
        "kind": client.kind,
        "description": client.description,
        "category": client.category,
        "platforms": client.platforms,
        "products": client.products,
        "organization_usage": client.organization_usage,
        "disabled": client.disabled_at is not None,
        "secrets": [secret_json(s) for s in client.secrets] if not client.is_public else [],
        "created_at": client.created_at.isoformat(),
    }


def product_json(product: ApiProduct, scopes: list[Scope]) -> dict[str, Any]:
    return {
        "slug": product.slug,
        "names": product.names,
        "descriptions": product.descriptions,
        "category": product.category,
        "auth": product.auth,
        "availability": product.availability,
        "docs_url": product.docs_url,
        "approval": p.approval_of(scopes),
        "scopes": [
            {"name": s.name, "sensitivity": s.sensitivity, "descriptions": s.descriptions} for s in scopes
        ],
    }


def key_json(key: ApiKey) -> dict[str, Any]:
    return {
        "id": str(key.id),
        "name": key.name,
        "environment": key.environment,
        "prefix": key.prefix,
        "scopes": key.scopes,
        "created_at": key.created_at.isoformat(),
        "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
        "active": key.is_active(utcnow()),
    }


# ── Developer ─────────────────────────────────────────────────────────────────────────────────


@bp.get("/me")
@developer(terms=False)
def me_view(me: User) -> Response:
    return jsonify(
        email=me.email,
        name=me.name,
        developer=me.developer_since is not None or me.is_admin,
        developer_since=me.developer_since.isoformat() if me.developer_since else None,
        platform_admin=me.is_admin,
    )


@bp.post("/terms")
@developer(terms=False)
def accept_terms(me: User) -> Response:
    p.become_developer(me)
    audit.record("developer.terms_accepted", user=me)
    db().commit()
    return jsonify(developer=True)


# ── API products ──────────────────────────────────────────────────────────────────────────────


@bp.get("/plugins")
@developer()
def list_plugins(me: User) -> Response:
    """The plugins this deployment runs, by id: the portal shows the pages of these only."""
    return jsonify(items=[{"id": plugin.id, "ui": plugins.ui_of(plugin)} for plugin in plugins.active()])


@bp.get("/products")
@developer()
def list_products(me: User) -> Response:
    grouped = p.scopes_by_product(offered=True)
    return jsonify(items=[product_json(x, grouped.get(x.slug, [])) for x in p.products(offered=True)])


# ── Organizations ─────────────────────────────────────────────────────────────────────────────


@bp.get("/organizations")
@developer()
def list_organizations(me: User) -> Response:
    return jsonify(items=[organization_json(m) for m in p.memberships_of(me)])


@bp.post("/organizations")
@developer()
def create_organization(me: User) -> tuple[Response, int]:
    data = parse(OrganizationIn)
    organization = p.create_organization(me, data.name, data.description, data.support_email)
    audit.record("developer.organization_created", user=me, organization=str(organization.id))
    db().commit()
    return jsonify(organization=organization_json(organization.members[0])), 201


@bp.get("/organizations/<organization_id>")
@developer()
def get_organization(organization_id: str, me: User) -> Response:
    member = p.membership(me, organization_id)
    organization = member.organization
    return jsonify(
        organization=organization_json(member),
        apps=[app_json(c) for c in p.apps_of(organization, member)],
        keys=[key_json(k) for k in p.keys_of(organization)],
        test_users=[{"email": t.email, "added_at": t.added_at.isoformat()} for t in organization.test_users],
        members=[member_json(m) for m in organization.members],
        invitations=[invitation_json(i) for i in p.pending_invitations(organization)],
    )


@bp.patch("/organizations/<organization_id>")
@developer()
def update_organization(organization_id: str, me: User) -> Response:
    member = p.membership(me, organization_id, "settings")
    patch = parse(OrganizationPatch)
    p.update_organization(
        member,
        patch.name,
        patch.description,
        patch.support_email if "support_email" in patch.model_fields_set else p.UNCHANGED,
    )
    db().commit()
    return jsonify(organization=organization_json(member))


@bp.delete("/organizations/<organization_id>")
@developer()
def delete_organization(organization_id: str, me: User) -> Response:
    member = p.membership(me, organization_id, "delete")
    organization = member.organization
    p.delete_organization(member)
    audit.record(
        "developer.organization_deleted", user=me, organization=str(organization.id), name=organization.name
    )
    db().commit()
    return jsonify(deleted=True)


# ── Members ───────────────────────────────────────────────────────────────────────────────────


@bp.post("/organizations/<organization_id>/members")
@developer()
def add_member(organization_id: str, me: User) -> tuple[Response, int]:
    actor = p.membership(me, organization_id, "members")
    p.writable(actor.organization)
    data = parse(MemberIn)
    try:
        member = p.add_member(actor, str(data.email), data.role, data.portal_role, data.apps)
    except p.PlatformError as refusal:
        if refusal.code != "no_such_account":
            raise
        # No account yet: an invitation, accepted once they sign in with this address.
        signup = f"{get_settings().issuer}/signup"
        invitation = p.invite(actor, str(data.email), data.role, data.portal_role, data.apps, signup)
        audit.record(
            "developer.member_invited",
            user=me,
            organization=organization_id,
            member=invitation.email,
            role=invitation.role,
        )
        db().commit()
        return jsonify(invitation=invitation_json(invitation)), 202
    audit.record(
        "developer.member_added",
        user=me,
        organization=organization_id,
        member=member.user.email,
        role=member.role,
    )
    db().commit()
    return jsonify(member=member_json(member)), 201


@bp.patch("/organizations/<organization_id>/members/<member_id>")
@developer()
def change_member(organization_id: str, member_id: str, me: User) -> Response:
    actor = p.membership(me, organization_id, "members")
    p.writable(actor.organization)
    member = p.member_of(actor.organization, member_id)
    patch = parse(MemberPatch)
    portal_role = patch.portal_role if "portal_role" in patch.model_fields_set else p.KEEP
    p.change_member(actor, member, patch.role, patch.apps, portal_role)
    audit.record(
        "developer.member_changed",
        user=me,
        organization=organization_id,
        member=member.user.email,
        role=member.role,
    )
    db().commit()
    return jsonify(member=member_json(member))


@bp.delete("/organizations/<organization_id>/members/<member_id>")
@developer()
def remove_member(organization_id: str, member_id: str, me: User) -> Response:
    actor = p.membership(me, organization_id)
    member = p.member_of(actor.organization, member_id)
    email = member.user.email
    p.remove_member(actor, member)
    audit.record("developer.member_removed", user=me, organization=organization_id, member=email)
    db().commit()
    return jsonify(removed=True)


@bp.delete("/organizations/<organization_id>/invitations/<invitation_id>")
@developer()
def withdraw_invitation(organization_id: str, invitation_id: str, me: User) -> Response:
    actor = p.membership(me, organization_id, "members")
    invitation = p.withdraw_invitation(actor.organization, invitation_id)
    audit.record(
        "developer.invitation_withdrawn", user=me, organization=organization_id, member=invitation.email
    )
    db().commit()
    return jsonify(withdrawn=True)


# ── Apps ──────────────────────────────────────────────────────────────────────────────────────


@bp.post("/organizations/<organization_id>/apps")
@developer()
def create_app(organization_id: str, me: User) -> tuple[Response, int]:
    member = p.membership(me, organization_id, "edit_apps")
    p.writable(member.organization)
    data = parse(AppIn)
    client, secret = p.create_app(
        member,
        p.NewApp(
            name=data.name,
            client_type=data.client_type,
            redirect_uris=[str(u) for u in data.redirect_uris],
            post_logout_redirect_uris=[str(u) for u in data.post_logout_redirect_uris],
            scopes=data.scopes,
            grant_types=data.grant_types,
            homepage_url=_url(data.homepage_url),
            privacy_url=_url(data.privacy_url),
            terms_url=_url(data.terms_url),
            brand=data.brand.model_dump(mode="json", exclude_none=True),
            kind=data.kind,
            description=data.description,
            category=data.category,
            platforms=list(data.platforms),
            products=data.products,
            organization_usage=data.organization_usage,
        ),
    )
    audit.record("developer.app_created", user=me, client=client)
    db().commit()
    return jsonify(app=app_json(client), client_secret=secret), 201


@bp.get("/apps/<client_id>")
@developer()
def get_app(client_id: str, me: User) -> Response:
    client, member = p.app_of(me, client_id)
    return jsonify(app=app_json(client), role=member.role, portal_role=member.portal_role)


@bp.get("/apps/<client_id>/overview")
@developer()
def app_overview(client_id: str, me: User) -> Response:
    client, member = p.app_of(me, client_id)
    return jsonify(asdict(p.overview(client, member.organization)))


@bp.patch("/apps/<client_id>")
@developer()
def update_app(client_id: str, me: User) -> Response:
    client, member = p.app_of(me, client_id, "edit_apps")
    p.writable(member.organization)
    patch = parse(AppPatch)
    fields = patch.model_fields_set
    if patch.name is not None:
        client.name = patch.name
    if patch.redirect_uris is not None:
        p.set_redirect_uris(client, [str(u) for u in patch.redirect_uris])
    if patch.post_logout_redirect_uris is not None:
        client.post_logout_redirect_uris = [str(u) for u in patch.post_logout_redirect_uris]
    for name in ("homepage_url", "privacy_url", "terms_url"):
        if name in fields:
            setattr(client, name, _url(getattr(patch, name)))
    if patch.brand is not None:
        client.brand = patch.brand.model_dump(mode="json", exclude_none=True)
    for name in ("kind", "description", "category", "organization_usage"):
        if getattr(patch, name) is not None:
            setattr(client, name, getattr(patch, name))
    if patch.platforms is not None:
        client.platforms = sorted(set(patch.platforms))
    if patch.products is not None:
        client.products = p.checked_products(patch.products)
    if patch.scopes is not None:
        p.set_app_scopes(client, patch.scopes)
    audit.record("developer.app_updated", user=me, client=client, fields=sorted(fields))
    db().commit()
    return jsonify(app=app_json(client))


@bp.delete("/apps/<client_id>")
@developer()
def delete_app(client_id: str, me: User) -> Response:
    client, _ = p.app_of(me, client_id, "publish")
    audit.record("developer.app_deleted", user=me, client_id=client.client_id)
    db().delete(client)
    db().commit()
    return jsonify(deleted=True)


class PublishIn(BaseModel):
    # Why the app needs each sensitive scope and where people meet it, by scope.
    justifications: dict[str, str] = Field(default={}, max_length=50)
    # How a reviewer tries the app: a test account, the steps to follow.
    instructions: str = Field(default="", max_length=4000)


@bp.post("/apps/<client_id>/publish")
@developer()
def publish_app(client_id: str, me: User) -> Response:
    client, member = p.app_of(me, client_id, "publish")
    data = parse(PublishIn)
    if any(len(text) > 2000 for text in data.justifications.values()):
        raise p.PlatformError("justification_too_long", 422)
    state = p.publish(client, p.writable(member.organization), me, data.justifications, data.instructions)
    audit.record("developer.app_publish", user=me, client=client, state=state)
    db().commit()
    return jsonify(state=state, app=app_json(client))


@bp.get("/apps/<client_id>/reviews")
@developer()
def app_reviews(client_id: str, me: User) -> Response:
    client, _ = p.app_of(me, client_id, "read")
    return jsonify(items=[review_json(r) for r in p.reviews_of(client)])


@bp.post("/apps/<client_id>/secrets")
@developer()
def new_secret(client_id: str, me: User) -> Response:
    client, member = p.app_of(me, client_id, "edit_apps")
    p.writable(member.organization)
    if client.is_public:
        raise p.PlatformError("public_client_has_no_secret", 422)
    secret = rotate_client_secret(client)
    audit.record("developer.secret_rotated", user=me, client=client)
    db().commit()
    return jsonify(client_secret=secret, app=app_json(client))


@bp.delete("/apps/<client_id>/secrets/<secret_id>")
@developer()
def revoke_secret(client_id: str, secret_id: str, me: User) -> Response:
    client, _ = p.app_of(me, client_id, "edit_apps")
    found = next((s for s in client.secrets if str(s.id) == secret_id), None)
    if found is None:
        raise p.PlatformError("not_found", 404)
    found.revoked_at = found.revoked_at or utcnow()
    audit.record("developer.secret_revoked", user=me, client=client, prefix=found.prefix)
    db().commit()
    return jsonify(app=app_json(client))


# ── Test users ────────────────────────────────────────────────────────────────────────────────


@bp.post("/organizations/<organization_id>/test-users")
@developer()
def add_test_user(organization_id: str, me: User) -> tuple[Response, int]:
    organization = p.writable(p.organization_of(me, organization_id, "test_users"))
    row = p.add_test_user(organization, str(parse(TestUserIn).email))
    db().commit()
    return jsonify(email=row.email), 201


@bp.delete("/organizations/<organization_id>/test-users/<path:email>")
@developer()
def remove_test_user(organization_id: str, email: str, me: User) -> Response:
    organization = p.organization_of(me, organization_id, "test_users")
    p.remove_test_user(organization, email)
    db().commit()
    return jsonify(removed=True)


# ── API keys ──────────────────────────────────────────────────────────────────────────────────


@bp.post("/organizations/<organization_id>/keys")
@developer()
def create_key(organization_id: str, me: User) -> tuple[Response, int]:
    member = p.membership(me, organization_id)
    p.writable(member.organization)
    data = parse(KeyIn)
    row, key = p.create_key(member, data.name, data.environment, data.scopes)
    db().flush()
    audit.record("developer.key_created", user=me, organization=organization_id, prefix=row.prefix)
    db().commit()
    return jsonify(key=key_json(row), api_key=key), 201


@bp.delete("/organizations/<organization_id>/keys/<key_id>")
@developer()
def revoke_key(organization_id: str, key_id: str, me: User) -> Response:
    member = p.membership(me, organization_id)
    row = p.key_of(member.organization, key_id)
    if not p.can(member, "live_keys" if row.environment == "live" else "sandbox_keys"):
        raise p.PlatformError("forbidden", 403, role=member.role)
    row.revoked_at = row.revoked_at or utcnow()
    audit.record("developer.key_revoked", user=me, organization=organization_id, prefix=row.prefix)
    db().commit()
    return jsonify(key=key_json(row))
