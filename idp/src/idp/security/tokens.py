"""
Random secrets (client secrets, codes, refresh and email tokens), and how they are stored: as a
SHA-256 hash. These carry their own entropy, so a fast hash is enough; passwords, which people
choose, use the slow hash in passwords.py.
"""

import hashlib
import hmac
import secrets

# Ambiguous characters left out, for codes a person types.
_USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ23456789"


def new_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def matches(token: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_token(token), stored_hash)


def new_numeric_code(digits: int = 6) -> str:
    return f"{secrets.randbelow(10**digits):0{digits}d}"


def new_user_code(length: int = 8) -> str:
    """A device-flow code a person reads off one screen and types on another: XXXX-XXXX."""
    raw = "".join(secrets.choice(_USER_CODE_ALPHABET) for _ in range(length))
    return f"{raw[: length // 2]}-{raw[length // 2 :]}"


def normalize_user_code(typed: str) -> str:
    """What a person typed, as stored: upper case, the dash back in the middle."""
    chars = "".join(c for c in typed.upper() if c.isalnum())
    return f"{chars[:4]}-{chars[4:]}" if len(chars) == 8 else chars
