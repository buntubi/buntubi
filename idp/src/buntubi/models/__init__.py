"""Every table, imported here so Alembic and the app see the whole schema."""

from buntubi.models.account import (
    AuditEvent,
    BackupCode,
    DeviceCode,
    EmailToken,
    Passkey,
    TotpCredential,
    UsedChallenge,
    UserPicture,
)
from buntubi.models.clients import Client
from buntubi.models.grants import AccessTokenRecord, AuthorizationCode, Consent, LoginSession, RefreshToken
from buntubi.models.platform import (
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
from buntubi.models.profile_fields import ProfileField
from buntubi.models.settings import PlatformSetting
from buntubi.models.users import Identity, User
from buntubi.models.webhooks import AppOrganization, OrganizationEventSequence, WebhookDelivery, WebhookEvent

__all__ = [
    "PlatformSetting",
    "ProfileField",
    "AppOrganization",
    "OrganizationEventSequence",
    "WebhookDelivery",
    "WebhookEvent",
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
    "UsedChallenge",
    "UserPicture",
    "Identity",
    "LoginSession",
    "RefreshToken",
    "Passkey",
    "TotpCredential",
    "User",
]
