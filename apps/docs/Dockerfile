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

COPY apps/docs/src/ apps/docs/src/
COPY apps/docs/public/ apps/docs/public/
COPY apps/docs/astro.config.mjs apps/docs/
COPY apps/docs/tsconfig.json apps/docs/

WORKDIR /app/apps/docs
RUN bun run build

FROM caddy:2-alpine

COPY apps/docs/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/docs/dist /srv
