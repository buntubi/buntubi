"""Every table, imported here so Alembic and the app see the whole schema."""

from idp.models.account import AuditEvent, BackupCode, DeviceCode, EmailToken, TotpCredential
from idp.models.clients import Client
from idp.models.grants import AccessTokenRecord, AuthorizationCode, Consent, LoginSession, RefreshToken
from idp.models.users import Identity, User

__all__ = [
    "AccessTokenRecord",
    "AuditEvent",
    "AuthorizationCode",
    "BackupCode",
    "Client",
    "Consent",
    "DeviceCode",
    "EmailToken",
    "Identity",
    "LoginSession",
    "RefreshToken",
    "TotpCredential",
    "User",
]
