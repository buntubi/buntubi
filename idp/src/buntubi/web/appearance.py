"""
The person's appearance for the platform's own products (`/v1/appearance`): a first-party app reads
it and changes it for the signed-in person, with a token holding `appearance`. A third-party app
cannot: a person's look is theirs, and shared only with the products the platform runs.
"""

from authlib.integrations.flask_oauth2 import current_token
from flask import Blueprint, Response, abort, jsonify, request
from sqlalchemy import select

from buntubi.db import db
from buntubi.models import Client, User
from buntubi.services import appearance
from buntubi.web.organizations import person

bp = Blueprint("appearance", __name__, url_prefix="/v1")


def _first_party() -> None:
    client = db().scalar(select(Client).where(Client.client_id == current_token.claims.client_id))
    if client is None or client.disabled_at is not None or not client.first_party:
        abort(403)


@bp.get("/appearance")
@person("appearance")
def get_appearance(me: User) -> Response:
    _first_party()
    return jsonify(appearance.state(me))


@bp.patch("/appearance")
@person("appearance")
def update_appearance(me: User) -> Response | tuple[Response, int]:
    _first_party()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_body"), 400
    try:
        result = appearance.update(me, data)
    except appearance.AppearanceError as error:
        return jsonify(error=str(error)), 400
    db().commit()
    return jsonify(result)
