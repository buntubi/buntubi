"""Whether an address is on the public internet: for requests the provider makes to apps' URLs."""

import ipaddress
import socket


def public_ip(host: str) -> bool:
    """False for an IP address that is not on the public internet; True for a name (resolve it first)."""
    try:
        return ipaddress.ip_address(host.strip("[]")).is_global
    except ValueError:
        return True


def resolve(host: str) -> list[str]:
    """Every address a name resolves to; an IP address is its own."""
    try:
        return sorted({str(info[4][0]) for info in socket.getaddrinfo(host, None)})
    except socket.gaierror:
        return []
