"""
The JSON endpoints the sign-in screens call. Every state change is CSRF-checked; every credential
check is rate-limited. Errors are {"error": "<code>"}, which the screens translate.
"""

import re
import uuid
from datetime import datetime, timedelta
from typing import Any

from flask import Blueprint, Response, jsonify, request, url_for
from sqlalchemy import func, select

from idp.config import get_settings
from idp.db import db, utcnow
from idp.extensions import limiter
from idp.models import Consent, DeviceCode, LoginSession, User
from idp.security import csrf
from idp.security.passwords import verify_password
from idp.security.tokens import normalize_user_code
from idp.services import (
    accounts,
    activity,
    audit,
    closing,
    connected,
    mail,
    mfa,
    own_apps,
    passkeys,
    platform,
    profile,
    sessions,
)
from idp.services.accounts import AccountError, NewAccount

bp = Blueprint("api", __name__, url_prefix="/api")

# Wrong second-factor codes allowed in one sign-in before it starts over from the password.
MAX_MFA_FAILURES = 5


@bp.before_request
def _csrf() -> None:
    csrf.protect()


@bp.errorhandler(AccountError)
def _refused(error: AccountError) -> tuple[Response, int]:
    db().rollback()
    return jsonify(error=error.code), 400


@bp.errorhandler(mail.MailError)
def _mail_failed(error: mail.MailError) -> tuple[Response, int]:
    # Nothing is kept: a sign-up whose code never left can be made again once email works.
    db().rollback()
    return jsonify(error="email_not_sent"), 503


def _body() -> dict[str, Any]:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _text(data: dict[str, Any], key: str, limit: int = 320) -> str:
    value = data.get(key, "")
    return value[:limit] if isinstance(value, str) else ""


def _signed_in(user: User, methods: list[str], event: str) -> Response:
    sessions.start(user, methods)
    audit.record(event, user=user, methods=methods)
    db().commit()
    return jsonify(redirect=sessions.take_return_to(url_for("pages.account")))


def _needs_verification(user: User, methods: list[str]) -> Response:
    sessions.set_pending(user, methods, "verify_email")
    db().commit()
    return jsonify(next="verify_email", email=user.email)


def _next_step(user: User, methods: list[str], event: str) -> Response:
    """Signs in, or asks for the second factor first when the account has one."""
    if mfa.is_enabled(user):
        sessions.set_pending(user, methods, "mfa")
        db().commit()
        return jsonify(next="mfa")
    return _signed_in(user, methods, event)


def _signed_in_user() -> User:
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    return login.user


@bp.get("/session")
def session_state() -> Response:
    login = sessions.current()
    accounts_here = sessions.all_signed_in()
    db().commit()
    return jsonify(
        signed_in=login is not None,
        current=str(login.id) if login else None,
        accounts=[{"id": str(a.id), "email": a.user.email, "name": a.user.name} for a in accounts_here],
    )


@bp.post("/session")
@limiter.limit("10 per minute")
def sign_in() -> Any:
    data = _body()
    user = accounts.authenticate(_text(data, "email"), _text(data, "password", 256))
    if user is None:
        # Shown to the account's owner on their security page; the answer stays the same.
        known = accounts.user_by_email(_text(data, "email"))
        if known is not None:
            audit.record("sign_in_failed", user=known)
            db().commit()
        return jsonify(error="invalid_credentials"), 401
    if not user.email_verified:
        accounts.send_verification_code(user)
        return _needs_verification(user, ["pwd"])
    return _next_step(user, ["pwd"], "sign_in")


@bp.delete("/session")
def sign_out() -> Response:
    login = sessions.current()
    if login is not None:
        audit.record("sign_out", user=login.user)
        sessions.end(login)
        db().commit()
    return jsonify(redirect=url_for("pages.signin"))


@bp.post("/signup")
@limiter.limit("5 per minute")
def sign_up() -> Response:
    data = _body()
    user = accounts.register(
        NewAccount(
            email=_text(data, "email"),
            password=_text(data, "password", 256),
            given_name=_text(data, "given_name", 100),
            family_name=_text(data, "family_name", 100),
            locale=_text(data, "locale", 10) or "fr",
        )
    )
    audit.record("sign_up", user=user)
    return _needs_verification(user, ["pwd"])


@bp.post("/email/verify")
@limiter.limit("10 per minute")
def verify_email() -> Any:
    pending = sessions.pending("verify_email")
    if pending is None:
        return jsonify(error="no_pending_sign_in"), 400
    try:
        accounts.verify_email(pending.user, _text(_body(), "code", 12))
    except AccountError:
        db().commit()  # keep the failed attempt counted
        raise
    return _next_step(pending.user, pending.methods, "email_verified")


@bp.post("/email/resend")
@limiter.limit("3 per minute")
def resend_code() -> Any:
    pending = sessions.pending("verify_email")
    if pending is None:
        return jsonify(error="no_pending_sign_in"), 400
    accounts.send_verification_code(pending.user)
    db().commit()
    return jsonify(sent=True)


@bp.post("/mfa/verify")
@limiter.limit("10 per minute")
def mfa_verify() -> Any:
    """The second step of a sign-in: a code from the app, or a backup code."""
    pending = sessions.pending("mfa")
    if pending is None:
        return jsonify(error="no_pending_sign_in"), 400
    try:
        method = mfa.verify(pending.user, _text(_body(), "code", 16))
    except AccountError:
        db().commit()
        if sessions.count_failure() >= MAX_MFA_FAILURES:
            sessions.clear_pending()
            return jsonify(error="too_many_attempts"), 400
        raise
    if method == "backup":
        audit.record("mfa_backup_code_used", user=pending.user, left=mfa.remaining_backup_codes(pending.user))
    sessions.end_replaced(pending)
    return _signed_in(pending.user, [*pending.methods, method, "mfa"], "sign_in")


@bp.get("/mfa")
def mfa_state() -> Response:
    user = _signed_in_user()
    return jsonify(enabled=mfa.is_enabled(user), backup_codes_left=mfa.remaining_backup_codes(user))


@bp.post("/mfa/totp")
def mfa_begin() -> Response:
    enrolment = mfa.begin(_signed_in_user())
    db().commit()
    return jsonify(secret=enrolment.secret, uri=enrolment.uri, qr=enrolment.qr)


@bp.post("/mfa/totp/confirm")
@limiter.limit("10 per minute")
def mfa_confirm() -> Response:
    user = _signed_in_user()
    codes = mfa.confirm(user, _text(_body(), "code", 16))
    audit.record("mfa_enabled", user=user)
    db().commit()
    return jsonify(backup_codes=codes)


@bp.post("/mfa/backup-codes")
@limiter.limit("10 per minute")
def mfa_new_backup_codes() -> Response:
    user = _signed_in_user()
    codes = mfa.regenerate_backup_codes(user, _text(_body(), "code", 16))
    audit.record("mfa_backup_codes_renewed", user=user)
    db().commit()
    return jsonify(backup_codes=codes)


@bp.post("/mfa/disable")
@limiter.limit("10 per minute")
def mfa_disable() -> Response:
    user = _signed_in_user()
    mfa.disable(user, _text(_body(), "code", 16))
    audit.record("mfa_disabled", user=user)
    db().commit()
    return jsonify(enabled=False)


@bp.post("/password/forgot")
@limiter.limit("5 per minute")
def forgot_password() -> tuple[Response, int]:
    accounts.request_password_reset(
        _text(_body(), "email"), f"{get_settings().issuer}{url_for('pages.reset_password')}"
    )
    db().commit()
    # The same answer whether or not the address has an account.
    return jsonify(sent=True), 202


@bp.post("/password/reset")
@limiter.limit("10 per minute")
def reset_password() -> Response:
    data = _body()
    user = accounts.reset_password(_text(data, "token", 128), _text(data, "password", 256))
    audit.record("password_reset", user=user)
    db().commit()
    return jsonify(redirect=url_for("pages.signin"))


@bp.post("/device")
@limiter.limit("10 per minute")
def device_decision() -> Any:
    """The signed-in person approves or denies the device showing this user code."""
    login = sessions.current()
    if login is None:
        return jsonify(error="not_signed_in"), 401
    data = _body()
    row = db().scalar(
        select(DeviceCode).where(
            DeviceCode.user_code == normalize_user_code(_text(data, "user_code", 16)),
            DeviceCode.status == "pending",
            DeviceCode.expires_at > utcnow(),
        )
    )
    if row is None:
        return jsonify(error="invalid_code"), 400
    if not platform.may_sign_in(row.client, login.user):
        return jsonify(error="app_in_sandbox"), 403
    approve = data.get("approve") is True
    row.status = "approved" if approve else "denied"
    row.user_id = login.user.id
    audit.record("device", user=login.user, client=row.client, approved=approve)
    db().commit()
    return jsonify(done=True, client={"name": row.client.name})


# ── The account area ──────────────────────────────────────────────────────────────────────────


def _iso(moment: datetime | None) -> str | None:
    return moment.isoformat() if moment else None


def _count(model: Any, *where: Any) -> int:
    return int(db().scalar(select(func.count()).select_from(model).where(*where)) or 0)


@bp.get("/account")
def account_summary() -> Any:
    """What the account home shows: who, the account's health, and the accounts on this browser."""
    login = sessions.current()
    if login is None:
        return jsonify(error="not_signed_in"), 401
    user = login.user
    here = sessions.all_signed_in()
    now = utcnow()
    summary = jsonify(
        user={
            "id": str(user.id),
            "email": user.email,
            "email_verified": user.email_verified,
            "name": user.name,
            "given_name": user.given_name,
            "family_name": user.family_name,
            "locale": user.locale,
            "phone": user.phone,
            "country": user.country,
            "picture": user.picture,
            "pending_email": profile.pending_email(user),
            "created_at": user.created_at.isoformat(),
            "has_password": user.password_hash is not None,
            "password_changed_at": _iso(user.password_changed_at),
        },
        mfa={
            "enabled": mfa.is_enabled(user),
            "since": _iso(totp.confirmed_at) if (totp := mfa.credential(user)) else None,
            "backup_codes_left": mfa.remaining_backup_codes(user),
        },
        devices=_count(
            LoginSession,
            LoginSession.user_id == user.id,
            LoginSession.revoked_at.is_(None),
            LoginSession.expires_at > now,
        ),
        connected_apps=_count(Consent, Consent.user_id == user.id),
        apps=[
            {"name": c.name, "url": c.homepage_url, "logo": c.brand.get("logo")}
            for c in own_apps.own_apps_for(user)
        ],
        accounts=[
            {"id": str(a.id), "email": a.user.email, "name": a.user.name, "current": a.id == login.id}
            for a in here
        ],
    )
    db().commit()
    return summary


def _me() -> User:
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    return login.user


_PHONE = re.compile(r"^(\+[1-9][0-9]{6,14})?$")
_COUNTRY = re.compile(r"^([A-Za-z]{2})?$")


@bp.patch("/account/profile")
def update_profile() -> Response:
    """Name, phone, country and language; only the fields sent change."""
    data = _body()
    user = _me()
    fields: dict[str, str] = {}
    for key, limit in (("given_name", 100), ("family_name", 100)):
        if isinstance(data.get(key), str):
            if len(data[key]) > limit:
                raise AccountError("too_long")
            fields[key] = data[key]
    if isinstance(data.get("phone"), str):
        phone = data["phone"].replace(" ", "")
        if not _PHONE.match(phone):
            raise AccountError("invalid_phone")
        fields["phone"] = phone
    if isinstance(data.get("country"), str):
        if not _COUNTRY.match(data["country"].strip()):
            raise AccountError("invalid_country")
        fields["country"] = data["country"].strip()
    if data.get("locale") in ("fr", "en"):
        fields["locale"] = data["locale"]
    profile.update(user, **fields)
    audit.record("profile_updated", user=user, fields=sorted(fields))
    db().commit()
    return jsonify(updated=sorted(fields))


@bp.post("/account/picture")
def set_picture() -> Response:
    """The photo, as the request body (made small in the browser), its type as Content-Type."""
    user = _me()
    profile.set_picture(user, (request.mimetype or "").lower(), request.get_data(cache=False))
    audit.record("picture_changed", user=user)
    db().commit()
    return jsonify(picture=user.picture)


@bp.delete("/account/picture")
def remove_picture() -> Response:
    user = _me()
    profile.remove_picture(user)
    audit.record("picture_removed", user=user)
    db().commit()
    return jsonify(picture=None)


@bp.post("/account/email")
@limiter.limit("5 per minute")
def request_email_change() -> Response:
    data = _body()
    user = _me()
    confirm = f"{get_settings().issuer}{url_for('pages.account', section='email/confirm')}"
    address = profile.request_email_change(user, _text(data, "email"), _text(data, "password", 256), confirm)
    audit.record("email_change_requested", user=user, new_email=address)
    db().commit()
    return jsonify(pending_email=address)


@bp.post("/account/password")
@limiter.limit("5 per minute")
def change_password() -> Response:
    data = _body()
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    others = data.get("sign_out_others") is True
    current, new = _text(data, "current_password", 256), _text(data, "new_password", 256)
    accounts.change_password(login.user, current, new, keep=login if others else None)
    audit.record("password_changed", user=login.user)
    if others:
        audit.record("signed_out_others", user=login.user)
    db().commit()
    return jsonify(ok=True)


# Adding a way in asks for the password again once the sign-in is older than this.
_RECENT_SIGN_IN = timedelta(minutes=10)


@bp.get("/account/passkeys")
def list_passkeys() -> Response:
    return jsonify(passkeys=[passkeys.as_json(p) for p in passkeys.list_for(_me())])


@bp.post("/account/passkeys/options")
@limiter.limit("10 per minute")
def passkey_registration_options() -> Response:
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    if utcnow() - login.created_at > _RECENT_SIGN_IN:
        password = _text(_body(), "password", 256)
        if not password:
            raise AccountError("reauth_required")
        if login.user.password_hash is None or not verify_password(login.user.password_hash, password):
            raise AccountError("wrong_password")
    options = passkeys.registration_options(login.user)
    db().commit()
    return jsonify(options)


@bp.post("/account/passkeys")
@limiter.limit("10 per minute")
def add_passkey() -> Response:
    user = _me()
    credential = _body().get("credential")
    if not isinstance(credential, dict):
        raise AccountError("passkey_failed")
    passkey = passkeys.register(user, credential)
    audit.record("passkey_added", user=user, name=passkey.name)
    db().commit()
    return jsonify(passkeys.as_json(passkey))


@bp.patch("/account/passkeys/<passkey_id>")
def rename_passkey(passkey_id: str) -> Response:
    passkey = passkeys.rename(_me(), passkey_id, _text(_body(), "name", 128))
    db().commit()
    return jsonify(passkeys.as_json(passkey))


@bp.delete("/account/passkeys/<passkey_id>")
def remove_passkey(passkey_id: str) -> Response:
    user = _me()
    name = passkeys.remove(user, passkey_id)
    audit.record("passkey_removed", user=user, name=name)
    db().commit()
    return jsonify(ok=True)


@bp.post("/passkey/options")
@limiter.limit("20 per minute")
def passkey_sign_in_options() -> Response:
    return jsonify(passkeys.sign_in_options())


@bp.post("/passkey")
@limiter.limit("10 per minute")
def passkey_sign_in() -> Response:
    credential = _body().get("credential")
    if not isinstance(credential, dict):
        raise AccountError("passkey_failed")
    user = passkeys.authenticate(credential)
    # A step-up in progress for this person ends with the passkey as well as with a code.
    pending = sessions.pending("mfa")
    if pending is not None and pending.user.id == user.id:
        sessions.end_replaced(pending)
    return _signed_in(user, passkeys.METHODS, "sign_in")


def _here() -> set[uuid.UUID]:
    """The sessions signed in on this browser."""
    return {login.id for login in sessions.all_signed_in()}


@bp.get("/account/devices")
def list_devices() -> Response:
    return jsonify(devices=connected.sessions_of(_me(), _here()))


@bp.delete("/account/devices/<session_id>")
def sign_out_device(session_id: str) -> Response:
    user = _me()
    login = connected.sign_out_session(user, session_id, _here())
    audit.record("device_signed_out", user=user, device=f"{login.user_agent or ''}"[:120])
    db().commit()
    return jsonify(ok=True)


@bp.post("/account/devices/sign-out-others")
def sign_out_other_devices() -> Response:
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    accounts.sign_out_others(login.user, login)
    audit.record("signed_out_others", user=login.user)
    db().commit()
    return jsonify(ok=True)


@bp.get("/account/apps")
def list_connected_apps() -> Response:
    user = _me()
    return jsonify(apps=connected.apps_of(user, user.locale))


@bp.delete("/account/apps/<client_id>")
def remove_connected_app(client_id: str) -> Response:
    user = _me()
    client = connected.remove_app(user, client_id)
    audit.record("app_access_removed", user=user, client=client, name=client.name)
    db().commit()
    return jsonify(ok=True)


@bp.get("/account/export")
@limiter.limit("5 per hour")
def export_data() -> Response:
    """A copy of what the provider keeps about the person, as a JSON file."""
    user = _me()
    data = closing.export(user, _here())
    audit.record("data_exported", user=user)
    db().commit()
    response = jsonify(data)
    day = utcnow().date().isoformat()
    response.headers["Content-Disposition"] = f'attachment; filename="account-{day}.json"'
    return response


@bp.get("/account/closing")
def account_closing() -> Response:
    """What the Data and account page needs: the last copy, and what stops a deletion."""
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    return jsonify(
        last_export_at=closing.last_export(login.user),
        password_needed=utcnow() - login.created_at > _RECENT_SIGN_IN,
        portal_url=closing.portal_url(),
        **closing.blockers(login.user),
    )


@bp.delete("/account")
@limiter.limit("5 per minute")
def delete_account() -> Response:
    """The person deletes their own account by typing its address; an old sign-in also gives the password."""
    data = _body()
    login = sessions.current()
    if login is None:
        raise AccountError("not_signed_in")
    user = login.user
    if _text(data, "email").strip().lower() != user.email:
        raise AccountError("email_mismatch")
    if utcnow() - login.created_at > _RECENT_SIGN_IN:
        password = _text(data, "password", 256)
        if not password:
            raise AccountError("reauth_required")
        if user.password_hash is None or not verify_password(user.password_hash, password):
            raise AccountError("wrong_password")
    blocking = closing.blockers(user)
    if blocking["organizations"]:
        raise AccountError("owns_organizations")
    if blocking["last_admin"]:
        raise AccountError("last_admin")
    audit.record("account.deleted", user=user, source="self", email=user.email)
    sessions.sign_out_here(str(login.id))
    closing.delete(user)
    db().commit()
    # Another account signed in on this browser becomes the current one; else the sign-in page.
    after = url_for("pages.account") if sessions.current() else url_for("pages.signin")
    return jsonify(redirect=after)


@bp.get("/account/activity")
def recent_activity() -> Response:
    return jsonify(days=activity.DAYS, events=activity.recent(_me()))


@bp.delete("/account/email")
def cancel_email_change() -> Response:
    user = _me()
    profile.cancel_email_change(user)
    db().commit()
    return jsonify(pending_email=None)


@bp.post("/account/email/confirm")
@limiter.limit("10 per minute")
def confirm_email_change() -> Response:
    user = _me()
    old = user.email
    address = profile.confirm_email_change(user, _text(_body(), "token", 128))
    audit.record("email_changed", user=user, old_email=old, new_email=address)
    db().commit()
    return jsonify(email=address)


@bp.delete("/accounts/<session_id>")
def sign_out_account(session_id: str) -> Any:
    """Signs one account out of this browser; another one signed in here becomes current."""
    login = sessions.sign_out_here(session_id)
    if login is None:
        return jsonify(error="unknown_account"), 404
    audit.record("sign_out", user=login.user)
    left = sessions.current()
    db().commit()
    return jsonify(redirect=url_for("pages.account") if left else url_for("pages.signin"))


@bp.delete("/accounts")
def sign_out_all() -> Response:
    """Signs every account out of this browser."""
    for login in sessions.all_signed_in():
        audit.record("sign_out", user=login.user)
    sessions.end_all_here()
    db().commit()
    return jsonify(redirect=url_for("pages.signin"))


@bp.post("/accounts/<session_id>")
def switch_account(session_id: str) -> Any:
    login = sessions.switch_to(session_id)
    if login is None:
        return jsonify(error="unknown_account"), 404
    db().commit()
    return jsonify(redirect=sessions.take_return_to(url_for("pages.account")))
