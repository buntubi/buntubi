# syntax=docker/dockerfile:1
# The console or the portal: the `fluixi build` output run by `fluixi start`, with production
# dependencies only. Settings come from the environment.
# Build from the repository root: docker build -f docker/app.Dockerfile --build-arg APP=console .

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /src
COPY . .
# The whole workspace, shared by both apps' builds: the @idp packages build with their own dev
# dependencies.
RUN pnpm install --frozen-lockfile
ARG APP
RUN test -n "$APP" \
 && pnpm --filter "${APP}..." build \
 && pnpm --filter "./apps/${APP}" deploy --prod --legacy /out \
 && cp -r "apps/${APP}/dist" /out/dist

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out .
# fluixi start compiles fluixi.config.ts next to itself.
RUN chown node:node /app
USER node
# console listens on 3420, portal on 3410 (fluixi.config.ts).
EXPOSE 3410 3420
CMD ["node_modules/.bin/fluixi", "start"]
