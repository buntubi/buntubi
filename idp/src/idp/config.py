"""Settings, read from the environment (prefix IDP_) and validated once at startup."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="IDP_", env_file=".env", extra="ignore")

    # Shown on the sign-in pages when no client brand applies; nothing is shown when empty.
    provider_name: str = ""
    # The issuer: the provider's public origin, exactly as clients see it. No trailing slash.
    issuer: str
    database_url: str
    # Signs the session cookie and the CSRF tokens.
    secret_key: SecretStr = Field(min_length=32)
    # A directory of private JWKs (one JSON file each); the newest signs, every one verifies.
    signing_keys_dir: Path

    access_token_ttl: int = 600
    refresh_token_ttl: int = 30 * 24 * 3600
    authorization_code_ttl: int = 60
    session_ttl: int = 14 * 24 * 3600
    email_token_ttl: int = 3600

    # Email through Resend. Test mode logs the message instead of sending it.
    resend_api_key: SecretStr | None = None
    email_from: str = "no-reply@localhost"
    email_test_mode: bool = True

    rate_limit_storage: str = "memory://"
    rate_limit_enabled: bool = True
    # Allowed browser origins for the token, revocation and userinfo endpoints (SPAs).
    cors_origins: list[str] = []
    # Secure cookies need HTTPS; browsers accept them on http://localhost too.
    secure_cookies: bool = True

    @field_validator("issuer")
    @classmethod
    def _no_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
