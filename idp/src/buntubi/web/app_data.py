"""
`/v1/app/users/<user_id>/data`: what an app keeps about a person for itself, read and written by
its own server with a client credentials token holding `app_data`.
"""

from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from authlib.integrations.flask_oauth2 import current_token
from flask import Blueprint, Response, abort, jsonify, request
from sqlalchemy import select

from buntubi.db import db
from buntubi.models import Client
from buntubi.models.app_data import AppUserData
from buntubi.oauth.server import require_token
from buntubi.services import app_data, audit
from buntubi.services import platform as p

bp = Blueprint("app_data", __name__, url_prefix="/v1/app/users")

F = TypeVar("F", bound=Callable[..., Any])


@bp.errorhandler(p.PlatformError)
def _refused(error: p.PlatformError) -> tuple[Response, int]:
    db().rollback()
    return jsonify(error=error.code, **error.details), error.status


def _app(view: F) -> F:
    """The caller, as an app whose token (client credentials, no person) holds `app_data`."""

    @require_token("app_data")
    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        client = db().scalar(select(Client).where(Client.client_id == current_token.claims.client_id))
        if current_token.user is not None or client is None or client.disabled_at is not None:
            abort(403)
        return view(*args, app=client, **kwargs)

    return wrapper


def _answer(row: AppUserData | None) -> Response:
    return jsonify(data=row.data if row else {}, updated_at=row.updated_at.isoformat() if row else None)


@bp.get("/<user_id>/data")
@_app
def get_data(app: Client, user_id: str) -> Response:
    return _answer(app_data.read(app, app_data.person(app, user_id)))


@bp.put("/<user_id>/data")
@_app
def put_data(app: Client, user_id: str) -> Response:
    user = app_data.person(app, user_id)
    row = app_data.write(app, user, request.get_json(silent=True), merge=False)
    audit.record("app_data_written", user=user, client=app)
    db().commit()
    return _answer(row)


@bp.patch("/<user_id>/data")
@_app
def patch_data(app: Client, user_id: str) -> Response:
    user = app_data.person(app, user_id)
    row = app_data.write(app, user, request.get_json(silent=True), merge=True)
    audit.record("app_data_written", user=user, client=app)
    db().commit()
    return _answer(row)


@bp.delete("/<user_id>/data")
@_app
def delete_data(app: Client, user_id: str) -> Response:
    user = app_data.person(app, user_id)
    app_data.remove(app, user)
    audit.record("app_data_removed", user=user, client=app)
    db().commit()
    return jsonify(removed=True)
