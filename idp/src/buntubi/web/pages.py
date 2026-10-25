"""
The screens: one shell page each, naming the custom element to mount and its configuration. All
behaviour is in the elements (frontend/); these routes only decide which one, in which language,
with which client's brand.
"""

import json
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from authlib.oauth2 import OAuth2Error
from authlib.oauth2.rfc6749 import scope_to_list
from flask import Blueprint, abort, redirect, render_template, request, session, url_for
from werkzeug.wrappers import Response

from buntubi import plugins
from buntubi import social as social_sign_in
from buntubi.config import get_settings
from buntubi.db import db
from buntubi.models import UserPicture
from buntubi.oauth.server import authorization, query_client
from buntubi.security import csrf
from buntubi.services import (
    login_hint,
    mfa,
    passkeys,
    platform,
    profile_fields,
    security_prompt,
    sessions,
    social,
)
from buntubi.web import ui_plugins

bp = Blueprint("pages", __name__)

LOCALES = ("fr", "en")


def locale() -> str:
    chosen = request.args.get("lang") or session.get("lang")
    if chosen in LOCALES:
        session["lang"] = chosen
        return chosen
    return request.accept_languages.best_match(LOCALES) or "fr"


def _resumed_client() -> Any:
    """The client of the authorization request this page will resume, if any."""
    return_to = session.get("return_to") or request.full_path
    client_id = parse_qs(urlparse(return_to).query).get("client_id", [None])[0]
    return query_client(client_id) if client_id else None


def _brand() -> dict[str, Any]:
    """The look of the client this sign-in is for, from the authorization request being resumed."""
    client = _resumed_client()
    if client is not None:
        return plugins.page_brand(client, {"name": client.name, **client.brand})
    platform = get_settings().brand()
    return plugins.page_brand(
        None, {key: platform[key] for key in ("name", "accent", "logo") if key in platform}
    )


# Where every provider page keeps the reader's light or dark choice (@idp/theme's schemeKey).
SCHEME_COOKIE = "idp-scheme"


def _scheme() -> str | None:
    """The saved light or dark choice, so the page is drawn in it before any script runs."""
    try:
        # Written by the browser URL-encoded.
        saved = json.loads(unquote(request.cookies.get(SCHEME_COOKIE, "")))
    except ValueError:
        return None
    value = saved.get("value") if isinstance(saved, dict) else saved
    return value if value in ("light", "dark") else None


def shell(element: str, *, account: bool = False, **props: Any) -> str:
    config = {
        "element": element,
        # The account area wears the platform's own look, whichever app the person came from.
        "account": account,
        "locale": locale(),
        "csrf": csrf.token(),
        # The session the page is opened for: requests declare it, and a switch since is refused.
        "session": sessions.current_id(),
        "brand": _brand(),
        # The platform's own policies, linked under its pages.
        "links": {
            key: value for key, value in get_settings().brand().items() if key in ("privacy_url", "terms_url")
        },
        "props": props,
    }
    plugins = ui_plugins.current()
    return render_template(
        "shell.html",
        config=config,
        locale=config["locale"],
        scheme=_scheme(),
        import_map=plugins.import_map,
        ui_plugin_index=plugins.index() if plugins.plugins else None,
    )


@bp.get("/")
def home() -> Response:
    return redirect(url_for("pages.account"))


def _social_props() -> dict[str, Any]:
    """The providers this page offers, and why the last round trip to one ended, if it did."""
    error = request.args.get("social_error")
    provider = social_sign_in.get(request.args.get("provider", ""))
    return {
        "social": [{"id": p.id, "label": p.label} for p in social.offered()],
        "socialError": error if error in social.REFUSALS else None,
        "socialProvider": provider.label if provider else None,
    }


@bp.get("/signin")
def signin() -> str:
    # The address an app named for the person, if any, as the form's starting email.
    return shell("idp-sign-in", email=login_hint.from_request(), **_social_props())


@bp.get("/signup")
def signup() -> str:
    # The fields the platform requires, asked on the form with name and email.
    required = [key for key, mode in profile_fields.shown().items() if mode == "required"]
    return shell(
        "idp-sign-up",
        email=login_hint.from_request(),
        fields=required,
        # Closed: the page says sign-up is by invitation; an invited address still goes through.
        signupOpen=social.signup_allowed(None),
        **_social_props(),
    )


@bp.get("/verify-email")
def verify_email() -> Any:
    pending = sessions.pending("verify_email")
    email = pending.user.email if pending else sessions.existing_sign_up()
    if email is None:
        return redirect(url_for("pages.signin"))
    return shell("idp-verify-email", email=email)


@bp.get("/mfa")
def mfa_step() -> Any:
    pending = sessions.pending("mfa")
    if pending is None:
        return redirect(url_for("pages.signin"))
    # A passkey of this person's also answers the second step; without an app there is no code.
    return shell(
        "idp-mfa-verify",
        passkey=bool(passkeys.list_for(pending.user)),
        code=mfa.is_enabled(pending.user),
    )


@bp.get("/forgot-password")
def forgot_password() -> str:
    return shell("idp-forgot-password")


@bp.get("/reset-password")
def reset_password() -> str:
    # The token stays in the page's own state; this response is not cached and sends no Referer.
    return shell("idp-reset-password", token=request.args.get("token", ""))


@bp.get("/consent")
def consent() -> Any:
    """What the authorization request in the query asks for; the answer goes to POST /oauth/authorize."""
    login = sessions.current()
    if login is None:
        return redirect(url_for("pages.signin"))
    try:
        grant = authorization.get_consent_grant(end_user=login.user)
    except OAuth2Error as error:
        if not getattr(error, "redirect_uri", None):
            return authorize_error(error)
        return authorization.handle_error_response(request, error)
    client = grant.client
    organization = client.organization
    return shell(
        "idp-consent",
        client={
            "name": client.name,
            "logo": client.brand.get("logo"),
            "verified": platform.is_verified(client),
            "homepage": client.homepage_url,
            "privacy": client.privacy_url,
            "terms": client.terms_url,
            "support_email": organization.support_email if organization is not None else None,
        },
        scopes=scope_to_list(grant.request.payload.scope or "") or [],
        email=login.user.email,
        # The organization the access is for, when the request names one the person is in.
        organization=acting.organization.name
        if (acting := platform.acting_membership(login.user, request.args.get("organization")))
        else None,
    )


def authorize_error(error: Any) -> tuple[str, int]:
    """
    An authorization request that cannot go back to its app: an unknown or disabled app, or a
    redirect URI it did not register. Only the error code is shown, never what the request
    carried, so the page cannot be made to say something of an attacker's.
    """
    return shell("idp-authorize-error", error=str(error.error)), 400


def blocked(client: Any) -> tuple[str, int]:
    """A sandbox app the signed-in person may not use: who to ask, rather than a bare error."""
    organization = client.organization
    return (
        shell(
            "idp-blocked",
            client={"name": client.name},
            support_email=organization.support_email if organization is not None else None,
        ),
        403,
    )


@bp.get("/organization")
def organization() -> Any:
    """The organizations an app that requires one may act in; the choice resumes its request."""
    login = sessions.current()
    if login is None:
        return redirect(url_for("pages.signin"))
    client = _resumed_client()
    return shell(
        "idp-organization-select",
        organizations=[
            {"id": str(m.organization_id), "name": m.organization.name, "role": m.role}
            for m in platform.organizations_to_act_in(login.user)
        ],
        client=client.name if client is not None else None,
    )


@bp.get("/accounts")
def accounts() -> str:
    logins = sessions.all_signed_in()
    db().commit()
    client = _resumed_client()
    return shell(
        "idp-account-select",
        accounts=[
            {"id": str(a.id), "email": a.user.email, "name": a.user.name, "picture": a.user.picture}
            for a in logins
        ],
        # The app that will see the chosen account.
        client=client.name if client is not None else None,
    )


@bp.get("/secure-account")
def secure_account() -> Any:
    """Once after signing up: a passkey or two-step sign-in, or not now."""
    login = sessions.current()
    db().commit()
    if login is None:
        return redirect(url_for("pages.signin"))
    if not security_prompt.applies(login.user):
        return redirect(sessions.take_return_to(url_for("pages.account")))
    return shell("idp-secure-account")


@bp.get("/account")
@bp.get("/account/<path:section>")
def account(section: str = "") -> Any:
    """The person's own account area: one app, its pages routed in the browser."""
    login = sessions.current()
    db().commit()
    if login is None:
        sessions.remember_return_to(request.full_path.rstrip("?"))
        return redirect(url_for("pages.signin"))
    return shell("idp-account-app", account=True)


@bp.get("/avatars/<uuid:user_id>")
def avatar(user_id: Any) -> Any:
    """A person's photo, public as the `picture` claim is; its address changes with it."""
    row = db().get(UserPicture, user_id)
    if row is None:
        abort(404)
    response = Response(row.data, mimetype=row.content_type)
    response.cache_control.public = True
    response.cache_control.max_age = 31_536_000
    response.cache_control.immutable = True
    return response


@bp.get("/device")
def device() -> Any:
    if sessions.current() is None:
        sessions.remember_return_to(request.full_path)
        return redirect(url_for("pages.signin"))
    db().commit()
    return shell("idp-device-activate", user_code=request.args.get("user_code", ""))


@bp.get("/signed-out")
def signed_out() -> str:
    return shell("idp-signed-out")
