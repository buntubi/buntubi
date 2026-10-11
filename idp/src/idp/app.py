"""The application factory."""

import os
from datetime import timedelta

from flask import Flask, Response, request

from idp import cli, plugins
from idp.config import Settings, get_settings
from idp.db import init_db
from idp.extensions import limiter
from idp.oauth.server import init_oauth
from idp.services import backchannel, session_check
from idp.web import admin, api, developer, oidc, openapi, pages

# Endpoints a browser application (SPA) calls cross-origin.
_CORS_PATHS = ("/oauth/token", "/oauth/revoke", "/oauth/userinfo")


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or get_settings()
    # Authlib refuses plain HTTP; allowed only for an issuer on this machine (development, tests).
    if settings.issuer.startswith(("http://localhost", "http://127.0.0.1")):
        os.environ["AUTHLIB_INSECURE_TRANSPORT"] = "1"
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=settings.secret_key.get_secret_value(),
        SESSION_COOKIE_NAME="idp_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=settings.secure_cookies,
        PERMANENT_SESSION_LIFETIME=timedelta(seconds=settings.session_ttl),
        RATELIMIT_STORAGE_URI=settings.rate_limit_storage,
        RATELIMIT_ENABLED=settings.rate_limit_enabled,
    )
    app.json.sort_keys = False  # type: ignore[attr-defined]
    init_db(app, settings.database_url)
    init_oauth(app)
    limiter.init_app(app)

    app.register_blueprint(oidc.bp)
    app.register_blueprint(api.bp)
    app.register_blueprint(pages.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(developer.bp)
    app.register_blueprint(openapi.bp)
    _init_plugins(app, settings)
    cli.register(app)

    # Logout tokens for the sessions this request ended, once it is answered.
    app.after_request(backchannel.flush)

    @app.after_request
    def _headers(response: Response) -> Response:
        headers = response.headers
        headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; "
            "base-uri 'none'; form-action 'self'",
        )
        # The session check page is meant to be framed by apps; nothing else is.
        if request.path != "/oauth/check-session":
            headers.setdefault("X-Frame-Options", "DENY")
        session_check.sync_cookie(response)
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("Referrer-Policy", "no-referrer")
        # Avatars are public and their address changes with them: cached like static files.
        if not request.path.startswith(("/static/", "/.well-known/", "/oauth/check-session.js", "/avatars/")):
            headers["Cache-Control"] = "no-store"
        origin = request.headers.get("Origin")
        if origin and origin in settings.cors_origins and request.path in _CORS_PATHS:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            headers["Access-Control-Allow-Methods"] = "GET, POST"
            headers["Vary"] = "Origin"
        return response

    return app


def _init_plugins(app: Flask, settings: Settings) -> None:
    """Load the deployment's plugins, mount their APIs, and sync their catalogue if asked."""
    loaded = plugins.load(settings.plugins)
    plugins.use(loaded)
    for plugin in loaded:
        blueprint = plugin.blueprint()
        if blueprint is not None:
            app.register_blueprint(blueprint, url_prefix=f"/api/plugins/{plugin.id}")
    if loaded and settings.plugins_sync_on_start:
        from idp.plugins.sync import sync

        with app.app_context():
            sync(loaded)
