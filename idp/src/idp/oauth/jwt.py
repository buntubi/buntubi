"""
Access tokens as JWTs (RFC 9068): signed with the current key and naming it (`kid`), verified
against whichever key the header names. Resource servers do the same with the published JWKS.
"""

import time
import uuid
from dataclasses import dataclass
from typing import Any

from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwt import JWTClaimsRegistry

from idp.security.keys import ALGORITHM, KeyRing

ACCESS_TOKEN_TYPE = "at+jwt"  # noqa: S105  (a media type, not a secret)


class InvalidAccessToken(Exception):
    pass


@dataclass(frozen=True)
class AccessTokenClaims:
    jti: str
    subject: str | None
    client_id: str
    scope: str
    issued_at: int
    expires_at: int
    claims: dict[str, Any]


def sign_access_token(ring: KeyRing, claims: dict[str, Any]) -> str:
    key = ring.current
    header = {"alg": ALGORITHM, "typ": ACCESS_TOKEN_TYPE, "kid": key.kid}
    return jwt.encode(header, claims, key.key)


def access_token_claims(
    *,
    issuer: str,
    audience: str | list[str],
    client_id: str,
    subject: str | None,
    scope: str,
    ttl: int,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    now = int(time.time())
    claims: dict[str, Any] = {
        "iss": issuer,
        "aud": audience,
        "client_id": client_id,
        "iat": now,
        "exp": now + ttl,
        "jti": uuid.uuid4().hex,
        "scope": scope,
    }
    # RFC 9068: the subject of a client-credentials token is the client itself.
    claims["sub"] = subject if subject is not None else client_id
    if extra:
        claims.update({k: v for k, v in extra.items() if v is not None})
    return claims


def verify_access_token(ring: KeyRing, token: str, issuer: str) -> AccessTokenClaims:
    """Signature, type, issuer and expiry. Revocation is the caller's to check (by jti)."""
    try:
        parsed = jwt.decode(
            token, lambda obj: _key_for(ring, obj.headers().get("kid")), algorithms=[ALGORITHM]
        )
    except (JoseError, ValueError) as exc:
        raise InvalidAccessToken(str(exc)) from exc
    if parsed.header.get("typ") != ACCESS_TOKEN_TYPE:
        raise InvalidAccessToken("not an access token")
    registry = JWTClaimsRegistry(
        iss={"essential": True, "value": issuer}, exp={"essential": True}, jti={"essential": True}
    )
    try:
        registry.validate(parsed.claims)
    except JoseError as exc:
        raise InvalidAccessToken(str(exc)) from exc
    c = parsed.claims
    return AccessTokenClaims(
        jti=c["jti"],
        subject=c.get("sub") if c.get("sub") != c.get("client_id") else None,
        client_id=c["client_id"],
        scope=c.get("scope", ""),
        issued_at=int(c["iat"]),
        expires_at=int(c["exp"]),
        claims=dict(c),
    )


def _key_for(ring: KeyRing, kid: str | None) -> Any:
    found = ring.find(kid) if kid else None
    if found is None:
        raise InvalidAccessToken("unknown signing key")
    return found.key
