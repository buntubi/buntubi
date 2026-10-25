"""
The address an app names for the person about to sign in (`login_hint`, OIDC Core 3.1.2.1). It
only fills the email field on sign-in and sign-up, and only when it reads as an address the way
sign-up would take it; anything else is ignored.
"""

from urllib.parse import urlencode

from email_validator import EmailNotValidError, validate_email
from flask import request

# RFC 5321's limit on a forward path, the longest an address can be.
MAX_LENGTH = 254


def from_request() -> str | None:
    value = request.args.get("login_hint", "")
    if not value or len(value) > MAX_LENGTH or value != value.strip():
        return None
    try:
        return validate_email(value, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        return None


def onto(path: str) -> str:
    """`path` with the hint carried on as its query, for the page the request leads to."""
    hint = from_request()
    return f"{path}?{urlencode({'login_hint': hint})}" if hint else path
