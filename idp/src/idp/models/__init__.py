"""Every table, imported here so Alembic and the app see the whole schema."""

from idp.models.account import (
    AuditEvent,
    BackupCode,
    DeviceCode,
    EmailToken,
    Passkey,
    TotpCredential,
    UserPicture,
)
from idp.models.clients import Client
from idp.models.grants import AccessTokenRecord, AuthorizationCode, Consent, LoginSession, RefreshToken
from idp.models.platform import (
    ApiKey,
    ApiProduct,
    AppReview,
    ClientSecret,
    Invitation,
    Organization,
    OrganizationMember,
    OrganizationTestUser,
    Scope,
)
from idp.models.users import Identity, User

__all__ = [
    "Scope",
    "OrganizationMember",
    "OrganizationTestUser",
    "Invitation",
    "Organization",
    "ClientSecret",
    "ApiKey",
    "AppReview",
    "ApiProduct",
    "AccessTokenRecord",
    "AuditEvent",
    "AuthorizationCode",
    "BackupCode",
    "Client",
    "Consent",
    "DeviceCode",
    "EmailToken",
    "UserPicture",
    "Identity",
    "LoginSession",
    "RefreshToken",
    "Passkey",
    "TotpCredential",
    "User",
]
