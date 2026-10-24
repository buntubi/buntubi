"""
The organizations API (`/v1/organizations`), which products call as the signed-in person: their
organizations, members and invitations, under the same rules as the developer portal
(services/platform.py). `organizations:read` reads, `organizations:manage` changes, as far as the
person's role there allows. A token bound to an organization reaches that one only, and creates
none. The developer portal's own role is not part of it: each product keeps its own roles.
"""

from collections.abc import Callable
from functools import wraps
from typing import Any, Literal, TypeVar

from authlib.integrations.flask_oauth2 import current_token
from flask import Blueprint, Response, abort, jsonify
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select

from buntubi.config import get_settings
from buntubi.db import db
from buntubi.models import Client, Invitation, OrganizationMember, User
from buntubi.oauth.server import require_token
from buntubi.services import audit, webhooks
from buntubi.services import platform as p
from buntubi.web.developer import OrganizationIn, OrganizationPatch
from buntubi.web.validation import parse

bp = Blueprint("organizations", __name__, url_prefix="/v1")

READ = ["organizations:read", "organizations:manage"]
MANAGE = "organizations:manage"

F = TypeVar("F", bound=Callable[..., Any])


@bp.errorhandler(p.PlatformError)
def _refused(error: p.PlatformError) -> tuple[Response, int]:
    db().rollback()
    return jsonify(error=error.code, **error.details), error.status


def person(scope: str | list[str]) -> Callable[[F], F]:
    """The caller, as a signed-in person whose token holds `scope`."""

    def decorate(view: F) -> F:
        @require_token(scope)
        @wraps(view)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            user = current_token.user
            if user is None or user.disabled_at is not None:
                abort(403)
            return view(*args, me=user, **kwargs)

        return wrapper

    return decorate


def _bound() -> str | None:
    """The organization the token names, if it names one."""
    value = current_token.claims.claims.get("org_id")
    return str(value) if value else None


def _member(me: User, organization_id: str, ability: str | None = "read") -> OrganizationMember:
    """The caller's membership; an organization other than the one the token names does not exist."""
    bound = _bound()
    if bound is not None and bound != organization_id:
        raise p.PlatformError("not_found", 404)
    return p.membership(me, organization_id, ability)


Role = Literal["owner", "admin", "billing", "member", "guest"]


class MembershipIn(BaseModel):
    email: EmailStr
    role: Role = "member"


class MembershipPatch(BaseModel):
    role: Role


class TransferIn(BaseModel):
    member: str = Field(min_length=1, max_length=64)


# ── Shapes ────────────────────────────────────────────────────────────────────────────────────


def organization_json(member: OrganizationMember) -> dict[str, Any]:
    organization = member.organization
    return {
        "id": str(organization.id),
        "name": organization.name,
        "description": organization.description,
        "support_email": organization.support_email,
        "suspended": organization.is_suspended,
        "role": member.role,
        "created_at": organization.created_at.isoformat(),
    }


def member_json(member: OrganizationMember) -> dict[str, Any]:
    return {
        "id": str(member.id),
        # The person's id: the `sub` of their tokens, which a product keys its own data by.
        "user_id": str(member.user_id),
        "email": member.user.email,
        "name": member.user.name,
        "role": member.role,
        "added_at": member.added_at.isoformat(),
    }


def invitation_json(invitation: Invitation) -> dict[str, Any]:
    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role,
        "invited_at": invitation.created_at.isoformat(),
        "expires_at": invitation.expires_at.isoformat(),
    }


# ── Organizations ─────────────────────────────────────────────────────────────────────────────


@bp.get("/organizations")
@person(READ)
def list_organizations(me: User) -> Response:
    bound = _bound()
    members = [m for m in p.memberships_of(me) if bound is None or str(m.organization_id) == bound]
    return jsonify(items=[organization_json(m) for m in members])


@bp.post("/organizations")
@person(MANAGE)
def create_organization(me: User) -> tuple[Response, int]:
    if _bound() is not None:
        raise p.PlatformError("organization_bound", 403)
    data = parse(OrganizationIn)
    organization = p.create_organization(me, data.name, data.description, data.support_email)
    audit.record("organizations.created", user=me, organization=str(organization.id))
    db().commit()
    return jsonify(organization=organization_json(organization.members[0])), 201


@bp.get("/organizations/<organization_id>")
@person(READ)
def get_organization(organization_id: str, me: User) -> Response:
    # A guest sees the organization they are in, not its people.
    return jsonify(organization=organization_json(_member(me, organization_id, None)))


@bp.patch("/organizations/<organization_id>")
@person(MANAGE)
def update_organization(organization_id: str, me: User) -> Response:
    member = _member(me, organization_id, None)
    patch = parse(OrganizationPatch)
    p.update_organization(
        member,
        patch.name,
        patch.description,
        patch.support_email if "support_email" in patch.model_fields_set else p.UNCHANGED,
    )
    audit.record("organizations.updated", user=me, organization=organization_id)
    db().commit()
    return jsonify(organization=organization_json(member))


@bp.delete("/organizations/<organization_id>")
@person(MANAGE)
def delete_organization(organization_id: str, me: User) -> Response:
    member = _member(me, organization_id, None)
    name = member.organization.name
    p.delete_organization(member)
    audit.record("organizations.deleted", user=me, organization=organization_id, name=name)
    db().commit()
    return jsonify(deleted=True)


@bp.post("/organizations/<organization_id>/transfer")
@person(MANAGE)
def transfer_ownership(organization_id: str, me: User) -> Response:
    actor = _member(me, organization_id, None)
    data = parse(TransferIn)
    if actor.role != "owner":
        raise p.PlatformError("forbidden", 403, role=actor.role)
    member = p.member_of(actor.organization, data.member)
    p.transfer_ownership(actor, member)
    audit.record(
        "organizations.ownership_transferred", user=me, organization=organization_id, to=member.user.email
    )
    db().commit()
    return jsonify(organization=organization_json(actor))


@bp.post("/organizations/<organization_id>/leave")
@person(MANAGE)
def leave(organization_id: str, me: User) -> Response:
    member = _member(me, organization_id, None)
    p.remove_member(member, member)
    audit.record("organizations.left", user=me, organization=organization_id)
    db().commit()
    return jsonify(left=True)


# ── Members and invitations ───────────────────────────────────────────────────────────────────


@bp.get("/organizations/<organization_id>/members")
@person(READ)
def list_members(organization_id: str, me: User) -> Response:
    organization = _member(me, organization_id).organization
    return jsonify(
        items=[member_json(m) for m in organization.members],
        invitations=[invitation_json(i) for i in p.pending_invitations(organization)],
    )


@bp.post("/organizations/<organization_id>/members")
@person(MANAGE)
def add_member(organization_id: str, me: User) -> tuple[Response, int]:
    actor = _member(me, organization_id, "members")
    p.writable(actor.organization)
    data = parse(MembershipIn)
    try:
        member = p.add_member(actor, str(data.email), data.role, None, [])
    except p.PlatformError as refusal:
        if refusal.code != "no_such_account":
            raise
        invitation = p.invite(actor, str(data.email), data.role, None, [], f"{get_settings().issuer}/signup")
        audit.record(
            "organizations.member_invited", user=me, organization=organization_id, member=invitation.email
        )
        db().commit()
        return jsonify(invitation=invitation_json(invitation)), 202
    audit.record(
        "organizations.member_added", user=me, organization=organization_id, member=member.user.email
    )
    db().commit()
    return jsonify(member=member_json(member)), 201


@bp.patch("/organizations/<organization_id>/members/<member_id>")
@person(MANAGE)
def change_member(organization_id: str, member_id: str, me: User) -> Response:
    actor = _member(me, organization_id, "members")
    p.writable(actor.organization)
    member = p.member_of(actor.organization, member_id)
    p.change_member(actor, member, parse(MembershipPatch).role, None)
    audit.record(
        "organizations.member_changed",
        user=me,
        organization=organization_id,
        member=member.user.email,
        role=member.role,
    )
    db().commit()
    return jsonify(member=member_json(member))


@bp.delete("/organizations/<organization_id>/members/<member_id>")
@person(MANAGE)
def remove_member(organization_id: str, member_id: str, me: User) -> Response:
    actor = _member(me, organization_id, None)
    member = p.member_of(actor.organization, member_id)
    email = member.user.email
    p.remove_member(actor, member)
    audit.record("organizations.member_removed", user=me, organization=organization_id, member=email)
    db().commit()
    return jsonify(removed=True)


@bp.delete("/organizations/<organization_id>/invitations/<invitation_id>")
@person(MANAGE)
def withdraw_invitation(organization_id: str, invitation_id: str, me: User) -> Response:
    actor = _member(me, organization_id, "members")
    invitation = p.withdraw_invitation(actor.organization, invitation_id)
    audit.record(
        "organizations.invitation_withdrawn", user=me, organization=organization_id, member=invitation.email
    )
    db().commit()
    return jsonify(withdrawn=True)


# A product's own server repairing its copy, with its credentials and no person: the organizations
# it hears of, shaped as in the events (services/webhooks.py), with the latest event number.


def app_caller(view: F) -> F:
    """The caller, as an app whose token (client credentials) holds `organizations:read`."""

    @require_token("organizations:read")
    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        client = db().scalar(select(Client).where(Client.client_id == current_token.claims.client_id))
        if current_token.user is not None or client is None or client.disabled_at is not None:
            abort(403)
        return view(*args, app=client, **kwargs)

    return wrapper


@bp.get("/app/organizations")
@app_caller
def app_organizations(app: Client) -> Response:
    return jsonify(
        items=[
            {**webhooks.organization_data(o), "sequence": webhooks.last_sequence(o.id)}
            for o in webhooks.heard_by(app)
        ]
    )


@bp.get("/app/organizations/<organization_id>")
@app_caller
def app_organization(app: Client, organization_id: str) -> Response:
    organization = webhooks.heard(app, p.parse_uuid(organization_id))
    if organization is None:
        raise p.PlatformError("not_found", 404)
    sequence = webhooks.last_sequence(organization.id)
    members = db().scalars(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == organization.id)
        .order_by(OrganizationMember.added_at)
    )
    return jsonify(
        organization=webhooks.organization_data(organization),
        members=[webhooks.member_data(m) for m in members],
        sequence=sequence,
    )
