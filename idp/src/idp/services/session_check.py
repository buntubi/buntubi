"""
OpenID Connect Session Management 1.0: an app learns that this browser signed in, out, or
switched account here while its page stays open.

The browser state is an opaque value derived from the current login, kept in a cookie the
check page can read. Each authorization answer carries a `session_state` that binds it to
the app and the app's origin. The app posts that value to the check page in a hidden
iframe; the page recomputes it from the cookie and answers "changed" or "unchanged" with no
request to the server.
"""

import hashlib
import hmac
import secrets
from urllib.parse import urlparse

from flask import Response, request, session

from idp.config import get_settings

COOKIE = "idp_browser_state"


def browser_state() -> str:
    """Opaque, and empty when nobody is signed in in this browser."""
    sid = session.get("sid")
    if not sid:
        return ""
    key = get_settings().secret_key.get_secret_value().encode()
    return hmac.new(key, f"browser-state {sid}".encode(), hashlib.sha256).hexdigest()[:32]


def session_state(client_id: str, redirect_uri: str) -> str:
    """The value an authorization answer carries: hash of app, origin, browser state, salt."""
    parts = urlparse(redirect_uri)
    origin = f"{parts.scheme}://{parts.netloc}"
    salt = secrets.token_hex(8)
    digest = hashlib.sha256(f"{client_id} {origin} {browser_state()} {salt}".encode()).hexdigest()
    return f"{digest}.{salt}"


def sync_cookie(response: Response) -> None:
    """Keep the cookie in step with the current login, whatever the request changed."""
    state = browser_state()
    if request.cookies.get(COOKIE, "") == state:
        return
    settings = get_settings()
    if not state:
        response.delete_cookie(COOKIE, path="/")
        return
    # Read by the check page's script, so not HttpOnly; it says nothing about who is signed in.
    # SameSite=None lets an app on another site embed the check page, which needs HTTPS.
    response.set_cookie(
        COOKIE,
        state,
        max_age=settings.session_ttl,
        path="/",
        httponly=False,
        secure=settings.secure_cookies,
        samesite="None" if settings.secure_cookies else "Lax",
    )


# Served from the provider's origin inside the app's hidden iframe. The script only hashes
# and answers; it never touches the network.
PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><title>Session check</title>
<script src="/oauth/check-session.js"></script></head><body></body></html>
"""

SCRIPT = """(() => {
  const name = 'COOKIE_NAME=';
  const read = () => {
    const found = document.cookie.split('; ').find((part) => part.startsWith(name));
    return found ? decodeURIComponent(found.slice(name.length)) : '';
  };
  const hex = (buffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
  window.addEventListener('message', async (event) => {
    if (typeof event.data !== 'string' || !event.source) return;
    const [clientId, sessionState] = event.data.split(' ');
    const salt = (sessionState || '').split('.')[1];
    if (!clientId || !salt) {
      event.source.postMessage('error', event.origin);
      return;
    }
    const text = new TextEncoder().encode(`${clientId} ${event.origin} ${read()} ${salt}`);
    const digest = hex(await crypto.subtle.digest('SHA-256', text));
    event.source.postMessage(`${digest}.${salt}` === sessionState ? 'unchanged' : 'changed', event.origin);
  });
})();
""".replace("COOKIE_NAME", COOKIE)
