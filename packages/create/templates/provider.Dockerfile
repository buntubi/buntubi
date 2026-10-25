# The provider: Buntubi's published image with this project's provider plugins installed, each
# one's plugins/<id>/provider package. Without plugins it is the published image as it is.
FROM ghcr.io/buntubi/idp-provider:{{version}}
USER root
COPY plugins /plugins
RUN for plugin in /plugins/*/provider; do \
      if [ -f "$plugin/pyproject.toml" ]; then pip install --no-cache-dir "$plugin"; fi; \
    done \
 && rm -rf /plugins
USER idp
