"""
Time-based one-time passwords (RFC 6238 over RFC 4226): SHA-1, 30-second steps, 6 digits,
which is what every authenticator app reads from an `otpauth://` URI.
"""

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode

STEP = 30
DIGITS = 6
# Steps accepted either side of now, for clocks that drift.
WINDOW = 1


def new_secret() -> str:
    """160 random bits, base32 without padding, as authenticator apps expect."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def code_at(secret: str, step: int, digits: int = DIGITS) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(value % 10**digits).zfill(digits)


def current_step(now: float | None = None) -> int:
    return int((time.time() if now is None else now) // STEP)


def matching_step(secret: str, code: str, after: int | None, now: float | None = None) -> int | None:
    """The step `code` belongs to, within the window and later than `after`; None otherwise."""
    code = code.strip().replace(" ", "")
    if len(code) != DIGITS or not code.isdigit():
        return None
    here = current_step(now)
    for step in range(here - WINDOW, here + WINDOW + 1):
        if after is not None and step <= after:
            continue
        if hmac.compare_digest(code_at(secret, step), code):
            return step
    return None


def provisioning_uri(secret: str, account: str, issuer: str) -> str:
    label = quote(f"{issuer}:{account}" if issuer else account)
    params = {"secret": secret, "algorithm": "SHA1", "digits": DIGITS, "period": STEP}
    if issuer:
        params["issuer"] = issuer
    return f"otpauth://totp/{label}?{urlencode(params)}"
