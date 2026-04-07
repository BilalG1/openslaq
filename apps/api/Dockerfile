FROM oven/bun:1

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

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/huddle/ packages/huddle/
COPY apps/api/ apps/api/

WORKDIR /app/apps/api

CMD ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]
