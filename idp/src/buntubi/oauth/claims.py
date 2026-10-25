"""What a client learns about a user: OpenID Connect standard claims, by scope."""

from typing import Any

from authlib.oauth2.rfc6749 import scope_to_list

from buntubi.models import User

# `admin` opens the admin API, and only for a user with the admin role.
SCOPES = ("openid", "profile", "email", "phone", "address", "offline_access", "admin", "developer")


def user_claims(user: User, scope: str) -> dict[str, Any]:
    scopes = set(scope_to_list(scope) or [])
    claims: dict[str, Any] = {"sub": str(user.id)}
    if "profile" in scopes:
        claims.update(
            name=user.name or None,
            given_name=user.given_name or None,
            family_name=user.family_name or None,
            locale=user.locale,
            picture=user.picture,
            updated_at=int(user.updated_at.timestamp()),
        )
        from buntubi.services import profile_fields  # as for the address below

        claims.update(profile_fields.values_of(user, profile_fields.shown()))
    if "email" in scopes:
        claims.update(email=user.email, email_verified=user.email_verified)
    if "phone" in scopes and user.phone:
        claims.update(phone_number=user.phone, phone_number_verified=False)
    if "address" in scopes:
        from buntubi.services.profile import address_claim  # the services import the OAuth server

        claims.update(address=address_claim(user))
    return {k: v for k, v in claims.items() if v is not None}
