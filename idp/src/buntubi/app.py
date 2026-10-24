"""The application factory."""

import os
from datetime import timedelta
from pathlib import Path

from flask import Flask, Response, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

from buntubi import cli, plugins
from buntubi.config import Settings, get_settings
from buntubi.db import db, init_db
from buntubi.extensions import limiter
from buntubi.oauth.server import init_oauth
from buntubi.services import backchannel, session_check
from buntubi.services.platform import PlatformError
from buntubi.web import admin, api, developer, oidc, openapi, organizations, pages, ui_plugins

# Endpoints a browser application (SPA) calls cross-origin.
_CORS_PATHS = ("/oauth/token", "/oauth/revoke", "/oauth/userinfo")


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or get_settings()
    problems = settings.production_problems()
    if problems:
        raise RuntimeError("refusing to start:\n- " + "\n- ".join(problems))
    # Authlib refuses plain HTTP; allowed only for an issuer on this machine (development, tests).
    if settings.local:
        os.environ["AUTHLIB_INSECURE_TRANSPORT"] = "1"
    app = Flask(__name__)
    if settings.trusted_proxies:
        # The client's address and scheme as the proxies saw them, trusting only that many hops.
        n = settings.trusted_proxies
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=n, x_proto=n)  # type: ignore[method-assign]
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
    app.register_blueprint(ui_plugins.bp)
    app.extensions["ui_plugins"] = ui_plugins.load(
        settings.ui_plugins_dir, Path(app.static_folder or "", "idp", "share.json")
    )
    app.register_blueprint(admin.bp)
    app.register_blueprint(developer.bp)
    app.register_blueprint(organizations.bp)
    app.register_blueprint(openapi.bp)
    _init_plugins(app, settings)

    # A plugin's routes refuse through the same helpers as the developer and admin APIs
    # (require_developer, member_of): answered as those APIs answer, not as a server fault.
    @app.errorhandler(PlatformError)
    def _platform_refusal(error: PlatformError) -> tuple[Response, int]:
        db().rollback()
        return jsonify(error=error.code, **error.details), error.status

    cli.register(app)

    # Logout tokens for the sessions this request ended, once it is answered.
    app.after_request(backchannel.flush)

    @app.after_request
    def _headers(response: Response) -> Response:
        headers = response.headers
        headers.setdefault(
            "Content-Security-Policy",
            f"default-src 'self'; script-src {ui_plugins.script_src()}; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; "
            "base-uri 'none'; form-action 'self'",
        )
        # The session check page is meant to be framed by apps; nothing else is.
        if request.path != "/oauth/check-session":
            headers.setdefault("X-Frame-Options", "DENY")
        session_check.sync_cookie(response)
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("Referrer-Policy", "no-referrer")
        if settings.issuer.startswith("https://"):
            # Not includeSubDomains: other services of the deployment's domain decide for themselves.
            headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        # Avatars are public and their address changes with them: cached like static files.
        # UI plugin files set their own: hashed ones kept for good, entries revalidated.
        if not request.path.startswith(
            ("/static/", "/.well-known/", "/oauth/check-session.js", "/avatars/", "/ui-plugins/")
        ):
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
    from buntubi.plugins import catalogue_file

    loaded = [*plugins.load(settings.plugins), *catalogue_file.load(settings.catalogue_files)]
    ids = [plugin.id for plugin in loaded]
    if len(ids) != len(set(ids)):
        raise RuntimeError(f"two plugins or catalogue files share an id: {sorted(ids)}")
    plugins.use(loaded)
    for plugin in loaded:
        blueprint = plugin.blueprint()
        if blueprint is not None:
            app.register_blueprint(blueprint, url_prefix=f"/api/plugins/{plugin.id}")
    if loaded and settings.plugins_sync_on_start:
        from buntubi.plugins.sync import sync

        with app.app_context():
            sync(loaded)
