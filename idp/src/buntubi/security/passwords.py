"""Passwords: a slow one-way hash (scrypt), never anything reversible, never logged."""

import gzip
from functools import cache
from importlib.resources import files

from werkzeug.security import check_password_hash, generate_password_hash

MIN_LENGTH = 10
MAX_LENGTH = 256

# Checked against when an email has no account, so a missing account takes as long as a wrong password.
_DUMMY_HASH = generate_password_hash("not-a-real-password", method="scrypt")


def hash_password(password: str) -> str:
    return generate_password_hash(password, method="scrypt")


def verify_password(stored_hash: str | None, candidate: str) -> bool:
    if not stored_hash:
        check_password_hash(_DUMMY_HASH, candidate)
        return False
    return check_password_hash(stored_hash, candidate)


def problem(password: str) -> str | None:
    """What is wrong with a new password, as an error code, or None."""
    if not MIN_LENGTH <= len(password) <= MAX_LENGTH:
        return "weak_password"
    if is_breached(password):
        return "breached_password"
    return None


def is_acceptable(password: str) -> bool:
    return problem(password) is None


def is_breached(password: str) -> bool:
    return password.lower() in _breached()


@cache
def _breached() -> frozenset[str]:
    """Loaded once, on the first password checked: about 120 000 entries (data/README.md)."""
    data = files("buntubi.security").joinpath("data/breached.txt.gz").read_bytes()
    return frozenset(gzip.decompress(data).decode().splitlines())
