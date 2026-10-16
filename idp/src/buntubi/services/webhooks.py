"""
Organization events for the products (models/webhooks.py). `emit` is called by the services that
make each change, inside their transaction: the event, its number in its organization and a
delivery for every app that hears of that organization are written with the change, or not at
all. Sending them is `deliver_due`'s work, in its own process.
"""

import uuid
from enum import StrEnum
from typing import Any, TypedDict

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert

from buntubi.db import db
from buntubi.models import (
    AppOrganization,
    Client,
    OrganizationEventSequence,
    OrganizationMember,
    WebhookDelivery,
    WebhookEvent,
)


class Event(StrEnum):
    """Every event products hear of: the names are a contract, mirrored by @buntubi/sdk/webhooks."""

    ORGANIZATION_CREATED = "organization.created"
    ORGANIZATION_UPDATED = "organization.updated"
    ORGANIZATION_SUSPENDED = "organization.suspended"
    ORGANIZATION_RESTORED = "organization.restored"
    ORGANIZATION_DELETED = "organization.deleted"
    MEMBER_ADDED = "member.added"
    MEMBER_ROLE_CHANGED = "member.role_changed"
    MEMBER_REMOVED = "member.removed"
    INVITATION_ACCEPTED = "invitation.accepted"


class OrganizationData(TypedDict):
    id: str
    name: str
    suspended: bool


class MemberData(TypedDict):
    id: str
    # The person's id: the `sub` of their tokens, which a product keys its own data by.
    user_id: str
    email: str
    role: str


class InvitationData(TypedDict):
    id: str
    email: str
    role: str


def _next_sequence(organization_id: uuid.UUID) -> int:
    """The organization's next event number, taken under a row lock: two changes never share one."""
    statement = (
        insert(OrganizationEventSequence)
        .values(organization_id=organization_id, last=1)
        .on_conflict_do_update(
            index_elements=[OrganizationEventSequence.organization_id],
            set_={"last": OrganizationEventSequence.last + 1},
        )
        .returning(OrganizationEventSequence.last)
    )
    return int(db().execute(statement).scalar_one())


def _listeners(organization_id: uuid.UUID) -> list[uuid.UUID]:
    """The apps with a webhook that hear of this organization: linked to it, or subscribed to all."""
    linked = select(AppOrganization.client_id).where(AppOrganization.organization_id == organization_id)
    return list(
        db().scalars(
            select(Client.id).where(
                Client.webhook_url.is_not(None),
                Client.disabled_at.is_(None),
                or_(Client.webhook_events == "all", Client.id.in_(linked)),
            )
        )
    )


def emit(organization_id: uuid.UUID, type: Event, data: dict[str, Any]) -> WebhookEvent:
    """Records an event of the organization, with a delivery for each app that hears of it."""
    db().flush()
    event = WebhookEvent(
        id=uuid.uuid4(),
        organization_id=organization_id,
        sequence=_next_sequence(organization_id),
        type=type.value,
        data=data,
    )
    db().add(event)
    for client_id in _listeners(organization_id):
        db().add(WebhookDelivery(event_id=event.id, client_id=client_id))
    db().flush()
    return event


def link(client_id: uuid.UUID, organization_id: uuid.UUID) -> None:
    """The app works with the organization from now on, and hears of its events."""
    db().execute(
        insert(AppOrganization)
        .values(client_id=client_id, organization_id=organization_id)
        .on_conflict_do_nothing()
    )


def member_data(member: OrganizationMember) -> MemberData:
    return MemberData(
        id=str(member.id), user_id=str(member.user_id), email=member.user.email, role=member.role
    )


def organization_data(organization: Any) -> OrganizationData:
    return OrganizationData(
        id=str(organization.id), name=organization.name, suspended=organization.is_suspended
    )


def organization_changed(organization: Any, type: Event, **data: Any) -> WebhookEvent:
    """An event about the organization itself, which it carries as it is."""
    return emit(organization.id, type, {"organization": organization_data(organization), **data})


def member_changed(member: OrganizationMember, type: Event, **data: Any) -> WebhookEvent:
    """An event about one member of an organization, which it carries as it is."""
    return emit(member.organization_id, type, {"member": member_data(member), **data})
