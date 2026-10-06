"""Request bodies, checked with pydantic: a body that does not fit answers 422 with the details."""

from typing import TypeVar

from flask import Response, abort, request
from pydantic import BaseModel, ValidationError

M = TypeVar("M", bound=BaseModel)


def parse(model: type[M]) -> M:
    try:
        return model.model_validate(request.get_json(silent=True) or {})
    except ValidationError as error:
        abort(Response(error.json(include_url=False), status=422, mimetype="application/json"))
