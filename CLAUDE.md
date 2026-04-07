# OpenSlaq

Bun monorepo: `apps/web` (React + Vite), `apps/api` (Hono), `packages/shared`.
Runs on port 3000 (web), 3001 (api), 3002 (postgres). New services should always run on next avaiale 3xxx port.
NEVER GIT STASH ACROSS REPO. If you need to use git stash, do so for a specific folder to not interfere with other agents working on other parts of codebase

## Commands

```bash
bun run dev              # start all apps (foreground)
bun run dev:bg           # start all apps (background, logs to .dev.log)
bun run dev:stop         # stop background dev servers
bun run lint             # oxlint
bun run typecheck        # tsc --noEmit across all packages
bun run check            # lint + typecheck

bun run --filter @openslaq/api db:generate   # generate Drizzle migrations
bun run --filter @openslaq/api db:migrate    # run migrations
bun run --filter @openslaq/api db:seed       # seed database

bun run test:web         # web unit + integration tests (~3s, no dev servers needed)
```

## Rules

- Always run `bun run check` (lint + typecheck) after writing code.
- When editing `apps/api`, always add or update corresponding e2e tests in `apps/api-e2e/tests/` and ensure they pass (`bun run test:api`). Dev servers must be running.
- When editing `apps/web`, always add or update co-located unit/integration tests (`*.test.ts`/`*.test.tsx` next to source files) and ensure they pass (`bun run test:web`). Use `@testing-library/react` (`render`, `screen`, `renderHook`) from `apps/web/src/test-utils.tsx` to render actual components and hooks — don't just test extracted pure logic. For branded ID types in assertions, wrap with `String()`. Also add or update e2e tests in `apps/web-e2e/` and ensure they pass (`bun run test:web:e2e`). Dev servers must be running for e2e. Web e2e tests take ~2 min, so avoid running them unnecessarily (e.g. don't re-run if only API code changed).
- When editing `apps/mobile`, always add or update corresponding unit tests and ensure they pass (`bun run test:mobile`). To verify UI changes, use `dtx` CLI (`scripts/mobile/dtx.ts`) to interact with the simulator — tap, type, screenshot, inspect the accessibility tree. Run `dtx start` to launch a Detox REPL session, then use `dtx` commands (e.g. `dtx tap --id foo`, `dtx type --id foo "text"`, `dtx screenshot`, `dtx tree`). Run `dtx --help` for full usage. Don't run Detox e2e tests in a loop — only run Detox (`bun run test:mobile:e2e`) for final validation before committing.
- **Always use `scripts/mobile/screenshot.sh <output.png>` instead of raw `xcrun simctl io` for simulator screenshots.** It auto-resizes to max 1500px so Claude Code can read the image (raw retina screenshots exceed the 2000px limit and crash the session). Pass `--udid <UDID>` if not targeting the booted simulator.
- Never worry about backwards compatibility. This project is not shipped yet — just change things directly.

## Docs

- `docs/README.md`: Docs index and canonical entrypoint.
- `docs/active/backlog-product.md`: Active product-facing backlog items.
- `docs/active/backlog-engineering.md`: Active refactor/quality backlog items.
- `docs/active/backlog-mobile.md`: Active mobile feature backlog (Slack parity + mobile UX).
- `docs/archive/`: Date-stamped snapshots of completed/superseded backlog docs.
- `docs/backlog.md`: Compatibility pointer to active backlogs and latest archive snapshot.
