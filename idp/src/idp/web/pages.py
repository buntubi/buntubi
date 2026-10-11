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

from idp import plugins
from idp.config import get_settings
from idp.db import db
from idp.models import UserPicture
from idp.oauth.server import authorization, query_client
from idp.security import csrf
from idp.services import passkeys, platform, sessions

bp = Blueprint("pages", __name__)

LOCALES = ("fr", "en")


def _locale() -> str:
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
        "locale": _locale(),
        "csrf": csrf.token(),
        "brand": _brand(),
        # The platform's own policies, linked under its pages.
        "links": {
            key: value for key, value in get_settings().brand().items() if key in ("privacy_url", "terms_url")
        },
        "props": props,
    }
    return render_template("shell.html", config=config, locale=config["locale"], scheme=_scheme())


@bp.get("/")
def home() -> Response:
    return redirect(url_for("pages.account"))


@bp.get("/signin")
def signin() -> str:
    return shell("idp-sign-in")


@bp.get("/signup")
def signup() -> str:
    return shell("idp-sign-up")


@bp.get("/verify-email")
def verify_email() -> Any:
    pending = sessions.pending("verify_email")
    if pending is None:
        return redirect(url_for("pages.signin"))
    return shell("idp-verify-email", email=pending.user.email)


@bp.get("/mfa")
def mfa_step() -> Any:
    pending = sessions.pending("mfa")
    if pending is None:
        return redirect(url_for("pages.signin"))
    # A passkey of this person's also answers the second step.
    return shell("idp-mfa-verify", passkey=bool(passkeys.list_for(pending.user)))


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
    )


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
