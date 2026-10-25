"""Google, by OpenID Connect: the code flow with PKCE, and the ID token checked before it is believed."""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlencode

from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet

from buntubi.config import get_settings
from buntubi.social.base import ExternalIdentity, ProviderError, Transaction, get_json, post_form

DISCOVERY = "https://accounts.google.com/.well-known/openid-configuration"
ISSUERS = ("https://accounts.google.com", "accounts.google.com")
# Google's keys rotate every few days; an unknown key id fetches them again at once.
KEYS_TTL = 3600


class Google:
    id = "google"
    label = "Google"

    def __init__(self) -> None:
        self._discovery: dict[str, Any] | None = None
        self._keys: tuple[float, KeySet] | None = None

    def configured(self) -> bool:
        settings = get_settings()
        return bool(settings.google_client_id and settings.google_client_secret.get_secret_value())

    def extra_scopes_supported(self) -> bool:
        return True

    def authorization_url(self, tx: Transaction, challenge: str, login_hint: str | None) -> str:
        query = {
            "response_type": "code",
            "client_id": get_settings().google_client_id,
            "redirect_uri": tx.redirect_uri,
            "scope": "openid email profile",
            "state": tx.state,
            "nonce": tx.nonce,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
        }
        if login_hint:
            query["login_hint"] = login_hint
        return f"{self._config()['authorization_endpoint']}?{urlencode(query)}"

    def identity(self, tx: Transaction, code: str) -> ExternalIdentity:
        settings = get_settings()
        tokens = post_form(
            self._config()["token_endpoint"],
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": tx.redirect_uri,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret.get_secret_value(),
                "code_verifier": tx.verifier,
            },
        )
        id_token = tokens.get("id_token") if isinstance(tokens, dict) else None
        if not isinstance(id_token, str):
            raise ProviderError("no id_token in Google's answer")
        claims = self._checked(id_token, tx.nonce)
        return ExternalIdentity(
            provider=self.id,
            subject=str(claims["sub"]),
            email=str(claims["email"]).lower() if claims.get("email") else None,
            email_verified=claims.get("email_verified") is True,
            given_name=str(claims.get("given_name") or "")[:100],
            family_name=str(claims.get("family_name") or "")[:100],
            picture=str(claims["picture"])[:2048] if claims.get("picture") else None,
        )

    def _checked(self, id_token: str, nonce: str) -> dict[str, Any]:
        registry = jwt.JWTClaimsRegistry(
            iss={"essential": True, "values": list(ISSUERS)},
            aud={"essential": True, "value": get_settings().google_client_id},
            sub={"essential": True},
            exp={"essential": True},
            nonce={"essential": True, "value": nonce},
        )
        try:
            token = jwt.decode(id_token, self._key_set(fresh=False), algorithms=["RS256"])
        except (JoseError, ValueError):
            # Most often a key Google rotated in since the set was cached: fetch it once more.
            try:
                token = jwt.decode(id_token, self._key_set(fresh=True), algorithms=["RS256"])
            except (JoseError, ValueError) as error:
                raise ProviderError(f"Google's ID token was refused: {type(error).__name__}") from None
        try:
            registry.validate(token.claims)
        except JoseError as error:
            raise ProviderError(f"Google's ID token claims were refused: {type(error).__name__}") from None
        return dict(token.claims)

    def _config(self) -> dict[str, Any]:
        if self._discovery is None:
            found = get_json(DISCOVERY)
            if (
                not isinstance(found, dict)
                or not {"authorization_endpoint", "token_endpoint", "jwks_uri"} <= found.keys()
            ):
                raise ProviderError("Google's discovery document is incomplete")
            self._discovery = found
        return self._discovery

    def _key_set(self, fresh: bool) -> KeySet:
        now = time.monotonic()
        if fresh or self._keys is None or now - self._keys[0] > KEYS_TTL:
            try:
                self._keys = (now, KeySet.import_key_set(get_json(self._config()["jwks_uri"])))
            except (ValueError, KeyError, TypeError):
                raise ProviderError("Google's key set could not be read") from None
        return self._keys[1]
