"""Passwords: a slow one-way hash (scrypt), never anything reversible, never logged."""

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


def is_acceptable(password: str) -> bool:
    return MIN_LENGTH <= len(password) <= MAX_LENGTH
