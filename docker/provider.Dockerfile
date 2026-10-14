# syntax=docker/dockerfile:1
# The provider: Flask under gunicorn, with the sign-in pages built in. Settings come from IDP_*
# environment variables only; signing keys are mounted at IDP_SIGNING_KEYS_DIR, never baked in.
# Build from the repository root: docker build -f docker/provider.Dockerfile .

FROM node:22-slim AS pages
RUN corepack enable
WORKDIR /src
COPY . .
RUN pnpm install --frozen-lockfile --filter idp-frontend... \
 && pnpm --filter "idp-frontend..." build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    FLASK_APP=idp.app:create_app \
    IDP_SIGNING_KEYS_DIR=/keys
RUN useradd --system --uid 10001 --home-dir /app idp
WORKDIR /app
COPY idp/pyproject.toml idp/requirements.lock idp/alembic.ini ./
COPY idp/migrations migrations
COPY idp/src src
COPY --from=pages /src/idp/src/idp/static/idp src/idp/static/idp
# Extra pip requirements for a deployment's plugins, e.g. --build-arg PLUGINS="acme-idp==1.2.0".
ARG PLUGINS=""
RUN pip install --no-cache-dir -c requirements.lock . $PLUGINS \
 && rm -rf src \
 && chown idp:idp /app
USER idp
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request,sys; sys.exit(urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4).status != 200)"
# WEB_CONCURRENCY sets the worker count (gunicorn reads it). Several workers need a shared
# IDP_RATE_LIMIT_STORAGE and IDP_PLUGINS_SYNC_ON_START=false.
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "idp.app:create_app()"]
