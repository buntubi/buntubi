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

from idp.config import get_settings
from idp.web import admin, developer

bp = Blueprint("openapi", __name__)

# Routes deliberately left out: the provider's own sign-in pages and the JSON endpoints they
# call, which are not an integration surface.
INTERNAL = {("POST", "/oauth/authorize")}
DESCRIBED_PREFIXES = ("/.well-known/", "/oauth/", "/developer/api/", "/admin/api/")

REQUEST_MODELS: list[type[BaseModel]] = [
    developer.OrganizationIn,
    developer.OrganizationPatch,
    developer.AppIn,
    developer.AppPatch,
    developer.TestUserIn,
    developer.KeyIn,
    developer.MemberIn,
    developer.MemberPatch,
    admin.ClientIn,
    admin.ClientPatch,
    admin.ReviewIn,
    admin.SuspendIn,
    admin.ScopeIn,
    admin.ScopePatch,
    admin.ProductIn,
    admin.ProductPatch,
]

# ── Schemas ───────────────────────────────────────────────────────────────────────────────────

STRING: dict[str, Any] = {"type": "string"}
INT: dict[str, Any] = {"type": "integer"}
BOOL: dict[str, Any] = {"type": "boolean"}
TIME: dict[str, Any] = {"type": "string", "format": "date-time"}
MAYBE_TIME: dict[str, Any] = {"type": ["string", "null"], "format": "date-time"}
MAYBE_STRING: dict[str, Any] = {"type": ["string", "null"]}
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
ROLE: dict[str, Any] = {"type": "string", "enum": ["owner", "admin", "developer", "reviewer", "viewer"]}


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
    "Me": obj({"email": STRING, "name": STRING, "developer": BOOL, "developer_since": MAYBE_TIME}),
    "Organization": obj(
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
    "AppOverview": obj(
        {
            "stage": {"type": "string", "enum": ["draft", "in_review", "changes_requested", "live"]},
            "checks": {
                "type": "array",
                "items": obj(
                    {
                        "key": {
                            "type": "string",
                            "enum": [
                                "basic_info",
                                "redirect_uri",
                                "products",
                                "policies",
                                "support_email",
                                "permissions",
                                "review",
                            ],
                        },
                        "state": {"type": "string", "enum": ["done", "warn", "todo"]},
                        "items": STRINGS,
                        "required": BOOL,
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
    "Member": obj(
        {
            "id": STRING,
            "email": STRING,
            "name": STRING,
            "role": ROLE,
            "apps": STRINGS,
            "added_at": TIME,
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
            "disabled": BOOL,
            "organization_id": MAYBE_STRING,
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
            "roles": STRINGS,
            "developer": BOOL,
            "mfa": BOOL,
            "disabled": BOOL,
            "created_at": TIME,
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
        }
    ),
    "AdminProduct": obj(
        {
            **PRODUCT_FIELDS,
            "position": INT,
            "scopes": STRINGS,
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
    }
)

# ── Operations ────────────────────────────────────────────────────────────────────────────────

Security = list[dict[str, list[str]]]

DEVELOPER: Security = [{"oauth2": ["developer"]}, {"bearer": []}]
ADMIN: Security = [{"oauth2": ["admin"]}, {"bearer": []}]
CLIENT: Security = [{"clientBasic": []}]
SIGNED_IN: Security = [{"oauth2": ["openid"]}, {"bearer": []}]


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
        "/oauth/logout": {
            "get": op(
                "End the browser session (RP-initiated logout)",
                oidc,
                None,
                {
                    "302": answer(
                        None, "To post_logout_redirect_uri when registered, else the signed-out page"
                    )
                },
                query=["id_token_hint", "post_logout_redirect_uri", "state"],
            )
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
                "Add a member (an existing account)",
                d,
                DEVELOPER,
                one("member", "Member", "201"),
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
        "/developer/api/organizations/{organization_id}/apps": {
            "post": op(
                "Create an app (sandbox)",
                d,
                DEVELOPER,
                with_secret("app", "App", "client_secret"),
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
                {"200": answer(obj({"app": ref("App"), "role": ROLE}))},
                params=["client_id"],
            ),
            "patch": op(
                "Change an app",
                d,
                DEVELOPER,
                one("app", "App"),
                request=body(ref("AppPatch")),
                params=["client_id"],
            ),
            "delete": op(
                "Delete an app", d, DEVELOPER, {"200": answer(obj({"deleted": BOOL}))}, params=["client_id"]
            ),
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
                "Ask to go live: live at once, or pending review for sensitive scopes",
                d,
                DEVELOPER,
                {
                    "200": answer(
                        obj({"state": {"type": "string", "enum": ["live", "pending"]}, "app": ref("App")})
                    )
                },
                params=["client_id"],
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
            "post": op(
                "Approve or reject an app (a rejection needs a note)",
                a,
                ADMIN,
                one("app", "Review"),
                request=body(ref("ReviewIn")),
                params=["client_id"],
            )
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
        "/admin/api/clients/{client_id}": {
            "patch": op(
                "Change a client",
                a,
                ADMIN,
                one("client", "AdminClient"),
                request=body(ref("ClientPatch")),
                params=["client_id"],
            )
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
        "/admin/api/users": {"get": op("Users", a, ADMIN, listing("AdminUser"), query=["q", "before"])},
        "/admin/api/users/{user_id}": {
            "get": op("A user", a, ADMIN, one("user", "AdminUser"), params=["user_id"])
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
        "offline_access": "Refresh tokens",
        "developer": "The developer API",
        "admin": "The admin API (admin role and a second factor at sign-in)",
    }
    return {
        "openapi": "3.1.0",
        "info": {"title": f"{get_settings().brand_name or 'Identity provider'} API", "version": "1"},
        "servers": [{"url": issuer}],
        "tags": [
            {"name": "OAuth and OpenID Connect"},
            {"name": "Developer API"},
            {"name": "Admin API"},
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
                        "clientCredentials": {"tokenUrl": f"{issuer}/oauth/token", "scopes": {}},
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
