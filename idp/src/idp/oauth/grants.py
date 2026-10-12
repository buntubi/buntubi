"""
The grants this provider supports, on Authlib: authorization code (PKCE S256 required, OpenID
Connect), refresh token (rotated, reuse revokes the family), client credentials, device code.
No implicit grant, no password grant.
"""

import time
import uuid
from datetime import datetime, timedelta
from typing import Any

from authlib.oauth2.rfc6749 import grants, list_to_scope, scope_to_list
from authlib.oauth2.rfc7636 import CodeChallenge
from authlib.oauth2.rfc8628 import DeviceCodeGrant as _DeviceCodeGrant
from authlib.oidc.core import OpenIDCode as _OpenIDCode
from authlib.oidc.core import UserInfo
from flask import g
from sqlalchemy import delete, select, update

from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import (
    AccessTokenRecord,
    AuthorizationCode,
    Client,
    DeviceCode,
    LoginSession,
    RefreshToken,
    User,
)
from idp.oauth.claims import user_claims
from idp.security.keys import ALGORITHM
from idp.security.tokens import hash_token

PUBLIC_AND_CONFIDENTIAL = ["client_secret_basic", "client_secret_post", "none"]
GRANT_TYPES_SUPPORTED = (
    "authorization_code",
    "refresh_token",
    "client_credentials",
    "urn:ietf:params:oauth:grant-type:device_code",
)


class AuthContext:
    """How and when the user signed in, carried from the code or refresh token into new tokens."""

    def __init__(
        self,
        session_id: uuid.UUID | None,
        auth_time: datetime,
        methods: list[str],
        family_id: uuid.UUID | None = None,
    ):
        self.session_id = session_id
        self.auth_time = auth_time
        self.methods = methods
        self.family_id = family_id


def attach(user: User, context: AuthContext) -> User:
    user._auth = context  # type: ignore[attr-defined]
    return user


def context_of(user: User | None) -> AuthContext | None:
    return getattr(user, "_auth", None)


class S256CodeChallenge(CodeChallenge):  # type: ignore[misc]
    """PKCE with S256 only: `plain` gives no protection if the code is intercepted."""

    SUPPORTED_CODE_CHALLENGE_METHOD = ["S256"]


def _never_reviewed(client: Client) -> bool:
    from idp.services.platform import never_reviewed

    return never_reviewed(client)


# How long a used or expired code is kept, so a late replay is still recognised.
CODE_KEPT = timedelta(days=1)


def _revoke_issued(code: AuthorizationCode) -> None:
    """A code used a second time leaked: what its first use gave is withdrawn."""
    from idp.services import audit

    if code.issued_family_id is not None:
        revoke_family(code.issued_family_id)
    if code.issued_jti is not None:
        db().execute(
            update(AccessTokenRecord)
            .where(AccessTokenRecord.jti == code.issued_jti, AccessTokenRecord.revoked_at.is_(None))
            .values(revoked_at=utcnow())
        )
    audit.record("authorization_code_replayed", user=code.user, client=code.client)


class AuthorizationCodeGrant(grants.AuthorizationCodeGrant):  # type: ignore[misc]
    TOKEN_ENDPOINT_AUTH_METHODS = PUBLIC_AND_CONFIDENTIAL

    def save_authorization_code(self, code: str, request: Any) -> None:
        login = g.login  # set by the authorize view: the session that approved this request
        data = request.payload.data
        scope = request.payload.scope or ""
        # OIDC Core 11: offline access, for a third-party app, only with consent asked in this very
        # request (the consent screen, which prompt=consent also reaches), never from a past one.
        client = request.client
        if not g.get("consented_now") and not _never_reviewed(client):
            scope = list_to_scope([s for s in scope_to_list(scope) or [] if s != "offline_access"])
        db().execute(delete(AuthorizationCode).where(AuthorizationCode.expires_at < utcnow() - CODE_KEPT))
        db().add(
            AuthorizationCode(
                code_hash=hash_token(code),
                client_id=request.client.id,
                user_id=request.user.id,
                session_id=login.id,
                redirect_uri=request.payload.redirect_uri,
                scope=scope,
                nonce=data.get("nonce"),
                code_challenge=data["code_challenge"],
                code_challenge_method=data.get("code_challenge_method", "S256"),
                auth_time=login.created_at,
                auth_methods=login.auth_methods,
                expires_at=utcnow() + timedelta(seconds=get_settings().authorization_code_ttl),
            )
        )

    def query_authorization_code(self, code: str, client: Client) -> AuthorizationCode | None:
        # Locked until this request commits: two redemptions at once are served one after the other.
        row = db().scalar(
            select(AuthorizationCode).where(AuthorizationCode.code_hash == hash_token(code)).with_for_update()
        )
        if row is None or row.client_id != client.id:
            return None
        if row.used_at is not None:
            _revoke_issued(row)
            return None
        if row.expires_at <= utcnow():
            return None
        return row

    def delete_authorization_code(self, authorization_code: AuthorizationCode) -> None:
        """Marks it used, with what it gave; it is purged a day later (save_authorization_code)."""
        authorization_code.used_at = utcnow()
        authorization_code.issued_jti, authorization_code.issued_family_id = g.pop(
            "issued_token", (None, None)
        )

    def authenticate_user(self, authorization_code: AuthorizationCode) -> User | None:
        user = authorization_code.user
        if user.disabled_at is not None:
            return None
        return attach(
            user,
            AuthContext(
                authorization_code.session_id, authorization_code.auth_time, authorization_code.auth_methods
            ),
        )


ID_TOKEN_TTL = 3600


class OpenIDCode(_OpenIDCode):  # type: ignore[misc]
    def exists_nonce(self, nonce: str, request: Any) -> bool:
        found = db().scalar(
            select(AuthorizationCode.id).where(
                AuthorizationCode.client_id == request.client.id, AuthorizationCode.nonce == nonce
            )
        )
        return found is not None

    # ID tokens: signed with the current key and naming it, so clients pick it from the JWKS.
    def resolve_client_private_key(self, client: Any) -> Any:
        from idp.oauth.server import key_ring

        return key_ring().current.key

    def get_client_algorithm(self, client: Any) -> str:
        return ALGORITHM

    def get_encode_header(self, client: Any) -> dict[str, str]:
        from idp.oauth.server import key_ring

        return {"alg": ALGORITHM, "kid": key_ring().current.kid}

    def get_client_claims(self, client: Any) -> dict[str, Any]:
        now = int(time.time())
        return {
            "iss": get_settings().issuer,
            "aud": [client.get_client_id()],
            "iat": now,
            "exp": now + ID_TOKEN_TTL,
        }

    def get_authorization_code_claims(self, authorization_code: Any) -> dict[str, Any]:
        claims: dict[str, Any] = super().get_authorization_code_claims(authorization_code)
        # The sign-in the token came from, which a back-channel logout names.
        if authorization_code.session_id is not None:
            claims["sid"] = str(authorization_code.session_id)
        return claims

    def generate_user_info(self, user: User, scope: str) -> UserInfo:
        return UserInfo(user_claims(user, scope))


# A rotated refresh token presented again this soon is a race between two requests of one app
# (a page and its data, two tabs), not a theft: refused without ending the family. Later, it is.
RENEWAL_RACE = timedelta(seconds=10)


class RefreshTokenGrant(grants.RefreshTokenGrant):  # type: ignore[misc]
    TOKEN_ENDPOINT_AUTH_METHODS = PUBLIC_AND_CONFIDENTIAL
    INCLUDE_NEW_REFRESH_TOKEN = True

    def authenticate_refresh_token(self, refresh_token: str) -> RefreshToken | None:
        # Locked until this request commits: two renewals at once are served one after the other.
        row = db().scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token)).with_for_update()
        )
        if row is None:
            return None
        if row.rotated_at is not None and row.revoked_at is None:
            if utcnow() - row.rotated_at < RENEWAL_RACE:
                # Renewed a moment ago: two requests of the same app raced. Refused, family kept.
                return None
            # Exchanged earlier: this copy was stolen, or the first one was. End them all.
            revoke_family(row.family_id)
            return None
        if row.revoked_at is not None or row.is_expired():
            return None
        return row

    def authenticate_user(self, refresh_token: RefreshToken) -> User | None:
        user = refresh_token.user
        if user.disabled_at is not None:
            return None
        # The sandbox rule again: someone taken off a sandbox app's test users cannot renew.
        from idp.services.platform import may_sign_in

        if not may_sign_in(refresh_token.client, user):
            return None
        # How the person signed in, from the session the token continues: a renewed token
        # still says a second factor was used, or the admin API refuses it as if it had not.
        login = db().get(LoginSession, refresh_token.session_id) if refresh_token.session_id else None
        # Without offline_access, a refresh token lives as long as the sign-in it came from: signed
        # out at the provider (or expired there), the app's access ends too, back-channel or not.
        # A token with no sign-in behind it (the device flow) is not bound to one.
        offline = "offline_access" in (scope_to_list(refresh_token.scope) or [])
        if (
            refresh_token.session_id
            and not offline
            and (login is None or login.revoked_at is not None or login.expires_at <= utcnow())
        ):
            revoke_family(refresh_token.family_id)
            return None
        methods = list(login.auth_methods) if login else []
        return attach(
            user,
            AuthContext(
                refresh_token.session_id, refresh_token.auth_time, methods, family_id=refresh_token.family_id
            ),
        )

    def revoke_old_credential(self, refresh_token: RefreshToken) -> None:
        refresh_token.rotated_at = utcnow()


class ClientCredentialsGrant(grants.ClientCredentialsGrant):  # type: ignore[misc]
    TOKEN_ENDPOINT_AUTH_METHODS = ["client_secret_basic", "client_secret_post"]


class DeviceCodeGrant(_DeviceCodeGrant):  # type: ignore[misc]
    TOKEN_ENDPOINT_AUTH_METHODS = PUBLIC_AND_CONFIDENTIAL

    def query_device_credential(self, device_code: str) -> DeviceCode | None:
        # A used code is gone: polling again is an invalid request, not a pending one.
        return db().scalar(
            select(DeviceCode).where(
                DeviceCode.device_code_hash == hash_token(device_code), DeviceCode.status != "used"
            )
        )

    def query_user_grant(self, user_code: str) -> tuple[User, bool] | None:
        row = db().scalar(select(DeviceCode).where(DeviceCode.user_code == user_code))
        if row is None or row.status == "pending" or row.user_id is None:
            return None
        user = db().get(User, row.user_id)
        if user is None:
            return None
        approved = row.status == "approved"
        if approved:
            row.status = "used"
            attach(user, AuthContext(None, utcnow(), ["device"]))
        return user, approved

    def should_slow_down(self, credential: DeviceCode) -> bool:
        now = utcnow()
        too_soon = (
            credential.last_polled_at is not None
            and (now - credential.last_polled_at).total_seconds() < credential.interval
        )
        credential.last_polled_at = now
        return too_soon


def revoke_family(family_id: uuid.UUID) -> None:
    now = utcnow()
    db().execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db().execute(
        update(AccessTokenRecord)
        .where(AccessTokenRecord.refresh_family_id == family_id, AccessTokenRecord.revoked_at.is_(None))
        .values(revoked_at=now)
    )
