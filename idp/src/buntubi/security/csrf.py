"""
CSRF protection for the JSON endpoints the sign-in screens call: a random token per browser
session, handed to the page and sent back in a header; and the request must come from this origin.
"""

import hmac
import secrets

from flask import abort, request, session

from buntubi.config import get_settings

HEADER = "X-CSRF-Token"
_KEY = "csrf"


def token() -> str:
    if _KEY not in session:
        session[_KEY] = secrets.token_urlsafe(32)
    value: str = session[_KEY]
    return value


def protect() -> None:
    """Rejects a state-changing request without the session's token or from another origin."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    origin = request.headers.get("Origin")
    if origin is not None and origin != get_settings().issuer:
        abort(403)
    expected = session.get(_KEY)
    sent = request.headers.get(HEADER, "")
    if not expected or not hmac.compare_digest(expected, sent):
        abort(403)
