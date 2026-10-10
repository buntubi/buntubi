"""
The screens: one shell page each, naming the custom element to mount and its configuration. All
behaviour is in the elements (frontend/); these routes only decide which one, in which language,
with which client's brand.
"""

from typing import Any
from urllib.parse import parse_qs, urlparse

from authlib.oauth2 import OAuth2Error
from authlib.oauth2.rfc6749 import scope_to_list
from flask import Blueprint, redirect, render_template, request, session, url_for
from werkzeug.wrappers import Response

from idp import plugins
from idp.config import get_settings
from idp.db import db
from idp.oauth.server import authorization, query_client
from idp.security import csrf
from idp.services import platform, sessions

bp = Blueprint("pages", __name__)

LOCALES = ("fr", "en")


def _locale() -> str:
    chosen = request.args.get("lang") or session.get("lang")
    if chosen in LOCALES:
        session["lang"] = chosen
        return chosen
    return request.accept_languages.best_match(LOCALES) or "fr"


def _brand() -> dict[str, Any]:
    """The look of the client this sign-in is for, from the authorization request being resumed."""
    return_to = session.get("return_to") or request.full_path
    client_id = parse_qs(urlparse(return_to).query).get("client_id", [None])[0]
    client = query_client(client_id) if client_id else None
    if client is not None:
        return plugins.page_brand(client, {"name": client.name, **client.brand})
    platform = get_settings().brand()
    return plugins.page_brand(
        None, {key: platform[key] for key in ("name", "accent", "logo") if key in platform}
    )


def shell(element: str, *, account: bool = False, **props: Any) -> str:
    config = {
        "element": element,
        # The account area wears the platform's own look, whichever app the person came from.
        "account": account,
        "locale": _locale(),
        "csrf": csrf.token(),
        "brand": _brand(),
        "props": props,
    }
    return render_template("shell.html", config=config, locale=config["locale"])


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
    if sessions.pending("mfa") is None:
        return redirect(url_for("pages.signin"))
    return shell("idp-mfa-verify")


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
    return shell(
        "idp-account-select",
        accounts=[{"id": str(a.id), "email": a.user.email, "name": a.user.name} for a in logins],
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
