"""A passkey for tests: a P-256 key on a pretend device, answering WebAuthn ceremonies as a browser would."""

import base64
import hashlib
import json
import os
import struct
from typing import Any
from urllib.parse import urlsplit

import cbor2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

# iCloud Keychain's AAGUID, so the default name can be checked.
AAGUID = "fbfc3007-154e-4ecc-8c0b-6e020557d7bd"


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


class SoftAuthenticator:
    def __init__(self, issuer: str) -> None:
        self.origin = f"{urlsplit(issuer).scheme}://{urlsplit(issuer).netloc}"
        self.rp_id = urlsplit(issuer).hostname or ""
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.credential_id = os.urandom(16)
        self.user_handle = b""
        self.count = 0

    def _client_data(self, kind: str, challenge: str) -> bytes:
        return json.dumps(
            {"type": kind, "challenge": challenge, "origin": self.origin, "crossOrigin": False}
        ).encode()

    def _auth_data(self, flags: int, attested: bytes = b"") -> bytes:
        self.count += 1
        return (
            hashlib.sha256(self.rp_id.encode()).digest()
            + bytes([flags])
            + struct.pack(">I", self.count)
            + attested
        )

    def create(self, options: dict[str, Any], verified: bool = True) -> dict[str, Any]:
        self.user_handle = unb64(options["user"]["id"])
        numbers = self.key.public_key().public_numbers()
        cose = cbor2.dumps(
            {1: 2, 3: -7, -1: 1, -2: numbers.x.to_bytes(32, "big"), -3: numbers.y.to_bytes(32, "big")}
        )
        attested = bytes.fromhex(AAGUID.replace("-", "")) + struct.pack(">H", len(self.credential_id))
        # User present, verified when asked to be, backed up, credential data included.
        flags = 0x01 | (0x04 if verified else 0) | 0x08 | 0x10 | 0x40
        auth_data = self._auth_data(flags, attested + self.credential_id + cose)
        attestation = cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": auth_data})
        return {
            "id": b64(self.credential_id),
            "rawId": b64(self.credential_id),
            "type": "public-key",
            "response": {
                "clientDataJSON": b64(self._client_data("webauthn.create", options["challenge"])),
                "attestationObject": b64(attestation),
                "transports": ["internal", "hybrid"],
            },
            "clientExtensionResults": {},
        }

    def get(self, options: dict[str, Any]) -> dict[str, Any]:
        client_data = self._client_data("webauthn.get", options["challenge"])
        auth_data = self._auth_data(0x01 | 0x04 | 0x08 | 0x10)
        signature = self.key.sign(auth_data + hashlib.sha256(client_data).digest(), ec.ECDSA(hashes.SHA256()))
        return {
            "id": b64(self.credential_id),
            "rawId": b64(self.credential_id),
            "type": "public-key",
            "response": {
                "clientDataJSON": b64(client_data),
                "authenticatorData": b64(auth_data),
                "signature": b64(signature),
                "userHandle": b64(self.user_handle),
            },
            "clientExtensionResults": {},
        }
