"""
Encryption for secrets the provider must read back (an authenticator's TOTP seed). The key is
derived from IDP_SECRET_KEY, so changing that key makes every enrolled authenticator unreadable:
users then enrol again.
"""

import base64
from functools import lru_cache

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from buntubi.config import get_settings


@lru_cache
def _fernet() -> Fernet:
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=b"idp stored secrets").derive(
        get_settings().secret_key.get_secret_value().encode()
    )
    return Fernet(base64.urlsafe_b64encode(key))


def seal(value: str) -> bytes:
    return _fernet().encrypt(value.encode())


def unseal(token: bytes) -> str:
    return _fernet().decrypt(token).decode()
