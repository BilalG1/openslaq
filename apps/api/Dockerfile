FROM oven/bun:1

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

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/huddle/ packages/huddle/
COPY apps/api/ apps/api/

WORKDIR /app/apps/api

CMD ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]
