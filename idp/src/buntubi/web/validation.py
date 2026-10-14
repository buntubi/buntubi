"""Request bodies, checked with pydantic: a body that does not fit answers 422 with the details."""

import re
from typing import Annotated, TypeVar
from urllib.parse import urlsplit

from flask import Response, abort, request
from pydantic import AfterValidator, BaseModel, Field, ValidationError

M = TypeVar("M", bound=BaseModel)


def parse(model: type[M]) -> M:
    try:
        return model.model_validate(request.get_json(silent=True) or {})
    except ValidationError as error:
        abort(Response(error.json(include_url=False), status=422, mimetype="application/json"))


# A native app's own scheme (RFC 8252 7.1): reverse-domain, so it holds a dot. No scheme a browser
# would run or read locally (javascript, data, file) has one.
_APP_SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+$")
_LOOPBACK = {"localhost", "127.0.0.1", "::1"}


def _redirect_uri(value: str) -> str:
    """
    Where sign-in may send a code back: https; http only to this machine (RFC 8252 7.3, for
    development and native apps); or a native app's own reverse-domain scheme. Never a fragment
    (RFC 6749 3.1.2), never blanks or control characters. Kept exactly as given, since redirect
    addresses are compared exactly.
    """
    if value != value.strip() or any(ord(c) < 0x21 or ord(c) == 0x7F for c in value) or "#" in value:
        raise ValueError("not a valid redirect address")
    parts = urlsplit(value)
    scheme = parts.scheme.lower()
    if scheme == "https" and parts.hostname:
        return value
    if scheme == "http" and parts.hostname in _LOOPBACK:
        return value
    if _APP_SCHEME.match(scheme) and (parts.path or parts.netloc):
        return value
    raise ValueError("https, http on this machine, or an app's own scheme (com.example.app:/callback)")


RedirectUri = Annotated[str, Field(max_length=2048), AfterValidator(_redirect_uri)]
