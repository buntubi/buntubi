"""
OpenID Connect Back-Channel Logout: when sessions end, each client that took part in one with a
back-channel URI is sent a signed logout token naming the person (`sub`) and the session (`sid`),
so it ends its own session too. Sent after the response, each in its own thread, best effort: a
client that does not answer is logged and not retried.
"""

import logging
import threading
import time
import uuid
from collections.abc import Iterable
from typing import Any

import requests
from flask import current_app, g, has_request_context
from joserfc import jwt
from sqlalchemy import select

from idp.config import get_settings
from idp.db import db
from idp.models import AccessTokenRecord, AuthorizationCode, Client, LoginSession, RefreshToken
from idp.security.keys import ALGORITHM

log = logging.getLogger(__name__)

LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout"
LOGOUT_TOKEN_TYPE = "logout+jwt"  # noqa: S105  (a media type, not a secret)
_TIMEOUT = 5
# A logout token is used at once; a short life keeps a copy from being replayed later.
_TTL = 120


def logout_token(client: Client, subject: str, session_id: str) -> str:
    from idp.oauth.server import key_ring

    key = key_ring().current
    now = int(time.time())
    claims = {
        "iss": get_settings().issuer,
        "aud": client.client_id,
        "iat": now,
        "exp": now + _TTL,
        "jti": uuid.uuid4().hex,
        "sub": subject,
        "sid": session_id,
        "events": {LOGOUT_EVENT: {}},
    }
    return jwt.encode({"alg": ALGORITHM, "typ": LOGOUT_TOKEN_TYPE, "kid": key.kid}, claims, key.key)


def deliver(uri: str, token: str) -> None:
    """One POST, as the specification says: the token in a form, no redirect followed."""
    try:
        response = requests.post(
            uri,
            data={"logout_token": token},
            headers={"Cache-Control": "no-store"},
            timeout=_TIMEOUT,
            allow_redirects=False,
        )
        if response.status_code >= 400:
            log.warning("back-channel logout to %s answered %s", uri, response.status_code)
    except requests.RequestException as error:
        log.warning("back-channel logout to %s failed: %s", uri, error)


def notify(session_ids: Iterable[uuid.UUID]) -> None:
    """
    Works out who to tell now, while the sessions' grants still name them, and sends once the
    request is answered. Outside a request (the command line) it sends at once.
    """
    ids = list(session_ids)
    if not ids:
        return
    deliveries = _deliveries(ids)
    if not deliveries:
        return
    if has_request_context():
        g.setdefault("backchannel_logouts", []).extend(deliveries)
    else:
        _send(deliveries)


def _deliveries(ids: list[uuid.UUID]) -> list[tuple[str, str]]:
    pairs: set[tuple[uuid.UUID, uuid.UUID]] = set()
    for model in (AuthorizationCode, RefreshToken, AccessTokenRecord):
        rows = db().execute(select(model.session_id, model.client_id).where(model.session_id.in_(ids)))
        pairs.update((s, c) for s, c in rows if s is not None)
    if not pairs:
        return []
    clients = {
        c.id: c
        for c in db().scalars(
            select(Client).where(
                Client.id.in_({c for _, c in pairs}), Client.backchannel_logout_uri.is_not(None)
            )
        )
    }
    subjects = {
        login.id: str(login.user_id)
        for login in db().scalars(select(LoginSession).where(LoginSession.id.in_(ids)))
    }
    deliveries = []
    for session_id, client_id in sorted(pairs, key=str):
        client = clients.get(client_id)
        subject = subjects.get(session_id)
        if client is None or subject is None or not client.backchannel_logout_uri:
            continue
        deliveries.append((client.backchannel_logout_uri, logout_token(client, subject, str(session_id))))
    return deliveries


def _send(deliveries: list[tuple[str, str]]) -> None:
    for uri, token in deliveries:
        threading.Thread(target=deliver, args=(uri, token), daemon=True).start()


def flush(response: Any) -> Any:
    """`after_request`: the logouts this request queued go out now its work is committed."""
    deliveries = g.pop("backchannel_logouts", None)
    if deliveries and response.status_code < 500:
        if current_app.config.get("TESTING"):
            for uri, token in deliveries:
                deliver(uri, token)
        else:
            _send(deliveries)
    return response
