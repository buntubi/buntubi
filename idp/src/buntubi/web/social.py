"""
Social sign-in in the browser: off to the provider, back at the callback, then on as any sign-in
goes (the second step when the account has one, then the app's own request).
"""

from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

from flask import Blueprint, Response, abort, jsonify, redirect, request, url_for
from werkzeug.wrappers import Response as WerkzeugResponse

from buntubi import social
from buntubi.db import db
from buntubi.extensions import limiter
from buntubi.models import User
from buntubi.security import csrf
from buntubi.services import login_hint, mfa, passkeys, profile_fields, sessions
from buntubi.services import social as flow
from buntubi.services.accounts import AccountError
from buntubi.web import api, pages

bp = Blueprint("social", __name__)


@bp.before_request
def _csrf() -> Response | None:
    csrf.protect()
    # As for the account API: a page opened for another account than the current one changes nothing.
    if request.method not in ("GET", "HEAD", "OPTIONS") and sessions.acting_for_another():
        return jsonify(error="account_changed"), 409  # type: ignore[return-value]
    return None


# How a provider's sign-in shows in the session's `amr`: a federated one.
METHODS = ["fed"]


@bp.get("/signin/<provider_id>")
@limiter.limit("20 per minute")
def start(provider_id: str) -> WerkzeugResponse:
    """Off to the provider. With `connect`, links it to the signed-in account instead."""
    provider = social.get(provider_id)
    if request.args.get("connect"):
        login = sessions.current()
        if provider is None or not provider.configured() or login is None:
            abort(404)
        return redirect(flow.begin(provider, link_to=login.user))
    if provider is None or provider not in flow.offered():
        abort(404)
    return redirect(flow.begin(provider, login_hint=login_hint.from_request()))


@bp.get("/signin/<provider_id>/callback")
@limiter.limit("20 per minute")
def callback(provider_id: str) -> WerkzeugResponse:
    provider = social.get(provider_id)
    if provider is None:
        abort(404)
    login = sessions.current()
    args = {key: request.args.get(key, "") for key in ("state", "code", "error")}
    outcome = flow.finish(provider, args, login.user if login else None, pages.locale())
    if outcome.kind == flow.LINKED:
        db().commit()
        return redirect(f"{url_for('pages.account')}/security?{urlencode({'connected': provider.id})}")
    if outcome.kind == flow.NEEDS_PROFILE:
        db().commit()
        return redirect(url_for("social.complete_page"))
    if outcome.kind == flow.SIGNED_IN and outcome.user is not None:
        return redirect(_after_provider(outcome.user))
    db().commit()
    where = f"{url_for('pages.account')}/security" if outcome.linking else url_for("pages.signin")
    return redirect(f"{where}?{urlencode({'social_error': outcome.kind, 'provider': provider.id})}")


@bp.get("/signup/complete")
def complete_page() -> Any:
    found = flow.waiting()
    if found is None:
        return redirect(url_for("pages.signin"))
    required = [key for key, mode in profile_fields.shown().items() if mode == "required"]
    return pages.shell("idp-complete-profile", fields=required, email=found.email, provider=found.provider)


@bp.post("/api/signup/complete")
@limiter.limit("5 per minute")
def complete() -> Any:
    data = request.get_json(silent=True)
    data = data if isinstance(data, dict) else {}
    outcome = flow.complete({k: v for k, v in data.items() if isinstance(k, str)}, pages.locale())
    if outcome.kind == flow.SIGNED_IN and outcome.user is not None:
        return jsonify(redirect=_after_provider(outcome.user))
    db().commit()
    return jsonify(error=outcome.kind), 400


@bp.get("/api/account/identities")
def identities() -> Response:
    user = _me()
    linked = flow.identities_of(user)
    return jsonify(
        identities=[
            {
                "id": str(identity.id),
                "provider": identity.provider,
                "email": identity.email,
                "created_at": identity.created_at.isoformat(),
                "last_used_at": identity.last_used_at.isoformat() if identity.last_used_at else None,
            }
            for identity in linked
        ],
        # What can still be connected: the configured providers not linked yet.
        available=[
            {"id": p.id, "label": p.label}
            for pid in social.SOCIAL_PROVIDERS
            if (p := social.get(pid)) and p.configured() and pid not in {i.provider for i in linked}
        ],
        has_password=user.password_hash is not None,
    )


@bp.delete("/api/account/identities/<identity_id>")
def unlink(identity_id: str) -> Response:
    user = _me()
    flow.unlink(user, identity_id)
    db().commit()
    return jsonify(removed=True)


@bp.errorhandler(AccountError)
def _refused(error: AccountError) -> tuple[Response, int]:
    db().rollback()
    return jsonify(error=error.code), 400


def _after_provider(user: User) -> str:
    """The second step when the account has one, else signed in; a provider never stands for it."""
    if mfa.is_enabled(user) or passkeys.list_for(user):
        sessions.set_pending(user, METHODS, "mfa")
        db().commit()
        return url_for("pages.mfa_step")
    return api.complete_sign_in(user, METHODS, "sign_in")


def _me() -> User:
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    return login.user
