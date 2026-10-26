"""
Social sign-in providers, by their stable id. Adding one is an adapter that follows
`base.Provider`, added here; the rest of the provider does not change.
"""

from typing import Literal, get_args

from buntubi.social.base import ExternalIdentity, Provider, ProviderError, Transaction
from buntubi.social.github import GitHub
from buntubi.social.google import Google

# The ids, as platform.toml, the apps and the identities table name them.
SocialProviderId = Literal["google", "github"]
SOCIAL_PROVIDERS: tuple[str, ...] = get_args(SocialProviderId)

_REGISTRY: dict[str, Provider] = {provider.id: provider for provider in (Google(), GitHub())}


def get(provider_id: str) -> Provider | None:
    return _REGISTRY.get(provider_id)


__all__ = [
    "SOCIAL_PROVIDERS",
    "SocialProviderId",
    "ExternalIdentity",
    "Provider",
    "ProviderError",
    "Transaction",
    "get",
]
