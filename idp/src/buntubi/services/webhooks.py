"""
Organization events for the products (models/webhooks.py). `emit` is called by the services that
make each change, inside their transaction: the event, its number in its organization and a
delivery for every app that hears of that organization are written with the change, or not at
all. Sending them is `deliver_due`'s work, in its own process.
"""

import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import timedelta
from enum import StrEnum
from typing import Any, TypedDict
from urllib.parse import urlsplit

import certifi
import urllib3
from sqlalchemy import ColumnElement, and_, or_, select
from sqlalchemy.dialects.postgresql import insert

from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import (
    AppOrganization,
    Client,
    Consent,
    Organization,
    OrganizationEventSequence,
    OrganizationMember,
    WebhookDelivery,
    WebhookEvent,
)
from buntubi.security import crypto
from buntubi.security.addresses import public_ip, resolve
from buntubi.security.tokens import new_token

log = logging.getLogger(__name__)

# The waits after each failed try; the last one repeats until a day after the event.
RETRY_DELAYS = (
    timedelta(minutes=1),
    timedelta(minutes=5),
    timedelta(minutes=30),
    timedelta(hours=2),
    timedelta(hours=6),
    timedelta(hours=12),
)
GIVE_UP_AFTER = timedelta(days=1)
TIMEOUT_SECONDS = 10


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


def _reading_roles() -> list[str]:
    from buntubi.services.platform import ROLE_ABILITIES

    return [role for role, abilities in ROLE_ABILITIES.items() if "read" in abilities]


def _hears(organization_id: Any) -> ColumnElement[bool]:
    """
    Whether the app (the `Client` of the query) hears of the organization (an id, or a column to
    test each row): subscribed to all of them, or linked to it while someone who may read its
    members still lets the app act there. A guest's consent gives nothing, and one taken back, or
    given by someone who left, ends it. The platform's own apps need no consent.
    """
    linked = select(AppOrganization.client_id).where(AppOrganization.organization_id == organization_id)
    readers = select(OrganizationMember.user_id).where(
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.role.in_(_reading_roles()),
    )
    consented = select(Consent.client_id).where(
        Consent.organization_id == organization_id, Consent.user_id.in_(readers)
    )
    return or_(
        Client.webhook_events == "all",
        and_(Client.id.in_(linked), or_(Client.first_party.is_(True), Client.id.in_(consented))),
    )


def _listeners(organization_id: uuid.UUID) -> list[uuid.UUID]:
    """The apps with a webhook that hear of this organization."""
    return list(
        db().scalars(
            select(Client.id).where(
                Client.webhook_url.is_not(None), Client.disabled_at.is_(None), _hears(organization_id)
            )
        )
    )


def heard_by(client: Client) -> list[Organization]:
    """The organizations the app hears of, webhook or not, by name."""
    return list(
        db().scalars(
            select(Organization)
            .join(Client, Client.id == client.id)
            .where(_hears(Organization.id))
            .order_by(Organization.name)
        )
    )


def heard(client: Client, organization_id: uuid.UUID) -> Organization | None:
    """That organization, if the app hears of it."""
    return db().scalar(
        select(Organization)
        .join(Client, Client.id == client.id)
        .where(Organization.id == organization_id, _hears(Organization.id))
    )


def last_sequence(organization_id: uuid.UUID) -> int:
    """
    The number of the organization's latest event, 0 before the first. Held until the transaction
    ends: a change waits for its number, so what is read after this matches it.
    """
    last = db().scalar(
        select(OrganizationEventSequence.last)
        .where(OrganizationEventSequence.organization_id == organization_id)
        .with_for_update(read=True)
    )
    return int(last or 0)


def listens(client_id: uuid.UUID, organization_id: uuid.UUID) -> bool:
    return client_id in _listeners(organization_id)


def _still_hears(client_id: uuid.UUID, event: WebhookEvent) -> bool:
    """
    Whether a queued event still goes to the app: a consent taken back stops it. A deletion took
    the organization's links with it, so it goes to the apps that heard of it when it happened,
    the ones it was queued for.
    """
    return event.type == Event.ORGANIZATION_DELETED.value or listens(client_id, event.organization_id)


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


# ── Sending ───────────────────────────────────────────────────────────────────────────────────


def body_of(event: WebhookEvent) -> bytes:
    """The event as the products receive it, compact JSON; the signature covers these bytes."""
    payload = {
        "id": str(event.id),
        "type": event.type,
        "created_at": event.created_at.isoformat(),
        "organization_id": str(event.organization_id),
        "sequence": event.sequence,
        "data": event.data,
    }
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()


def signature(secret: str, timestamp: int, body: bytes) -> str:
    """HMAC-SHA256 over `<timestamp>.<body>`, hex: `@buntubi/sdk/webhooks` checks it the same way."""
    return hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()


def _send(delivery: WebhookDelivery) -> None:
    """One try: delivered on a 2xx, otherwise the next try is planned, or the delivery given up."""
    client, event = delivery.client, delivery.event
    now = utcnow()
    delivery.attempts += 1
    delivery.last_attempt_at = now
    if not client.webhook_url or not client.webhook_secret or client.disabled_at is not None:
        delivery.status, delivery.last_error = "failed", "no_endpoint"
        return
    if not _still_hears(client.id, event):
        delivery.status, delivery.last_error = "failed", "not_listening"
        return
    # A name may resolve inside the network later than it was set: resolved at each send, every
    # address checked, and the request made to the one checked, never resolved again.
    address: str | None = None
    if not get_settings().local:
        addresses = _addresses(urlsplit(client.webhook_url).hostname or "")
        if not addresses or not all(public_ip(a) for a in addresses):
            delivery.status, delivery.last_error = "failed", "address_not_allowed"
            return
        address = addresses[0]
    body = body_of(event)
    stamp = int(time.time())
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Buntubi-Webhooks/1",
        "Buntubi-Event-Id": str(event.id),
        "Buntubi-Event-Type": event.type,
        "Buntubi-Signature": f"t={stamp},v1={signature(crypto.unseal(client.webhook_secret), stamp, body)}",
    }
    try:
        status = _post(client.webhook_url, data=body, headers=headers, address=address)
        delivery.last_status, delivery.last_error = status, None
        if 200 <= status < 300:
            delivery.status, delivery.delivered_at = "delivered", now
            return
    except urllib3.exceptions.HTTPError as error:
        delivery.last_status, delivery.last_error = None, str(error)[:500]
    if now - delivery.created_at >= GIVE_UP_AFTER:
        delivery.status = "failed"
        return
    delivery.next_attempt_at = now + RETRY_DELAYS[min(delivery.attempts, len(RETRY_DELAYS)) - 1]


def _post(url: str, *, data: bytes, headers: dict[str, str], address: str | None) -> int:
    """
    POSTs to `url` over a connection to `address` when given, the URL's name staying the Host and
    the name the certificate must carry. Answers the status: a redirect is an answer, not
    followed, and the body is never read.
    """
    parts = urlsplit(url)
    name = parts.hostname or ""
    secure = parts.scheme == "https"
    port = parts.port or (443 if secure else 80)
    timeout = urllib3.Timeout(connect=TIMEOUT_SECONDS, read=TIMEOUT_SECONDS)
    pool: urllib3.HTTPConnectionPool
    if secure:
        pool = urllib3.HTTPSConnectionPool(
            address or name,
            port,
            timeout=timeout,
            retries=False,
            cert_reqs="CERT_REQUIRED",
            ca_certs=os.environ.get("REQUESTS_CA_BUNDLE") or certifi.where(),
            server_hostname=name,
            assert_hostname=name,
        )
    else:
        pool = urllib3.HTTPConnectionPool(address or name, port, timeout=timeout, retries=False)
    path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    try:
        response = pool.urlopen(
            "POST",
            path,
            body=data,
            headers={**headers, "Host": parts.netloc},
            redirect=False,
            preload_content=False,
            assert_same_host=False,
        )
        status = int(response.status)
        response.close()
        return status
    finally:
        pool.close()


def deliver_due(limit: int = 50) -> int:
    """
    Tries the deliveries that are due, oldest first, committing each: several workers share the
    queue, a row locked by one being skipped by the others. Returns how many were tried.
    """
    tried = 0
    while tried < limit:
        delivery = db().scalar(
            select(WebhookDelivery)
            .where(WebhookDelivery.status == "pending", WebhookDelivery.next_attempt_at <= utcnow())
            .order_by(WebhookDelivery.created_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if delivery is None:
            break
        _send(delivery)
        db().commit()
        tried += 1
    return tried


def _addresses(host: str) -> list[str]:
    return resolve(host)


def new_secret() -> str:
    """A signing secret, shown to the app once and kept sealed: the provider reads it back to sign."""
    return f"whsec_{new_token()}"


def set_secret(client: Client) -> str:
    """A new signing secret for the app; the one it replaces stops signing at once."""
    secret = new_secret()
    client.webhook_secret = crypto.seal(secret)
    return secret


def redeliver(delivery: WebhookDelivery) -> None:
    """Sends it again at the next pass, whatever happened to it before, if the app still hears of it."""
    from buntubi.services.platform import PlatformError

    if not _still_hears(delivery.client_id, delivery.event):
        raise PlatformError("not_listening", 409)
    delivery.status = "pending"
    delivery.next_attempt_at = utcnow()
