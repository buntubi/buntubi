"""
The OAuth 2.1 / OpenID Connect endpoints: discovery, keys, authorize, token, revocation,
introspection, userinfo, device authorization and logout.
"""

import uuid
from collections.abc import Callable
from functools import wraps
from typing import Any
from urllib.parse import urlencode

from authlib.oauth2 import OAuth2Error
from authlib.oauth2.rfc6749 import scope_to_list
from flask import Blueprint, Response, abort, g, jsonify, redirect, request, url_for
from joserfc import jwt as jose_jwt
from joserfc.errors import JoseError
from sqlalchemy import text

from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.extensions import limiter
from buntubi.oauth.claims import SCOPES, user_claims
from buntubi.oauth.grants import GRANT_TYPES_SUPPORTED
from buntubi.oauth.server import authorization, key_ring, query_client, require_token, scopes_of
from buntubi.security import csrf
from buntubi.security.keys import ALGORITHM
from buntubi.services import audit, consent, mfa, passkeys, platform, session_check, sessions
from buntubi.web import pages

bp = Blueprint("oidc", __name__)


@bp.get("/healthz")
@limiter.exempt
def healthz() -> Response:
    """For the container and the load balancer: up when the database answers. Says nothing else."""
    try:
        db().execute(text("select 1"))
    except Exception:
        db().rollback()
        return Response("unavailable", status=503, mimetype="text/plain")
    return Response("ok", mimetype="text/plain")


@bp.get("/.well-known/openid-configuration")
def discovery() -> Response:
    issuer = get_settings().issuer
    return jsonify(
        issuer=issuer,
        authorization_endpoint=f"{issuer}/oauth/authorize",
        token_endpoint=f"{issuer}/oauth/token",
        userinfo_endpoint=f"{issuer}/oauth/userinfo",
        jwks_uri=f"{issuer}/.well-known/jwks.json",
        revocation_endpoint=f"{issuer}/oauth/revoke",
        introspection_endpoint=f"{issuer}/oauth/introspect",
        device_authorization_endpoint=f"{issuer}/oauth/device_authorization",
        end_session_endpoint=f"{issuer}/oauth/logout",
        backchannel_logout_supported=True,
        backchannel_logout_session_supported=True,
        check_session_iframe=f"{issuer}/oauth/check-session",
        scopes_supported=list(SCOPES),
        response_types_supported=["code"],
        response_modes_supported=["query"],
        grant_types_supported=list(GRANT_TYPES_SUPPORTED),
        subject_types_supported=["public"],
        id_token_signing_alg_values_supported=["RS256"],
        token_endpoint_auth_methods_supported=["client_secret_basic", "client_secret_post", "none"],
        revocation_endpoint_auth_methods_supported=["client_secret_basic", "client_secret_post", "none"],
        introspection_endpoint_auth_methods_supported=["client_secret_basic", "client_secret_post"],
        code_challenge_methods_supported=["S256"],
        authorization_response_iss_parameter_supported=True,
        # Said outright: an absent request_uri_parameter_supported means true (OIDC Discovery 3).
        request_parameter_supported=False,
        request_uri_parameter_supported=False,
        claims_parameter_supported=False,
        prompt_values_supported=["none", "login", "consent", "select_account"],
        claims_supported=[
            "sub",
            "iss",
            "aud",
            "exp",
            "iat",
            "auth_time",
            "nonce",
            "amr",
            "sid",
            "name",
            "given_name",
            "family_name",
            "locale",
            "picture",
            "updated_at",
            "email",
            "email_verified",
            "phone_number",
            "phone_number_verified",
            "address",
        ],
    )


@bp.get("/.well-known/jwks.json")
def jwks() -> Response:
    response = jsonify(key_ring().jwks())
    response.cache_control.max_age = 300
    response.cache_control.public = True
    return response


@bp.get("/.well-known/brand.json")
def brand() -> Response:
    """Name, accent, logo and contact links of the platform, for the portal and the console."""
    response = jsonify(get_settings().brand())
    response.cache_control.max_age = 300
    response.cache_control.public = True
    return response


@bp.get("/oauth/authorize")
def authorize() -> Any:
    login = sessions.current()
    prompt = set((request.args.get("prompt") or "").split())
    try:
        grant = authorization.get_consent_grant(end_user=login.user if login else None)
    except OAuth2Error as error:
        response = authorization.handle_error_response(request, error)
        # Set only once the redirect URI was checked against the client's registered ones.
        if getattr(error, "redirect_uri", None):
            response = _with_session_state(response, request.args.get("client_id", ""))
        return response

    # OIDC Core 6: request objects are not supported, and refused as such rather than ignored,
    # which would drop the state and nonce they carry.
    for parameter in ("request", "request_uri"):
        if request.args.get(parameter):
            return _error_redirect(grant, f"{parameter}_not_supported")

    if login is None or "login" in prompt or _too_old(login):
        if "none" in prompt:
            return _error_redirect(grant, "login_required")
        sessions.remember_return_to(_authorize_path(drop_prompt=True))
        return redirect(url_for("pages.signin"))

    # Some scopes need a second factor at sign-in (the console's `admin`). A session signed in
    # without one, for instance before two-step was turned on, is asked for the code here and
    # comes back, rather than being handed a token the app will refuse.
    if _needs_second_factor(login, request.args.get("scope", "")):
        if "none" in prompt:
            return _error_redirect(grant, "interaction_required")
        sessions.set_pending(login.user, list(login.auth_methods), "mfa", replaces=str(login.id))
        sessions.remember_return_to(_authorize_path(drop_prompt=True))
        return redirect(url_for("pages.mfa_step"))

    if "select_account" in prompt:
        sessions.remember_return_to(_authorize_path(drop_prompt=True))
        return redirect(url_for("pages.accounts"))

    # A sandbox app is open to its organization's test users only; anyone else is told so here.
    if not platform.may_sign_in(grant.client, login.user):
        if "none" in prompt:
            return _error_redirect(grant, "access_denied")
        audit.record("authorize_blocked", user=login.user, client=grant.client)
        db().commit()
        return pages.blocked(grant.client)

    organization_id, answer = _organization_for(grant, login.user, prompt)
    if answer is not None:
        return answer

    scope = grant.request.payload.scope or ""
    if "consent" in prompt or consent.is_needed(login.user, grant.client, scope, organization_id):
        if "none" in prompt:
            return _error_redirect(grant, "consent_required")
        query = _query(drop_prompt=True)
        if organization_id is not None:
            # Picked here when there was a single one: the consent screen and its answer name it.
            query["organization"] = str(organization_id)
        return redirect(url_for("pages.consent") + "?" + urlencode(query))

    g.login = login
    g.organization_id = organization_id
    response = _with_session_state(
        authorization.create_authorization_response(grant_user=login.user, grant=grant),
        grant.client.client_id,
    )
    audit.record("authorize", user=login.user, client=grant.client)
    db().commit()
    return response


@bp.post("/oauth/authorize")
def authorize_decision() -> Any:
    """The consent screen's answer, as JSON: {"approve": true|false}. Replies with where to go."""
    csrf.protect()
    if sessions.acting_for_another():
        return jsonify(error="account_changed"), 409
    login = sessions.current()
    if login is None:
        abort(401)
    approve = bool((request.get_json(silent=True) or {}).get("approve"))
    try:
        grant = authorization.get_consent_grant(end_user=login.user)
    except OAuth2Error as error:
        return jsonify(error=error.error), 400
    if not platform.may_sign_in(grant.client, login.user):
        return jsonify(error="app_in_sandbox"), 403
    organization_id, answer = _organization_for(grant, login.user, {"none"})
    if answer is not None:
        return jsonify(error="organization_refused"), 403
    if approve:
        consent.record(login.user, grant.client, grant.request.payload.scope or "", organization_id)
        g.login = login
        g.organization_id = organization_id
        g.consented_now = True  # the person saw and approved this request's scopes, offline_access too
        response = authorization.create_authorization_response(grant_user=login.user, grant=grant)
    else:
        response = authorization.create_authorization_response(grant_user=None, grant=grant)
    audit.record("consent", user=login.user, client=grant.client, approved=approve)
    db().commit()
    return jsonify(redirect=_with_session_state(response, grant.client.client_id).headers["Location"])


@bp.post("/oauth/token")
@limiter.limit("60 per minute")
def token() -> Response:
    response = authorization.create_token_response()
    # Committed even for a refused request: a detected refresh-token reuse revokes its family.
    db().commit()
    return response


@bp.post("/oauth/revoke")
def revoke() -> Response:
    response = authorization.create_endpoint_response("revocation")
    db().commit()
    return response


@bp.post("/oauth/introspect")
def introspect() -> Response:
    response = authorization.create_endpoint_response("introspection")
    # An API key check records when the key was last used.
    db().commit()
    return response


@bp.post("/oauth/device_authorization")
@limiter.limit("20 per minute")
def device_authorization() -> Response:
    response = authorization.create_endpoint_response("device_authorization")
    db().commit()
    return response


def _bearer_from_body(view: Callable[..., Response]) -> Callable[..., Response]:
    """RFC 6750 2.2: a form-encoded POST may carry the token as `access_token` instead of a header."""

    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Response:
        if (
            request.method == "POST"
            and "Authorization" not in request.headers
            and request.mimetype == "application/x-www-form-urlencoded"
            and (token := request.form.get("access_token"))
        ):
            request.environ["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return view(*args, **kwargs)

    return wrapper


@bp.route("/oauth/userinfo", methods=["GET", "POST"])
@_bearer_from_body
@require_token("openid")
def userinfo() -> Response:
    from authlib.integrations.flask_oauth2 import current_token

    user = current_token.user
    if user is None or user.disabled_at is not None:
        abort(401)
    return jsonify(user_claims(user, " ".join(scopes_of(current_token))))


@bp.get("/oauth/logout")
def logout() -> Any:
    """
    RP-initiated logout. With an `id_token_hint` naming this browser's current session, it ends
    at once; otherwise (no hint, an invalid one, someone else's) the person is asked first, so a
    link from another site cannot sign them out. Then back to a registered address.
    """
    client, claims = _id_token_hint(request.args.get("id_token_hint"))
    login = sessions.current()
    if login is not None and not _names_session(claims, login):
        db().commit()
        return pages.shell("idp-logout-confirm", app=client.name if client is not None else "")
    _end(login, client)
    return redirect(_after_logout(client))


@bp.post("/oauth/logout")
def logout_confirmed() -> Any:
    """The confirmation page's answer, with the same query: ends the session, says where to go."""
    csrf.protect()
    if sessions.acting_for_another():
        return jsonify(error="account_changed"), 409
    client, _ = _id_token_hint(request.args.get("id_token_hint"))
    _end(sessions.current(), client)
    return jsonify(redirect=_after_logout(client))


def _names_session(claims: dict[str, Any] | None, login: Any) -> bool:
    """The hint is an ID token of this very sign-in (its sid), or of this account when it has none."""
    if claims is None:
        return False
    if claims.get("sid"):
        return bool(claims["sid"] == str(login.id))
    return bool(claims.get("sub") == str(login.user_id))


def _end(login: Any, client: Any) -> None:
    if login is not None:
        audit.record("logout", user=login.user, client=client)
        sessions.end(login)
        db().commit()


def _after_logout(client: Any) -> str:
    target = request.args.get("post_logout_redirect_uri")
    if target and client is not None and target in client.post_logout_redirect_uris:
        state = request.args.get("state")
        return target + (("&" if "?" in target else "?") + urlencode({"state": state}) if state else "")
    return str(url_for("pages.signed_out"))


# Scopes whose tokens are only issued to a sign-in that used the second factor.
SECOND_FACTOR_SCOPES = frozenset({"admin"})


def _needs_second_factor(login: Any, scope: str) -> bool:
    """
    A step-up is due: the scope needs it, the account has a second factor (an authenticator app
    or a passkey), this sign-in did not use it.
    """
    wanted = set(scope_to_list(scope) or [])
    return (
        bool(wanted & SECOND_FACTOR_SCOPES)
        and "mfa" not in (login.auth_methods or [])
        and (mfa.is_enabled(login.user) or bool(passkeys.list_for(login.user)))
    )


def _organization_for(grant: Any, user: Any, prompt: set[str]) -> tuple[uuid.UUID | None, Any]:
    """
    The organization the tokens will name, or the answer to give instead. A request naming one
    needs an app that works with organizations and a person in it; an app that requires one, and
    a request naming none, takes the person's only one or asks them to pick.
    """
    asked = request.args.get("organization")
    usage = grant.client.organization_usage
    if asked is not None:
        if usage == "none":
            return None, _error_redirect(grant, "invalid_request")
        member = platform.acting_membership(user, asked)
        if member is None:
            return None, _error_redirect(grant, "access_denied")
        return member.organization_id, None
    if usage != "required":
        return None, None
    choices = platform.organizations_to_act_in(user)
    if not choices:
        return None, _error_redirect(grant, "access_denied")
    if len(choices) == 1:
        return choices[0].organization_id, None
    if "none" in prompt:
        return None, _error_redirect(grant, "interaction_required")
    sessions.remember_return_to(_authorize_path(drop_prompt=True))
    return None, redirect(url_for("pages.organization"))


def _too_old(login: Any) -> bool:
    max_age = request.args.get("max_age")
    if max_age is None or not max_age.isdigit():
        return False
    return (utcnow() - login.created_at).total_seconds() > int(max_age)


def _query(drop_prompt: bool) -> dict[str, str]:
    query = request.args.to_dict()
    if drop_prompt:
        query.pop("prompt", None)
    return query


def _authorize_path(drop_prompt: bool) -> str:
    return url_for("oidc.authorize") + "?" + urlencode(_query(drop_prompt))


def _error_redirect(grant: Any, error: str) -> Any:
    params = {"error": error}
    if state := grant.request.payload.state:
        params["state"] = state
    params["iss"] = get_settings().issuer
    uri = grant.request.payload.redirect_uri
    # A refusal carries it too: an app told "nobody signed in" watches for someone who does.
    params["session_state"] = session_check.session_state(grant.client.client_id, uri)
    return redirect(uri + ("&" if "?" in uri else "?") + urlencode(params))


def _with_session_state(response: Any, client_id: str) -> Any:
    """
    Adds `session_state` to an authorization answer that goes back to the app, and `iss`
    (RFC 9207), so an app that talks to several providers knows which one answered.
    """
    location = response.headers.get("Location")
    if location and response.status_code in (301, 302, 303, 307):
        state = session_check.session_state(client_id, location)
        response.headers["Location"] = (
            location
            + ("&" if "?" in location else "?")
            + urlencode({"session_state": state, "iss": get_settings().issuer})
        )
    return response


@bp.get("/oauth/check-session")
def check_session() -> Response:
    """The OP iframe of Session Management: any app may embed it; it shows nothing."""
    response = Response(session_check.PAGE, mimetype="text/html")
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; script-src 'self'; frame-ancestors *; base-uri 'none'"
    )
    return response


@bp.get("/oauth/check-session.js")
def check_session_script() -> Response:
    response = Response(session_check.SCRIPT, mimetype="text/javascript")
    response.cache_control.max_age = 300
    response.cache_control.public = True
    return response


def _id_token_hint(hint: str | None) -> tuple[Any, dict[str, Any] | None]:
    """
    The client an ID token we issued was for, and its claims. Expired is fine here (a logout may
    come long after the sign-in); a bad signature, another algorithm or another issuer is not.
    """
    if not hint:
        return None, None
    try:
        token = jose_jwt.decode(hint, lambda obj: _key_for(obj.headers().get("kid")), algorithms=[ALGORITHM])
    except (JoseError, ValueError):
        return None, None
    if token.claims.get("iss") != get_settings().issuer:
        return None, None
    audience = token.claims.get("aud")
    client_id = audience[0] if isinstance(audience, list) else audience
    client = query_client(client_id) if isinstance(client_id, str) else None
    return client, (dict(token.claims) if client is not None else None)


def _key_for(kid: str | None) -> Any:
    found = key_ring().find(kid) if kid else None
    if found is None:
        raise ValueError("unknown key")
    return found.key


def supported_scopes(scope: str) -> list[str]:
    return [s for s in (scope_to_list(scope) or []) if s in SCOPES]
