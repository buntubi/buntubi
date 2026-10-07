"""
The authorization server, assembled: client lookup, token issuing and saving, the grants and
endpoints, and the resource protector the provider's own APIs (userinfo, admin) use.
"""

import ipaddress
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from authlib.integrations.flask_oauth2 import AuthorizationServer, ResourceProtector
from authlib.oauth2.rfc6749 import scope_to_list
from authlib.oauth2.rfc6750 import BearerTokenGenerator, BearerTokenValidator
from authlib.oauth2.rfc7009 import RevocationEndpoint as _RevocationEndpoint
from authlib.oauth2.rfc7662 import IntrospectionEndpoint as _IntrospectionEndpoint
from authlib.oauth2.rfc8628 import DeviceAuthorizationEndpoint as _DeviceAuthorizationEndpoint
from flask import Flask, current_app
from flask import request as flask_request
from joserfc import jwt as jose_jwt
from sqlalchemy import select

from idp.config import get_settings
from idp.db import db, utcnow
from idp.models import AccessTokenRecord, ApiKey, Client, DeviceCode, RefreshToken, User
from idp.oauth.grants import (
    AuthorizationCodeGrant,
    ClientCredentialsGrant,
    DeviceCodeGrant,
    OpenIDCode,
    RefreshTokenGrant,
    S256CodeChallenge,
    context_of,
    revoke_family,
)
from idp.oauth.jwt import InvalidAccessToken, access_token_claims, sign_access_token, verify_access_token
from idp.security.keys import KeyRing
from idp.security.tokens import hash_token, new_token, new_user_code


def key_ring() -> KeyRing:
    """Loaded on first use, so `flask keys generate` runs before any key exists."""
    ring: KeyRing | None = current_app.extensions.get("idp.keys")
    if ring is None:
        ring = current_app.extensions["idp.keys"] = KeyRing.load(get_settings().signing_keys_dir)
    return ring


def query_client(client_id: str) -> Client | None:
    client = db().scalar(select(Client).where(Client.client_id == client_id))
    if client is None or client.disabled_at is not None:
        return None
    # A suspended organization's apps stop at once: no sign-in, no token, no refresh.
    if client.organization is not None and client.organization.is_suspended:
        return None
    return client


def _access_token(client: Client, grant_type: str, user: User | None, scope: str) -> str:
    settings = get_settings()
    context = context_of(user)
    extra: dict[str, Any] = {}
    if context is not None:
        extra = {
            "auth_time": int(context.auth_time.timestamp()),
            "amr": context.methods or None,
            "sid": str(context.session_id) if context.session_id else None,
        }
    # A developer's app says which side it is on, so the platform APIs keep sandbox data apart.
    if client.organization_id is not None:
        extra["env"] = client.environment
    claims = access_token_claims(
        issuer=settings.issuer,
        audience=client.client_id,
        client_id=client.client_id,
        subject=str(user.id) if user is not None else None,
        scope=scope or "",
        ttl=settings.access_token_ttl,
        extra=extra,
    )
    return sign_access_token(key_ring(), claims)


def save_token(token: dict[str, Any], request: Any) -> None:
    """Records the access token's jti, and the refresh token as a hash in the family it continues."""
    settings = get_settings()
    client: Client = request.client
    user: User | None = request.user
    context = context_of(user)
    claims = jose_jwt.decode(token["access_token"], key_ring().current.key).claims
    has_refresh = "refresh_token" in token
    # A rotation continues the family it came from; a first refresh token starts one.
    family_id = (
        context.family_id if context and context.family_id else (uuid.uuid4() if has_refresh else None)
    )
    db().add(
        AccessTokenRecord(
            jti=claims["jti"],
            client_id=client.id,
            user_id=user.id if user is not None else None,
            refresh_family_id=family_id,
            scope=token.get("scope", ""),
            expires_at=datetime.fromtimestamp(claims["exp"], UTC),
        )
    )
    if has_refresh and family_id is not None and user is not None and context is not None:
        db().add(
            RefreshToken(
                token_hash=hash_token(token["refresh_token"]),
                family_id=family_id,
                client_id=client.id,
                user_id=user.id,
                session_id=context.session_id,
                scope=token.get("scope", ""),
                auth_time=context.auth_time,
                expires_at=utcnow() + timedelta(seconds=settings.refresh_token_ttl),
            )
        )


class AccessTokenView:
    """An access token as introspection and the resource protector see it."""

    def __init__(self, claims: Any, record: AccessTokenRecord | None) -> None:
        self.claims = claims
        self.record = record

    def check_client(self, client: Client) -> bool:
        return self.claims.client_id == client.client_id

    def get_scope(self) -> str:
        return str(self.claims.scope)

    def is_expired(self) -> bool:
        return self.claims.expires_at <= int(utcnow().timestamp())

    def is_revoked(self) -> bool:
        return self.record is None or self.record.revoked_at is not None

    @property
    def user(self) -> User | None:
        return db().get(User, uuid.UUID(self.claims.subject)) if self.claims.subject else None


class ApiKeyView:
    """
    An API key as introspection sees it. Active while the key is neither revoked nor expired,
    its organization not suspended, and the caller's address (`client_ip`, when the key is limited to
    some networks) inside one of them. A check that answers active counts as a use.
    """

    def __init__(self, key: ApiKey, client_ip: str | None) -> None:
        self.key = key
        self.client_ip = client_ip

    def check_client(self, client: Client) -> bool:
        return False

    def get_scope(self) -> str:
        return " ".join(self.key.scopes)

    def is_expired(self) -> bool:
        return self.key.expires_at is not None and self.key.expires_at <= utcnow()

    def is_revoked(self) -> bool:
        return (
            self.key.revoked_at is not None
            or self.key.organization.is_suspended
            or not self._address_allowed()
        )

    def _address_allowed(self) -> bool:
        if not self.key.allowed_ips:
            return True
        try:
            address = ipaddress.ip_address(self.client_ip or "")
        except ValueError:
            return False
        return any(address in ipaddress.ip_network(net, strict=False) for net in self.key.allowed_ips)


def _find_token(
    token_string: str, hint: str | None, *, keys: bool = False, client_ip: str | None = None
) -> RefreshToken | AccessTokenView | ApiKeyView | None:
    if keys and (hint == "api_key" or token_string.startswith(("sk_test_", "sk_live_"))):
        key = db().scalar(select(ApiKey).where(ApiKey.key_hash == hash_token(token_string)))
        return ApiKeyView(key, client_ip) if key is not None else None
    if hint != "access_token":
        row = db().scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token_string)))
        if row is not None:
            return row
    try:
        claims = verify_access_token(key_ring(), token_string, get_settings().issuer)
    except InvalidAccessToken:
        return None
    return AccessTokenView(claims, db().get(AccessTokenRecord, claims.jti))


class RevocationEndpoint(_RevocationEndpoint):  # type: ignore[misc]
    """RFC 7009 for both kinds: a refresh token ends its whole family; an access token, itself."""

    CLIENT_AUTH_METHODS = ["client_secret_basic", "client_secret_post", "none"]

    def query_token(self, token_string: str, token_type_hint: str | None) -> Any:
        return _find_token(token_string, token_type_hint)

    def revoke_token(self, token: Any, request: Any) -> None:
        if isinstance(token, RefreshToken):
            revoke_family(token.family_id)
        elif isinstance(token, AccessTokenView) and token.record is not None:
            token.record.revoked_at = utcnow()


class IntrospectionEndpoint(_IntrospectionEndpoint):  # type: ignore[misc]
    """
    RFC 7662, for resource servers, confidential clients only. A client may look at the tokens
    issued to it; the owner's own resource servers (first-party clients) at any token and at API
    keys, which is how the platform APIs check a key. Anything else answers inactive.
    """

    CLIENT_AUTH_METHODS = ["client_secret_basic", "client_secret_post"]
    SUPPORTED_TOKEN_TYPES = ("access_token", "refresh_token", "api_key")

    def query_token(self, token_string: str, token_type_hint: str | None) -> Any:
        return _find_token(
            token_string, token_type_hint, keys=True, client_ip=flask_request.form.get("client_ip")
        )

    def check_permission(self, token: Any, client: Client, request: Any) -> bool:
        if client.is_public:
            return False
        return bool(client.first_party) or token.check_client(client)

    def introspect_token(self, token: Any) -> dict[str, Any]:
        issuer = get_settings().issuer
        if isinstance(token, RefreshToken):
            return {
                "active": True,
                "token_type": "refresh_token",
                "client_id": token.client.client_id,
                "sub": str(token.user_id),
                "scope": token.scope,
                "exp": int(token.expires_at.timestamp()),
                "iat": int(token.issued_at.timestamp()),
                "iss": issuer,
            }
        if isinstance(token, ApiKeyView):
            key = token.key
            key.last_used_at = utcnow()
            payload: dict[str, Any] = {
                "active": True,
                "token_type": "api_key",
                "key_id": str(key.id),
                "organization_id": str(key.organization_id),
                "env": key.environment,
                "scope": token.get_scope(),
                "iat": int(key.created_at.timestamp()),
                "iss": issuer,
            }
            if key.expires_at is not None:
                payload["exp"] = int(key.expires_at.timestamp())
            return payload
        c = token.claims
        return {
            "active": True,
            "token_type": "access_token",
            "client_id": c.client_id,
            "sub": c.claims["sub"],
            "aud": c.claims.get("aud"),
            "scope": c.scope,
            "exp": c.expires_at,
            "iat": c.issued_at,
            "jti": c.jti,
            "iss": issuer,
        }


class DeviceAuthorizationEndpoint(_DeviceAuthorizationEndpoint):  # type: ignore[misc]
    USER_CODE_TYPE = "string"

    def generate_user_code(self) -> str:
        return new_user_code()

    def generate_device_code(self) -> str:
        return new_token()

    def get_verification_uri(self) -> str:
        return f"{get_settings().issuer}/device"

    def save_device_credential(self, client_id: str, scope: str, data: dict[str, Any]) -> None:
        client = query_client(client_id)
        assert client is not None  # the endpoint authenticated it
        db().add(
            DeviceCode(
                device_code_hash=hash_token(data["device_code"]),
                user_code=data["user_code"],
                client_id=client.id,
                scope=scope or "",
                expires_at=utcnow() + timedelta(seconds=data["expires_in"]),
                interval=data.get("interval", 5),
            )
        )


class AccessTokenValidator(BearerTokenValidator):  # type: ignore[misc]
    """For the provider's own APIs: a valid, unrevoked access token with the scopes asked for."""

    def authenticate_token(self, token_string: str) -> AccessTokenView | None:
        try:
            claims = verify_access_token(key_ring(), token_string, get_settings().issuer)
        except InvalidAccessToken:
            return None
        return AccessTokenView(claims, db().get(AccessTokenRecord, claims.jti))

    def validate_token(self, token: AccessTokenView, scopes: list[str] | None, request: Any) -> None:
        super().validate_token(token, scopes, request)


authorization = AuthorizationServer()
require_token = ResourceProtector()


def init_oauth(app: Flask) -> None:
    settings = get_settings()
    authorization.init_app(app, query_client=query_client, save_token=save_token)
    generator = BearerTokenGenerator(
        access_token_generator=_access_token,
        refresh_token_generator=lambda **_: new_token(),
        expires_generator=lambda client, grant_type: settings.access_token_ttl,
    )
    authorization.register_token_generator("default", generator)

    authorization.register_grant(
        AuthorizationCodeGrant, [S256CodeChallenge(required=True), OpenIDCode(require_nonce=False)]
    )
    authorization.register_grant(RefreshTokenGrant)
    authorization.register_grant(ClientCredentialsGrant)
    authorization.register_grant(DeviceCodeGrant)
    authorization.register_endpoint(RevocationEndpoint)
    authorization.register_endpoint(IntrospectionEndpoint)
    authorization.register_endpoint(DeviceAuthorizationEndpoint)

    require_token.register_token_validator(AccessTokenValidator())


def scopes_of(token: AccessTokenView) -> list[str]:
    return list(scope_to_list(token.get_scope()) or [])
