"""
GitHub, by OAuth2: no ID token, so the account comes from its API. The key is the numeric user
id, never the login, which its owner can change; the email is the primary one GitHub has verified.
"""

from __future__ import annotations

from urllib.parse import urlencode

from buntubi.config import get_settings
from buntubi.social.base import ExternalIdentity, ProviderError, Transaction, get_json, post_form

AUTHORIZE = "https://github.com/login/oauth/authorize"
EXCHANGE = "https://github.com/login/oauth/access_token"
API = "https://api.github.com"


class GitHub:
    id = "github"
    label = "GitHub"

    def configured(self) -> bool:
        settings = get_settings()
        return bool(settings.github_client_id and settings.github_client_secret.get_secret_value())

    def extra_scopes_supported(self) -> bool:
        return True

    def authorization_url(self, tx: Transaction, challenge: str, login_hint: str | None) -> str:
        query = {
            "client_id": get_settings().github_client_id,
            "redirect_uri": tx.redirect_uri,
            # Who they are and their addresses; nothing about their repositories.
            "scope": "read:user user:email",
            "state": tx.state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "allow_signup": "true",
        }
        if login_hint:
            query["login"] = login_hint
        return f"{AUTHORIZE}?{urlencode(query)}"

    def identity(self, tx: Transaction, code: str) -> ExternalIdentity:
        settings = get_settings()
        tokens = post_form(
            EXCHANGE,
            {
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret.get_secret_value(),
                "code": code,
                "redirect_uri": tx.redirect_uri,
                "code_verifier": tx.verifier,
            },
        )
        # GitHub answers 200 with an `error` field for a refused code.
        token = tokens.get("access_token") if isinstance(tokens, dict) else None
        if not isinstance(token, str):
            raise ProviderError("GitHub gave no access token")
        headers = {"Authorization": f"Bearer {token}", "X-GitHub-Api-Version": "2022-11-28"}
        user = get_json(f"{API}/user", headers)
        if not isinstance(user, dict) or not isinstance(user.get("id"), int):
            raise ProviderError("GitHub's user has no id")
        emails = get_json(f"{API}/user/emails", headers)
        primary: dict[str, object] | None = None
        if isinstance(emails, list):
            primary = next(
                (
                    e
                    for e in emails
                    if isinstance(e, dict) and e.get("primary") and e.get("verified") and e.get("email")
                ),
                None,
            )
        given, _, family = str(user.get("name") or "").strip().partition(" ")
        return ExternalIdentity(
            provider=self.id,
            subject=str(user["id"]),
            email=str(primary["email"]).lower() if primary else None,
            email_verified=primary is not None,
            given_name=given[:100],
            family_name=family.strip()[:100],
            picture=str(user["avatar_url"])[:2048] if user.get("avatar_url") else None,
        )
