FROM oven/bun:1 AS build

WORKDIR /app

# Copy all workspace package.json files (lockfile requires full workspace structure)
# Uses a temp copy + find so new workspaces are picked up automatically
COPY package.json bun.lock bunfig.toml ./
COPY packages/ tmp-pkg/
RUN find tmp-pkg -name package.json | while read f; do \
      dir=$(dirname "$f" | sed 's|^tmp-pkg|packages|'); \
      mkdir -p "$dir" && mv "$f" "$dir/"; \
    done && rm -rf tmp-pkg
COPY apps/ tmp-apps/
RUN find tmp-apps -maxdepth 2 -name package.json | while read f; do \
      dir=$(dirname "$f" | sed 's|^tmp-apps|apps|'); \
      mkdir -p "$dir" && mv "$f" "$dir/"; \
    done && rm -rf tmp-apps

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
