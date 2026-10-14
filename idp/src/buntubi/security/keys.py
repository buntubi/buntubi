"""
Token signing keys: private JWKs in a directory, one file each, named by key id.

The newest key signs; every key in the directory still verifies and is published in the JWKS.
Rotating is adding a key, then removing the old one once its tokens have expired. Keys are read
from disk only, never fetched over HTTP, and only their public halves ever leave this module.
"""

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from joserfc.jwk import RSAKey

ALGORITHM = "RS256"


@dataclass(frozen=True)
class SigningKey:
    kid: str
    created_at: int
    key: RSAKey

    def public_jwk(self) -> dict[str, Any]:
        return {**self.key.as_dict(private=False), "kid": self.kid, "use": "sig", "alg": ALGORITHM}


class KeyRing:
    def __init__(self, keys: list[SigningKey]) -> None:
        if not keys:
            raise ValueError("No signing key: run `flask keys generate`.")
        self._keys = sorted(keys, key=lambda k: k.created_at, reverse=True)

    @classmethod
    def load(cls, directory: Path) -> "KeyRing":
        keys = []
        for path in sorted(directory.glob("*.json")):
            data = json.loads(path.read_text())
            key = RSAKey.import_key(data)
            if not key.is_private:
                raise ValueError(f"{path.name} is not a private key")
            keys.append(SigningKey(kid=data["kid"], created_at=int(data.get("iat", 0)), key=key))
        return cls(keys)

    @property
    def current(self) -> SigningKey:
        return self._keys[0]

    def find(self, kid: str) -> SigningKey | None:
        return next((k for k in self._keys if k.kid == kid), None)

    def jwks(self) -> dict[str, list[dict[str, Any]]]:
        return {"keys": [k.public_jwk() for k in self._keys]}


def generate_key(directory: Path, size: int = 3072) -> Path:
    """Writes a new private key, readable by its owner only, and returns its path."""
    key = RSAKey.generate_key(size, private=True)
    created_at = int(time.time())
    kid = f"{time.strftime('%Y%m%d', time.gmtime(created_at))}-{key.thumbprint()[:8]}"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{kid}.json"
    path.write_text(json.dumps({**key.as_dict(private=True), "kid": kid, "iat": created_at}))
    path.chmod(0o600)
    return path
