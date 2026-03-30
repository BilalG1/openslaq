FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY packages/client-core/package.json packages/client-core/
COPY packages/editor/package.json packages/editor/
COPY packages/huddle/package.json packages/huddle/
COPY packages/test-utils/package.json packages/test-utils/
COPY packages/ts-sdk/package.json packages/ts-sdk/
COPY packages/claude-channel/package.json packages/claude-channel/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/
COPY apps/desktop/package.json apps/desktop/
COPY apps/docs/package.json apps/docs/
COPY apps/mobile/package.json apps/mobile/
COPY apps/api-e2e/package.json apps/api-e2e/
COPY apps/web-e2e/package.json apps/web-e2e/
COPY apps/web-e2e-old/package.json apps/web-e2e-old/

RUN bun install --frozen-lockfile

COPY apps/docs/src/ apps/docs/src/
COPY apps/docs/public/ apps/docs/public/
COPY apps/docs/astro.config.mjs apps/docs/
COPY apps/docs/tsconfig.json apps/docs/

WORKDIR /app/apps/docs
RUN bun run build

FROM caddy:2-alpine

COPY apps/docs/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/docs/dist /srv
