"""
The OpenAPI 3.1 description of what integrators call: OpenID Connect discovery and keys, the
OAuth 2.1 endpoints, the developer API and the admin API. Served at /openapi.json, which Postman
and code generators import.

Request bodies come from the pydantic models the endpoints validate with, so the two cannot
disagree. Response schemas are written here and reject unknown fields; tests check real
responses against them, and check that every public route is described.
"""

from typing import Any

from flask import Blueprint, Response, jsonify
from pydantic import BaseModel
from pydantic.json_schema import models_json_schema

from buntubi.config import get_settings
from buntubi.services.webhooks import Event
from buntubi.web import admin, developer, organizations

bp = Blueprint("openapi", __name__)

# Routes deliberately left out: the provider's own sign-in pages and the JSON endpoints they
# call, which are not an integration surface.
INTERNAL = {("POST", "/oauth/authorize")}
DESCRIBED_PREFIXES = ("/.well-known/", "/oauth/", "/developer/api/", "/admin/api/", "/v1/")

REQUEST_MODELS: list[type[BaseModel]] = [
    developer.PublishIn,
    developer.OrganizationIn,
    developer.OrganizationPatch,
    developer.AppIn,
    developer.AppPatch,
    developer.TestUserIn,
    developer.KeyIn,
    developer.MemberIn,
    developer.MemberPatch,
    organizations.MembershipIn,
    organizations.MembershipPatch,
    organizations.TransferIn,
    admin.ClientIn,
    admin.ClientPatch,
    admin.ReviewIn,
    admin.SuspendIn,
    admin.ScopeIn,
    admin.ScopePatch,
    admin.ProductIn,
    admin.ProductPatch,
    admin.UserIn,
    admin.UserPatch,
]

# ── Schemas ───────────────────────────────────────────────────────────────────────────────────

STRING: dict[str, Any] = {"type": "string"}
INT: dict[str, Any] = {"type": "integer"}
BOOL: dict[str, Any] = {"type": "boolean"}
TIME: dict[str, Any] = {"type": "string", "format": "date-time"}
MAYBE_TIME: dict[str, Any] = {"type": ["string", "null"], "format": "date-time"}
MAYBE_STRING: dict[str, Any] = {"type": ["string", "null"]}
# A catalogue entry a plugin declares is read-only here (`managed_by_plugin`); one it no longer
# declares is deprecated: kept for the apps holding it, offered to no new one.
MANAGED: dict[str, Any] = {
    "managed_by": {**MAYBE_STRING, "description": "The plugin that declares it; null when made here."},
    "deprecated_at": MAYBE_TIME,
}
STRINGS: dict[str, Any] = {"type": "array", "items": STRING}
ENVIRONMENT: dict[str, Any] = {"type": "string", "enum": ["sandbox", "live"]}
KIND: dict[str, Any] = {
    "type": "string",
    "enum": ["consumer", "business", "web", "mobile", "backend", "internal"],
}
PLATFORM: dict[str, Any] = {"type": "string", "enum": ["web", "ios", "android", "backend"]}
SENSITIVITY: dict[str, Any] = {"type": "string", "enum": ["public", "sensitive", "restricted"]}
PRODUCT_FIELDS: dict[str, Any] = {
    "slug": STRING,
    "names": {"type": "object"},
    "descriptions": {"type": "object"},
    "category": STRING,
    "auth": {"type": "array", "items": {"type": "string", "enum": ["oauth2", "oidc", "api_key", "webhooks"]}},
    "availability": {"type": "string", "enum": ["ga", "beta", "sandbox"]},
    "docs_url": MAYBE_STRING,
    "approval": {"type": "string", "enum": ["none", "review", "restricted"]},
}
ROLE: dict[str, Any] = {"type": "string", "enum": ["owner", "admin", "billing", "member", "guest"]}
# Whether the app's tokens name an organization the person acts in.
ORGANIZATION_USAGE: dict[str, Any] = {"type": "string", "enum": ["none", "optional", "required"]}
PORTAL_ROLE: dict[str, Any] = {"type": ["string", "null"], "enum": ["developer", "reviewer", "viewer", None]}


def ref(name: str) -> dict[str, str]:
    return {"$ref": f"#/components/schemas/{name}"}


def obj(
    properties: dict[str, Any], required: list[str] | None = None, *, closed: bool = True
) -> dict[str, Any]:
    schema: dict[str, Any] = {
        "type": "object",
        "properties": properties,
        "required": list(properties) if required is None else required,
    }
    if closed:
        schema["additionalProperties"] = False
    return schema


def items_of(name: str) -> dict[str, Any]:
    return obj({"items": {"type": "array", "items": ref(name)}})


RESPONSE_SCHEMAS: dict[str, dict[str, Any]] = {
    "Error": obj({"error": STRING}, closed=False),
    "OAuthError": obj({"error": STRING, "error_description": STRING}, ["error"], closed=False),
    # OpenID Connect and OAuth
    "Discovery": obj({"issuer": STRING, "jwks_uri": STRING}, closed=False),
    "Jwks": obj({"keys": {"type": "array", "items": {"type": "object"}}}),
    "Brand": obj(
        {
            "name": STRING,
            "accent": STRING,
            "logo": STRING,
            "support_email": STRING,
            "privacy_url": STRING,
            "terms_url": STRING,
        }
    ),
    "TokenResponse": obj(
        {
            "access_token": STRING,
            "token_type": STRING,
            "expires_in": INT,
            "refresh_token": STRING,
            "id_token": STRING,
            "scope": STRING,
        },
        ["access_token", "token_type", "expires_in"],
    ),
    "DeviceAuthorization": obj(
        {
            "device_code": STRING,
            "user_code": STRING,
            "verification_uri": STRING,
            "verification_uri_complete": STRING,
            "expires_in": INT,
            "interval": INT,
        },
        ["device_code", "user_code", "verification_uri", "expires_in"],
    ),
    "UserInfo": obj({"sub": STRING}, closed=False),
    "Introspection": obj(
        {
            "active": BOOL,
            "token_type": {"type": "string", "enum": ["access_token", "refresh_token", "api_key"]},
            "client_id": STRING,
            "sub": STRING,
            "aud": {},
            "scope": STRING,
            "exp": INT,
            "iat": INT,
            "jti": STRING,
            "iss": STRING,
            "env": ENVIRONMENT,
            "organization_id": STRING,
            "key_id": STRING,
        },
        ["active"],
    ),
    # Developer API
    "Me": obj(
        {
            "email": STRING,
            "name": STRING,
            "developer": BOOL,
            "developer_since": MAYBE_TIME,
            "platform_admin": BOOL,
        }
    ),
    "Organization": obj(
        {
            "id": STRING,
            "name": STRING,
            "description": STRING,
            "support_email": MAYBE_STRING,
            "suspended": BOOL,
            "platform": BOOL,
            "role": ROLE,
            "portal_role": PORTAL_ROLE,
            "created_at": TIME,
        }
    ),
    "AppOverview": obj(
        {
            "stage": {"type": "string", "enum": ["draft", "in_review", "changes_requested", "live"]},
            "checks": {
                "type": "array",
                "items": obj(
                    {
                        "key": {
                            "type": "string",
                            "description": "The provider's own: basic_info, redirect_uri, products, "
                            "policies, support_email, permissions, review. A plugin adds its own, "
                            "with a label.",
                        },
                        "state": {"type": "string", "enum": ["done", "warn", "todo"]},
                        "items": STRINGS,
                        "required": BOOL,
                        "label": {
                            "anyOf": [obj({"fr": STRING, "en": STRING}), {"type": "null"}],
                            "description": "Words for a plugin's line; null for the provider's own.",
                        },
                    }
                ),
            },
            "scopes": obj({"live": STRINGS, "waiting": STRINGS, "sandbox": STRINGS}),
        }
    ),
    "Product": obj(
        {
            **PRODUCT_FIELDS,
            "scopes": {
                "type": "array",
                "items": obj(
                    {"name": STRING, "sensitivity": SENSITIVITY, "descriptions": {"type": "object"}}
                ),
            },
        }
    ),
    # The organizations API: an organization as the person sees it, its members and invitations.
    "WebhookDelivery": obj(
        {
            "id": STRING,
            "event_id": STRING,
            "event_type": {"type": "string", "enum": [e.value for e in Event]},
            "organization_id": STRING,
            "status": {"type": "string", "enum": ["pending", "delivered", "failed"]},
            "attempts": INT,
            "last_status": {"type": ["integer", "null"]},
            "last_error": MAYBE_STRING,
            "created_at": TIME,
            "last_attempt_at": {"type": ["string", "null"], "format": "date-time"},
            "next_attempt_at": {"type": ["string", "null"], "format": "date-time"},
            "delivered_at": {"type": ["string", "null"], "format": "date-time"},
        }
    ),
    "Membership": obj(
        {
            "id": STRING,
            "name": STRING,
            "description": STRING,
            "support_email": MAYBE_STRING,
            "suspended": BOOL,
            "role": ROLE,
            "created_at": TIME,
        }
    ),
    "OrganizationMember": obj(
        {"id": STRING, "user_id": STRING, "email": STRING, "name": STRING, "role": ROLE, "added_at": TIME}
    ),
    "OrganizationInvitation": obj(
        {"id": STRING, "email": STRING, "role": ROLE, "invited_at": TIME, "expires_at": TIME}
    ),
    "Member": obj(
        {
            "id": STRING,
            "email": STRING,
            "name": STRING,
            "role": ROLE,
            "portal_role": PORTAL_ROLE,
            "apps": STRINGS,
            "added_at": TIME,
            "two_step": BOOL,
        }
    ),
    "Invitation": obj(
        {
            "id": STRING,
            "email": STRING,
            "role": ROLE,
            "portal_role": PORTAL_ROLE,
            "apps": STRINGS,
            "invited_at": TIME,
            "expires_at": TIME,
        }
    ),
    "Secret": obj(
        {
            "id": STRING,
            "prefix": STRING,
            "created_at": TIME,
            "last_used_at": MAYBE_TIME,
            "expires_at": MAYBE_TIME,
            "active": BOOL,
        }
    ),
    "App": obj(
        {
            "client_id": STRING,
            "organization_id": STRING,
            "name": STRING,
            "client_type": {"type": "string", "enum": ["public", "confidential"]},
            "environment": ENVIRONMENT,
            "first_party": BOOL,
            "review_status": {"type": "string", "enum": ["none", "pending", "approved", "rejected"]},
            "review_note": STRING,
            "redirect_uris": STRINGS,
            "post_logout_redirect_uris": STRINGS,
            "scopes": STRINGS,
            "grant_types": STRINGS,
            "homepage_url": MAYBE_STRING,
            "privacy_url": MAYBE_STRING,
            "terms_url": MAYBE_STRING,
            "brand": {"type": "object"},
            "kind": KIND,
            "description": STRING,
            "category": STRING,
            "platforms": {"type": "array", "items": PLATFORM},
            "products": STRINGS,
            "organization_usage": ORGANIZATION_USAGE,
            "webhook_url": MAYBE_STRING,
            "webhook_events": {"type": "string", "enum": ["linked", "all"]},
            "disabled": BOOL,
            "secrets": {"type": "array", "items": ref("Secret")},
            "created_at": TIME,
        }
    ),
    "ApiKey": obj(
        {
            "id": STRING,
            "name": STRING,
            "environment": ENVIRONMENT,
            "prefix": STRING,
            "scopes": STRINGS,
            "created_at": TIME,
            "last_used_at": MAYBE_TIME,
            "active": BOOL,
        }
    ),
    "OrganizationDetail": obj(
        {
            "organization": ref("Organization"),
            "apps": {"type": "array", "items": ref("App")},
            "keys": {"type": "array", "items": ref("ApiKey")},
            "test_users": {"type": "array", "items": obj({"email": STRING, "added_at": TIME})},
            "members": {"type": "array", "items": ref("Member")},
            "invitations": {"type": "array", "items": ref("Invitation")},
        }
    ),
    # Admin API
    "Overview": obj(
        {
            name: INT
            for name in (
                "users",
                "developers",
                "organizations",
                "suspended_organizations",
                "live_apps",
                "sandbox_apps",
                "pending_reviews",
            )
        }
    ),
    "AdminMe": obj(
        {
            "id": STRING,
            "email": STRING,
            "name": STRING,
            "superadmin": BOOL,
            "platform_organization_id": MAYBE_STRING,
        }
    ),
    "AdminClient": obj(
        {
            "client_id": STRING,
            "name": STRING,
            "client_type": STRING,
            "redirect_uris": STRINGS,
            "post_logout_redirect_uris": STRINGS,
            "grant_types": STRINGS,
            "scope": STRING,
            "first_party": BOOL,
            "brand": {"type": "object"},
            "homepage_url": MAYBE_STRING,
            "disabled": BOOL,
            "organization_id": MAYBE_STRING,
            "organization": MAYBE_STRING,
            "platform": BOOL,
            "environment": ENVIRONMENT,
            "review_status": STRING,
            "created_at": TIME,
        }
    ),
    "AdminUser": obj(
        {
            "id": STRING,
            "email": STRING,
            "email_verified": BOOL,
            "given_name": STRING,
            "family_name": STRING,
            "locale": STRING,
            "country": MAYBE_STRING,
            "phone": MAYBE_STRING,
            "address": obj(
                {
                    "street_address": STRING,
                    "locality": STRING,
                    "region": STRING,
                    "postal_code": STRING,
                    "country": MAYBE_STRING,
                }
            ),
            "roles": STRINGS,
            "superadmin": BOOL,
            "developer": BOOL,
            "developer_since": MAYBE_TIME,
            "password_set": BOOL,
            "mfa": BOOL,
            "passkeys": INT,
            "disabled": BOOL,
            "created_at": TIME,
            "last_sign_in_at": MAYBE_TIME,
        }
    ),
    "AdminUserPage": obj(
        {
            "user": ref("AdminUser"),
            "organizations": {
                "type": "array",
                "items": obj({"id": STRING, "name": STRING, "role": ROLE, "platform": BOOL}),
            },
            "active_sessions": INT,
        }
    ),
    "AdminOrganization": obj(
        {
            "id": STRING,
            "name": STRING,
            "owner": {"anyOf": [obj({"id": STRING, "email": STRING}), {"type": "null"}]},
            "members": INT,
            "support_email": MAYBE_STRING,
            "approved_scopes": STRINGS,
            "apps": INT,
            "platform": BOOL,
            "suspended": BOOL,
            "suspended_reason": MAYBE_STRING,
            "created_at": TIME,
        }
    ),
    "Scope": obj(
        {
            "name": STRING,
            "sensitivity": {"type": "string", "enum": ["public", "sensitive", "restricted"]},
            "descriptions": {"type": "object"},
            "resource": STRING,
            "notes": STRING,
            "product": MAYBE_STRING,
            **MANAGED,
        }
    ),
    "DeveloperPlugin": obj({"id": STRING, "ui": {"type": "object"}}),
    "Plugin": obj(
        {
            "id": STRING,
            "version": STRING,
            "products": STRINGS,
            "scopes": STRINGS,
            "ui": {"type": "object", "description": "What the console and the portal show for it."},
        }
    ),
    "AdminProduct": obj(
        {
            **PRODUCT_FIELDS,
            "position": INT,
            "scopes": STRINGS,
            **MANAGED,
        }
    ),
    "AuditEvent": obj(
        {
            "event": STRING,
            "user_id": MAYBE_STRING,
            "client_id": MAYBE_STRING,
            "ip": MAYBE_STRING,
            "details": {"type": "object"},
            "at": TIME,
        }
    ),
}


# A review is the client as the admin API shows it, plus what the decision needs.
RESPONSE_SCHEMAS["Review"] = obj(
    {
        **RESPONSE_SCHEMAS["AdminClient"]["properties"],
        "homepage_url": MAYBE_STRING,
        "privacy_url": MAYBE_STRING,
        "terms_url": MAYBE_STRING,
        "sensitive_scopes": STRINGS,
        "organization": {"type": ["object", "null"]},
        "owner": {"type": ["object", "null"]},
        "requested_at": TIME,
        "description": STRING,
        "logo": MAYBE_STRING,
        "history": {"type": "array", "items": ref("AppReview")},
    }
)

PERSON: dict[str, Any] = {"type": ["object", "null"]}
# One request to go live with sensitive scopes, and its answer. `decided_by` for staff only.
_APP_REVIEW = {
    "id": STRING,
    "submitted_at": TIME,
    "submitted_by": PERSON,
    "scopes": STRINGS,
    "justifications": {"type": "object", "additionalProperties": STRING},
    "instructions": STRING,
    "decision": {"type": "string", "enum": ["pending", "approved", "rejected"]},
    "note": STRING,
    "decided_at": MAYBE_TIME,
    "decided_by": PERSON,
}
RESPONSE_SCHEMAS["AppReview"] = obj(_APP_REVIEW, [key for key in _APP_REVIEW if key != "decided_by"])

_EVENT_ORGANIZATION = {"id": STRING, "name": STRING, "suspended": BOOL}
RESPONSE_SCHEMAS["EventOrganization"] = obj(_EVENT_ORGANIZATION)
RESPONSE_SCHEMAS["AppOrganization"] = obj({**_EVENT_ORGANIZATION, "sequence": INT})
RESPONSE_SCHEMAS["EventMember"] = obj({"id": STRING, "user_id": STRING, "email": STRING, "role": STRING})

# ── Operations ────────────────────────────────────────────────────────────────────────────────

Security = list[dict[str, list[str]]]

DEVELOPER: Security = [{"oauth2": ["developer"]}, {"bearer": []}]
ADMIN: Security = [{"oauth2": ["admin"]}, {"bearer": []}]
CLIENT: Security = [{"clientBasic": []}]
SIGNED_IN: Security = [{"oauth2": ["openid"]}, {"bearer": []}]
ORGANIZATIONS_READ: Security = [
    {"oauth2": ["organizations:read"]},
    {"oauth2": ["organizations:manage"]},
    {"bearer": []},
]
ORGANIZATIONS_MANAGE: Security = [{"oauth2": ["organizations:manage"]}, {"bearer": []}]
# An app's own token (client credentials), never a person's.
APP_ORGANIZATIONS: Security = [{"oauth2": ["organizations:read"]}, {"bearer": []}]


def body(schema: dict[str, Any], media: str = "application/json") -> dict[str, Any]:
    return {"required": True, "content": {media: {"schema": schema}}}


def answer(schema: dict[str, Any] | None, description: str = "OK") -> dict[str, Any]:
    if schema is None:
        return {"description": description}
    return {"description": description, "content": {"application/json": {"schema": schema}}}


# What the OAuth endpoints answer when they refuse (RFC 6749 5.2): 401 when client
# authentication failed, 400 for the rest.
OAUTH_REFUSED = {
    "400": answer(ref("OAuthError"), "Refused: invalid_request, invalid_grant, ..."),
    "401": answer(ref("OAuthError"), "The client could not be authenticated"),
}

REFUSED = {
    "400": answer(ref("Error"), "Refused: the error code says why"),
    "401": answer(None, "No valid access token"),
    "403": answer(ref("Error"), "Not allowed (scope, role, terms, second factor)"),
    "404": answer(ref("Error"), "Not found, or not yours"),
    "422": answer(None, "The body does not fit the schema"),
}


def op(
    summary: str,
    tag: str,
    security: Security | None,
    responses: dict[str, Any],
    request: dict[str, Any] | None = None,
    params: list[str] | None = None,
    query: list[str] | None = None,
) -> dict[str, Any]:
    operation: dict[str, Any] = {"summary": summary, "tags": [tag], "responses": responses}
    if security is not None:
        operation["security"] = security
        operation["responses"] = {**REFUSED, **responses}
    if request is not None:
        operation["requestBody"] = request
    parameters = [{"name": p, "in": "path", "required": True, "schema": STRING} for p in params or []]
    parameters += [{"name": q, "in": "query", "required": False, "schema": STRING} for q in query or []]
    if parameters:
        operation["parameters"] = parameters
    return operation


def form(properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return body(
        {"type": "object", "properties": properties, "required": required},
        "application/x-www-form-urlencoded",
    )


def ok(name: str) -> dict[str, Any]:
    return {"200": answer(ref(name))}


def one(key: str, name: str, status: str = "200") -> dict[str, Any]:
    return {status: answer(obj({key: ref(name)}))}


def listing(name: str) -> dict[str, Any]:
    return {"200": answer(items_of(name))}


def with_secret(key: str, name: str, secret: str) -> dict[str, Any]:
    return {
        "201": answer(obj({key: ref(name), secret: MAYBE_STRING}), "Created; the secret is shown this once")
    }


def paths() -> dict[str, dict[str, Any]]:
    d, a, oidc = "Developer API", "Admin API", "OAuth and OpenID Connect"
    return {**_organization_paths(), **_paths(d, a, oidc)}


def _organization_paths() -> dict[str, dict[str, Any]]:
    o, read, manage = "Organizations API", ORGANIZATIONS_READ, ORGANIZATIONS_MANAGE
    org, member = ["organization_id"], ["organization_id", "member_id"]
    membership = one("organization", "Membership")
    return {
        "/v1/organizations": {
            "get": op(
                "The person's organizations (only the token's, when it names one)",
                o,
                read,
                listing("Membership"),
            ),
            "post": op(
                "Create an organization, owned by the person",
                o,
                manage,
                one("organization", "Membership", "201"),
                request=body(ref("OrganizationIn")),
            ),
        },
        "/v1/organizations/{organization_id}": {
            "get": op("An organization the person is in, guests included", o, read, membership, params=org),
            "patch": op(
                "Change an organization",
                o,
                manage,
                membership,
                request=body(ref("OrganizationPatch")),
                params=org,
            ),
            "delete": op(
                "Delete an organization (owner)",
                o,
                manage,
                {"200": answer(obj({"deleted": BOOL}))},
                params=org,
            ),
        },
        "/v1/organizations/{organization_id}/transfer": {
            "post": op(
                "Hand ownership to another member; the owner stays on as an admin",
                o,
                manage,
                membership,
                request=body(ref("TransferIn")),
                params=org,
            )
        },
        "/v1/organizations/{organization_id}/leave": {
            "post": op("Leave the organization", o, manage, {"200": answer(obj({"left": BOOL}))}, params=org)
        },
        "/v1/organizations/{organization_id}/members": {
            "get": op(
                "Members and pending invitations (not for guests)",
                o,
                read,
                {
                    "200": answer(
                        obj(
                            {
                                "items": {"type": "array", "items": ref("OrganizationMember")},
                                "invitations": {"type": "array", "items": ref("OrganizationInvitation")},
                            }
                        )
                    )
                },
                params=org,
            ),
            "post": op(
                "Add someone with an account, or invite an address without one",
                o,
                manage,
                {
                    "201": answer(obj({"member": ref("OrganizationMember")})),
                    "202": answer(obj({"invitation": ref("OrganizationInvitation")}), "Invited"),
                },
                request=body(ref("MembershipIn")),
                params=org,
            ),
        },
        "/v1/organizations/{organization_id}/members/{member_id}": {
            "patch": op(
                "Change a member's role",
                o,
                manage,
                one("member", "OrganizationMember"),
                request=body(ref("MembershipPatch")),
                params=member,
            ),
            "delete": op(
                "Remove a member", o, manage, {"200": answer(obj({"removed": BOOL}))}, params=member
            ),
        },
        "/v1/app/organizations": {
            "get": op(
                "The organizations the app hears of, with their latest event number",
                o,
                APP_ORGANIZATIONS,
                listing("AppOrganization"),
            )
        },
        "/v1/app/organizations/{organization_id}": {
            "get": op(
                "One of them with its members, as of its latest event number",
                o,
                APP_ORGANIZATIONS,
                {
                    "200": answer(
                        obj(
                            {
                                "organization": ref("EventOrganization"),
                                "members": {"type": "array", "items": ref("EventMember")},
                                "sequence": INT,
                            }
                        )
                    )
                },
                params=org,
            )
        },
        "/v1/organizations/{organization_id}/invitations/{invitation_id}": {
            "delete": op(
                "Withdraw an invitation",
                o,
                manage,
                {"200": answer(obj({"withdrawn": BOOL}))},
                params=["organization_id", "invitation_id"],
            )
        },
    }


def _paths(d: str, a: str, oidc: str) -> dict[str, dict[str, Any]]:
    return {
        # OpenID Connect and OAuth
        "/.well-known/openid-configuration": {"get": op("Discovery document", oidc, None, ok("Discovery"))},
        "/.well-known/jwks.json": {"get": op("Public signing keys", oidc, None, ok("Jwks"))},
        "/.well-known/brand.json": {"get": op("The platform's brand", oidc, None, ok("Brand"))},
        "/oauth/authorize": {
            "get": op(
                "Start an authorization (code flow, PKCE S256 required)",
                oidc,
                None,
                {"302": answer(None, "To sign-in, consent, or back to redirect_uri")},
                query=[
                    "response_type",
                    "client_id",
                    "redirect_uri",
                    "scope",
                    "state",
                    "nonce",
                    "code_challenge",
                    "code_challenge_method",
                    "prompt",
                    "max_age",
                ],
            )
        },
        "/oauth/token": {
            "post": op(
                "Exchange a grant for tokens",
                oidc,
                None,
                {"200": answer(ref("TokenResponse")), **OAUTH_REFUSED},
                request=form(
                    {
                        "grant_type": {
                            "type": "string",
                            "enum": [
                                "authorization_code",
                                "refresh_token",
                                "client_credentials",
                                "urn:ietf:params:oauth:grant-type:device_code",
                            ],
                        },
                        "code": STRING,
                        "redirect_uri": STRING,
                        "code_verifier": STRING,
                        "refresh_token": STRING,
                        "device_code": STRING,
                        "scope": STRING,
                        "client_id": STRING,
                        "client_secret": STRING,
                    },
                    ["grant_type"],
                ),
            )
        },
        "/oauth/userinfo": {
            "get": op(
                "Claims about the signed-in user",
                oidc,
                SIGNED_IN,
                ok("UserInfo"),
            ),
            "post": op(
                "Claims about the signed-in user",
                oidc,
                SIGNED_IN,
                ok("UserInfo"),
            ),
        },
        "/oauth/revoke": {
            "post": op(
                "Revoke a refresh or access token (RFC 7009)",
                oidc,
                None,
                {"200": answer(None), **OAUTH_REFUSED},
                request=form({"token": STRING, "token_type_hint": STRING, "client_id": STRING}, ["token"]),
            )
        },
        "/oauth/introspect": {
            "post": op(
                "Check a token or an API key (RFC 7662), as a confidential client",
                oidc,
                CLIENT,
                {**ok("Introspection"), **OAUTH_REFUSED},
                request=form(
                    {
                        "token": STRING,
                        "token_type_hint": {
                            "type": "string",
                            "enum": ["access_token", "refresh_token", "api_key"],
                        },
                        "client_ip": STRING,
                    },
                    ["token"],
                ),
            )
        },
        "/oauth/device_authorization": {
            "post": op(
                "Start the device flow (RFC 8628)",
                oidc,
                None,
                {**ok("DeviceAuthorization"), **OAUTH_REFUSED},
                request=form({"client_id": STRING, "scope": STRING}, ["client_id"]),
            )
        },
        "/oauth/check-session": {
            "get": op(
                "The session check page apps embed (OpenID Connect Session Management)",
                oidc,
                None,
                {"200": answer(None, "An HTML page answering postMessage with changed or unchanged")},
            )
        },
        "/oauth/check-session.js": {
            "get": op("The session check page's script", oidc, None, {"200": answer(None, "JavaScript")})
        },
        "/oauth/logout": {
            "get": op(
                "End the browser session (RP-initiated logout)",
                oidc,
                None,
                {
                    "302": answer(
                        None, "To post_logout_redirect_uri when registered, else the signed-out page"
                    ),
                    "200": answer(
                        None,
                        "A confirmation page, when id_token_hint does not name the current session",
                    ),
                },
                query=["id_token_hint", "post_logout_redirect_uri", "state"],
            ),
            "post": op(
                "The confirmation page's answer: end the session (same query as the GET)",
                oidc,
                None,
                {
                    "200": answer(obj({"redirect": STRING}), "Where to go next"),
                    "409": answer(None, "The page was opened for another account than the current one"),
                },
                query=["id_token_hint", "post_logout_redirect_uri", "state"],
            ),
        },
        # Developer API
        "/developer/api/me": {
            "get": op("Who is calling, and whether they are a developer", d, DEVELOPER, ok("Me"))
        },
        "/developer/api/terms": {
            "post": op("Accept the developer terms", d, DEVELOPER, {"200": answer(obj({"developer": BOOL}))})
        },
        "/developer/api/products": {
            "get": op("The API products apps can use, with their scopes", d, DEVELOPER, listing("Product"))
        },
        "/developer/api/organizations": {
            "get": op("Your organizations", d, DEVELOPER, listing("Organization")),
            "post": op(
                "Create an organization",
                d,
                DEVELOPER,
                one("organization", "Organization", "201"),
                request=body(ref("OrganizationIn")),
            ),
        },
        "/developer/api/organizations/{organization_id}": {
            "get": op(
                "An organization with its apps, keys, test users and members",
                d,
                DEVELOPER,
                ok("OrganizationDetail"),
                params=["organization_id"],
            ),
            "patch": op(
                "Change an organization",
                d,
                DEVELOPER,
                one("organization", "Organization"),
                request=body(ref("OrganizationPatch")),
                params=["organization_id"],
            ),
            "delete": op(
                "Delete an organization",
                d,
                DEVELOPER,
                {"200": answer(obj({"deleted": BOOL}))},
                params=["organization_id"],
            ),
        },
        "/developer/api/organizations/{organization_id}/members": {
            "post": op(
                "Add a member, or invite an address with no account (joins at its first verified sign-in)",
                d,
                DEVELOPER,
                {**one("member", "Member", "201"), **one("invitation", "Invitation", "202")},
                request=body(ref("MemberIn")),
                params=["organization_id"],
            )
        },
        "/developer/api/organizations/{organization_id}/members/{member_id}": {
            "patch": op(
                "Change a member's role or apps",
                d,
                DEVELOPER,
                one("member", "Member"),
                request=body(ref("MemberPatch")),
                params=["organization_id", "member_id"],
            ),
            "delete": op(
                "Remove a member, or leave",
                d,
                DEVELOPER,
                {"200": answer(obj({"removed": BOOL}))},
                params=["organization_id", "member_id"],
            ),
        },
        "/developer/api/organizations/{organization_id}/invitations/{invitation_id}": {
            "delete": op(
                "Withdraw an invitation",
                d,
                DEVELOPER,
                {"200": answer(obj({"withdrawn": BOOL}))},
                params=["organization_id", "invitation_id"],
            ),
        },
        "/developer/api/organizations/{organization_id}/apps": {
            "post": op(
                "Create an app (sandbox)",
                d,
                DEVELOPER,
                {
                    "201": answer(
                        obj(
                            {"app": ref("App"), "client_secret": MAYBE_STRING, "webhook_secret": MAYBE_STRING}
                        ),
                        "Created; the client and webhook secrets are shown this once",
                    )
                },
                request=body(ref("AppIn")),
                params=["organization_id"],
            )
        },
        "/developer/api/organizations/{organization_id}/keys": {
            "post": op(
                "Create an API key",
                d,
                DEVELOPER,
                {
                    "201": answer(
                        obj({"key": ref("ApiKey"), "api_key": STRING}), "Created; the key is shown this once"
                    )
                },
                request=body(ref("KeyIn")),
                params=["organization_id"],
            )
        },
        "/developer/api/organizations/{organization_id}/keys/{key_id}": {
            "delete": op(
                "Revoke an API key", d, DEVELOPER, one("key", "ApiKey"), params=["organization_id", "key_id"]
            )
        },
        "/developer/api/organizations/{organization_id}/test-users": {
            "post": op(
                "Add a sandbox test user",
                d,
                DEVELOPER,
                {"201": answer(obj({"email": STRING}))},
                request=body(ref("TestUserIn")),
                params=["organization_id"],
            )
        },
        "/developer/api/organizations/{organization_id}/test-users/{email}": {
            "delete": op(
                "Remove a test user (their tokens for the sandbox apps end)",
                d,
                DEVELOPER,
                {"200": answer(obj({"removed": BOOL}))},
                params=["organization_id", "email"],
            )
        },
        "/developer/api/apps/{client_id}": {
            "get": op(
                "An app, with the caller's role in its organization",
                d,
                DEVELOPER,
                {"200": answer(obj({"app": ref("App"), "role": ROLE, "portal_role": PORTAL_ROLE}))},
                params=["client_id"],
            ),
            "patch": op(
                "Change an app; a first webhook address answers its secret, this once",
                d,
                DEVELOPER,
                {"200": answer(obj({"app": ref("App"), "webhook_secret": STRING}, required=["app"]))},
                request=body(ref("AppPatch")),
                params=["client_id"],
            ),
            "delete": op(
                "Delete an app", d, DEVELOPER, {"200": answer(obj({"deleted": BOOL}))}, params=["client_id"]
            ),
        },
        "/developer/api/apps/{client_id}/webhook-secret": {
            "post": op(
                "A new webhook signing secret, shown this once; the previous one stops signing",
                d,
                DEVELOPER,
                {"200": answer(obj({"webhook_secret": STRING}))},
                params=["client_id"],
            )
        },
        "/developer/api/apps/{client_id}/webhook-deliveries": {
            "get": op(
                "The app's last 50 webhook deliveries, newest first",
                d,
                DEVELOPER,
                listing("WebhookDelivery"),
                params=["client_id"],
            )
        },
        "/developer/api/apps/{client_id}/webhook-deliveries/{delivery_id}/redeliver": {
            "post": op(
                "Send a webhook delivery again at the next pass",
                d,
                DEVELOPER,
                one("delivery", "WebhookDelivery"),
                params=["client_id", "delivery_id"],
            )
        },
        "/developer/api/apps/{client_id}/overview": {
            "get": op(
                "Where an app stands: its stage, what it needs before going live, its scopes",
                d,
                DEVELOPER,
                ok("AppOverview"),
                params=["client_id"],
            )
        },
        "/developer/api/apps/{client_id}/publish": {
            "post": op(
                "Ask to go live: live at once, or pending review for sensitive scopes, each explained",
                d,
                DEVELOPER,
                {
                    "200": answer(
                        obj({"state": {"type": "string", "enum": ["live", "pending"]}, "app": ref("App")})
                    )
                },
                request={"required": False, "content": {"application/json": {"schema": ref("PublishIn")}}},
                params=["client_id"],
            )
        },
        "/developer/api/apps/{client_id}/reviews": {
            "get": op(
                "An app's reviews, the latest first", d, DEVELOPER, listing("AppReview"), params=["client_id"]
            )
        },
        "/developer/api/apps/{client_id}/secrets": {
            "post": op(
                "New client secret (the previous ones expire in 24 hours)",
                d,
                DEVELOPER,
                {
                    "200": answer(
                        obj({"client_secret": STRING, "app": ref("App")}), "The secret is shown this once"
                    )
                },
                params=["client_id"],
            )
        },
        "/developer/api/apps/{client_id}/secrets/{secret_id}": {
            "delete": op(
                "Revoke a client secret", d, DEVELOPER, one("app", "App"), params=["client_id", "secret_id"]
            )
        },
        # Admin API
        "/admin/api/overview": {"get": op("Counts", a, ADMIN, ok("Overview"))},
        "/admin/api/reviews": {"get": op("Apps waiting for review", a, ADMIN, listing("Review"))},
        "/admin/api/apps/{client_id}/review": {
            "get": op(
                "One app as a reviewer sees it, with its history",
                a,
                ADMIN,
                one("app", "Review"),
                params=["client_id"],
            ),
            "post": op(
                "Approve or reject an app (a rejection needs a note)",
                a,
                ADMIN,
                one("app", "Review"),
                request=body(ref("ReviewIn")),
                params=["client_id"],
            ),
        },
        "/admin/api/organizations": {
            "get": op("Organizations", a, ADMIN, listing("AdminOrganization"), query=["q"])
        },
        "/admin/api/organizations/{organization_id}/suspend": {
            "post": op(
                "Suspend an organization (its apps stop, their tokens are revoked)",
                a,
                ADMIN,
                one("organization", "AdminOrganization"),
                request=body(ref("SuspendIn")),
                params=["organization_id"],
            )
        },
        "/admin/api/organizations/{organization_id}/restore": {
            "post": op(
                "Restore a suspended organization",
                a,
                ADMIN,
                one("organization", "AdminOrganization"),
                params=["organization_id"],
            )
        },
        "/admin/api/scopes": {
            "get": op("The scope catalog", a, ADMIN, listing("Scope")),
            "post": op("Add a scope", a, ADMIN, one("scope", "Scope", "201"), request=body(ref("ScopeIn"))),
        },
        "/admin/api/scopes/{name}": {
            "patch": op(
                "Change a scope",
                a,
                ADMIN,
                one("scope", "Scope"),
                request=body(ref("ScopePatch")),
                params=["name"],
            )
        },
        "/admin/api/products": {
            "get": op("The API product catalog", a, ADMIN, listing("AdminProduct")),
            "post": op(
                "Add an API product",
                a,
                ADMIN,
                one("product", "AdminProduct", "201"),
                request=body(ref("ProductIn")),
            ),
        },
        "/admin/api/products/{slug}": {
            "patch": op(
                "Change an API product",
                a,
                ADMIN,
                one("product", "AdminProduct"),
                request=body(ref("ProductPatch")),
                params=["slug"],
            )
        },
        "/developer/api/plugins": {
            "get": op(
                "The plugins this deployment runs",
                d,
                DEVELOPER,
                listing("DeveloperPlugin"),
            ),
        },
        "/admin/api/plugins": {
            "get": op("The plugins this deployment runs", a, ADMIN, listing("Plugin")),
        },
        "/admin/api/clients": {
            "get": op("All clients", a, ADMIN, listing("AdminClient")),
            "post": op(
                "Register a first-party or owner client",
                a,
                ADMIN,
                with_secret("client", "AdminClient", "client_secret"),
                request=body(ref("ClientIn")),
            ),
        },
        "/admin/api/me": {
            "get": op(
                "Who is signed in to the console",
                a,
                ADMIN,
                ok("AdminMe"),
            )
        },
        "/admin/api/clients/{client_id}": {
            "get": op("A client", a, ADMIN, one("client", "AdminClient"), params=["client_id"]),
            "patch": op(
                "Change a client",
                a,
                ADMIN,
                one("client", "AdminClient"),
                request=body(ref("ClientPatch")),
                params=["client_id"],
            ),
        },
        "/admin/api/clients/{client_id}/secret": {
            "post": op(
                "New client secret",
                a,
                ADMIN,
                {"200": answer(obj({"client_secret": STRING}), "The secret is shown this once")},
                params=["client_id"],
            )
        },
        "/admin/api/users": {
            "get": op("Users", a, ADMIN, listing("AdminUser"), query=["q", "before"]),
            "post": op(
                "Create an account: invited by email, or ready with a password the admin sets",
                a,
                ADMIN,
                {"201": answer(obj({"user": ref("AdminUser")}), "Created and invited")},
                request=body(ref("UserIn")),
            ),
        },
        "/admin/api/users/{user_id}": {
            "get": op(
                "A user, their organizations and open sessions",
                a,
                ADMIN,
                ok("AdminUserPage"),
                params=["user_id"],
            ),
            "patch": op(
                "Change a profile",
                a,
                ADMIN,
                one("user", "AdminUser"),
                request=body(ref("UserPatch")),
                params=["user_id"],
            ),
        },
        "/admin/api/users/{user_id}/password-reset": {
            "post": op(
                "Email a password reset link",
                a,
                ADMIN,
                {"202": answer(obj({"sent": BOOL}), "Sent")},
                params=["user_id"],
            )
        },
        "/admin/api/users/{user_id}/sign-out": {
            "post": op("End every session of a user", a, ADMIN, one("user", "AdminUser"), params=["user_id"])
        },
        "/admin/api/users/{user_id}/mfa": {
            "delete": op(
                "Turn off a user's two-step sign-in (not yours, not a superadmin's)",
                a,
                ADMIN,
                one("user", "AdminUser"),
                params=["user_id"],
            )
        },
        "/admin/api/users/{user_id}/disable": {
            "post": op(
                "Disable a user (signs them out everywhere)",
                a,
                ADMIN,
                one("user", "AdminUser"),
                params=["user_id"],
            )
        },
        "/admin/api/users/{user_id}/enable": {
            "post": op("Enable a user", a, ADMIN, one("user", "AdminUser"), params=["user_id"])
        },
        "/admin/api/users/{user_id}/admin": {
            "post": op(
                "Give the admin role and a seat in the platform organization (superadmins only)",
                a,
                ADMIN,
                one("user", "AdminUser"),
                params=["user_id"],
            ),
            "delete": op(
                "Take the admin role away (superadmins only; never from a superadmin)",
                a,
                ADMIN,
                one("user", "AdminUser"),
                params=["user_id"],
            ),
        },
        "/admin/api/audit": {"get": op("Audit trail", a, ADMIN, listing("AuditEvent"), query=["user"])},
    }


def build() -> dict[str, Any]:
    issuer = get_settings().issuer
    _, definitions = models_json_schema(
        [(model, "validation") for model in REQUEST_MODELS], ref_template="#/components/schemas/{model}"
    )
    request_schemas: dict[str, Any] = definitions.get("$defs", {})
    scopes = {
        "openid": "Sign-in",
        "profile": "Name and picture",
        "email": "Email address",
        "phone": "Phone number",
        "address": "Postal address",
        "offline_access": "Refresh tokens",
        "developer": "The developer API",
        "admin": "The admin API (admin role and a second factor at sign-in)",
        "organizations:read": "Read the person's organizations and their members",
        "organizations:manage": "Change them, as the person's role allows",
    }
    return {
        "openapi": "3.1.0",
        "info": {"title": f"{get_settings().brand_name or 'Identity provider'} API", "version": "1"},
        "servers": [{"url": issuer}],
        "tags": [
            {"name": "OAuth and OpenID Connect"},
            {"name": "Developer API"},
            {"name": "Admin API"},
            {"name": "Organizations API"},
        ],
        "paths": paths(),
        "components": {
            "schemas": {**request_schemas, **RESPONSE_SCHEMAS},
            "securitySchemes": {
                "oauth2": {
                    "type": "oauth2",
                    "flows": {
                        "authorizationCode": {
                            "authorizationUrl": f"{issuer}/oauth/authorize",
                            "tokenUrl": f"{issuer}/oauth/token",
                            "refreshUrl": f"{issuer}/oauth/token",
                            "scopes": scopes,
                        },
                        "clientCredentials": {
                            "tokenUrl": f"{issuer}/oauth/token",
                            "scopes": {"organizations:read": scopes["organizations:read"]},
                        },
                    },
                },
                "bearer": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
                "clientBasic": {"type": "http", "scheme": "basic"},
            },
        },
    }


@bp.get("/openapi.json")
def openapi_json() -> Response:
    response = jsonify(build())
    response.cache_control.public = True
    response.cache_control.max_age = 300
    return response
