"""
What every provider adapter does, and the identity it hands back. Protocol details stay in the
adapter: the contract assumes neither OpenID Connect nor a verified email.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import requests

# Every call to a provider: an answer slower than this is a provider that is down.
TIMEOUT = 10


class ProviderError(Exception):
    """The provider refused, failed or answered something that does not check out. Never shown as is."""


@dataclass(frozen=True)
class ExternalIdentity:
    provider: str
    # The provider's stable id for the account: Google's `sub`, GitHub's numeric id.
    subject: str
    email: str | None = None
    email_verified: bool = False
    given_name: str = ""
    family_name: str = ""
    picture: str | None = None
    # Why a part the adapter asked for is missing (a refused email lookup), for the audit trail.
    note: str | None = None


@dataclass(frozen=True)
class Transaction:
    """What one round trip to the provider needs back at the callback."""

    state: str
    nonce: str
    verifier: str
    redirect_uri: str


class Provider(Protocol):
    id: str
    label: str

    def configured(self) -> bool:
        """Its client id and secret are set."""
        ...

    def authorization_url(self, tx: Transaction, challenge: str, login_hint: str | None) -> str: ...

    def identity(self, tx: Transaction, code: str) -> ExternalIdentity:
        """Exchanges the code and returns the checked identity, or raises ProviderError."""
        ...

    # For apps that call the provider's API for the person (spec 7.10): extra scopes, offline
    # access, keeping and revoking the provider's refresh token. Not used by sign-in.
    def extra_scopes_supported(self) -> bool: ...


def post_form(url: str, data: dict[str, str], headers: dict[str, str] | None = None) -> Any:
    try:
        response = requests.post(
            url, data=data, headers={"Accept": "application/json", **(headers or {})}, timeout=TIMEOUT
        )
    except requests.RequestException as error:
        raise ProviderError(f"{url}: {type(error).__name__}") from None
    return _json(response)


def get_json(url: str, headers: dict[str, str] | None = None) -> Any:
    try:
        response = requests.get(
            url, headers={"Accept": "application/json", **(headers or {})}, timeout=TIMEOUT
        )
    except requests.RequestException as error:
        raise ProviderError(f"{url}: {type(error).__name__}") from None
    return _json(response)


def _json(response: requests.Response) -> Any:
    if response.status_code >= 400:
        raise ProviderError(f"{response.url} answered {response.status_code}")
    try:
        return response.json()
    except ValueError:
        raise ProviderError(f"{response.url} did not answer JSON") from None
