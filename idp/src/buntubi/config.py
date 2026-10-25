"""Settings, read from the environment (prefix IDP_) and validated once at startup."""

import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="IDP_", env_file=".env", extra="ignore")

    # The platform's brand. One deployment, one brand: the sign-in pages (when no client brand
    # applies), emails, authenticator apps, the developer portal and the owner console read it.
    # Nothing is shown for an empty field.
    brand_name: str = ""
    brand_accent: str = ""
    brand_logo_url: str = ""
    brand_support_email: str = ""
    brand_privacy_url: str = ""
    brand_terms_url: str = ""
    # The issuer: the provider's public origin, exactly as clients see it. No trailing slash.
    issuer: str
    database_url: str
    # Signs the session cookie and the CSRF tokens.
    secret_key: SecretStr = Field(min_length=32)
    # A directory of private JWKs (one JSON file each); the newest signs, every one verifies.
    signing_keys_dir: Path

    # Short, because an API checking tokens offline sees a revocation only when the token expires;
    # APIs that must see it at once introspect the token instead.
    access_token_ttl: int = 300
    refresh_token_ttl: int = 30 * 24 * 3600
    authorization_code_ttl: int = 60
    session_ttl: int = 14 * 24 * 3600
    email_token_ttl: int = 3600

    # How long `flask prune` keeps an ended sign-in (the devices list shows recent ones) and
    # the audit trail.
    session_retention_days: int = 30
    audit_retention_days: int = 365
    # How long delivered and failed webhook deliveries stay in the delivery log.
    webhook_retention_days: int = 30

    # Email through Resend. Test mode logs the message, codes and links included, instead of
    # sending it: for development only, refused with a public issuer.
    resend_api_key: SecretStr | None = None
    email_from: str = "no-reply@localhost"
    email_test_mode: bool = False

    rate_limit_storage: str = "memory://"
    rate_limit_enabled: bool = True
    # Allowed browser origins for the token, revocation and userinfo endpoints (SPAs).
    cors_origins: list[str] = []
    # Secure cookies need HTTPS; browsers accept them on http://localhost too.
    secure_cookies: bool = True
    # How many proxies in front set X-Forwarded-For and X-Forwarded-Proto (a load balancer, then
    # a reverse proxy: 2). 0 when clients reach the provider directly. Too high lets a client
    # choose the address the rate limits and the audit trail see.
    trusted_proxies: int = 0

    # Social sign-in (buntubi/social): a provider is offered once its client is set here and
    # platform.toml lists it under [social].
    google_client_id: str = ""
    google_client_secret: SecretStr = SecretStr("")
    github_client_id: str = ""
    github_client_secret: SecretStr = SecretStr("")

    @property
    def local(self) -> bool:
        """An issuer on this machine: development and tests."""
        return urlsplit(self.issuer).hostname in ("localhost", "127.0.0.1", "::1")

    def production_problems(self) -> list[str]:
        """What a provider with a public issuer must not run with."""
        if self.local:
            return []
        problems = []
        if not self.issuer.startswith("https://"):
            problems.append("IDP_ISSUER must be https")
        if self.email_test_mode:
            problems.append("IDP_EMAIL_TEST_MODE logs sign-in codes and reset links instead of sending them")
        if not self.secure_cookies:
            problems.append("IDP_SECURE_COOKIES must be true")
        if (
            self.rate_limit_storage.startswith("memory://")
            and "rate_limit_storage" not in self.model_fields_set
        ):
            problems.append(
                "IDP_RATE_LIMIT_STORAGE: limits kept in memory are per process; "
                "give a shared store (redis://...), or memory:// explicitly for a single process"
            )
        return problems

    # Plugins this deployment runs, by entry point name, in order (see buntubi.plugins).
    plugins: list[str] = []
    # Bring the catalogue in line with the plugins when the app starts. Turn off where several
    # workers start at once, and run `flask plugins sync` on deploy instead.
    plugins_sync_on_start: bool = True
    # Catalogues declared as data, without a plugin: JSON files of products and scopes, each
    # synced under the owner it names (buntubi.plugins.catalogue_file).
    catalogue_files: list[Path] = []
    # Folder of UI plugins built with buntubi-ui-plugin (one subfolder each), whose browser halves
    # the sign-in pages load at run time. Unset: none.
    ui_plugins_dir: Path | None = None

    @field_validator("brand_accent")
    @classmethod
    def _hex_colour(cls, value: str) -> str:
        if value and not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("expected #rrggbb")
        return value

    def brand(self) -> dict[str, str]:
        """The brand fields that are set, keyed as clients see them."""
        fields = {
            "name": self.brand_name,
            "accent": self.brand_accent,
            "logo": self.brand_logo_url,
            "support_email": self.brand_support_email,
            "privacy_url": self.brand_privacy_url,
            "terms_url": self.brand_terms_url,
        }
        return {key: value for key, value in fields.items() if value}

    @field_validator("issuer")
    @classmethod
    def _no_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
