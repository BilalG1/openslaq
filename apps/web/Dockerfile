FROM oven/bun:1 AS build

WORKDIR /app

# Copy all workspace package.json files (lockfile requires full workspace structure)
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

# Copy source (web needs shared + api/src for Hono RPC types)
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/client-core/src/ packages/client-core/src/
COPY packages/client-core/tsconfig.json packages/client-core/
COPY packages/huddle/src/ packages/huddle/src/
COPY packages/huddle/tsconfig.json packages/huddle/
COPY packages/editor/src/ packages/editor/src/
COPY packages/editor/tsconfig.json packages/editor/
COPY apps/api/src/ apps/api/src/
COPY apps/web/src/ apps/web/src/
COPY apps/web/public/ apps/web/public/
COPY apps/web/index.html apps/web/
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/vite.config.ts apps/web/
COPY apps/web/vite-env.d.ts apps/web/

# Vite inlines VITE_* env vars at build time
ARG VITE_API_URL
ARG VITE_STACK_PROJECT_ID
ARG VITE_STACK_PUBLISHABLE_CLIENT_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STACK_PROJECT_ID=$VITE_STACK_PROJECT_ID
ENV VITE_STACK_PUBLISHABLE_CLIENT_KEY=$VITE_STACK_PUBLISHABLE_CLIENT_KEY

WORKDIR /app/apps/web
RUN bun run build

# --- Serve with Caddy ---
FROM caddy:2-alpine

COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
